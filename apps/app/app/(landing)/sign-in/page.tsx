import type { MailboxProviderId } from "@crm/auth/scopes";
import type { Metadata } from "next";
import { redirect, unstable_rethrow } from "next/navigation";
import { Suspense } from "react";
import { AuthHeading, AuthShell } from "@/components/auth-shell";
import { getSession } from "@/lib/session";
import { getServerQueryClient, getServerTrpc } from "@/lib/trpc/server";
import { SocialSignIn } from "./social-sign-in";
import { type SsoProvider, SsoSignIn } from "./sso-sign-in";

export const metadata: Metadata = {
	title: "Sign in",
};

type SignInOptions = {
	google: boolean;
	microsoft: boolean;
	providers: SsoProvider[];
};

async function signInOptions(): Promise<SignInOptions | null> {
	try {
		return await getServerQueryClient().fetchQuery(
			getServerTrpc().sso.signInOptions.queryOptions(),
		);
	} catch (error) {
		unstable_rethrow(error);
		console.error("Sign-in: could not read the sign-in options.", error);
		return null;
	}
}

async function currentSession() {
	try {
		return await getSession();
	} catch (error) {
		unstable_rethrow(error);
		console.error("Sign-in: could not read the session.", error);
		return null;
	}
}

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
	return (
		<AuthShell>
			<Suspense
				fallback={
					<AuthHeading
						title="Welcome back"
						description="Sign in with your account to continue."
					/>
				}
			>
				<SignIn searchParams={searchParams} />
			</Suspense>
		</AuthShell>
	);
}

async function SignIn({
	searchParams,
}: Pick<PageProps<"/sign-in">, "searchParams">) {
	const [session, options, { method }] = await Promise.all([
		currentSession(),
		signInOptions(),
		searchParams,
	]);

	if (session) {
		redirect("/");
	}

	const configured: MailboxProviderId[] = [];
	if (options?.google ?? true) configured.push("google");
	if (options?.microsoft ?? false) configured.push("microsoft");

	const providers = options?.providers ?? [];

	const insisted = configured.find((provider) => provider === method);
	const showSso = providers.length > 0 && insisted === undefined;
	const social =
		insisted !== undefined
			? [insisted]
			: providers.length === 0
				? configured
				: [];

	const isDev = process.env.NODE_ENV !== "production";

	if (!showSso && social.length === 0) {
		return (
			<>
				<AuthHeading
					title="Development Sign-in"
					description="Quick local access for testing the CRM."
				/>

				<div className="flex flex-col gap-3 w-full">
					<a
						href="/api/auth/dev-login"
						className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 text-center"
					>
						Sign in as Demo Admin (Ada Okafor)
					</a>

					<p className="text-center text-muted-foreground text-xs mt-2">
						Seeded local workspace:{" "}
						<code className="font-mono text-foreground">/crm</code>
					</p>
				</div>
			</>
		);
	}

	return (
		<>
			<AuthHeading
				title="Welcome back"
				description="Sign in with your account to continue."
			/>

			{showSso ? <SsoSignIn providers={providers} /> : null}
			{social.map((provider) => (
				<SocialSignIn key={provider} provider={provider} />
			))}

			{isDev ? (
				<div className="pt-2 border-t border-border/40 text-center w-full">
					<a
						href="/api/auth/dev-login"
						className="text-xs text-muted-foreground hover:text-foreground underline transition"
					>
						Or continue as Demo Admin (Ada Okafor)
					</a>
				</div>
			) : null}
		</>
	);
}
