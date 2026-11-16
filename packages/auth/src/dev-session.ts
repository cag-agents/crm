import { db } from "@crm/db";
import { auth } from "./auth";
import { SESSION_COOKIE_NAME } from "./cookies";
import { ensureWorkspaceMembership } from "./organization";

export async function createDevSession(email: string = "ada@trycomp.ai") {
	let user = await db.user.findFirst({ where: { email } });
	if (!user) {
		user = await db.user.create({
			data: {
				id: `seed-${email.split("@")[0]}`,
				email,
				name: "Ada Okafor",
				emailVerified: true,
			},
		});
	}

	await ensureWorkspaceMembership(user.id);

	const ctx = await auth.$context;
	const session = await ctx.internalAdapter.createSession(user.id);

	const secretBuf = new TextEncoder().encode(ctx.secret);
	const key = await crypto.subtle.importKey(
		"raw",
		secretBuf,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(session.token),
	);
	const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signature)));
	const signedValue = `${session.token}.${base64Sig}`;

	return {
		session,
		user,
		cookieName: SESSION_COOKIE_NAME,
		cookieValue: signedValue,
	};
}
