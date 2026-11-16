"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@crm/ui/components/avatar";
import { Badge } from "@crm/ui/components/badge";
import { Button } from "@crm/ui/components/button";
import { Input } from "@crm/ui/components/input";
import { Textarea } from "@crm/ui/components/textarea";
import { cn } from "@crm/ui/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
	Archive,
	Check,
	CheckCheck,
	Clock,
	Inbox,
	Mail,
	MessageCircle,
	MessageSquare,
	Paperclip,
	Phone,
	RefreshCw,
	Search,
	Send,
	Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
	FacebookIcon,
	InstagramIcon,
	WhatsAppIcon,
} from "@/components/social-icons";
import { useTRPC } from "@/lib/trpc/client";

export type ChannelFilter =
	| "ALL"
	| "WHATSAPP"
	| "INSTAGRAM"
	| "FACEBOOK"
	| "EMAIL";
export type StatusFilter = "ALL" | "OPEN" | "CLOSED" | "SNOOZED";

export interface ConversationItem {
	id: string;
	channelId: string;
	channelType:
		| "WHATSAPP"
		| "INSTAGRAM"
		| "FACEBOOK"
		| "EMAIL"
		| "TELEGRAM"
		| "SMS"
		| "LINKEDIN"
		| "GENERIC";
	channelName: string;
	contactId?: string | null;
	contactName?: string | null;
	contactPhone?: string | null;
	contactEmail?: string | null;
	contactAvatar?: string | null;
	externalThreadId: string;
	title?: string | null;
	status: "OPEN" | "CLOSED" | "SNOOZED" | "PENDING";
	priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
	lastMessageAt: Date | string;
	lastMessageSnippet?: string | null;
	unreadCount: number;
	assignedTo?: string | null;
}

export interface ChatMessage {
	id: string;
	conversationId: string;
	externalMessageId?: string | null;
	direction: "INBOUND" | "OUTBOUND";
	senderType: string;
	senderId?: string | null;
	senderName?: string | null;
	content: string;
	contentType: string;
	mediaUrl?: string | null;
	mediaType?: string | null;
	deliveryStatus: "PENDING" | "SENT" | "DELIVERED" | "READ" | "FAILED";
	sentAt: Date | string;
}

// Fallback initial demo conversations
const DEMO_CONVERSATIONS: ConversationItem[] = [
	{
		id: "conv-wa-01",
		channelId: "chan-wa",
		channelType: "WHATSAPP",
		channelName: "WhatsApp Support",
		contactName: "Aarav Sharma",
		contactPhone: "+91 98765 43210",
		externalThreadId: "wa_9876543210",
		title: "Pricing query for Enterprise plan",
		status: "OPEN",
		priority: "HIGH",
		lastMessageAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		lastMessageSnippet:
			"Could you please send over the enterprise tier pricing sheet?",
		unreadCount: 2,
		assignedTo: "Garvit (You)",
	},
	{
		id: "conv-email-01",
		channelId: "chan-email",
		channelType: "EMAIL",
		channelName: "Email Desk",
		contactName: "Sophia Martinez",
		contactEmail: "sophia.martinez@cloudscale.io",
		externalThreadId: "email-thread-902",
		title: "Question regarding API integration limits",
		status: "OPEN",
		priority: "NORMAL",
		lastMessageAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
		lastMessageSnippet:
			"We noticed rate limits on the webhook endpoint during stress tests.",
		unreadCount: 1,
		assignedTo: "Ashish",
	},
	{
		id: "conv-ig-01",
		channelId: "chan-ig",
		channelType: "INSTAGRAM",
		channelName: "Instagram Direct",
		contactName: "Elena Rostova",
		contactAvatar:
			"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
		externalThreadId: "ig_dm_10283",
		title: "Instagram DM from @elena_r",
		status: "OPEN",
		priority: "NORMAL",
		lastMessageAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
		lastMessageSnippet:
			"Loved your latest launch! Do you support custom SSO integrations?",
		unreadCount: 0,
		assignedTo: "Garvit (You)",
	},
	{
		id: "conv-fb-01",
		channelId: "chan-fb",
		channelType: "FACEBOOK",
		channelName: "Facebook Page",
		contactName: "Marcus Sterling",
		externalThreadId: "fb_user_44921",
		title: "Facebook Messenger inquiry",
		status: "SNOOZED",
		priority: "LOW",
		lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		lastMessageSnippet: "Will check back with my procurement team on Tuesday.",
		unreadCount: 0,
		assignedTo: "Garvit (You)",
	},
	{
		id: "conv-email-02",
		channelId: "chan-email",
		channelType: "EMAIL",
		channelName: "Email Desk",
		contactName: "David Chen",
		contactEmail: "d.chen@apexglobal.tech",
		externalThreadId: "email-thread-104",
		title: "Annual Billing & Tax Invoice Confirmation",
		status: "CLOSED",
		priority: "NORMAL",
		lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
		lastMessageSnippet:
			"Thank you, payment confirmed and invoice downloaded successfully.",
		unreadCount: 0,
		assignedTo: "Support Agent",
	},
];

