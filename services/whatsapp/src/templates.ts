import { db } from "@crm/db";
import type {
	SendResult,
	SendTemplateParams,
	WhatsAppApiResponse,
} from "./types";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function sendWhatsAppTemplate(
	params: SendTemplateParams,
): Promise<SendResult> {
	const { channelId, recipientPhone, templateName } = params;

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

	const payload = {
		messaging_product: "whatsapp",
		recipient_type: "individual",
		to: recipientPhone,
		type: "template",
		template: {
			name: templateName,
			language: {
				code: params.languageCode || "en_US",
			},
			components: params.components || [],
		},
	};

	try {
		const response = await fetch(
			`${GRAPH_API_BASE}/${phoneNumberId}/messages`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(payload),
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
		const snippet = `Template: ${templateName}`;

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
					content: snippet,
					contentType: "TEMPLATE",
					deliveryStatus: "SENT",
					sentAt: new Date(),
				},
			});

			await db.conversation.update({
				where: { id: conversation.id },
				data: {
					lastMessageAt: new Date(),
					lastMessageSnippet: snippet.slice(0, 100),
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
