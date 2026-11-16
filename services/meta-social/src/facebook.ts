import { type Prisma, db } from "@crm/db";
import type { MetaMessagingEvent } from "./types";

/**
 * Processes incoming Facebook Messenger events and syncs them to the CRM database.
 */
export async function processFacebookMessage(
  pageId: string,
  event: MetaMessagingEvent,
): Promise<void> {
  const senderPsid = event.sender.id;
  const messageData = event.message;

  if (!messageData && !event.postback) {
    // Delivery or read receipt, can be tracked separately if desired
    return;
  }

  const content = messageData?.text || event.postback?.title || "[Media/Attachment]";
  const externalMessageId = messageData?.mid;
  const sentAt = event.timestamp ? new Date(event.timestamp) : new Date();

  // Determine media URL if any
  let mediaUrl: string | undefined;
  let mediaType: string | undefined;
  if (messageData?.attachments && messageData.attachments.length > 0) {
    mediaUrl = messageData.attachments[0]?.payload.url;
    mediaType = messageData.attachments[0]?.type;
  }

  // 1. Find or create the Facebook channel for this pageId
  const channel = await db.channel.upsert({
    where: { id: `fb_page_${pageId}` },
    update: {
      status: "ACTIVE",
      identifier: pageId,
    },
    create: {
      id: `fb_page_${pageId}`,
      name: `Facebook Page (${pageId})`,
      type: "FACEBOOK",
      status: "ACTIVE",
      identifier: pageId,
    },
  });

  // 2. Find or create Contact for this sender PSID
  let contact = await db.contact.findFirst({
    where: {
      firstName: "FB User",
      lastName: senderPsid.slice(-4),
    },
  }).catch(() => null);

  if (!contact) {
    contact = await db.contact.create({
      data: {
        firstName: `FB User`,
        lastName: senderPsid.slice(-4),
        source: "MANUAL",
      },
    });
  }

  // 3. Find or create Conversation
  const conversation = await db.conversation.upsert({
    where: {
      channelId_externalThreadId: {
        channelId: channel.id,
        externalThreadId: senderPsid,
      },
    },
    update: {
      lastMessageAt: sentAt,
      lastMessageSnippet: content.slice(0, 100),
      unreadCount: { increment: 1 },
      status: "OPEN",
    },
    create: {
      channelId: channel.id,
      contactId: contact.id,
      externalThreadId: senderPsid,
      title: `Facebook: ${contact.firstName} ${contact.lastName || ""}`.trim(),
      status: "OPEN",
      priority: "NORMAL",
      lastMessageAt: sentAt,
      lastMessageSnippet: content.slice(0, 100),
      unreadCount: 1,
    },
  });

  // 4. Save incoming message
  await db.message.create({
    data: {
      conversationId: conversation.id,
      externalMessageId,
      direction: "INBOUND",
      senderType: "CONTACT",
      senderId: senderPsid,
      content,
      contentType: mediaType === "image" ? "IMAGE" : "TEXT",
      mediaUrl,
      mediaType,
      deliveryStatus: "DELIVERED",
      metadata: event as unknown as Prisma.InputJsonValue,
      sentAt,
    },
  });

  console.log(`[facebook] Saved inbound message from ${senderPsid} in conv ${conversation.id}`);
}

