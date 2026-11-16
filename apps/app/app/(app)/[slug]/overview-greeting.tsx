"use client";

import { useQueryState } from "nuqs";
import { PageShellDescription, PageShellTitle } from "@/components/page-shell";
import { SEARCH_PARAM } from "@/lib/search-param-keys";
import { overviewParsers } from "./overview-search-params";

export function OverviewGreetingFallback() {
	return (
		<>
			<PageShellTitle>Creator Command Center</PageShellTitle>
			<PageShellDescription>
				Published brand collabs, sponsorships in production, and active
				deliverables.
			</PageShellDescription>
		</>
	);
}

export function OverviewGreeting() {
	const [scope] = useQueryState(
		SEARCH_PARAM.overview.scope,
		overviewParsers[SEARCH_PARAM.overview.scope],
	);

	return (
		<>
			<PageShellTitle>Creator Command Center</PageShellTitle>
			<PageShellDescription>
				{scope === "me"
					? "Your published brand collabs, sponsorships in production, and active deliverables."
					: "Published brand collabs, sponsorships in production, and active deliverables across your talent network."}
			</PageShellDescription>
		</>
	);
}
