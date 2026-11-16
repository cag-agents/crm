/**
 * Shared types for the Gateway service.
 */

/** All supported channel types */
export type ChannelType =
  | "whatsapp"
  | "telegram"
  | "meta"       // Facebook + Instagram via Graph API
  | "email"
  | "sms"
  | "linkedin"
  | "youtube"
  | "x-twitter"
  | "tiktok";

/** The payload shape pushed into the Redis job queue */
export interface WebhookEvent {
  /** Which channel this webhook came from */
  channel: ChannelType;
  /** Raw parsed JSON payload from the platform */
  payload: unknown;
  /** ISO timestamp when the gateway received this */
  receivedAt: string;
  /** Relevant headers (signatures, tokens) stored for audit */
  headers: Record<string, string>;
}

/** Kafka topic names — one per event type, not per channel */
export const KAFKA_TOPICS = {
  /** A new inbound message (text, media, etc.) */
  MESSAGE_INBOUND: "channel.message.inbound",
  /** An outbound message was sent by us */
  MESSAGE_OUTBOUND: "channel.message.outbound",
  /** A message delivery status update (sent, delivered, read, failed) */
  MESSAGE_STATUS: "channel.message.status",
  /** A social engagement event (comment, mention, reaction) */
  SOCIAL_ENGAGEMENT: "channel.social.engagement",
  /** A webhook event we couldn't classify */
  UNCLASSIFIED: "channel.unclassified",
} as const;
