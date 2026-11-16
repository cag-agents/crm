import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { UnifiedInboxClient } from "./inbox-client";

export const metadata: Metadata = {
	title: "Unified Omnichannel Inbox",
	description:
		"Unified communication hub for WhatsApp, Instagram, Facebook, and Email conversations.",
};

export default function InboxPage() {
	return (
		<HydrateClient>
			<Suspense fallback={<InboxFallback />}>
				<UnifiedInboxClient />
			</Suspense>
		</HydrateClient>
	);
}

function InboxFallback() {
	return (
		<div className="flex h-[calc(100vh-3.5rem)] w-full items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-2">
				<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="text-xs text-muted-foreground">
					Loading Unified Inbox...
				</span>
			</div>
		</div>
	);
}