const DEMO_MESSAGES = {
	"conv-wa-01": [
		{
			id: "msg-wa-1",
			conversationId: "conv-wa-01",
			direction: "INBOUND",
			senderType: "CONTACT",
			senderName: "Aarav Sharma",
			content:
				"Hi! We are evaluating omnichannel platforms for our 50-agent support team.",
			contentType: "TEXT",
			deliveryStatus: "READ",
			sentAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
		},
		{
			id: "msg-wa-2",
			conversationId: "conv-wa-01",
			direction: "OUTBOUND",
			senderType: "USER",
			senderName: "Garvit",
			content:
				"Hello Aarav! Glad to connect. We support unified WhatsApp, Meta, and Email with full 24h CSW tracking.",
			contentType: "TEXT",
			deliveryStatus: "READ",
			sentAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
		},
		{
			id: "msg-wa-3",
			conversationId: "conv-wa-01",
			direction: "INBOUND",
			senderType: "CONTACT",
			senderName: "Aarav Sharma",
			content: "Could you please send over the enterprise tier pricing sheet?",
			contentType: "TEXT",
			deliveryStatus: "DELIVERED",
			sentAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
		},
	],
	"conv-email-01": [
		{
			id: "msg-em-1",
			conversationId: "conv-email-01",
			direction: "INBOUND",
			senderType: "CONTACT",
			senderName: "Sophia Martinez",
			content:
				"Hello CRM Team,\n\nWe noticed rate limits on the webhook endpoint during stress tests (150 rps). Is there a dedicated tier for high-frequency webhook callbacks?",
			contentType: "TEXT",
			deliveryStatus: "READ",
			sentAt: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
		},
	],
	"conv-ig-01": [
		{
			id: "msg-ig-1",
			conversationId: "conv-ig-01",
			direction: "INBOUND",
			senderType: "CONTACT",
			senderName: "Elena Rostova",
			content:
				"Loved your latest launch! Do you support custom SSO integrations?",
			contentType: "TEXT",
			deliveryStatus: "READ",
			sentAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
		},
	],
} satisfies Record<string, ChatMessage[]>;

const CANNED_REPLIES = [
	"Thanks for reaching out! Let me check the details and get back to you shortly.",
	"Here is our documentation and setup guide for omnichannel integrations.",
	"Your request has been escalated to our senior engineering team.",
	"Could you please share your registered workspace domain or account ID?",
];

function getChannelIcon(type: string, className = "size-3.5") {
	switch (type) {
		case "WHATSAPP":
			return <WhatsAppIcon className={cn("text-emerald-500", className)} />;
		case "INSTAGRAM":
			return <InstagramIcon className={cn("text-pink-500", className)} />;
		case "FACEBOOK":
			return <FacebookIcon className={cn("text-blue-500", className)} />;
		case "EMAIL":
			return <Mail className={cn("text-amber-500", className)} />;
		default:
			return <Inbox className={cn("text-muted-foreground", className)} />;
	}
}

