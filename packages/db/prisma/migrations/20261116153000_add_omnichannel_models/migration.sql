-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('WHATSAPP', 'TELEGRAM', 'FACEBOOK', 'INSTAGRAM', 'EMAIL', 'SMS', 'LINKEDIN', 'GENERIC');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR', 'PENDING');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'CLOSED', 'SNOOZED', 'PENDING');

-- CreateEnum
CREATE TYPE "ConversationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageSenderType" AS ENUM ('CONTACT', 'USER', 'BOT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageContentType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "MessageDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'QUEUED', 'PROCESSED', 'FAILED');

-- CreateTable
CREATE TABLE "channel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'PENDING',
    "identifier" TEXT,
    "credentials" JSONB,
    "config" JSONB,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "contactId" TEXT,
    "companyId" TEXT,
    "externalThreadId" TEXT NOT NULL,
    "title" TEXT,
    "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "ConversationPriority" NOT NULL DEFAULT 'NORMAL',
    "assignedToId" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageSnippet" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "direction" "MessageDirection" NOT NULL,
    "senderType" "MessageSenderType" NOT NULL DEFAULT 'CONTACT',
    "senderId" TEXT,
    "senderName" TEXT,
    "content" TEXT NOT NULL,
    "contentType" "MessageContentType" NOT NULL DEFAULT 'TEXT',
    "mediaUrl" TEXT,
    "mediaType" TEXT,
    "deliveryStatus" "MessageDeliveryStatus" NOT NULL DEFAULT 'SENT',
    "errorMessage" TEXT,
    "metadata" JSONB,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhookEvent" (
    "id" TEXT NOT NULL,
    "channelId" TEXT,
    "channelType" "ChannelType" NOT NULL,
    "externalEventId" TEXT,
    "eventType" TEXT,
    "payload" JSONB NOT NULL,
    "headers" JSONB,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "channel_type_status_idx" ON "channel"("type", "status");

-- CreateIndex
CREATE INDEX "channel_organizationId_idx" ON "channel"("organizationId");

-- CreateIndex
CREATE INDEX "conversation_channelId_idx" ON "conversation"("channelId");

-- CreateIndex
CREATE INDEX "conversation_status_lastMessageAt_idx" ON "conversation"("status", "lastMessageAt");

-- CreateIndex
CREATE INDEX "conversation_contactId_idx" ON "conversation"("contactId");

-- CreateIndex
CREATE INDEX "conversation_assignedToId_idx" ON "conversation"("assignedToId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_channelId_externalThreadId_key" ON "conversation"("channelId", "externalThreadId");

-- CreateIndex
CREATE INDEX "message_conversationId_sentAt_idx" ON "message"("conversationId", "sentAt");

-- CreateIndex
CREATE INDEX "message_externalMessageId_idx" ON "message"("externalMessageId");

-- CreateIndex
CREATE INDEX "webhookEvent_channelType_status_idx" ON "webhookEvent"("channelType", "status");

-- CreateIndex
CREATE INDEX "webhookEvent_externalEventId_idx" ON "webhookEvent"("externalEventId");

-- AddForeignKey
ALTER TABLE "channel" ADD CONSTRAINT "channel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message" ADD CONSTRAINT "message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhookEvent" ADD CONSTRAINT "webhookEvent_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
