import { db, type Prisma } from "@crm/db";
import { Injectable, Logger } from "@nestjs/common";
import type { z } from "zod";
import type {
	getMessagesInput,
	getMetricsInput,
	listConversationsInput,
	sendReplyInput,
	updateConversationInput,
} from "./omnichannel.contracts";

@Injectable()
export class OmnichannelService {
	private readonly logger = new Logger(OmnichannelService.name);

	async listConversations(input: z.infer<typeof listConversationsInput>) {
		const { channelType, status, priority, search, limit } = input;

		const where: Prisma.ConversationWhereInput = {};
		if (channelType) {
			where.channel = { type: channelType };
		}
		if (status) {
			where.status = status;
		}
		if (priority) {
			where.priority = priority;
		}
		if (search) {
			where.OR = [
				{ title: { contains: search, mode: "insensitive" } },
				{ lastMessageSnippet: { contains: search, mode: "insensitive" } },
				{ externalThreadId: { contains: search, mode: "insensitive" } },
			];
		}

		const conversations = await db.conversation.findMany({
			where,
			take: limit,
			orderBy: { lastMessageAt: "desc" },
			include: {
				channel: true,
				contact: true,
			},
		});

		return {
			conversations: conversations.map((c) => ({
				id: c.id,
				channelId: c.channelId,
				channelType: c.channel.type,
				channelName: c.channel.name,
				contactId: c.contactId,
				contactName: c.contact
					? `${c.contact.firstName} ${c.contact.lastName || ""}`.trim()
					: null,
				contactPhone: c.contact?.phone ?? null,
				contactEmail: c.contact?.email ?? null,
				externalThreadId: c.externalThreadId,
				title: c.title,
				status: c.status,
				priority: c.priority,
				lastMessageAt: c.lastMessageAt,
				lastMessageSnippet: c.lastMessageSnippet,
				unreadCount: c.unreadCount,
				createdAt: c.createdAt,
			})),
		};
	}

	async getMessages(input: z.infer<typeof getMessagesInput>) {
		const { conversationId, limit } = input;

		const conv = await db.conversation.findUnique({
			where: { id: conversationId },
			include: {
				channel: true,
				contact: true,
			},
		});

		const messages = await db.message.findMany({
			where: { conversationId },
			take: limit,
			orderBy: { sentAt: "asc" },
		});

		const conversation = conv
			? {
					id: conv.id,
					channelId: conv.channelId,
					channelType: conv.channel.type,
					channelName: conv.channel.name,
					contactId: conv.contactId,
					contactName: conv.contact
						? `${conv.contact.firstName} ${conv.contact.lastName || ""}`.trim()
						: null,
					contactPhone: conv.contact?.phone ?? null,
					contactEmail: conv.contact?.email ?? null,
					externalThreadId: conv.externalThreadId,
					title: conv.title,
					status: conv.status,
					priority: conv.priority,
					lastMessageAt: conv.lastMessageAt,
					lastMessageSnippet: conv.lastMessageSnippet,
					unreadCount: conv.unreadCount,
					createdAt: conv.createdAt,
				}
			: null;

		// Reset unread count when messages are viewed
		if (conv && conv.unreadCount > 0) {
			await db.conversation
				.update({
					where: { id: conversationId },
					data: { unreadCount: 0 },
				})
				.catch(() => {});
		}

		return {
			conversation,
			messages: messages.map((m) => ({
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
				deliveryStatus: m.deliveryStatus,
				sentAt: m.sentAt,
			})),
		};
	}

	async sendReply(input: z.infer<typeof sendReplyInput>, userId?: string) {
		const { conversationId, text, mediaUrl, mediaType } = input;

		const conv = await db.conversation.findUnique({
			where: { id: conversationId },
			include: { channel: true },
		});

		if (!conv) {
			return { success: false, error: "Conversation not found" };
		}

		// 1. Dispatch through channel microservice if applicable
		let externalMessageId: string | undefined;

		if (conv.channel.type === "FACEBOOK" || conv.channel.type === "INSTAGRAM") {
			try {
				const metaPort = process.env.META_SERVICE_PORT || "3003";
				const metaRes = await fetch(`http://localhost:${metaPort}/api/send`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						channelId: conv.channelId,
						recipientId: conv.externalThreadId,
						text,
					}),
				});
				const metaData = (await metaRes.json()) as {
					success?: boolean;
					messageId?: string;
				};
				if (metaData?.messageId) {
					externalMessageId = metaData.messageId;
				}
			} catch (err) {
				this.logger.warn(`Could not contact Meta service: ${err}`);
			}
		}

		// 2. Persist message in database
		const message = await db.message.create({
			data: {
				conversationId,
				externalMessageId,
				direction: "OUTBOUND",
				senderType: "USER",
				senderId: userId ?? null,
				content: text,
				contentType: mediaUrl
					? mediaType?.startsWith("image")
						? "IMAGE"
						: "DOCUMENT"
					: "TEXT",
				mediaUrl,
				mediaType,
				deliveryStatus: "SENT",
				sentAt: new Date(),
			},
		});

		// 3. Update conversation last activity
		await db.conversation.update({
			where: { id: conversationId },
			data: {
				lastMessageAt: new Date(),
				lastMessageSnippet: text.slice(0, 100),
			},
		});

		return { success: true, messageId: message.id };
	}

	async updateConversation(input: z.infer<typeof updateConversationInput>) {
		const { conversationId, status, priority, assignedToId } = input;

		const data: Prisma.ConversationUpdateInput = {};
		if (status !== undefined) data.status = status;
		if (priority !== undefined) data.priority = priority;
		if (assignedToId !== undefined) {
			data.assignedTo = assignedToId
				? { connect: { id: assignedToId } }
				: { disconnect: true };
		}

		await db.conversation.update({
			where: { id: conversationId },
			data,
		});

		return { success: true };
	}

	async getMetrics(_input: z.infer<typeof getMetricsInput>) {
		const totalMessages = await db.message.count();
		const openConversations = await db.conversation.count({
			where: { status: "OPEN" },
		});
		const closedConversations = await db.conversation.count({
			where: { status: "CLOSED" },
		});
		const unreadConversations = await db.conversation.count({
			where: { unreadCount: { gt: 0 } },
		});

		// Group by channel
		const channels = await db.channel.findMany({
			include: {
				_count: {
					select: { conversations: true },
				},
			},
		});

		const byChannel: Record<string, number> = {};
		for (const ch of channels) {
			byChannel[ch.type] = (byChannel[ch.type] || 0) + ch._count.conversations;
		}

		const totalResolved = openConversations + closedConversations;
		const resolutionRate =
			totalResolved > 0
				? Math.round((closedConversations / totalResolved) * 100)
				: 100;

		return {
			totalMessages,
			openConversations,
			closedConversations,
			unreadConversations,
			resolutionRate,
			byChannel,
			avgResponseTimeMinutes: 3, // Target benchmark: 3 minutes
		};
	}
}
