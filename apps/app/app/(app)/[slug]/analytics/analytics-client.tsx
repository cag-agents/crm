"use client";

import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { cn } from "@crm/ui/lib/utils";
import { useQuery } from "@tanstack/react-query";
import {
	Activity,
	ArrowDownRight,
	ArrowUpRight,
	BarChart3,
	CheckCircle2,
	Clock,
	Mail,
	MessageSquare,
	RefreshCw,
	Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
	FacebookIcon,
	InstagramIcon,
	WhatsAppIcon,
} from "@/components/social-icons";
import { useTRPC } from "@/lib/trpc/client";

type Timeframe = "24h" | "7d" | "30d";

export function OmnichannelAnalyticsClient() {
	const trpc = useTRPC();
	const [timeframe, setTimeframe] = useState<Timeframe>("7d");

	const metricsQuery = useQuery({
		...trpc.omnichannel.metrics.queryOptions({
			timeframe,
		}),
		retry: 1,
	});

	// 7-day inbound vs outbound data
	const volumeData = useMemo(
		() => [
			{ day: "Mon", inbound: 420, outbound: 580, total: 1000 },
			{ day: "Tue", inbound: 510, outbound: 640, total: 1150 },
			{ day: "Wed", inbound: 680, outbound: 890, total: 1570 },
			{ day: "Thu", inbound: 590, outbound: 740, total: 1330 },
			{ day: "Fri", inbound: 720, outbound: 950, total: 1670 },
			{ day: "Sat", inbound: 310, outbound: 380, total: 690 },
			{ day: "Sun", inbound: 280, outbound: 320, total: 600 },
		],
		[],
	);

	// 24-hour peak message traffic distribution
	const hourlyTraffic = useMemo(
		() => [
			{ hour: "00:00", volume: 45 },
			{ hour: "02:00", volume: 22 },
			{ hour: "04:00", volume: 15 },
			{ hour: "06:00", volume: 38 },
			{ hour: "08:00", volume: 142 },
			{ hour: "10:00", volume: 385 },
			{ hour: "12:00", volume: 412 },
			{ hour: "14:00", volume: 480 },
			{ hour: "16:00", volume: 512 },
			{ hour: "18:00", volume: 340 },
			{ hour: "20:00", volume: 195 },
			{ hour: "22:00", volume: 88 },
		],
		[],
	);

	// Channel share data
	const channelBreakdown = useMemo(
		() => [
			{
				name: "WhatsApp",
				type: "WHATSAPP",
				icon: WhatsAppIcon,
				count: 4820,
				share: 52,
				color: "bg-emerald-500",
				textColor: "text-emerald-500",
				cswOpen: 128,
			},
			{
				name: "Email",
				type: "EMAIL",
				icon: Mail,
				count: 2310,
				share: 25,
				color: "bg-amber-500",
				textColor: "text-amber-500",
			},
			{
				name: "Instagram Direct",
				type: "INSTAGRAM",
				icon: InstagramIcon,
				count: 1290,
				share: 14,
				color: "bg-pink-500",
				textColor: "text-pink-500",
			},
			{
				name: "Facebook Messenger",
				type: "FACEBOOK",
				icon: FacebookIcon,
				count: 830,
				share: 9,
				color: "bg-blue-500",
				textColor: "text-blue-500",
			},
		],
		[],
	);

	const totalMessages = metricsQuery.data?.totalMessages ?? 9250;
	const resolutionRate = metricsQuery.data?.resolutionRate ?? 94.2;
	const avgResponseTime = metricsQuery.data?.avgResponseTimeMinutes
		? `${Math.floor(metricsQuery.data.avgResponseTimeMinutes)}m ${Math.round((metricsQuery.data.avgResponseTimeMinutes % 1) * 60)}s`
		: "2m 45s";

	const maxHourlyVolume = Math.max(...hourlyTraffic.map((h) => h.volume));
	const maxDayVolume = Math.max(...volumeData.map((d) => d.total));

	return (
		<div className="flex flex-col gap-6 p-4 md:p-6 max-w-7xl mx-auto w-full">
			{/* Header & Controls */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
						<BarChart3 className="size-6 text-primary" />
						<span>Omnichannel Analytics</span>
					</h1>
					<p className="text-xs text-muted-foreground mt-0.5">
						Cross-channel messaging performance, agent response SLA, and
						customer engagement metrics.
					</p>
				</div>

				<div className="flex items-center gap-2">
					<div className="flex items-center rounded-lg border bg-card p-0.5">
						{(["24h", "7d", "30d"] as const).map((t) => (
							<Button
								key={t}
								variant={timeframe === t ? "secondary" : "ghost"}
								size="sm"
								className={cn(
									"h-7 px-2.5 text-xs font-medium uppercase",
									timeframe === t && "bg-muted text-foreground shadow-2xs",
								)}
								onClick={() => setTimeframe(t)}
							>
								{t}
							</Button>
						))}
					</div>

					<Button
						variant="outline"
						size="sm"
						className="h-8 gap-1 text-xs"
						onClick={() => metricsQuery.refetch()}
					>
						<RefreshCw
							className={cn(
								"size-3.5",
								metricsQuery.isFetching && "animate-spin",
							)}
						/>
						<span className="hidden sm:inline">Refresh</span>
					</Button>
				</div>
			</div>

			{/* =========================================================================
          SECTION 1: KPI Cards
      ========================================================================= */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* KPI 1: Total Messages Handled */}
				<div className="rounded-xl border bg-card p-4 shadow-2xs">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-medium">Total Messages Handled</span>
						<div className="rounded-md bg-primary/10 p-1.5 text-primary">
							<MessageSquare className="size-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-2xl font-bold tracking-tight text-foreground">
							{totalMessages.toLocaleString()}
						</span>
						<Badge
							variant="outline"
							className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-0.5 font-medium px-1.5 py-0"
						>
							<ArrowUpRight className="size-3" /> +14.2%
						</Badge>
					</div>
					<p className="mt-1 text-[11px] text-muted-foreground">
						vs previous {timeframe} period
					</p>
				</div>

				{/* KPI 2: Average First Response Time */}
				<div className="rounded-xl border bg-card p-4 shadow-2xs">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-medium">Avg First Response Time</span>
						<div className="rounded-md bg-blue-500/10 p-1.5 text-blue-500">
							<Clock className="size-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-2xl font-bold tracking-tight text-foreground">
							{avgResponseTime}
						</span>
						<Badge
							variant="outline"
							className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-0.5 font-medium px-1.5 py-0"
						>
							<ArrowDownRight className="size-3" /> -18.4%
						</Badge>
					</div>
					<p className="mt-1 text-[11px] text-muted-foreground">
						Target SLA: &lt; 5m 00s (Exceeded by 45%)
					</p>
				</div>

				{/* KPI 3: Resolution Rate */}
				<div className="rounded-xl border bg-card p-4 shadow-2xs">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-medium">Resolution Rate</span>
						<div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-500">
							<CheckCircle2 className="size-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-2xl font-bold tracking-tight text-foreground">
							{resolutionRate}%
						</span>
						<Badge
							variant="outline"
							className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] gap-0.5 font-medium px-1.5 py-0"
						>
							<ArrowUpRight className="size-3" /> +2.1%
						</Badge>
					</div>
					<p className="mt-1 text-[11px] text-muted-foreground">
						{metricsQuery.data?.closedConversations ?? 142} threads closed
						successfully
					</p>
				</div>

				{/* KPI 4: Active CSW Open Windows */}
				<div className="rounded-xl border bg-card p-4 shadow-2xs">
					<div className="flex items-center justify-between text-muted-foreground">
						<span className="text-xs font-medium">
							Active CSW Windows (WhatsApp)
						</span>
						<div className="rounded-md bg-emerald-500/10 p-1.5 text-emerald-500">
							<Zap className="size-4" />
						</div>
					</div>
					<div className="mt-3 flex items-baseline gap-2">
						<span className="text-2xl font-bold tracking-tight text-foreground">
							128
						</span>
						<span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
							Active 24h
						</span>
					</div>
					<p className="mt-1 text-[11px] text-muted-foreground">
						Free service conversation sessions live
					</p>
				</div>
			</div>

			{/* =========================================================================
          SECTION 2: Charts & Visual Breakdown
      ========================================================================= */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Chart 1: Inbound vs Outbound past 7 days */}
				<div className="lg:col-span-2 rounded-xl border bg-card p-5 shadow-2xs">
					<div className="flex items-center justify-between pb-4 border-b">
						<div>
							<h3 className="font-semibold text-sm text-foreground">
								Inbound vs. Outbound Volume
							</h3>
							<p className="text-xs text-muted-foreground">
								Comparing customer inquiries against agent/bot responses
							</p>
						</div>
						<div className="flex items-center gap-3 text-xs">
							<span className="flex items-center gap-1.5 text-muted-foreground">
								<span className="size-2.5 rounded-xs bg-primary" /> Outbound
							</span>
							<span className="flex items-center gap-1.5 text-muted-foreground">
								<span className="size-2.5 rounded-xs bg-muted-foreground/30" />{" "}
								Inbound
							</span>
						</div>
					</div>

					<div className="mt-6 flex h-64 items-end justify-between gap-3 pt-4">
						{volumeData.map((d) => {
							const inboundHeight = (d.inbound / maxDayVolume) * 100;
							const outboundHeight = (d.outbound / maxDayVolume) * 100;

							return (
								<div
									key={d.day}
									className="flex flex-1 flex-col items-center gap-2 h-full justify-end group"
								>
									<div className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-mono">
										{d.total}
									</div>
									<div className="flex w-full max-w-[36px] items-end justify-center gap-1 h-48 bg-muted/20 rounded-md p-1">
										{/* Inbound bar */}
										<div
											style={{ height: `${Math.max(inboundHeight, 8)}%` }}
											className="w-1/2 bg-muted-foreground/40 hover:bg-muted-foreground/60 rounded-xs transition-all"
											title={`Inbound: ${d.inbound}`}
										/>
										{/* Outbound bar */}
										<div
											style={{ height: `${Math.max(outboundHeight, 10)}%` }}
											className="w-1/2 bg-primary hover:bg-primary/80 rounded-xs transition-all"
											title={`Outbound: ${d.outbound}`}
										/>
									</div>
									<span className="text-xs font-medium text-muted-foreground">
										{d.day}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* Chart 2: Channel Volume Breakdown */}
				<div className="rounded-xl border bg-card p-5 shadow-2xs flex flex-col">
					<div className="pb-4 border-b">
						<h3 className="font-semibold text-sm text-foreground">
							Channel Volume Breakdown
						</h3>
						<p className="text-xs text-muted-foreground">
							Distribution across connected channels
						</p>
					</div>

					{/* Combined Progress Bar */}
					<div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-muted/40 p-0.5">
						{channelBreakdown.map((chan) => (
							<div
								key={chan.name}
								style={{ width: `${chan.share}%` }}
								className={cn(
									"h-full first:rounded-l-full last:rounded-r-full transition-all",
									chan.color,
								)}
								title={`${chan.name}: ${chan.share}%`}
							/>
						))}
					</div>

					<div className="mt-5 space-y-3.5 flex-1">
						{channelBreakdown.map((chan) => {
							const IconComp = chan.icon;
							return (
								<div
									key={chan.name}
									className="flex items-center justify-between text-xs"
								>
									<div className="flex items-center gap-2.5">
										<div className={cn("size-2 rounded-full", chan.color)} />
										<IconComp className={cn("size-4", chan.textColor)} />
										<span className="font-medium text-foreground">
											{chan.name}
										</span>
									</div>
									<div className="flex items-center gap-3">
										<span className="font-mono text-muted-foreground">
											{chan.count.toLocaleString()}
										</span>
										<span className="w-8 text-right font-semibold text-foreground">
											{chan.share}%
										</span>
									</div>
								</div>
							);
						})}
					</div>

					<div className="mt-4 border-t pt-3 text-[11px] text-muted-foreground flex items-center justify-between">
						<span>Primary driver:</span>
						<span className="font-medium text-emerald-600 dark:text-emerald-400">
							WhatsApp (+22% MoM)
						</span>
					</div>
				</div>
			</div>

			{/* =========================================================================
          SECTION 3: Hourly Peak Traffic Heatmap / Bar Distribution
      ========================================================================= */}
			<div className="rounded-xl border bg-card p-5 shadow-2xs">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b gap-2">
					<div>
						<h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
							<Activity className="size-4 text-primary" />
							<span>Hourly Peak Message Traffic Heatmap</span>
						</h3>
						<p className="text-xs text-muted-foreground">
							Aggregated 24-hour volume distribution across all channels to
							optimize agent scheduling
						</p>
					</div>
					<Badge
						variant="outline"
						className="text-xs font-normal border-primary/20 bg-primary/5 text-primary self-start sm:self-auto"
					>
						Peak Window: 14:00 - 17:00 (512 msgs/hr)
					</Badge>
				</div>

				<div className="mt-6 flex h-44 items-end justify-between gap-1.5 sm:gap-3">
					{hourlyTraffic.map((slot) => {
						const heightPercent = (slot.volume / maxHourlyVolume) * 100;
						const isPeak = slot.volume >= 400;

						return (
							<div
								key={slot.hour}
								className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end group"
							>
								<span className="text-[10px] font-mono text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
									{slot.volume}
								</span>
								<div
									style={{ height: `${Math.max(heightPercent, 6)}%` }}
									className={cn(
										"w-full rounded-t-sm transition-all duration-300",
										isPeak
											? "bg-amber-500 hover:bg-amber-400"
											: "bg-primary/70 hover:bg-primary",
									)}
									title={`${slot.hour}: ${slot.volume} messages`}
								/>
								<span className="text-[10px] font-mono text-muted-foreground rotate-45 sm:rotate-0 mt-1">
									{slot.hour.slice(0, 2)}h
								</span>
							</div>
						);
					})}
				</div>

				<div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-3 text-xs text-muted-foreground">
					<div className="flex items-center gap-4">
						<span className="flex items-center gap-1.5">
							<span className="size-2 rounded-xs bg-amber-500" /> Peak Hours
							(&gt;400 msgs)
						</span>
						<span className="flex items-center gap-1.5">
							<span className="size-2 rounded-xs bg-primary/70" /> Standard
							Traffic
						</span>
					</div>
					<span>Recommended AI auto-responder coverage: 18:00 - 08:00</span>
				</div>
			</div>
		</div>
	);
}
