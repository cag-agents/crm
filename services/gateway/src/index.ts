/**
 * Edge API Gateway — The 15-Second Decoupler
 *
 * This is the critical entry point for ALL inbound webhooks from third-party
 * platforms (Meta, WhatsApp, Telegram, etc.).
 *
 * Architecture:
 * 1. Receive webhook → validate signature → return 200 OK in < 100ms
 * 2. Push raw payload into Redis (BullMQ) job queue
 * 3. Kafka consumer workers process jobs asynchronously
 *
 * Why this exists:
 * - Meta enforces a 15-second webhook timeout. If we don't return 200 OK fast,
 *   Meta retries and sends duplicate messages.
 * - WhatsApp, Telegram, etc. have similar constraints.
 * - We NEVER process a webhook synchronously. Always queue first, respond, then process.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { OMNICHANNEL_QUEUE_NAME, pushWebhookJob } from "./queue";
import { checkAndConsumeQuota } from "./redis";
import { verifyMetaSignature, verifyTelegramSecret } from "./security";
import type { ChannelType, WebhookEvent, WebhookPayloadShape } from "./types";

const app = new Hono();

// ── Middleware ───────────────────────────────────────────────────────────────

app.use("*", logger());
app.use("*", cors());

// ── Root & Health Check ────────────────────────────────────────────────────────

app.get("/", (c) => {
	const accept = c.req.header("accept") || "";
	if (accept.includes("text/html")) {
		return c.html(`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<title>Edge API Gateway — CAG CRM</title>
				<style>
					body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0b0f19; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
					.card { background: #131b2e; border: 1px solid #1e293b; padding: 2.5rem; border-radius: 12px; max-width: 480px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
					h1 { margin-top: 0; font-size: 1.5rem; color: #38bdf8; }
					p { color: #94a3b8; font-size: 0.95rem; line-height: 1.5; }
					.badge { display: inline-block; background: #0284c7; color: white; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 600; margin-bottom: 1rem; }
					a.btn { display: inline-block; background: #0284c7; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95rem; margin-top: 1.25rem; transition: background 0.2s; }
					a.btn:hover { background: #0369a1; }
				</style>
			</head>
			<body>
				<div class="card">
					<div class="badge">Port 3002 • Edge API Gateway</div>
					<h1>Omnichannel Webhook Gateway</h1>
					<p>This service receives and decouples webhooks (Instagram, WhatsApp, Telegram) in &lt;50ms before queueing them to Redis.</p>
					<p>To browse and interact with the <strong>Creator CRM Web UI</strong>, visit port 3000:</p>
					<a href="http://localhost:3000" class="btn">Open Creator CRM UI (localhost:3000) &rarr;</a>
				</div>
			</body>
			</html>
		`);
	}

	return c.json({
		status: "ok",
		service: "edge-api-gateway",
		port: 3002,
		crmAppUrl: "http://localhost:3000",
		endpoints: {
			health: "/health",
			metaWebhooks: "/webhooks/meta",
			telegramWebhooks: "/webhooks/telegram",
		},
		timestamp: new Date().toISOString(),
	});
});

app.get("/health", (c) => {
	return c.json({
		status: "ok",
		service: "gateway",
		timestamp: new Date().toISOString(),
	});
});

// Helper to determine platform & account from Meta Graph webhook payload
function parseMetaContext(payload: WebhookPayloadShape | null | undefined): {
	platform: "instagram" | "whatsapp";
	accountId: string;
} {
	const entry = payload?.entry?.[0];
	const changes = entry?.changes?.[0];
	const changeVal = changes?.value;

	// Check WhatsApp structure
	if (
		changeVal?.messages ||
		changeVal?.statuses ||
		changes?.field === "messages"
	) {
		const fromPhone = changeVal?.messages?.[0]?.from;
		const phoneId = changeVal?.metadata?.phone_number_id;
		return {
			platform: "whatsapp",
			accountId: fromPhone || phoneId || "@creator_hq",
		};
	}

	// Check Instagram comment / direct message / mentions
	const messaging = entry?.messaging?.[0];
	if (messaging) {
		const senderId = messaging?.sender?.id;
		return {
			platform: "instagram",
			accountId: senderId || "@creator_hq",
		};
	}

	const senderHandle =
		changeVal?.from?.username ||
		changeVal?.sender_id ||
		(changeVal?.comment_id
			? `@${changeVal.from?.username || "creator_hq"}`
			: "@creator_hq");

	return {
		platform: "instagram",
		accountId: senderHandle,
	};
}

// ── Meta (Facebook + Instagram) Webhook ─────────────────────────────────────
// Meta sends a GET for verification and POST for actual events.

app.get("/webhooks/meta", (c) => {
	const mode = c.req.query("hub.mode");
	const token = c.req.query("hub.verify_token");
	const challenge = c.req.query("hub.challenge");

	const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

	if (
		mode === "subscribe" &&
		(token === VERIFY_TOKEN ||
			!VERIFY_TOKEN ||
			process.env.NODE_ENV !== "production")
	) {
		console.log("[gateway] Meta webhook verified");
		return c.text(challenge ?? "", 200);
	}

	return c.text("Forbidden", 403);
});

app.post("/webhooks/meta", async (c) => {
	const startTime = performance.now();

	const isSimulation = c.req.header("x-demo-simulation") === "true";
	const rawBody = await c.req.text();
	const signature = c.req.header("x-hub-signature-256");

	if (!verifyMetaSignature(rawBody, signature, isSimulation)) {
		console.warn("[gateway] Meta webhook signature verification failed");
		return c.text("Invalid signature", 401);
	}

	let payload: WebhookPayloadShape | undefined;
	try {
		payload = JSON.parse(rawBody) as WebhookPayloadShape;
	} catch {
		payload = { raw: rawBody };
	}

	const { platform, accountId } = parseMetaContext(payload);

	// Redis Token Bucket / Sliding Window Rate Limiter
	await checkAndConsumeQuota(platform, accountId);

	const job = await pushWebhookJob(
		`${platform}-webhook`,
		{
			channel: platform as ChannelType,
			payload,
			receivedAt: new Date().toISOString(),
			headers: {
				"x-hub-signature-256": signature ?? "",
				"x-demo-simulation": isSimulation ? "true" : "false",
			},
		} satisfies WebhookEvent,
	);

	const elapsedMs = Number((performance.now() - startTime).toFixed(2));
	console.log(
		`[EDGE-GATEWAY] 200 OK returned in ${elapsedMs.toFixed(2)}ms (<15s Meta SLA) | Queued job #${job.id} | Platform: ${platform}`,
	);

	return c.json(
		{
			status: "accepted",
			decoupled: true,
			queue: OMNICHANNEL_QUEUE_NAME,
			latency_ms: elapsedMs,
		},
		200,
	);
});

// ── WhatsApp Webhook ────────────────────────────────────────────────────────

app.get("/webhooks/whatsapp", (c) => {
	const mode = c.req.query("hub.mode");
	const token = c.req.query("hub.verify_token");
	const challenge = c.req.query("hub.challenge");

	const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

	if (
		mode === "subscribe" &&
		(token === VERIFY_TOKEN ||
			!VERIFY_TOKEN ||
			process.env.NODE_ENV !== "production")
	) {
		console.log("[gateway] WhatsApp webhook verified");
		return c.text(challenge ?? "", 200);
	}

	return c.text("Forbidden", 403);
});

app.post("/webhooks/whatsapp", async (c) => {
	const startTime = performance.now();
	const isSimulation = c.req.header("x-demo-simulation") === "true";
	const rawBody = await c.req.text();
	const signature = c.req.header("x-hub-signature-256");

	if (!verifyMetaSignature(rawBody, signature, isSimulation)) {
		console.warn("[gateway] WhatsApp webhook signature verification failed");
		return c.text("Invalid signature", 401);
	}

	let payload: WebhookPayloadShape | undefined;
	try {
		payload = JSON.parse(rawBody) as WebhookPayloadShape;
	} catch {
		payload = { raw: rawBody };
	}

	const accountId =
		payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
		payload?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id ||
		"@creator_hq";

	await checkAndConsumeQuota("whatsapp", accountId);

	const job = await pushWebhookJob(
		"whatsapp-webhook",
		{
			channel: "whatsapp" as ChannelType,
			payload,
			receivedAt: new Date().toISOString(),
			headers: {
				"x-hub-signature-256": signature ?? "",
				"x-demo-simulation": isSimulation ? "true" : "false",
			},
		} satisfies WebhookEvent,
	);

	const elapsedMs = Number((performance.now() - startTime).toFixed(2));
	console.log(
		`[EDGE-GATEWAY] 200 OK returned in ${elapsedMs.toFixed(2)}ms (<15s Meta SLA) | Queued job #${job.id} | Platform: whatsapp`,
	);

	return c.json(
		{
			status: "accepted",
			decoupled: true,
			queue: OMNICHANNEL_QUEUE_NAME,
			latency_ms: elapsedMs,
		},
		200,
	);
});

// ── Telegram Webhook ────────────────────────────────────────────────────────

app.post("/webhooks/telegram", async (c) => {
	const startTime = performance.now();
	const isSimulation = c.req.header("x-demo-simulation") === "true";
	const secretToken = c.req.header("x-telegram-bot-api-secret-token");

	if (!verifyTelegramSecret(secretToken, isSimulation)) {
		console.warn("[gateway] Telegram webhook secret mismatch");
		return c.text("Forbidden", 403);
	}

	const rawBody = await c.req.text();
	let payload: WebhookPayloadShape | undefined;
	try {
		payload = JSON.parse(rawBody) as WebhookPayloadShape;
	} catch {
		payload = { raw: rawBody };
	}

	const accountId =
		payload?.message?.from?.username ||
		payload?.message?.chat?.id?.toString() ||
		"@creator_hq";

	await checkAndConsumeQuota("telegram", accountId);

	const job = await pushWebhookJob(
		"telegram-webhook",
		{
			channel: "telegram" as ChannelType,
			payload,
			receivedAt: new Date().toISOString(),
			headers: {
				"x-telegram-bot-api-secret-token": secretToken ?? "",
				"x-demo-simulation": isSimulation ? "true" : "false",
			},
		} satisfies WebhookEvent,
	);

	const elapsedMs = Number((performance.now() - startTime).toFixed(2));
	console.log(
		`[EDGE-GATEWAY] 200 OK returned in ${elapsedMs.toFixed(2)}ms (<15s Meta SLA) | Queued job #${job.id} | Platform: telegram`,
	);

	return c.json(
		{
			status: "accepted",
			decoupled: true,
			queue: OMNICHANNEL_QUEUE_NAME,
			latency_ms: elapsedMs,
		},
		200,
	);
});

// ── Generic Webhook (for future channels) ───────────────────────────────────

app.post("/webhooks/:channel", async (c) => {
	const startTime = performance.now();
	const channel = c.req.param("channel") as ChannelType;
	const rawBody = await c.req.text();

	let payload: unknown;
	try {
		payload = JSON.parse(rawBody);
	} catch {
		payload = { raw: rawBody };
	}

	const _job = await pushWebhookJob(
		`${channel}-webhook`,
		{
			channel,
			payload,
			receivedAt: new Date().toISOString(),
			headers: {},
		} satisfies WebhookEvent,
	);

	const elapsedMs = Number((performance.now() - startTime).toFixed(2));
	return c.json(
		{
			status: "accepted",
			decoupled: true,
			queue: OMNICHANNEL_QUEUE_NAME,
			latency_ms: elapsedMs,
		},
		200,
	);
});

// ── Start Server ────────────────────────────────────────────────────────────

const PORT = Number(process.env.GATEWAY_PORT) || 3002;

console.log(`[gateway] Edge API Gateway starting on port ${PORT}`);

export default {
	port: PORT,
	fetch: app.fetch,
};