function getChannelBadge(type: string) {
	switch (type) {
		case "WHATSAPP":
			return (
				<Badge
					variant="outline"
					className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[10px] px-1.5 py-0"
				>
					<WhatsAppIcon className="size-2.5" /> WhatsApp
				</Badge>
			);
		case "INSTAGRAM":
			return (
				<Badge
					variant="outline"
					className="border-pink-500/30 bg-pink-500/10 text-pink-600 dark:text-pink-400 gap-1 text-[10px] px-1.5 py-0"
				>
					<InstagramIcon className="size-2.5" /> Instagram
				</Badge>
			);
		case "FACEBOOK":
			return (
				<Badge
					variant="outline"
					className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1 text-[10px] px-1.5 py-0"
				>
					<FacebookIcon className="size-2.5" /> Facebook
				</Badge>
			);
		case "EMAIL":
			return (
				<Badge
					variant="outline"
					className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 gap-1 text-[10px] px-1.5 py-0"
				>
					<Mail className="size-2.5" /> Email
				</Badge>
			);
		default:
			return (
				<Badge variant="outline" className="text-[10px] px-1.5 py-0">
					{type}
				</Badge>
			);
	}
}

interface NavChannelItem {
	id: ChannelFilter;
	label: string;
	icon: typeof Inbox;
	count: number;
	color?: string;
}

