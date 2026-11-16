import { type Prisma, db } from "@crm/db";
import type { MetaMessagingEvent } from "./types";

/**
 * Processes incoming Instagram Direct events and syncs them to the CRM database.
 */
export async function processInstagramMessage(
  igAccountId: string,
  event: MetaMessagingEvent,
): Promise<void> {
  const senderIgsid = event.sender.id;
  const messageData = event.message;

  if (!messageData && !event.postback) {
    return;
  }

  const content = messageData?.text || event.postback?.title || "[Instagram Media]";
  const externalMessageId = messageData?.mid;
  const sentAt = event.timestamp ? new Date(event.timestamp) : new Date();

  let mediaUrl: string | undefined;
  let mediaType: string | undefined;
  if (messageData?.attachments && messageData.attachments.length > 0) {
    mediaUrl = messageData.attachments[0]?.payload.url;
    mediaType = messageData.attachments[0]?.type;
  }

  // 1. Find or create Instagram channel
  const channel = await db.channel.upsert({
    where: { id: `ig_account_${igAccountId}` },
    update: {
      status: "ACTIVE",
      identifier: igAccountId,
    },
    create: {
      id: `ig_account_${igAccountId}`,
      name: `Instagram (${igAccountId})`,
      type: "INSTAGRAM",
      status: "ACTIVE",
      identifier: igAccountId,
    },
  });

  // 2. Find or create Contact
  const contact = await db.contact.create({
    data: {
      firstName: `IG User`,
      lastName: senderIgsid.slice(-4),
      source: "MANUAL",
    },
  });

  // 3. Find or create Conversation
  const conversation = await db.conversation.upsert({
    where: {
      channelId_externalThreadId: {
        channelId: channel.id,
        externalThreadId: senderIgsid,
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
      externalThreadId: senderIgsid,
      title: `Instagram: @user_${senderIgsid.slice(-6)}`,
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
      senderId: null,
      senderName: contact.firstName,
      content,
      contentType: mediaType === "image" ? "IMAGE" : "TEXT",
      mediaUrl,
      mediaType,
      deliveryStatus: "DELIVERED",
      metadata: event as unknown as Prisma.InputJsonValue,
      sentAt,
    },
  });

  console.log(`[instagram] Saved inbound message from ${senderIgsid} in conv ${conversation.id}`);
}
