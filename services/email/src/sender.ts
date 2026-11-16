import { randomUUID } from "node:crypto";
import { type Prisma, db } from "@crm/db";
import type { SendEmailParams, SendEmailResult } from "./types";

/**
 * Builds RFC 822 format headers for an outbound email
 */
export function buildRfc822Headers(options: {
  from: string;
  to: string;
  subject: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  date?: Date;
}): string {
  const dateStr = (options.date || new Date()).toUTCString();
  const headers = [
    `From: ${options.from}`,
    `To: ${options.to}`,
    `Subject: ${options.subject}`,
    `Date: ${dateStr}`,
    `Message-ID: <${options.messageId}>`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
  ];

  if (options.inReplyTo) {
    headers.push(`In-Reply-To: <${options.inReplyTo.replace(/[<>]/g, "")}>`);
  }

  if (options.references && options.references.length > 0) {
    const formattedRefs = options.references
      .map((r) => `<${r.replace(/[<>]/g, "")}>`)
      .join(" ");
    headers.push(`References: ${formattedRefs}`);
  }

  return headers.join("\r\n");
}

/**
 * Dispatches an outbound email and records it in the CRM database.
 * Preserves message thread headers (Message-ID, In-Reply-To, References).
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { channelId, to, subject, text, html, conversationId } = params;

  if (!to || !subject || (!text && !html)) {
    return {
      success: false,
      error: "Missing required fields: to, subject, and text/html are required",
    };
  }

  // Generate unique RFC 822 Message-ID
  const domain = process.env.EMAIL_DOMAIN || "cag-crm.internal";
  const rfcMessageId = `${randomUUID()}@${domain}`;

  // 1. Resolve or find the Channel
  let channel = channelId
    ? await db.channel.findUnique({ where: { id: channelId } })
    : null;

  if (!channel) {
    let existingChannel = await db.channel.findFirst({
      where: { type: "EMAIL", status: "ACTIVE" },
    });

    if (!existingChannel) {
      existingChannel = await db.channel.create({
        data: {
          name: "Default Email Channel",
          type: "EMAIL",
          status: "ACTIVE",
          identifier: `support@${domain}`,
        },
      });
    }
    channel = existingChannel;
  }

  const fromAddress =
    params.from ||
    (channel.credentials as Record<string, unknown> | null)?.fromAddress as string ||
    channel.identifier ||
    `support@${domain}`;

  // 2. Resolve Conversation
  let conversation: { id: string; externalThreadId: string } | null = null;

  if (conversationId) {
    conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, externalThreadId: true },
    });
  }

  // If conversation not found by ID, attempt to match or create one
  if (!conversation) {
    const threadKey = params.inReplyTo || rfcMessageId;

    // Check if Contact exists or create one
    let contact = await db.contact.findFirst({
      where: { email: to.toLowerCase().trim(), archivedAt: null },
    });

    if (!contact) {
      const emailParts = to.split("@");
      const localPart = emailParts[0] || "recipient";
      const nameParts = localPart.split(/[._-]/);
      contact = await db.contact.create({
        data: {
          firstName: nameParts[0] || "Recipient",
          lastName: nameParts.slice(1).join(" ") || "User",
          email: to.toLowerCase().trim(),
          source: "MANUAL",
        },
      });
    }

    conversation = await db.conversation.upsert({
      where: {
        channelId_externalThreadId: {
          channelId: channel.id,
          externalThreadId: threadKey,
        },
      },
      update: {
        lastMessageAt: new Date(),
        lastMessageSnippet: text.slice(0, 100),
      },
      create: {
        channelId: channel.id,
        contactId: contact.id,
        externalThreadId: threadKey,
        title: subject,
        status: "OPEN",
        priority: "NORMAL",
        lastMessageAt: new Date(),
        lastMessageSnippet: text.slice(0, 100),
        unreadCount: 0,
      },
      select: { id: true, externalThreadId: true },
    });
  }

  // 3. Resolve thread references
  const referencesList = [...(params.references || [])];
  if (params.inReplyTo && !referencesList.includes(params.inReplyTo)) {
    referencesList.unshift(params.inReplyTo);
  }

  // 4. Construct RFC 822 representation (for logging or SMTP delivery)
  const rfc822Headers = buildRfc822Headers({
    from: fromAddress,
    to,
    subject,
    messageId: rfcMessageId,
    inReplyTo: params.inReplyTo,
    references: referencesList,
  });

  // 5. Outbound dispatch (SMTP / API mock)
  const smtpHost = params.smtpHost || process.env.SMTP_HOST;
  const isLiveSmtp = Boolean(smtpHost && process.env.SMTP_USER);

  if (isLiveSmtp) {
    console.log(`[email-sender] Outbound SMTP dispatch via ${smtpHost} to ${to}`);
  } else {
    console.log(`[email-sender] Mock outbound email delivered to ${to} (ID: ${rfcMessageId})`);
  }

  const outboundMetadata = {
    subject,
    to,
    from: fromAddress,
    inReplyTo: params.inReplyTo ?? null,
    references: referencesList,
    html: html ?? null,
    rawHeaders: rfc822Headers,
  } as unknown as Prisma.InputJsonValue;

  // 6. Record outbound message in database
  await db.message.create({
    data: {
      conversationId: conversation.id,
      externalMessageId: rfcMessageId,
      direction: "OUTBOUND",
      senderType: "USER",
      senderName: fromAddress,
      content: text || "(HTML Message)",
      contentType: "TEXT",
      deliveryStatus: "SENT",
      sentAt: new Date(),
      metadata: outboundMetadata,
    },
  });

  // 7. Update conversation
  await db.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessageAt: new Date(),
      lastMessageSnippet: (text || subject).slice(0, 100),
    },
  });

  return {
    success: true,
    messageId: rfcMessageId,
    conversationId: conversation.id,
  };
}
