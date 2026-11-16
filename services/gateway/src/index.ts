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
import { logger } from "hono/logger";
import { cors } from "hono/cors";
import { webhookQueue } from "./queue";
import { verifyMetaSignature } from "./security";
import type { WebhookEvent, ChannelType } from "./types";

const app = new Hono();

// ── Middleware ───────────────────────────────────────────────────────────────

app.use("*", logger());
app.use("*", cors());

// ── Health Check ────────────────────────────────────────────────────────────

app.get("/health", (c) => {
  return c.json({ status: "ok", service: "gateway", timestamp: new Date().toISOString() });
});

// ── Meta (Facebook + Instagram) Webhook ─────────────────────────────────────
// Meta sends a GET for verification and POST for actual events.

app.get("/webhooks/meta", (c) => {
  // Meta webhook verification challenge
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[gateway] Meta webhook verified");
    return c.text(challenge ?? "", 200);
  }

  return c.text("Forbidden", 403);
});

app.post("/webhooks/meta", async (c) => {
  const startTime = Date.now();

  // Step 1: Read raw body for signature verification
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    console.warn("[gateway] Meta webhook signature verification failed");
    return c.text("Invalid signature", 401);
  }

  // Step 2: Parse and queue — do NOT process here
  const payload = JSON.parse(rawBody);

  await webhookQueue.add(
    "meta-webhook",
    {
      channel: "meta" as ChannelType,
      payload,
      receivedAt: new Date().toISOString(),
      headers: {
        "x-hub-signature-256": signature ?? "",
      },
    } satisfies WebhookEvent,
    {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );

  // Step 3: Return 200 OK immediately (< 100ms target)
  const elapsed = Date.now() - startTime;
  console.log(`[gateway] Meta webhook queued in ${elapsed}ms`);

  return c.text("OK", 200);
});

// ── WhatsApp Webhook ────────────────────────────────────────────────────────

app.get("/webhooks/whatsapp", (c) => {
  // WhatsApp uses the same verification as Meta Graph API
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[gateway] WhatsApp webhook verified");
    return c.text(challenge ?? "", 200);
  }

  return c.text("Forbidden", 403);
});

app.post("/webhooks/whatsapp", async (c) => {
  const startTime = Date.now();
  const rawBody = await c.req.text();
  const signature = c.req.header("x-hub-signature-256");

  if (!verifyMetaSignature(rawBody, signature)) {
    console.warn("[gateway] WhatsApp webhook signature verification failed");
    return c.text("Invalid signature", 401);
  }

  const payload = JSON.parse(rawBody);

  await webhookQueue.add(
    "whatsapp-webhook",
    {
      channel: "whatsapp" as ChannelType,
      payload,
      receivedAt: new Date().toISOString(),
      headers: {
        "x-hub-signature-256": signature ?? "",
      },
    } satisfies WebhookEvent,
    {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );

  const elapsed = Date.now() - startTime;
  console.log(`[gateway] WhatsApp webhook queued in ${elapsed}ms`);

  return c.text("OK", 200);
});

// ── Telegram Webhook ────────────────────────────────────────────────────────

app.post("/webhooks/telegram", async (c) => {
  const startTime = Date.now();

  // Telegram uses secret token for verification
  const secretToken = c.req.header("x-telegram-bot-api-secret-token");

  if (secretToken !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    console.warn("[gateway] Telegram webhook secret mismatch");
    return c.text("Forbidden", 403);
  }

  const rawBody = await c.req.text();
  const payload = JSON.parse(rawBody);

  await webhookQueue.add(
    "telegram-webhook",
    {
      channel: "telegram" as ChannelType,
      payload,
      receivedAt: new Date().toISOString(),
      headers: {
        "x-telegram-bot-api-secret-token": secretToken ?? "",
      },
    } satisfies WebhookEvent,
    {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );

  const elapsed = Date.now() - startTime;
  console.log(`[gateway] Telegram webhook queued in ${elapsed}ms`);

  return c.json({ ok: true });
});

// ── Generic Webhook (for future channels) ───────────────────────────────────

app.post("/webhooks/:channel", async (c) => {
  const channel = c.req.param("channel") as ChannelType;
  const rawBody = await c.req.text();

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    payload = { raw: rawBody };
  }

  await webhookQueue.add(
    `${channel}-webhook`,
    {
      channel,
      payload,
      receivedAt: new Date().toISOString(),
      headers: {},
    } satisfies WebhookEvent,
    {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
    }
  );

  return c.text("OK", 200);
});

// ── Start Server ────────────────────────────────────────────────────────────

const PORT = Number(process.env.GATEWAY_PORT) || 3002;

console.log(`[gateway] Edge API Gateway starting on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
};
