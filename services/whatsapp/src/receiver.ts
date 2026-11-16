import { type Prisma, db } from "@crm/db";
import { calculateCswExpiry } from "./csw";
import type {
	WhatsAppChangeValue,
	WhatsAppContactProfile,
	WhatsAppInboundMessage,
	WhatsAppStatusUpdate,
} from "./types";

export async function processWhatsAppMessage(
	phoneNumberId: string,
	message: WhatsAppInboundMessage,
	contactProfile?: WhatsAppContactProfile,
): Promise<void> {
	const fromPhone = message.from;
	let content = "";
	let contentType:
		| "TEXT"
		| "IMAGE"
		| "AUDIO"
		| "VIDEO"
		| "DOCUMENT"
		| "LOCATION" = "TEXT";
	let mediaUrl: string | undefined;
	let mediaType: string | undefined;

	switch (message.type) {
		case "text":
			content = message.text?.body || "";
			contentType = "TEXT";
			break;
		case "image":
			content = message.image?.caption || "[Image]";
			contentType = "IMAGE";
			mediaType = message.image?.mime_type;
			break;
		case "audio":
			content = "[Audio]";
			contentType = "AUDIO";
			mediaType = message.audio?.mime_type;
			break;
		case "video":
			content = message.video?.caption || "[Video]";
			contentType = "VIDEO";
			mediaType = message.video?.mime_type;
			break;
		case "document":
			content =
				message.document?.filename || message.document?.caption || "[Document]";
			contentType = "DOCUMENT";
			mediaType = message.document?.mime_type;
			break;
		case "location":
			content = message.location?.name
				? `[Location] ${message.location.name}: ${message.location.address || ""}`
				: `[Location] (${message.location?.latitude}, ${message.location?.longitude})`;
			contentType = "LOCATION";
			break;
		case "interactive":
			if (message.interactive?.type === "button_reply") {
				content = message.interactive.button_reply?.title || "[Button Reply]";
			} else if (message.interactive?.type === "list_reply") {
				content = message.interactive.list_reply?.title || "[List Reply]";
			} else {
				content = "[Interactive Message]";
			}
			contentType = "TEXT";
			break;
		case "button":
			content = message.button?.text || "[Button Reply]";
			contentType = "TEXT";
			break;
		default:
			content = "[Unsupported message type]";
			contentType = "TEXT";
			break;
	}

	const sentAt = message.timestamp
		? new Date(Number(message.timestamp) * 1000)
		: new Date();
	const cswExpiresAt = calculateCswExpiry(sentAt);

	const channel = await db.channel.upsert({
		where: { id: `wa_${phoneNumberId}` },
		update: {
			status: "ACTIVE",
			identifier: phoneNumberId,
		},
		create: {
			id: `wa_${phoneNumberId}`,
			name: `WhatsApp (${phoneNumberId})`,
			type: "WHATSAPP",
			status: "ACTIVE",
			identifier: phoneNumberId,
		},
	});

	let contact = await db.contact.findFirst({
		where: {
			phone: fromPhone,
		},
	});

	if (!contact) {
		const rawProfileName =
			contactProfile?.profile?.name || `WhatsApp User ${fromPhone.slice(-4)}`;
		const parts = rawProfileName.trim().split(/\s+/);
		const firstName = parts[0] || "WhatsApp";
		const lastName = parts.slice(1).join(" ") || fromPhone.slice(-4);

		contact = await db.contact.create({
			data: {
				firstName,
				lastName,
				phone: fromPhone,
				source: "MANUAL",
			},
		});
	}

	const existingConversation = await db.conversation.findUnique({
		where: {
			channelId_externalThreadId: {
				channelId: channel.id,
				externalThreadId: fromPhone,
			},
		},
	});

	const existingMetadata =
		(existingConversation?.metadata as Record<string, unknown> | null) || {};

	const updatedMetadata: Record<string, unknown> = {
		...existingMetadata,
		cswExpiresAt: cswExpiresAt.toISOString(),
		customerPhone: fromPhone,
	};

	const conversation = await db.conversation.upsert({
		where: {
			channelId_externalThreadId: {
				channelId: channel.id,
				externalThreadId: fromPhone,
			},
		},
		update: {
			lastMessageAt: sentAt,
			lastMessageSnippet: content.slice(0, 100),
			unreadCount: { increment: 1 },
			status: "OPEN",
			metadata: updatedMetadata as unknown as Prisma.InputJsonValue,
		},
		create: {
			channelId: channel.id,
			contactId: contact.id,
			externalThreadId: fromPhone,
			title: `${contact.firstName} ${contact.lastName || ""}`.trim(),
			status: "OPEN",
			priority: "NORMAL",
			lastMessageAt: sentAt,
			lastMessageSnippet: content.slice(0, 100),
			unreadCount: 1,
			metadata: updatedMetadata as unknown as Prisma.InputJsonValue,
		},
	});

	await db.message.create({
		data: {
			conversationId: conversation.id,
			externalMessageId: message.id,
			direction: "INBOUND",
			senderType: "CONTACT",
			senderId: fromPhone,
			senderName: contactProfile?.profile?.name || contact.firstName,
			content,
			contentType,
			mediaUrl,
			mediaType,
			deliveryStatus: "DELIVERED",
			metadata: message as unknown as Prisma.InputJsonValue,
			sentAt,
		},
	});
}

export async function processWhatsAppStatus(
	statusUpdate: WhatsAppStatusUpdate,
): Promise<void> {
	let mappedStatus: "SENT" | "DELIVERED" | "READ" | "FAILED";

	switch (statusUpdate.status) {
		case "sent":
			mappedStatus = "SENT";
			break;
		case "delivered":
			mappedStatus = "DELIVERED";
			break;
		case "read":
			mappedStatus = "READ";
			break;
		case "failed":
			mappedStatus = "FAILED";
			break;
		default:
			return;
	}

	const existing = await db.message.findFirst({
		where: {
			externalMessageId: statusUpdate.id,
		},
	});

	if (!existing) {
		return;
	}

	await db.message.update({
		where: { id: existing.id },
		data: {
			deliveryStatus: mappedStatus,
			errorMessage:
				statusUpdate.errors?.[0]?.message || statusUpdate.errors?.[0]?.title,
		},
	});
}

export async function processWhatsAppChange(
	value: WhatsAppChangeValue,
): Promise<void> {
	const phoneNumberId = value.metadata.phone_number_id;

	if (value.messages && Array.isArray(value.messages)) {
		for (const message of value.messages) {
			const profile = value.contacts?.find((c) => c.wa_id === message.from);
			await processWhatsAppMessage(phoneNumberId, message, profile);
		}
	}

	if (value.statuses && Array.isArray(value.statuses)) {
		for (const status of value.statuses) {
			await processWhatsAppStatus(status);
		}
	}
}
