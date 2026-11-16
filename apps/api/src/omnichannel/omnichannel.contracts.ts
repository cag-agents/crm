import { z } from "zod";

export const channelTypeEnum = z.enum([
	"WHATSAPP",
	"TELEGRAM",
	"FACEBOOK",
	"INSTAGRAM",
	"EMAIL",
	"SMS",
	"LINKEDIN",
	"GENERIC",
]);

export const conversationStatusEnum = z.enum([
	"OPEN",
	"CLOSED",
	"SNOOZED",
	"PENDING",
]);
export const conversationPriorityEnum = z.enum([
	"LOW",
	"NORMAL",
	"HIGH",
	"URGENT",
]);
export const messageDirectionEnum = z.enum(["INBOUND", "OUTBOUND"]);

export const listConversationsInput = z.object({
	channelType: channelTypeEnum.optional(),
	status: conversationStatusEnum.optional(),
	priority: conversationPriorityEnum.optional(),
	search: z.string().optional(),
	limit: z.number().min(1).max(100).default(50),
	cursor: z.string().optional(),
});

export const conversationSummarySchema = z.object({
	id: z.string(),
	channelId: z.string(),
	channelType: channelTypeEnum,
	channelName: z.string(),
	contactId: z.string().nullable().optional(),
	contactName: z.string().nullable().optional(),
	contactPhone: z.string().nullable().optional(),
	contactEmail: z.string().nullable().optional(),
	externalThreadId: z.string(),
	title: z.string().nullable().optional(),
	status: conversationStatusEnum,
	priority: conversationPriorityEnum,
	lastMessageAt: z.date(),
	lastMessageSnippet: z.string().nullable().optional(),
	unreadCount: z.number(),
	createdAt: z.date(),
});

export const listConversationsOutput = z.object({
	conversations: z.array(conversationSummarySchema),
	nextCursor: z.string().optional(),
});

export const getMessagesInput = z.object({
	conversationId: z.string(),
	limit: z.number().min(1).max(200).default(50),
});

export const messageItemSchema = z.object({
	id: z.string(),
	conversationId: z.string(),
	externalMessageId: z.string().nullable().optional(),
	direction: messageDirectionEnum,
	senderType: z.string(),
	senderId: z.string().nullable().optional(),
	senderName: z.string().nullable().optional(),
	content: z.string(),
	contentType: z.string(),
	mediaUrl: z.string().nullable().optional(),
	mediaType: z.string().nullable().optional(),
	deliveryStatus: z.string(),
	sentAt: z.date(),
});

export const getMessagesOutput = z.object({
	conversation: conversationSummarySchema.nullable(),
	messages: z.array(messageItemSchema),
});

export const sendReplyInput = z.object({
	conversationId: z.string(),
	text: z.string().min(1, "Message text cannot be empty"),
	mediaUrl: z.string().optional(),
	mediaType: z.string().optional(),
});

export const sendReplyOutput = z.object({
	success: z.boolean(),
	messageId: z.string().optional(),
	error: z.string().optional(),
});

export const updateConversationInput = z.object({
	conversationId: z.string(),
	status: conversationStatusEnum.optional(),
	priority: conversationPriorityEnum.optional(),
	assignedToId: z.string().nullable().optional(),
});

export const updateConversationOutput = z.object({
	success: z.boolean(),
});

export const getMetricsInput = z.object({
	timeframe: z.enum(["24h", "7d", "30d"]).default("7d"),
});

export const getMetricsOutput = z.object({
	totalMessages: z.number(),
	openConversations: z.number(),
	closedConversations: z.number(),
	unreadConversations: z.number(),
	resolutionRate: z.number(),
	byChannel: z.record(z.string(), z.number()),
	avgResponseTimeMinutes: z.number(),
});
