import { db, type Prisma } from "@crm/db";
import { parseRfc822Email } from "./parser";
import type { InboundEmailResult, ParsedEmail } from "./types";

/**
 * Strips HTML tags to produce a clean plain-text snippet or fallback content
 */
function stripHtml(html: string): string {
	return html
		.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
		.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
		.replace(/<[^>]+>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

/**
 * Normalizes email address for lookups
 */
function normalizeEmail(email: string): string {
	return email.trim().toLowerCase();
}

/**
 * Ingests an inbound parsed or raw RFC 822 email into the CRM database:
 * 1. Finds or creates the EMAIL channel
 * 2. Finds or creates the Contact by email address
 * 3. Resolves conversation thread via In-Reply-To, References, or Message-ID
 * 4. Creates inbound Message in db.message
 * 5. Updates conversation status, snippet, and lastMessageAt
 */
export async function ingestInboundEmail(
	input: string | ParsedEmail,
	channelId?: string,
): Promise<InboundEmailResult> {
	try {
		const email = typeof input === "string" ? parseRfc822Email(input) : input;
		const fromAddress = normalizeEmail(email.from.address);

		if (!fromAddress) {
			return { success: false, error: "Sender email address is missing" };
		}

		// 1. Find or create the Channel (type: EMAIL)
		let channel: { id: string };
		if (channelId) {
			const existing = await db.channel.findUnique({
				where: { id: channelId },
			});
			if (existing) {
				channel = existing;
			} else {
				channel = await db.channel.create({
					data: {
						id: channelId,
						name: "Email Support",
						type: "EMAIL",
						status: "ACTIVE",
						identifier: email.to[0]?.address || "support@cag-crm.internal",
					},
				});
			}
		} else {
			let existingChannel = await db.channel.findFirst({
				where: { type: "EMAIL", status: "ACTIVE" },
			});

			if (!existingChannel) {
				existingChannel = await db.channel.create({
					data: {
						name: "Default Email Channel",
						type: "EMAIL",
						status: "ACTIVE",
						identifier: email.to[0]?.address || "support@cag-crm.internal",
					},
				});
			}
			channel = existingChannel;
		}

		// 2. Find or create Contact by email address
		let contact = await db.contact.findFirst({
			where: {
				email: fromAddress,
				archivedAt: null,
			},
		});

		if (!contact) {
			// Derive first and last name from name or email address
			let firstName = "Email";
			let lastName = fromAddress.split("@")[0] || "User";

			if (email.from.name) {
				const nameParts = email.from.name.trim().split(/\s+/);
				firstName = nameParts[0] || "Email";
				lastName = nameParts.slice(1).join(" ") || "User";
			}

			contact = await db.contact.create({
				data: {
					firstName,
					lastName,
					email: fromAddress,
					source: "MANUAL",
				},
			});
		}

		// 3. Thread resolution: check if In-Reply-To or References match an existing message
		let threadKey = email.messageId;
		let existingConversationId: string | undefined;

		const candidateReferences = [
			email.inReplyTo,
			...(email.references || []),
		].filter(Boolean) as string[];

		if (candidateReferences.length > 0) {
			const priorMessage = await db.message.findFirst({
				where: {
					externalMessageId: { in: candidateReferences },
				},
				include: { conversation: true },
			});

			if (priorMessage?.conversation) {
				existingConversationId = priorMessage.conversation.id;
				threadKey = priorMessage.conversation.externalThreadId;
			}
		}

		// Determine message text body
		const bodyContent =
			email.text?.trim() ||
			(email.html ? stripHtml(email.html) : "") ||
			"(No email body)";

		const snippet = bodyContent.slice(0, 120);
		const sentAt = email.date || new Date();

		const conversationMetadata = {
			subject: email.subject,
			from: {
				name: email.from.name ?? null,
				address: email.from.address,
			},
			to: email.to.map((t) => ({ name: t.name ?? null, address: t.address })),
		} as unknown as Prisma.InputJsonValue;

		// 4. Upsert or update Conversation
		let conversation: { id: string };

		if (existingConversationId) {
			conversation = await db.conversation.update({
				where: { id: existingConversationId },
				data: {
					lastMessageAt: sentAt,
					lastMessageSnippet: snippet,
					unreadCount: { increment: 1 },
					status: "OPEN",
				},
			});
		} else {
			conversation = await db.conversation.upsert({
				where: {
					channelId_externalThreadId: {
						channelId: channel.id,
						externalThreadId: threadKey,
					},
				},
				update: {
					lastMessageAt: sentAt,
					lastMessageSnippet: snippet,
					unreadCount: { increment: 1 },
					status: "OPEN",
				},
				create: {
					channelId: channel.id,
					contactId: contact.id,
					externalThreadId: threadKey,
					title: email.subject || `Email Thread from ${contact.firstName}`,
					status: "OPEN",
					priority: "NORMAL",
					lastMessageAt: sentAt,
					lastMessageSnippet: snippet,
					unreadCount: 1,
					metadata: conversationMetadata,
				},
			});
		}

		const messageMetadata = {
			subject: email.subject,
			inReplyTo: email.inReplyTo ?? null,
			references: email.references,
			html: email.html ?? null,
			attachmentsCount: email.attachments.length,
			attachments: email.attachments.map((a) => ({
				filename: a.filename,
				contentType: a.contentType,
				size: a.size,
			})),
		} as unknown as Prisma.InputJsonValue;

		// 5. Save incoming Message
		const message = await db.message.create({
			data: {
				conversationId: conversation.id,
				externalMessageId: email.messageId,
				direction: "INBOUND",
				senderType: "CONTACT",
				senderId: contact.id,
				senderName: email.from.name || fromAddress,
				content: bodyContent,
				contentType: "TEXT",
				deliveryStatus: "DELIVERED",
				sentAt,
				metadata: messageMetadata,
			},
		});

		return {
			success: true,
			conversationId: conversation.id,
			messageId: message.id,
			contactId: contact.id,
			channelId: channel.id,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.error("[email-receiver] Error ingesting inbound email:", message);
		return { success: false, error: message };
	}
}
