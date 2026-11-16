import { type Prisma, db } from "@crm/db";
import type { MetaChangeEvent } from "./types";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Handles Facebook Page Feed comment events (post comments & replies)
 */
export async function processFacebookFeedComment(
	pageId: string,
	change: MetaChangeEvent,
): Promise<void> {
	const value = change.value;
	if (value.item !== "comment" || value.verb !== "add") {
		return;
	}

	const commentId = value.comment_id;
	const postId = (value.post_id || value.parent_id) as string | undefined;
	const message = value.message || "[Empty Comment]";
	const from = value.from;
	const senderId = from?.id || "unknown_fb_user";
	const senderName = from?.name || "Facebook User";
	const createdAt = value.created_time
		? new Date(value.created_time * 1000)
		: new Date();

	// 1. Upsert Facebook Channel
	const channel = await db.channel.upsert({
		where: { id: `fb_page_${pageId}` },
		update: { status: "ACTIVE" },
		create: {
			id: `fb_page_${pageId}`,
			name: `Facebook Page (${pageId})`,
			type: "FACEBOOK",
			status: "ACTIVE",
			identifier: pageId,
		},
	});

	// 2. Find or create Contact
	const nameParts = senderName.split(" ");
	const firstName = nameParts[0] || "FB";
	const lastName = nameParts.slice(1).join(" ") || `User ${senderId.slice(-4)}`;

	let contact = await db.contact
		.findFirst({
			where: {
				firstName,
				lastName,
			},
		})
		.catch(() => null);

	if (!contact) {
		contact = await db.contact.create({
			data: {
				firstName,
				lastName,
				source: "MANUAL",
			},
		});
	}

	// 3. Conversation for this post thread
	const threadId = postId
		? `post_${postId}_user_${senderId}`
		: `comment_${commentId}`;
	const conversation = await db.conversation.upsert({
		where: {
			channelId_externalThreadId: {
				channelId: channel.id,
				externalThreadId: threadId,
			},
		},
		update: {
			lastMessageAt: createdAt,
			lastMessageSnippet: message.slice(0, 100),
			unreadCount: { increment: 1 },
			status: "OPEN",
		},
		create: {
			channelId: channel.id,
			contactId: contact.id,
			externalThreadId: threadId,
			title: `Post Comment: ${senderName} on ${postId || "Post"}`,
			status: "OPEN",
			priority: "NORMAL",
			lastMessageAt: createdAt,
			lastMessageSnippet: message.slice(0, 100),
			unreadCount: 1,
			metadata: {
				postId,
				commentId,
				type: "social_comment",
			},
		},
	});

	// 4. Save message
	await db.message.create({
		data: {
			conversationId: conversation.id,
			externalMessageId: commentId,
			direction: "INBOUND",
			senderType: "CONTACT",
			senderId: null,
			senderName,
			content: message,
			contentType: "TEXT",
			deliveryStatus: "DELIVERED",
			metadata: change as unknown as Prisma.InputJsonValue,
			sentAt: createdAt,
		},
	});

	console.log(
		`[facebook-content] Processed comment ${commentId} from ${senderName} on post ${postId}`,
	);
}

/**
 * Handles Instagram media comment events
 */
export async function processInstagramComment(
	igAccountId: string,
	change: MetaChangeEvent,
): Promise<void> {
	const value = change.value as Record<string, unknown>;
	const commentId = (value.id || value.comment_id) as string;
	const text = (value.text || value.message) as string;
	const from = value.from as { id?: string; username?: string } | undefined;
	const senderId = from?.id || "unknown_ig_user";
	const username = from?.username || `user_${senderId.slice(-4)}`;
	const media = value.media as { id?: string } | undefined;
	const mediaId = media?.id;

	if (!commentId || !text) {
		return;
	}

	// 1. Upsert Instagram Channel
	const channel = await db.channel.upsert({
		where: { id: `ig_account_${igAccountId}` },
		update: { status: "ACTIVE" },
		create: {
			id: `ig_account_${igAccountId}`,
			name: `Instagram (${igAccountId})`,
			type: "INSTAGRAM",
			status: "ACTIVE",
			identifier: igAccountId,
		},
	});

	// 2. Find or create Contact
	let contact = await db.contact
		.findFirst({
			where: {
				firstName: `@${username}`,
			},
		})
		.catch(() => null);

	if (!contact) {
		contact = await db.contact.create({
			data: {
				firstName: `@${username}`,
				lastName: `(IG)`,
				source: "MANUAL",
			},
		});
	}

	// 3. Conversation for this media comment thread
	const threadId = mediaId
		? `media_${mediaId}_user_${senderId}`
		: `comment_${commentId}`;
	const conversation = await db.conversation.upsert({
		where: {
			channelId_externalThreadId: {
				channelId: channel.id,
				externalThreadId: threadId,
			},
		},
		update: {
			lastMessageAt: new Date(),
			lastMessageSnippet: text.slice(0, 100),
			unreadCount: { increment: 1 },
			status: "OPEN",
		},
		create: {
			channelId: channel.id,
			contactId: contact.id,
			externalThreadId: threadId,
			title: `IG Comment: @${username} on media ${mediaId || ""}`.trim(),
			status: "OPEN",
			priority: "NORMAL",
			lastMessageAt: new Date(),
			lastMessageSnippet: text.slice(0, 100),
			unreadCount: 1,
			metadata: {
				mediaId,
				commentId,
				username,
				type: "social_comment",
			},
		},
	});

	// 4. Save message
	await db.message.create({
		data: {
			conversationId: conversation.id,
			externalMessageId: commentId,
			direction: "INBOUND",
			senderType: "CONTACT",
			senderId: null,
			senderName: `@${username}`,
			content: text,
			contentType: "TEXT",
			deliveryStatus: "DELIVERED",
			metadata: change as unknown as Prisma.InputJsonValue,
			sentAt: new Date(),
		},
	});

	console.log(
		`[instagram-content] Processed comment ${commentId} from @${username}`,
	);
}

/**
 * Replies to a comment on Facebook or Instagram via Meta Graph API
 */
export async function replyToComment(params: {
	commentId: string;
	message: string;
	token?: string;
}): Promise<{ success: boolean; id?: string; error?: string }> {
	const token = params.token || process.env.META_PAGE_ACCESS_TOKEN;
	if (!token) {
		return { success: false, error: "Missing META_PAGE_ACCESS_TOKEN" };
	}

	try {
		const url = `${GRAPH_API_BASE}/${params.commentId}/comments`;
		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				message: params.message,
			}),
		});

		const data = (await response.json()) as {
			id?: string;
			error?: { message: string };
		};
		if (!response.ok || data.error) {
			return {
				success: false,
				error: data.error?.message || `HTTP ${response.status}`,
			};
		}

		return { success: true, id: data.id };
	} catch (err: unknown) {
		const errorMsg = err instanceof Error ? err.message : String(err);
		return { success: false, error: errorMsg };
	}
}
