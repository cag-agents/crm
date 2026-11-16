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
import { redis } from "./redis";
import { KAFKA_TOPICS, type WebhookEvent } from "./types";

// ── Kafka Producer ──────────────────────────────────────────────────────────

const kafka = new Kafka({
	clientId: "crm-gateway-worker",
	brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const producer = kafka.producer({
	createPartitioner: Partitioners.DefaultPartitioner,
});

await producer.connect();
console.log("[worker] Connected to Kafka");

// ── Event Classifier ────────────────────────────────────────────────────────

/**
 * Classify a raw webhook payload into the correct Kafka topic.
 * Each platform has different payload shapes — this is where we normalize.
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
	const data = payload as Record<string, unknown>;
	const entry = (data.entry as Array<Record<string, unknown>>)?.[0];
	const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
	const value = changes?.value as Record<string, unknown>;

	// Message status updates (sent, delivered, read)
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

	// Inbound messages
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
	const data = payload as Record<string, unknown>;
	const entry = (data.entry as Array<Record<string, unknown>>)?.[0];

	// Check for messaging (DMs from FB/IG)
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

	// Check for comments/mentions (social engagement)
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
	const data = payload as Record<string, unknown>;
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

const worker = new Worker(
	"webhook-events",
	async (job) => {
		const event = job.data as WebhookEvent;
		const { topic, key, value } = classifyEvent(event);

		// Publish to Kafka
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

		console.log(`[worker] ${event.channel} event → ${topic} (key: ${key})`);
	},
	{
		connection: redis,
		concurrency: 10, // Process 10 jobs in parallel
	},
);

worker.on("completed", (job) => {
	console.log(`[worker] Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
	console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

console.log("[worker] Webhook worker started, waiting for jobs...");
