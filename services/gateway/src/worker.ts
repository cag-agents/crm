/**
 * Webhook Worker — Consumes jobs from the BullMQ queue, classifies them,
 * and publishes normalized events to Kafka topics.
 *
 * This runs as a SEPARATE process from the gateway. The gateway's only job
 * is to receive and queue. This worker's job is to parse and route.
 *
 * Run with: bun run src/worker.ts
 */

import { Worker } from "bullmq";
import { Kafka, Partitioners } from "kafkajs";
import { OMNICHANNEL_QUEUE_NAME } from "./queue";
import { checkAndConsumeQuota, redis } from "./redis";
import {
	KAFKA_TOPICS,
	type NormalizedWebhookPayload,
	type WebhookEvent,
	type WebhookPayloadShape,
} from "./types";

// ── Kafka Producer ──────────────────────────────────────────────────────────

const kafka = new Kafka({
	clientId: "crm-gateway-worker",
	brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const producer = kafka.producer({
	createPartitioner: Partitioners.DefaultPartitioner,
});

let kafkaConnected = false;
try {
	await producer.connect();
	kafkaConnected = true;
	console.log("[worker] Connected to Kafka");
} catch (err) {
	console.warn(
		"[worker] Kafka broker not connected — proceeding in direct API-bridge mode:",
		err instanceof Error ? err.message : String(err),
	);
}

// ── Event Classifier ────────────────────────────────────────────────────────

/**
 * Normalizes any webhook event into a structured payload for the Core CRM API bridge.
 */
function extractBridgePayload(event: WebhookEvent): NormalizedWebhookPayload {
	if (event.normalized) {
		return event.normalized;
	}

	const { channel, payload } = event;
	const data = (payload || {}) as WebhookPayloadShape;

	// Direct structure check (e.g. from simulator or pre-normalized payloads)
	if (typeof data.senderHandle === "string" && typeof data.text === "string") {
		return {
			platform: (data.platform || channel || "instagram") as string,
			eventType: (data.eventType || "direct_message") as string,
			senderHandle: data.senderHandle,
			senderName: (data.senderName as string) || data.senderHandle,
			senderEmail: data.senderEmail as string | undefined,
			commentId: data.commentId as string | undefined,
			text: data.text,
			workspaceSlug: data.workspaceSlug as string | undefined,
			metadata: data.metadata as Record<string, unknown> | undefined,
		};
	}

	// Meta / Instagram Graph API webhook
	if (channel === "meta" || channel === "instagram") {
		const entry = data.entry?.[0];
		const change = entry?.changes?.[0];
		const val = change?.value;

		// Instagram Comment-to-DM trigger
		if (val?.comment_id) {
			const handle = val?.from?.username
				? `@${val.from.username}`
				: val?.sender_id
					? `@${val.sender_id}`
					: "@creator_follower";
			return {
				platform: "instagram",
				eventType: "comment_to_dm",
				senderHandle: handle,
				senderName:
					val?.from?.name || val?.from?.username || "Instagram Follower",
				commentId: val.comment_id,
				text: val.message || val.text || "Commented on post",
				metadata: { post_id: val.post_id, media_id: val.media_id },
			};
		}

		// Instagram / Facebook Direct Message
		const messaging = entry?.messaging?.[0];
		if (messaging?.message) {
			const senderId = messaging.sender?.id || "unknown";
			return {
				platform: "instagram",
				eventType: "direct_message",
				senderHandle: messaging.sender?.username
					? `@${messaging.sender.username}`
					: `@${senderId}`,
				senderName: messaging.sender?.name || `Meta User ${senderId}`,
				text: messaging.message?.text || "",
				metadata: { mid: messaging.message?.mid, pageId: entry?.id },
			};
		}
	}

	// WhatsApp Cloud API webhook
	if (
		channel === "whatsapp" ||
		data.entry?.[0]?.changes?.[0]?.value?.messages
	) {
		const entry = data.entry?.[0];
		const change = entry?.changes?.[0];
		const val = change?.value;
		const message = val?.messages?.[0];
		const contact = val?.contacts?.[0];

		const fromPhone = message?.from || "whatsapp-contact";
		return {
			platform: "whatsapp",
			eventType: "brand_inquiry",
			senderHandle: fromPhone.startsWith("+") ? fromPhone : `+${fromPhone}`,
			senderName: contact?.profile?.name || fromPhone,
			text: message?.text?.body || message?.caption || "WhatsApp message",
			metadata: { messageId: message?.id, timestamp: message?.timestamp },
		};
	}

	// Telegram Bot API webhook
	if (channel === "telegram" || data.message) {
		const msg = data.message;
		const from = msg?.from;
		const handle = from?.username
			? `@${from.username}`
			: `@user_${from?.id || "telegram"}`;
		const fullName =
			[from?.first_name, from?.last_name].filter(Boolean).join(" ") || handle;

		return {
			platform: "telegram",
			eventType: "direct_message",
			senderHandle: handle,
			senderName: fullName,
			text: msg?.text || "Telegram message",
			metadata: { chatId: msg?.chat?.id, messageId: msg?.message_id },
		};
	}

	return {
		platform: channel,
		eventType: "inbound_event",
		senderHandle: "@creator_hq",
		senderName: "Inbound Contact",
		text: typeof payload === "string" ? payload : JSON.stringify(payload),
	};
}

/**
 * Classify a raw webhook payload into the correct Kafka topic.
 */
function classifyEvent(event: WebhookEvent): {
	topic: string;
	key: string;
	value: Record<string, unknown>;
} {
	const { channel, payload } = event;

	switch (channel) {
		case "whatsapp":
			return classifyWhatsApp(payload);
		case "meta":
		case "instagram":
			return classifyMeta(payload);
		case "telegram":
			return classifyTelegram(payload);
		default:
			return {
				topic: KAFKA_TOPICS.UNCLASSIFIED,
				key: channel,
				value: { channel, payload, receivedAt: event.receivedAt },
			};
	}
}

function classifyWhatsApp(payload: unknown): {
	topic: string;
	key: string;
	value: Record<string, unknown>;
} {
	const data = (payload || {}) as Record<string, unknown>;
	const entry = (data.entry as Array<Record<string, unknown>>)?.[0];
	const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
	const value = changes?.value as Record<string, unknown>;

	if (value?.statuses) {
		return {
			topic: KAFKA_TOPICS.MESSAGE_STATUS,
			key: `whatsapp:${(value.statuses as Array<Record<string, unknown>>)?.[0]?.recipient_id}`,
			value: {
				channel: "whatsapp",
				type: "status",
				...value,
			},
		};
	}

	if (value?.messages) {
		const message = (value.messages as Array<Record<string, unknown>>)?.[0];
		return {
			topic: KAFKA_TOPICS.MESSAGE_INBOUND,
			key: `whatsapp:${message?.from}`,
			value: {
				channel: "whatsapp",
				type: "message",
				from: message?.from,
				messageId: message?.id,
				messageType: message?.type,
				text: (message?.text as Record<string, unknown>)?.body,
				timestamp: message?.timestamp,
				metadata: value.metadata,
			},
		};
	}

	return {
		topic: KAFKA_TOPICS.UNCLASSIFIED,
		key: "whatsapp:unknown",
		value: { channel: "whatsapp", payload: data },
	};
}

function classifyMeta(payload: unknown): {
	topic: string;
	key: string;
	value: Record<string, unknown>;
} {
	const data = (payload || {}) as Record<string, unknown>;
	const entry = (data.entry as Array<Record<string, unknown>>)?.[0];

	const messaging = (entry?.messaging as Array<Record<string, unknown>>)?.[0];
	if (messaging?.message) {
		return {
			topic: KAFKA_TOPICS.MESSAGE_INBOUND,
			key: `meta:${messaging.sender && (messaging.sender as Record<string, unknown>).id}`,
			value: {
				channel: "meta",
				type: "message",
				from: (messaging.sender as Record<string, unknown>)?.id,
				messageId: (messaging.message as Record<string, unknown>)?.mid,
				text: (messaging.message as Record<string, unknown>)?.text,
				pageId: entry?.id,
			},
		};
	}

	const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
	if (
		changes?.field === "feed" ||
		changes?.field === "comments" ||
		changes?.field === "mentions"
	) {
		return {
			topic: KAFKA_TOPICS.SOCIAL_ENGAGEMENT,
			key: `meta:${entry?.id}`,
			value: {
				channel: "meta",
				type: changes.field as string,
				pageId: entry?.id,
				commentId: (changes.value as Record<string, unknown>)?.comment_id,
				senderId: (changes.value as Record<string, unknown>)?.sender_id,
				message: (changes.value as Record<string, unknown>)?.message,
			},
		};
	}

	return {
		topic: KAFKA_TOPICS.UNCLASSIFIED,
		key: "meta:unknown",
		value: { channel: "meta", payload: data },
	};
}

function classifyTelegram(payload: unknown): {
	topic: string;
	key: string;
	value: Record<string, unknown>;
} {
	const data = (payload || {}) as Record<string, unknown>;
	const message = data.message as Record<string, unknown> | undefined;

	if (message) {
		const from = message.from as Record<string, unknown>;
		const chat = message.chat as Record<string, unknown>;
		return {
			topic: KAFKA_TOPICS.MESSAGE_INBOUND,
			key: `telegram:${chat?.id}`,
			value: {
				channel: "telegram",
				type: "message",
				from: from?.id,
				username: from?.username,
				chatId: chat?.id,
				chatType: chat?.type,
				messageId: message.message_id,
				text: message.text,
				date: message.date,
			},
		};
	}

	return {
		topic: KAFKA_TOPICS.UNCLASSIFIED,
		key: "telegram:unknown",
		value: { channel: "telegram", payload: data },
	};
}

// ── BullMQ Worker ───────────────────────────────────────────────────────────

const API_URL = process.env.API_URL || "http://localhost:3001";

export const worker = new Worker(
	OMNICHANNEL_QUEUE_NAME,
	async (job) => {
		const event = job.data as WebhookEvent;
		const bridgePayload = extractBridgePayload(event);

		// 1. Log stage 1: Dequeued Job
		console.log(
			`[WORKER] Dequeued Job #${job.id} (${bridgePayload.platform} - ${bridgePayload.eventType})`,
		);

		// 2. Check & consume Redis token bucket rate limit
		const platformQuota =
			bridgePayload.platform === "whatsapp" ||
			bridgePayload.platform === "telegram"
				? bridgePayload.platform
				: "instagram";
		await checkAndConsumeQuota(platformQuota, bridgePayload.senderHandle);

		// 3. Publish to Kafka if connected
		if (kafkaConnected) {
			try {
				const { topic, key, value } = classifyEvent(event);
				await producer.send({
					topic,
					messages: [
						{
							key,
							value: JSON.stringify({
								...value,
								_meta: {
									jobId: job.id,
									receivedAt: event.receivedAt,
									processedAt: new Date().toISOString(),
								},
							}),
						},
					],
				});
			} catch (err) {
				console.warn(
					"[worker] Kafka send error:",
					err instanceof Error ? err.message : String(err),
				);
			}
		}

		// 4. Log compliance if Meta Instagram comment
		if (bridgePayload.platform === "instagram" && bridgePayload.commentId) {
			console.log(
				`[COMPLIANCE] Meta CSW 24h Window opened via /v19.0/${bridgePayload.commentId}/messages`,
			);
		}

		// 5. Forward to Core CRM API Ingest Controller
		try {
			const res = await fetch(`${API_URL}/api/webhooks/ingest`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(bridgePayload),
			});

			if (!res.ok) {
				// Fallback to alternate route if not prefixed
				const fallbackRes = await fetch(`${API_URL}/webhooks/ingest`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(bridgePayload),
				});
				if (!fallbackRes.ok) {
					throw new Error(
						`API bridge error: HTTP ${res.status} (${await res.text()})`,
					);
				}
				const data = (await fallbackRes.json()) as {
					contactId: string;
					activityId: string;
				};
				console.log(
					`[BRIDGE] Synced to Core CRM API -> Contact ID: ${data.contactId}, Activity ID: ${data.activityId}`,
				);
				return data;
			}

			const data = (await res.json()) as {
				contactId: string;
				activityId: string;
			};
			console.log(
				`[BRIDGE] Synced to Core CRM API -> Contact ID: ${data.contactId}, Activity ID: ${data.activityId}`,
			);
			return data;
		} catch (bridgeErr) {
			console.error(
				`[worker] API bridge sync failed:`,
				bridgeErr instanceof Error ? bridgeErr.message : String(bridgeErr),
			);
			throw bridgeErr;
		}
	},
	{
		connection: redis,
		concurrency: 10,
	},
);

worker.on("completed", (job) => {
	console.log(`[worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
	console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

console.log(
	`[worker] Webhook worker started on queue '${OMNICHANNEL_QUEUE_NAME}', waiting for jobs...`,
);
