import { Hono } from "hono";
import { type Prisma, db } from "@crm/db";
import { processFacebookMessage } from "./facebook";
import { processInstagramMessage } from "./instagram";
import { sendMetaMessage } from "./sender";
import type { MetaWebhookPayload } from "./types";

const app = new Hono();

// Health check
app.get("/health", (c) => c.json({ status: "ok", service: "meta-social" }));

/**
 * Meta Webhook Verification endpoint
 * Handles GET request from Meta when configuring callback URL in App Dashboard
 */
app.get("/webhook/meta", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || "cag_crm_meta_token";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("[meta-social] Webhook verified successfully");
    return c.text(challenge || "");
  }

  console.warn("[meta-social] Webhook verification failed token mismatch");
  return c.text("Forbidden", 403);
});

/**
 * Meta Webhook Receiver endpoint
 * Receives webhook notifications from Facebook Pages & Instagram
 */
app.post("/webhook/meta", async (c) => {
  try {
    const payload = (await c.req.json()) as MetaWebhookPayload;

    // 1. Audit log webhook event in Prisma DB
    db.webhookEvent.create({
      data: {
        channelType: payload.object === "instagram" ? "INSTAGRAM" : "FACEBOOK",
        payload: payload as unknown as Prisma.InputJsonValue,
        eventType: "messaging",
        status: "RECEIVED",
      },
    }).catch((err) => console.error("[meta-social] Failed to audit webhook event:", err));

    // 2. Process entries asynchronously so Meta receives 200 OK in <15s
    if (payload.entry && Array.isArray(payload.entry)) {
      for (const entry of payload.entry) {
        const targetId = entry.id;

        if (entry.messaging && Array.isArray(entry.messaging)) {
          for (const msgEvent of entry.messaging) {
            if (payload.object === "instagram") {
              processInstagramMessage(targetId, msgEvent).catch((err) =>
                console.error("[meta-social] Instagram processing error:", err)
              );
            } else {
              processFacebookMessage(targetId, msgEvent).catch((err) =>
                console.error("[meta-social] Facebook processing error:", err)
              );
            }
          }
        }
      }
    }

    return c.text("EVENT_RECEIVED", 200);
  } catch (err) {
    console.error("[meta-social] Error parsing webhook payload:", err);
    return c.text("Bad Request", 400);
  }
});

/**
 * Outbound Send API endpoint
 * Allows CRM agents or UI to send messages to Facebook / Instagram users
 */
app.post("/api/send", async (c) => {
  try {
    const body = await c.req.json();
    const { channelId, recipientId, text } = body;

    if (!channelId || !recipientId || !text) {
      return c.json({ error: "channelId, recipientId, and text are required" }, 400);
    }

    const result = await sendMetaMessage({
      channelId,
      recipientId,
      text,
    });

    if (!result.success) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({ success: true, messageId: result.messageId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 500);
  }
});

const PORT = Number(process.env.META_SERVICE_PORT || 3003);

export default {
  port: PORT,
  fetch: app.fetch,
};

console.log(`[meta-social] Service running on http://localhost:${PORT}`);
