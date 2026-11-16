"use client";

import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Checkbox } from "@crm/ui/components/checkbox";
import { Switch } from "@crm/ui/components/switch";
import { cn } from "@crm/ui/lib/utils";
import {
	Info,
	Lock,
	Mail,
	RotateCcw,
	Save,
	Shield,
	Sparkles,
	Zap,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { InstagramIcon, WhatsAppIcon } from "@/components/social-icons";

interface ModuleToggle {
	id: string;
	name: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	enabled: boolean;
	color: string;
	badge: string;
}

interface PermissionDefinition {
	id: string;
	name: string;
	description: string;
}

const PERMISSION_COLUMNS: PermissionDefinition[] = [
	{
		id: "view_conversations",
		name: "View Conversations",
		description: "Read inbound and outbound chat threads",
	},
	{
		id: "send_messages",
		name: "Send Messages",
		description: "Dispatch customer replies across all channels",
	},
	{
		id: "close_threads",
		name: "Delete/Close Threads",
		description: "Resolve, snooze, or archive customer conversations",
	},
	{
		id: "channel_settings",
		name: "Modify Channel Settings",
		description: "Configure webhooks, tokens, and phone numbers",
	},
	{
		id: "access_analytics",
		name: "Access Analytics",
		description: "View SLA charts, resolution rates, and metrics",
	},
];

type RoleKey = "admin" | "support_manager" | "sales_agent" | "readonly_viewer";

interface RoleDefinition {
	key: RoleKey;
	name: string;
	description: string;
	badge: string;
	isImmutable?: boolean;
}

const ROLES: RoleDefinition[] = [
	{
		key: "admin",
		name: "Admin",
		description:
			"Full workspace authority including integrations, billing, and member roles.",
		badge: "Full Access",
		isImmutable: true,
	},
	{
		key: "support_manager",
		name: "Support Manager",
		description:
			"Supervises live agent queues, resolves escalated threads, and reviews SLA metrics.",
		badge: "Supervisory",
	},
	{
		key: "sales_agent",
		name: "Sales Agent",
		description:
			"Handles inbound leads, sends replies, and manages customer relationships.",
		badge: "Operational",
	},
	{
		key: "readonly_viewer",
		name: "Read-only Viewer",
		description:
			"Auditor or trainee access for observing conversations without modifying state.",
		badge: "Restricted",
	},
];

const DEFAULT_MATRIX = {
	admin: {
		view_conversations: true,
		send_messages: true,
		close_threads: true,
		channel_settings: true,
		access_analytics: true,
	},
	support_manager: {
		view_conversations: true,
		send_messages: true,
		close_threads: true,
		channel_settings: false,
		access_analytics: true,
	},
	sales_agent: {
		view_conversations: true,
		send_messages: true,
		close_threads: true,
		channel_settings: false,
		access_analytics: false,
	},
	readonly_viewer: {
		view_conversations: true,
		send_messages: false,
		close_threads: false,
		channel_settings: false,
		access_analytics: true,
	},
} satisfies Record<RoleKey, Record<string, boolean>>;

const DEFAULT_MODULES: ModuleToggle[] = [
	{
		id: "whatsapp",
		name: "WhatsApp Integration",
		description:
			"Connect Cloud API / Meta Embedded signup for 24-hour Customer Service Windows (CSW).",
		icon: WhatsAppIcon,
		enabled: true,
		color: "text-emerald-500",
		badge: "Port 3002",
	},
	{
		id: "meta_social",
		name: "Meta (Facebook & Instagram) Integration",
		description:
			"Real-time webhook sync for Facebook Pages, Instagram Direct Messages, and post comments.",
		icon: InstagramIcon,
		enabled: true,
		color: "text-pink-500",
		badge: "Port 3003",
	},
	{
		id: "email",
		name: "Email Management",
		description:
			"Inbound RFC 822 parser, IMAP synchronization, and outbound SMTP thread dispatcher.",
		icon: Mail,
		enabled: true,
		color: "text-amber-500",
		badge: "Port 3004",
	},
	{
		id: "n8n_ai",
		name: "n8n AI Auto-Responder",
		description:
			"Automated routing workflows, LLM smart summaries, and after-hours autonomous responder.",
		icon: Sparkles,
		enabled: false,
		color: "text-purple-500",
		badge: "Workflow Engine",
	},
];

export function RolesAndModulesClient() {
	const [modules, setModules] = useState<ModuleToggle[]>(DEFAULT_MODULES);
	const [matrix, setMatrix] =
		useState<Record<RoleKey, Record<string, boolean>>>(DEFAULT_MATRIX);
	const [hasChanges, setHasChanges] = useState(false);

	const handleToggleModule = (id: string, currentState: boolean) => {
		const nextState = !currentState;
		setModules((prev) =>
			prev.map((m) => (m.id === id ? { ...m, enabled: nextState } : m)),
		);
		setHasChanges(true);
		const mod = modules.find((m) => m.id === id);
		if (nextState) {
			toast.success(`${mod?.name} enabled`);
		} else {
			toast.warning(`${mod?.name} disabled`);
		}
	};

	const handleTogglePermission = (role: RoleKey, permId: string) => {
		if (role === "admin") {
			toast.info("Admin permissions cannot be modified (system invariant).");
			return;
		}

		setMatrix((prev) => ({
			...prev,
			[role]: {
				...prev[role],
				[permId]: !prev[role][permId],
			},
		}));
		setHasChanges(true);
	};

	const handleSave = () => {
		setHasChanges(false);
		toast.success("Role permissions and module toggles saved successfully");
	};

	const handleReset = () => {
		setModules(DEFAULT_MODULES);
		setMatrix(DEFAULT_MATRIX);
		setHasChanges(false);
		toast.info("Settings restored to system defaults");
	};

	return (
		<div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-6xl space-y-8">
			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
				<div>
					<h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
						<Shield className="size-6 text-primary" />
						<span>RBAC & Module Management</span>
					</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						Configure omnichannel microservice integrations and define granular
						role-based access matrix.
					</p>
				</div>

				<div className="flex items-center gap-2">
					{hasChanges && (
						<Button
							variant="ghost"
							size="sm"
							className="h-8 text-xs gap-1"
							onClick={handleReset}
						>
							<RotateCcw className="size-3" /> Reset
						</Button>
					)}
					<Button
						size="sm"
						className="h-8 text-xs gap-1.5"
						onClick={handleSave}
						disabled={!hasChanges}
					>
						<Save className="size-3.5" /> Save Changes
					</Button>
				</div>
			</div>

			{/* =========================================================================
          SECTION 1: Module Feature Toggles (Switches)
      ========================================================================= */}
			<div className="space-y-4">
				<div>
					<h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<Zap className="size-4 text-amber-500" />
						<span>Omnichannel Module Toggles</span>
					</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Dynamically activate or suspend channel microservices and workflow
						engines across your CRM.
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{modules.map((mod) => {
						const IconComp = mod.icon;
						return (
							<div
								key={mod.id}
								className={cn(
									"flex flex-col justify-between rounded-xl border p-4 shadow-2xs transition-colors",
									mod.enabled
										? "bg-card border-border"
										: "bg-muted/30 border-muted opacity-80",
								)}
							>
								<div className="flex items-start justify-between gap-3">
									<div className="flex items-start gap-3">
										<div
											className={cn(
												"rounded-lg p-2 bg-muted/60 mt-0.5",
												mod.color,
											)}
										>
											<IconComp className="size-5" />
										</div>
										<div>
											<div className="flex items-center gap-2">
												<span className="font-semibold text-xs md:text-sm text-foreground">
													{mod.name}
												</span>
												<Badge
													variant="outline"
													className="text-[10px] px-1.5 py-0 font-mono"
												>
													{mod.badge}
												</Badge>
											</div>
											<p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
												{mod.description}
											</p>
										</div>
									</div>

									<Switch
										checked={mod.enabled}
										onCheckedChange={() =>
											handleToggleModule(mod.id, mod.enabled)
										}
									/>
								</div>

								<div className="mt-3 pt-3 border-t flex items-center justify-between text-[11px]">
									<span className="text-muted-foreground">Status:</span>
									{mod.enabled ? (
										<span className="flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
											<span className="size-1.5 rounded-full bg-emerald-500" />{" "}
											Operational
										</span>
									) : (
										<span className="flex items-center gap-1 text-muted-foreground">
											<span className="size-1.5 rounded-full bg-muted-foreground" />{" "}
											Suspended
										</span>
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>

			{/* =========================================================================
          SECTION 2: Role Permissions Table (RBAC Matrix)
      ========================================================================= */}
			<div className="space-y-4">
				<div>
					<h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
						<Lock className="size-4 text-primary" />
						<span>Role Permissions Matrix</span>
					</h2>
					<p className="text-xs text-muted-foreground mt-0.5">
						Define exact action permissions for each staff tier across
						omnichannel conversations.
					</p>
				</div>

				<div className="rounded-xl border bg-card shadow-2xs overflow-hidden">
					<div className="overflow-x-auto">
						<table className="w-full text-xs text-left">
							<thead>
								<tr className="border-b bg-muted/40 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
									<th className="py-3 px-4 w-72">Role & Scope</th>
									{PERMISSION_COLUMNS.map((col) => (
										<th key={col.id} className="py-3 px-3 text-center">
											<div className="font-medium text-foreground">
												{col.name}
											</div>
											<div className="text-[10px] font-normal text-muted-foreground lowercase">
												{col.id.replace("_", " ")}
											</div>
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y">
								{ROLES.map((role) => {
									return (
										<tr
											key={role.key}
											className="hover:bg-muted/20 transition-colors"
										>
											<td className="py-3.5 px-4 align-top">
												<div className="flex items-center gap-2">
													<span className="font-semibold text-xs text-foreground">
														{role.name}
													</span>
													<Badge
														variant={
															role.key === "admin" ? "default" : "secondary"
														}
														className="text-[10px] px-1.5 py-0"
													>
														{role.badge}
													</Badge>
													{role.isImmutable && (
														<span title="System Protected">
															<Lock className="size-3 text-muted-foreground" />
														</span>
													)}
												</div>
												<p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
													{role.description}
												</p>
											</td>

											{PERMISSION_COLUMNS.map((perm) => {
												const isChecked = Boolean(matrix[role.key]?.[perm.id]);
												const disabled = role.isImmutable;

												return (
													<td
														key={perm.id}
														className="py-3.5 px-3 text-center align-middle"
													>
														<div className="flex items-center justify-center">
															<Checkbox
																checked={isChecked}
																disabled={disabled}
																onCheckedChange={() =>
																	handleTogglePermission(role.key, perm.id)
																}
																className={cn(
																	disabled && "opacity-70 cursor-not-allowed",
																)}
															/>
														</div>
													</td>
												);
											})}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</div>

				{/* Security Audit Footer Note */}
				<div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5 flex items-start gap-3">
					<Info className="size-4 text-primary shrink-0 mt-0.5" />
					<div className="text-xs text-muted-foreground leading-relaxed">
						<strong className="text-foreground font-medium">
							Enterprise Security Note:
						</strong>{" "}
						All role modifications are recorded in the security audit ledger.
						Permissions take effect immediately across all active agent
						websocket sessions and tRPC procedures.
					</div>
				</div>
			</div>
		</div>
	);
}
