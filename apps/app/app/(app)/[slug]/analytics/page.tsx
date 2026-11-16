import type { Metadata } from "next";
import { Suspense } from "react";
import { HydrateClient } from "@/lib/trpc/hydrate";
import { OmnichannelAnalyticsClient } from "./analytics-client";

export const metadata: Metadata = {
	title: "Omnichannel Analytics & Insights",
	description:
		"Cross-channel volume, response SLA, and conversation metrics across WhatsApp, Instagram, Facebook, and Email.",
};

export default function AnalyticsPage() {
	return (
		<HydrateClient>
			<Suspense fallback={<AnalyticsFallback />}>
				<OmnichannelAnalyticsClient />
			</Suspense>
		</HydrateClient>
	);
}

function AnalyticsFallback() {
	return (
		<div className="flex h-96 w-full items-center justify-center">
			<div className="flex flex-col items-center gap-2">
				<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="text-xs text-muted-foreground">
					Loading Analytics...
				</span>
			</div>
		</div>
	);
}
