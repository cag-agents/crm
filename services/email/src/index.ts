import { Hono } from "hono";
import { z } from "zod";
import { db } from "@crm/db";
import { ingestInboundEmail } from "./receiver";
import { sendEmail } from "./sender";
import type { InboundEmailResult } from "./types";

const app = new Hono();

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok", service: "email" }));

/**
 * List email conversations and recent email messages
 */
app.get("/api/emails", async (c) => {
  try {
    const limitParam = c.req.query("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 20;

    // Find all conversations belonging to EMAIL channels
    const conversations = await db.conversation.findMany({
      where: {
        channel: {
          type: "EMAIL",
        },
      },
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        channel: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        messages: {
          take: 5,
          orderBy: { sentAt: "desc" },
        },
      },
      orderBy: { lastMessageAt: "desc" },
      take: limit,
    });

    return c.json({ success: true, conversations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-service] GET /api/emails error:", message);
    return c.json({ error: message }, 500);
  }
});

const sendEmailSchema = z.object({
  channelId: z.string().optional(),
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  conversationId: z.string().optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  from: z.string().optional(),
});

/**
 * Outbound Email Dispatch endpoint
 */
app.post("/api/email/send", async (c) => {
  try {
    const rawBody = await c.req.json();
    const parseResult = sendEmailSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return c.json({ error: parseResult.error.format() }, 400);
    }

    const { channelId, to, subject, text, html, conversationId, inReplyTo, references, from } =
      parseResult.data;

    if (!text && !html) {
      return c.json({ error: "Either text or html content must be provided" }, 400);
    }

    const result = await sendEmail({
      channelId,
      to,
      subject,
      text: text || "",
      html,
      conversationId,
      inReplyTo,
      references,
      from,
    });

    if (!result.success) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({
      success: true,
      messageId: result.messageId,
      conversationId: result.conversationId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-service] POST /api/email/send error:", message);
    return c.json({ error: message }, 500);
  }
});

/**
 * Inbound Email Webhook/Ingest endpoint
 * Supports raw RFC 822 string body or parsed JSON
 */
app.post("/api/email/inbound", async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";
    let result: InboundEmailResult;

    if (contentType.includes("application/json")) {
      const body = await c.req.json();
      if (typeof body.raw === "string") {
        result = await ingestInboundEmail(body.raw, body.channelId);
      } else {
        result = await ingestInboundEmail(body, body.channelId);
      }
    } else {
      const rawText = await c.req.text();
      result = await ingestInboundEmail(rawText);
    }

    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }

    return c.json(result, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email-service] POST /api/email/inbound error:", message);
    return c.json({ error: message }, 500);
  }
});

const port = Number(process.env.EMAIL_SERVICE_PORT || 3004);

export default {
  port,
  fetch: app.fetch,
};
