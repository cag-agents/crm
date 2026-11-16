import { db } from "@crm/db";
import { checkConversationCsw } from "./csw";
import type {
	SendMessageParams,
	SendResult,
	WhatsAppApiResponse,
} from "./types";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function sendWhatsAppMessage(
	params: SendMessageParams,
): Promise<SendResult> {
	const { channelId, recipientPhone } = params;

	let token = params.accessToken;
	let phoneNumberId = params.phoneNumberId;

	const channel = await db.channel.findUnique({
		where: { id: channelId },
	});

	if (!channel && !token) {
		return {
			success: false,
			error: `Channel ${channelId} not found`,
		};
	}

	if (channel) {
		const creds = channel.credentials as Record<string, unknown> | null;
		if (!token) {
			token =
				(creds?.accessToken as string | undefined) ||
				process.env.WHATSAPP_ACCESS_TOKEN;
		}
		if (!phoneNumberId) {
			phoneNumberId =
				(creds?.phoneNumberId as string | undefined) ||
				channel.identifier ||
				process.env.WHATSAPP_PHONE_NUMBER_ID;
		}
	} else {
		token = token || process.env.WHATSAPP_ACCESS_TOKEN;
		phoneNumberId = phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
	}

	if (!token) {
		return {
			success: false,
			error: "No WhatsApp access token configured",
		};
	}

	if (!phoneNumberId) {
		return {
			success: false,
			error: "No WhatsApp phone number ID configured",
		};
	}

	const cswStatus = await checkConversationCsw(channelId, recipientPhone);
	if (!cswStatus.isOpen) {
		return {
			success: false,
			error:
				"Customer Service Window (24h) has expired. Use a template message to contact the customer.",
		};
	}

	let messagePayload: Record<string, unknown>;
	let messageContent = params.text || "";
	let contentType: "TEXT" | "IMAGE" | "AUDIO" | "VIDEO" | "DOCUMENT" = "TEXT";

	if (params.interactiveButtons && params.interactiveButtons.length > 0) {
		messagePayload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: recipientPhone,
			type: "interactive",
			interactive: {
				type: "button",
				body: {
					text: params.text || "Please select an option:",
				},
				action: {
					buttons: params.interactiveButtons.slice(0, 3).map((btn) => ({
						type: "reply",
						reply: {
							id: btn.id,
							title: btn.title.slice(0, 20),
						},
					})),
				},
			},
		};
		messageContent = params.text || "[Interactive Buttons]";
	} else if (params.mediaType && params.mediaUrl) {
		contentType = params.mediaType.toUpperCase() as
			| "IMAGE"
			| "AUDIO"
			| "VIDEO"
			| "DOCUMENT";
		messagePayload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: recipientPhone,
			type: params.mediaType,
			[params.mediaType]: {
				link: params.mediaUrl,
				caption: params.caption,
			},
		};
		messageContent = params.caption || `[${params.mediaType}]`;
	} else {
		messagePayload = {
			messaging_product: "whatsapp",
			recipient_type: "individual",
			to: recipientPhone,
			type: "text",
			text: {
				preview_url: false,
				body: params.text || "",
			},
		};
	}

	try {
		const response = await fetch(
			`${GRAPH_API_BASE}/${phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(messagePayload),
			},
		);

		const data = (await response.json()) as WhatsAppApiResponse;

		if (!response.ok || data.error) {
			const errMsg = data.error?.message || `HTTP ${response.status}`;
			return {
				success: false,
				error: errMsg,
			};
		}

		const externalMessageId = data.messages?.[0]?.id;

		const conversation = await db.conversation.findUnique({
			where: {
				channelId_externalThreadId: {
					channelId,
					externalThreadId: recipientPhone,
				},
			},
		});

		if (conversation) {
			await db.message.create({
				data: {
					conversationId: conversation.id,
					externalMessageId,
					direction: "OUTBOUND",
					senderType: "USER",
					content: messageContent,
					contentType,
					mediaUrl: params.mediaUrl,
					mediaType: params.mediaType,
					deliveryStatus: "SENT",
					sentAt: new Date(),
				},
			});

			await db.conversation.update({
				where: { id: conversation.id },
				data: {
					lastMessageAt: new Date(),
					lastMessageSnippet: messageContent.slice(0, 100),
				},
			});
		}

		return {
			success: true,
			messageId: externalMessageId,
		};
	} catch (err: unknown) {
		const error = err instanceof Error ? err.message : String(err);
		return {
			success: false,
			error,
		};
	}
}
