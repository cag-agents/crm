import { db } from "@crm/db";
import type { MetaGraphApiResponse, SendMessageParams } from "./types";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Sends a message via Meta Graph API (Facebook Messenger or Instagram Direct)
 * and records it in the CRM database.
 */
export async function sendMetaMessage(params: SendMessageParams): Promise<{
	success: boolean;
	messageId?: string;
	error?: string;
}> {
	const { channelId, recipientId, text } = params;

	// Retrieve channel credentials if pageAccessToken is not directly provided
	let token = params.pageAccessToken;

	if (!token) {
		const channel = await db.channel.findUnique({
			where: { id: channelId },
		});

		if (!channel) {
			return { success: false, error: `Channel ${channelId} not found` };
		}

		const creds = channel.credentials as Record<string, unknown> | null;
		token =
			(creds?.accessToken as string) || process.env.META_PAGE_ACCESS_TOKEN;
	}

	if (!token) {
		return {
			success: false,
			error: "No Meta Page Access Token configured for this channel",
		};
	}

	try {
		const response = await fetch(`${GRAPH_API_BASE}/me/messages`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({
				recipient: { id: recipientId },
				message: { text },
				messaging_type: "RESPONSE",
			}),
		});

		const data = (await response.json()) as MetaGraphApiResponse;

		if (!response.ok || data.error) {
			const errMsg = data.error?.message || `HTTP ${response.status}`;
			console.error("[meta-sender] Graph API error:", errMsg);
			return { success: false, error: errMsg };
		}

		const externalMessageId = data.message_id;

		// Find the conversation to save the outbound message
		const conversation = await db.conversation.findFirst({
			where: {
				channelId,
				externalThreadId: recipientId,
			},
		});

		if (conversation) {
			await db.message.create({
				data: {
					conversationId: conversation.id,
					externalMessageId,
					direction: "OUTBOUND",
					senderType: "USER",
					content: text,
					contentType: "TEXT",
					deliveryStatus: "SENT",
					sentAt: new Date(),
				},
			});

			await db.conversation.update({
				where: { id: conversation.id },
				data: {
					lastMessageAt: new Date(),
					lastMessageSnippet: text.slice(0, 100),
				},
			});
		}

		return { success: true, messageId: externalMessageId };
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[meta-sender] Failed to send message:", message);
		return { success: false, error: message };
	}
}
