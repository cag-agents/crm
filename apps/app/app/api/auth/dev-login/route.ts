import { createDevSession } from "@crm/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
	try {
		const { cookieName, cookieValue } =
			await createDevSession("ada@trycomp.ai");

		const cookieStore = await cookies();
		cookieStore.set(cookieName, cookieValue, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			secure: process.env.NODE_ENV === "production",
			maxAge: 60 * 60 * 24 * 7, // 7 days
		});

		const url = new URL(request.url);
		const targetUrl = new URL("/crm", url.origin);
		return NextResponse.redirect(targetUrl);
	} catch (error) {
		console.error("Failed to create dev demo session:", error);
		return NextResponse.json(
			{ error: "Failed to create dev session", details: String(error) },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	return GET(request);
}
