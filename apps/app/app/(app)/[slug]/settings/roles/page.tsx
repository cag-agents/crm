import type { Metadata } from "next";
import { Suspense } from "react";
import { RolesAndModulesClient } from "./roles-client";

export const metadata: Metadata = {
	title: "Role Permissions & Module Toggles",
	description:
		"Configure omnichannel service toggles and manage RBAC permission matrix.",
};

export default function RolesSettingsPage() {
	return (
		<Suspense fallback={<RolesFallback />}>
			<RolesAndModulesClient />
		</Suspense>
	);
}

function RolesFallback() {
	return (
		<div className="flex h-96 w-full items-center justify-center">
			<div className="flex flex-col items-center gap-2">
				<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
				<span className="text-xs text-muted-foreground">
					Loading Roles & Modules...
				</span>
			</div>
		</div>
	);
}
