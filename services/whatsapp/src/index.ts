import { Hono } from "hono";
import { type Prisma, db } from "@crm/db";
import { processWhatsAppChange } from "./receiver";
import { sendWhatsAppMessage } from "./sender";
import { sendWhatsAppTemplate } from "./templates";
import type {
	SendMessageParams,
	SendTemplateParams,
	WhatsAppWebhookPayload,
} from "./types";

export const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok", service: "whatsapp" }));

app.get("/webhook/whatsapp", (c) => {
	const mode = c.req.query("hub.mode");
	const token = c.req.query("hub.verify_token");
	const challenge = c.req.query("hub.challenge");

	const expectedToken =
		process.env.WHATSAPP_VERIFY_TOKEN || "cag_crm_whatsapp_token";

	if (mode === "subscribe" && token === expectedToken) {
		return c.text(challenge || "");
	}

	return c.text("Forbidden", 403);
});

app.post("/webhook/whatsapp", async (c) => {
	try {
		const payload = (await c.req.json()) as WhatsAppWebhookPayload;

		db.webhookEvent
			.create({
				data: {
					channelType: "WHATSAPP",
					payload: payload as unknown as Prisma.InputJsonValue,
					eventType: "messages",
					status: "RECEIVED",
				},
			})
			.catch((err) => {
				console.error("Failed to audit webhook event:", err);
			});

		if (payload.entry && Array.isArray(payload.entry)) {
			for (const entry of payload.entry) {
				if (entry.changes && Array.isArray(entry.changes)) {
					for (const change of entry.changes) {
						if (change.value) {
							await processWhatsAppChange(change.value).catch((err) => {
								console.error("WhatsApp message processing error:", err);
							});
						}
					}
				}
			}
		}

		return c.text("EVENT_RECEIVED", 200);
	} catch (err) {
		console.error("Error parsing WhatsApp webhook payload:", err);
		return c.text("Bad Request", 400);
	}
});

app.post("/api/send", async (c) => {
	try {
		const body = (await c.req.json()) as Partial<SendMessageParams>;
		const { channelId, recipientPhone } = body;

		if (!channelId || !recipientPhone) {
			return c.json(
				{ error: "channelId and recipientPhone are required" },
				400,
			);
		}

		if (!body.text && !body.mediaUrl && !body.interactiveButtons?.length) {
			return c.json(
				{
					error:
						"At least one of text, mediaUrl, or interactiveButtons is required",
				},
				400,
			);
		}

		const result = await sendWhatsAppMessage({
			channelId,
			recipientPhone,
			text: body.text,
			mediaType: body.mediaType,
			mediaUrl: body.mediaUrl,
			caption: body.caption,
			interactiveButtons: body.interactiveButtons,
			phoneNumberId: body.phoneNumberId,
			accessToken: body.accessToken,
		});

		if (!result.success) {
			return c.json({ error: result.error }, 400);
		}

		return c.json({ success: true, messageId: result.messageId });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: message }, 500);
	}
});

app.post("/api/template/send", async (c) => {
	try {
		const body = (await c.req.json()) as Partial<SendTemplateParams>;
		const { channelId, recipientPhone, templateName } = body;

		if (!channelId || !recipientPhone || !templateName) {
			return c.json(
				{ error: "channelId, recipientPhone, and templateName are required" },
				400,
			);
		}

		const result = await sendWhatsAppTemplate({
			channelId,
			recipientPhone,
			templateName,
			languageCode: body.languageCode,
			components: body.components,
			phoneNumberId: body.phoneNumberId,
			accessToken: body.accessToken,
		});

		if (!result.success) {
			return c.json({ error: result.error }, 400);
		}

		return c.json({ success: true, messageId: result.messageId });
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		return c.json({ error: message }, 500);
	}
});

const PORT = Number(process.env.WHATSAPP_SERVICE_PORT || 3004);

export default {
	port: PORT,
	fetch: app.fetch,
};