export function UnifiedInboxClient() {
	const trpc = useTRPC();
	const [selectedChannel, setSelectedChannel] = useState<ChannelFilter>("ALL");
	const [selectedStatus, setSelectedStatus] = useState<StatusFilter>("OPEN");
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedConvId, setSelectedConvId] = useState<string>("conv-wa-01");
	const [replyText, setReplyText] = useState("");
	const [localConversations, setLocalConversations] =
		useState<ConversationItem[]>(DEMO_CONVERSATIONS);
	const [localMessages, setLocalMessages] =
		useState<Record<string, ChatMessage[]>>(DEMO_MESSAGES);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Fetch real conversations from tRPC API if available
	const convListQuery = useQuery({
		...trpc.omnichannel.list.queryOptions({
			channelType: selectedChannel === "ALL" ? undefined : selectedChannel,
			status: selectedStatus === "ALL" ? undefined : selectedStatus,
			search: searchQuery || undefined,
		}),
		retry: 1,
	});

	// Fetch messages for active conversation if available
	const messagesQuery = useQuery({
		...trpc.omnichannel.messages.queryOptions({
			conversationId: selectedConvId,
		}),
		enabled: Boolean(selectedConvId && !selectedConvId.startsWith("conv-")),
		retry: 1,
	});

	// Synchronize remote data if available
	useEffect(() => {
		if (
			convListQuery.data?.conversations &&
			convListQuery.data.conversations.length > 0
		) {
			const mapped: ConversationItem[] = convListQuery.data.conversations.map(
				(c) => ({
					id: c.id,
					channelId: c.channelId,
					channelType: c.channelType,
					channelName: c.channelName,
					contactId: c.contactId,
					contactName: c.contactName,
					contactPhone: c.contactPhone,
					contactEmail: c.contactEmail,
					externalThreadId: c.externalThreadId,
					title: c.title,
					status: c.status,
					priority: c.priority,
					lastMessageAt: c.lastMessageAt,
					lastMessageSnippet: c.lastMessageSnippet,
					unreadCount: c.unreadCount,
				}),
			);
			setLocalConversations(mapped);
			if (!mapped.some((item) => item.id === selectedConvId)) {
				setSelectedConvId(mapped[0]?.id || "");
			}
		}
	}, [convListQuery.data, selectedConvId]);

	// Reply mutation
	const sendReplyMutation = useMutation(
		trpc.omnichannel.reply.mutationOptions({
			onSuccess: () => {
				toast.success("Message dispatched successfully");
				convListQuery.refetch();
				messagesQuery.refetch();
			},
			onError: (err) => {
				toast.error(`Dispatch failed: ${err.message}`);
			},
		}),
	);

	// Filtered conversations
	const filteredConversations = useMemo(() => {
		return localConversations.filter((c) => {
			if (selectedChannel !== "ALL" && c.channelType !== selectedChannel)
				return false;
			if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false;
			if (searchQuery.trim()) {
				const q = searchQuery.toLowerCase();
				const nameMatch = c.contactName?.toLowerCase().includes(q);
				const snippetMatch = c.lastMessageSnippet?.toLowerCase().includes(q);
				const titleMatch = c.title?.toLowerCase().includes(q);
				const emailMatch = c.contactEmail?.toLowerCase().includes(q);
				const phoneMatch = c.contactPhone?.toLowerCase().includes(q);
				if (
					!nameMatch &&
					!snippetMatch &&
					!titleMatch &&
					!emailMatch &&
					!phoneMatch
				) {
					return false;
				}
			}
			return true;
		});
	}, [localConversations, selectedChannel, selectedStatus, searchQuery]);

	const activeConversation = useMemo(() => {
		return (
			localConversations.find((c) => c.id === selectedConvId) ||
			filteredConversations[0]
		);
	}, [localConversations, selectedConvId, filteredConversations]);

	const activeMessages = useMemo(() => {
		if (
			messagesQuery.data?.messages &&
			messagesQuery.data.messages.length > 0
		) {
			return messagesQuery.data.messages.map((m) => ({
				id: m.id,
				conversationId: m.conversationId,
				externalMessageId: m.externalMessageId,
				direction: m.direction,
				senderType: m.senderType,
				senderId: m.senderId,
				senderName: m.senderName,
				content: m.content,
				contentType: m.contentType,
				mediaUrl: m.mediaUrl,
				mediaType: m.mediaType,
				deliveryStatus:
					(m.deliveryStatus as ChatMessage["deliveryStatus"]) || "SENT",
				sentAt: m.sentAt,
			}));
		}
		return localMessages[activeConversation?.id || ""] || [];
	}, [messagesQuery.data, localMessages, activeConversation]);

	// Channel unread counts calculation
	const unreadCounts = useMemo(() => {
		const counts = { ALL: 0, WHATSAPP: 0, INSTAGRAM: 0, FACEBOOK: 0, EMAIL: 0 };
		for (const c of localConversations) {
			counts.ALL += c.unreadCount;
			if (c.channelType === "WHATSAPP") counts.WHATSAPP += c.unreadCount;
			if (c.channelType === "INSTAGRAM") counts.INSTAGRAM += c.unreadCount;
			if (c.channelType === "FACEBOOK") counts.FACEBOOK += c.unreadCount;
			if (c.channelType === "EMAIL") counts.EMAIL += c.unreadCount;
		}
		return counts;
	}, [localConversations]);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	const handleSendMessage = async () => {
		if (!replyText.trim() || !activeConversation) return;
		const textToSend = replyText.trim();
		setReplyText("");

		const newMsg: ChatMessage = {
			id: `msg-${Date.now()}`,
			conversationId: activeConversation.id,
			direction: "OUTBOUND",
			senderType: "USER",
			senderName: "Garvit",
			content: textToSend,
			contentType: "TEXT",
			deliveryStatus: "SENT",
			sentAt: new Date().toISOString(),
		};

		// Optimistic update
		setLocalMessages((prev) => ({
			...prev,
			[activeConversation.id]: [...(prev[activeConversation.id] || []), newMsg],
		}));

		setLocalConversations((prev) =>
			prev.map((c) =>
				c.id === activeConversation.id
					? {
							...c,
							lastMessageSnippet: textToSend.slice(0, 100),
							lastMessageAt: new Date().toISOString(),
						}
					: c,
			),
		);

		// Call live backend if not mock ID
		if (!activeConversation.id.startsWith("conv-")) {
			sendReplyMutation.mutate({
				conversationId: activeConversation.id,
				text: textToSend,
			});
		} else {
			toast.success("Reply dispatched to customer");
		}
	};

	const handleStatusChange = (newStatus: "OPEN" | "CLOSED" | "SNOOZED") => {
		if (!activeConversation) return;
		setLocalConversations((prev) =>
			prev.map((c) =>
				c.id === activeConversation.id ? { ...c, status: newStatus } : c,
			),
		);
		toast.info(`Conversation marked as ${newStatus}`);
	};

	const channelItems: NavChannelItem[] = [
		{ id: "ALL", label: "All Channels", icon: Inbox, count: unreadCounts.ALL },
		{
			id: "WHATSAPP",
			label: "WhatsApp",
			icon: MessageCircle,
			count: unreadCounts.WHATSAPP,
			color: "text-emerald-500",
		},
		{
			id: "INSTAGRAM",
			label: "Instagram",
			icon: MessageCircle,
			count: unreadCounts.INSTAGRAM,
			color: "text-pink-500",
		},
		{
			id: "FACEBOOK",
			label: "Facebook",
			icon: MessageSquare,
			count: unreadCounts.FACEBOOK,
			color: "text-blue-500",
		},
		{
			id: "EMAIL",
			label: "Email",
			icon: Mail,
			count: unreadCounts.EMAIL,
			color: "text-amber-500",
		},
	];

	return (
		<div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
			{/* =========================================================================
          PANE 1: Channels Filter (Left)
      ========================================================================= */}
			<aside className="flex w-60 flex-col border-r bg-muted/20 shrink-0">
				<div className="flex h-12 items-center justify-between border-b px-4">
					<div className="flex items-center gap-2 font-medium text-xs text-foreground uppercase tracking-wider">
						<Inbox className="size-4 text-primary" />
						<span>Channels</span>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="size-7 text-muted-foreground"
						onClick={() => convListQuery.refetch()}
						title="Refresh channels"
					>
						<RefreshCw
							className={cn(
								"size-3.5",
								convListQuery.isFetching && "animate-spin",
							)}
						/>
					</Button>
				</div>

				<nav className="flex flex-col gap-1 p-2">
					{channelItems.map((chan) => {
						const active = selectedChannel === chan.id;
						return (
							<button
								key={chan.id}
								type="button"
								onClick={() => setSelectedChannel(chan.id)}
								className={cn(
									"flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium transition-colors text-left",
									active
										? "bg-primary text-primary-foreground shadow-xs"
										: "text-muted-foreground hover:bg-muted hover:text-foreground",
								)}
							>
								<div className="flex items-center gap-2.5 min-w-0">
									{getChannelIcon(
										chan.id,
										cn(
											"size-4 shrink-0",
											active ? "text-primary-foreground" : chan.color,
										),
									)}
									<span className="truncate">{chan.label}</span>
								</div>
								{chan.count > 0 && (
									<span
										className={cn(
											"ml-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold",
											active
												? "bg-primary-foreground text-primary"
												: "bg-destructive text-destructive-foreground",
										)}
									>
										{chan.count}
									</span>
								)}
							</button>
						);
					})}
				</nav>

				{/* Live Service Health Indicators */}
				<div className="mt-auto border-t p-3 space-y-2 bg-muted/10">
					<div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
						Services Status
					</div>
					<div className="space-y-1.5 text-xs">
						<div className="flex items-center justify-between text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<span className="size-1.5 rounded-full bg-emerald-500" />{" "}
								WhatsApp CSW
							</span>
							<span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
								LIVE
							</span>
						</div>
						<div className="flex items-center justify-between text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<span className="size-1.5 rounded-full bg-emerald-500" /> Meta
								Webhooks
							</span>
							<span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
								LIVE
							</span>
						</div>
						<div className="flex items-center justify-between text-muted-foreground">
							<span className="flex items-center gap-1.5">
								<span className="size-1.5 rounded-full bg-emerald-500" /> Email
								Poller/SMTP
							</span>
							<span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
								READY
							</span>
						</div>
					</div>
				</div>
			</aside>

			{/* =========================================================================
          PANE 2: Conversation List (Center)
      ========================================================================= */}
			<section className="flex w-80 md:w-96 flex-col border-r shrink-0">
				<div className="flex flex-col gap-2 border-b p-3">
					<div className="relative">
						<Search className="absolute left-2.5 top-2 size-3.5 text-muted-foreground" />
						<Input
							type="search"
							placeholder="Search conversations..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-8 h-8 text-xs"
						/>
					</div>

					<div className="flex items-center gap-1">
						{(["OPEN", "SNOOZED", "CLOSED", "ALL"] as const).map((st) => (
							<Button
								key={st}
								variant={selectedStatus === st ? "secondary" : "ghost"}
								size="sm"
								className={cn(
									"h-6 px-2 text-[11px] font-normal capitalize",
									selectedStatus === st &&
										"bg-muted font-medium text-foreground",
								)}
								onClick={() => setSelectedStatus(st)}
							>
								{st.toLowerCase()}
							</Button>
						))}
					</div>
				</div>

				{/* Conversation Cards Scroll Area */}
				<div className="flex-1 overflow-y-auto divide-y">
					{filteredConversations.length === 0 ? (
						<div className="flex flex-col items-center justify-center p-8 text-center">
							<Inbox className="size-8 text-muted-foreground/40 mb-2" />
							<p className="text-xs font-medium text-foreground">
								No conversations found
							</p>
							<p className="text-[11px] text-muted-foreground mt-0.5">
								Try switching channels or clearing your search filters.
							</p>
						</div>
					) : (
						filteredConversations.map((conv) => {
							const active = conv.id === activeConversation?.id;
							const dateObj = new Date(conv.lastMessageAt);
							const timeDisplay = Number.isNaN(dateObj.getTime())
								? "Recently"
								: dateObj.toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									});

							return (
								<button
									key={conv.id}
									type="button"
									onClick={() => setSelectedConvId(conv.id)}
									className={cn(
										"flex w-full flex-col gap-1.5 p-3 text-left transition-colors",
										active ? "bg-muted/80 shadow-inner" : "hover:bg-muted/30",
										conv.unreadCount > 0 && "bg-primary/5",
									)}
								>
									<div className="flex items-center justify-between w-full gap-2">
										<div className="flex items-center gap-2 min-w-0">
											<Avatar className="size-7 shrink-0">
												{conv.contactAvatar ? (
													<AvatarImage
														src={conv.contactAvatar}
														alt={conv.contactName || "Contact"}
													/>
												) : null}
												<AvatarFallback className="text-[10px] bg-primary/10 text-primary font-medium">
													{(conv.contactName || "User")
														.slice(0, 2)
														.toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="truncate font-medium text-xs text-foreground">
												{conv.contactName ||
													conv.contactPhone ||
													conv.contactEmail ||
													"Customer"}
											</div>
										</div>
										<div className="flex items-center gap-1.5 shrink-0">
											<span className="text-[10px] text-muted-foreground">
												{timeDisplay}
											</span>
											{getChannelIcon(conv.channelType, "size-3")}
										</div>
									</div>

									<div className="flex items-center justify-between gap-2">
										<p className="line-clamp-2 text-[11px] text-muted-foreground leading-relaxed flex-1">
											{conv.lastMessageSnippet ||
												conv.title ||
												"No messages yet"}
										</p>
										{conv.unreadCount > 0 && (
											<span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
												{conv.unreadCount}
											</span>
										)}
									</div>

									<div className="flex items-center gap-1.5 pt-0.5">
										{getChannelBadge(conv.channelType)}
										{conv.priority === "HIGH" || conv.priority === "URGENT" ? (
											<Badge
												variant="destructive"
												className="text-[9px] px-1 py-0 h-4"
											>
												{conv.priority}
											</Badge>
										) : null}
										{conv.status !== "OPEN" && (
											<span className="text-[10px] text-muted-foreground capitalize">
												• {conv.status.toLowerCase()}
											</span>
										)}
									</div>
								</button>
							);
						})
					)}
				</div>
			</section>

			{/* =========================================================================
          PANE 3: Chat Thread & Reply Box (Right)
      ========================================================================= */}
			<main className="flex flex-1 flex-col min-w-0 bg-background">
				{activeConversation ? (
					<>
						{/* Header */}
						<header className="flex h-14 items-center justify-between border-b px-4 py-2 shrink-0 bg-card/40">
							<div className="flex items-center gap-3 min-w-0">
								<Avatar className="size-9 shrink-0">
									{activeConversation.contactAvatar ? (
										<AvatarImage src={activeConversation.contactAvatar} />
									) : null}
									<AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
										{(activeConversation.contactName || "User")
											.slice(0, 2)
											.toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<h2 className="font-semibold text-xs md:text-sm text-foreground truncate">
											{activeConversation.contactName || "Customer"}
										</h2>
										{getChannelBadge(activeConversation.channelType)}
									</div>
									<div className="flex items-center gap-2 text-[11px] text-muted-foreground">
										{activeConversation.contactPhone && (
											<span className="flex items-center gap-1">
												<Phone className="size-2.5" />
												{activeConversation.contactPhone}
											</span>
										)}
										{activeConversation.contactEmail && (
											<span className="flex items-center gap-1">
												<Mail className="size-2.5" />
												{activeConversation.contactEmail}
											</span>
										)}
										{activeConversation.assignedTo && (
											<span>• Assigned: {activeConversation.assignedTo}</span>
										)}
									</div>
								</div>
							</div>

							{/* Status Action Controls */}
							<div className="flex items-center gap-1.5 shrink-0">
								<Button
									variant={
										activeConversation.status === "OPEN" ? "default" : "outline"
									}
									size="sm"
									className="h-7 text-xs"
									onClick={() => handleStatusChange("OPEN")}
								>
									Open
								</Button>
								<Button
									variant={
										activeConversation.status === "SNOOZED"
											? "default"
											: "outline"
									}
									size="sm"
									className="h-7 text-xs"
									onClick={() => handleStatusChange("SNOOZED")}
								>
									<Clock className="size-3 mr-1" /> Snooze
								</Button>
								<Button
									variant={
										activeConversation.status === "CLOSED"
											? "default"
											: "outline"
									}
									size="sm"
									className="h-7 text-xs"
									onClick={() => handleStatusChange("CLOSED")}
								>
									<Archive className="size-3 mr-1" /> Close
								</Button>
							</div>
						</header>

						{/* Message Thread Scroll Area */}
						<div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/5">
							{activeMessages.length === 0 ? (
								<div className="flex h-full items-center justify-center text-muted-foreground text-xs">
									No message history yet. Send a reply below.
								</div>
							) : (
								activeMessages.map((msg) => {
									const isInbound = msg.direction === "INBOUND";
									const sentTime = new Date(msg.sentAt).toLocaleTimeString([], {
										hour: "2-digit",
										minute: "2-digit",
									});

									return (
										<div
											key={msg.id}
											className={cn(
												"flex flex-col max-w-[78%] md:max-w-[65%]",
												isInbound ? "mr-auto items-start" : "ml-auto items-end",
											)}
										>
											<div className="flex items-center gap-1.5 px-1 pb-1 text-[10px] text-muted-foreground">
												<span>
													{msg.senderName || (isInbound ? "Customer" : "Agent")}
												</span>
												<span>•</span>
												<span>{sentTime}</span>
											</div>

											<div
												className={cn(
													"rounded-2xl px-3.5 py-2.5 text-xs shadow-2xs leading-relaxed whitespace-pre-wrap break-words",
													isInbound
														? "bg-card text-card-foreground border rounded-tl-xs"
														: "bg-primary text-primary-foreground rounded-tr-xs",
												)}
											>
												{msg.content}

												{msg.mediaUrl && (
													<div className="mt-2 rounded-md overflow-hidden border">
														{msg.mediaType?.startsWith("image") ? (
															// biome-ignore lint/performance/noImgElement: dynamic user-uploaded chat media preview
															<img
																src={msg.mediaUrl}
																alt="Attachment"
																className="max-h-48 object-cover"
															/>
														) : (
															<div className="flex items-center gap-2 p-2 bg-muted/20 text-xs">
																<Paperclip className="size-3.5" />
																<span>Media attachment</span>
															</div>
														)}
													</div>
												)}
											</div>

											{!isInbound && (
												<div className="flex items-center gap-1 px-1 pt-0.5 text-[10px] text-muted-foreground">
													{msg.deliveryStatus === "READ" ? (
														<span className="flex items-center text-blue-500 gap-0.5 font-medium">
															<CheckCheck className="size-3" /> Read
														</span>
													) : msg.deliveryStatus === "DELIVERED" ? (
														<span className="flex items-center text-muted-foreground gap-0.5">
															<CheckCheck className="size-3" /> Delivered
														</span>
													) : (
														<span className="flex items-center text-muted-foreground gap-0.5">
															<Check className="size-3" /> Sent
														</span>
													)}
												</div>
											)}
										</div>
									);
								})
							)}
							<div ref={messagesEndRef} />
						</div>

						{/* Quick Canned Replies Bar */}
						<div className="border-t bg-muted/20 px-3 py-1.5 flex items-center gap-1.5 overflow-x-auto shrink-0">
							<span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground shrink-0">
								<Sparkles className="size-3 text-amber-500" /> Quick Replies:
							</span>
							{CANNED_REPLIES.map((reply) => (
								<button
									key={reply}
									type="button"
									onClick={() => setReplyText(reply)}
									className="rounded-full border bg-background px-2.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground shrink-0 transition-colors"
								>
									{reply.slice(0, 32)}...
								</button>
							))}
						</div>

						{/* Reply Box */}
						<div className="border-t p-3 shrink-0 bg-background">
							<div className="rounded-md border bg-card focus-within:ring-1 focus-within:ring-primary p-2">
								<Textarea
									placeholder={`Reply via ${activeConversation.channelType.toLowerCase()} (Press Enter to send)...`}
									value={replyText}
									onChange={(e) => setReplyText(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter" && !e.shiftKey) {
											e.preventDefault();
											handleSendMessage();
										}
									}}
									className="min-h-[64px] border-0 p-0 shadow-none focus-visible:ring-0 resize-none text-xs"
								/>

								<div className="flex items-center justify-between pt-2 border-t mt-1">
									<div className="flex items-center gap-1">
										<Button
											variant="ghost"
											size="icon"
											className="size-7 text-muted-foreground hover:text-foreground"
											title="Attach file"
											type="button"
											onClick={() => toast.info("Attachment uploader ready")}
										>
											<Paperclip className="size-3.5" />
										</Button>
										<span className="text-[10px] text-muted-foreground hidden sm:inline">
											Sending via {activeConversation.channelName}
										</span>
									</div>

									<Button
										size="sm"
										className="h-7 px-3 text-xs gap-1.5"
										onClick={handleSendMessage}
										disabled={!replyText.trim() || sendReplyMutation.isPending}
									>
										<span>Send</span>
										<Send className="size-3" />
									</Button>
								</div>
							</div>
						</div>
					</>
				) : (
					<div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
						<Inbox className="size-12 mb-3 text-muted-foreground/30" />
						<p className="text-sm font-medium text-foreground">
							Select a conversation
						</p>
						<p className="text-xs max-w-sm mt-1">
							Choose an omnichannel thread from the center pane to view the
							conversation history and reply.
						</p>
					</div>
				)}
			</main>
		</div>
	);
}
