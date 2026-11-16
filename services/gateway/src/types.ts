/**
 * Shared types for the Gateway service.
 */

/** All supported channel types */
export type ChannelType =
	| "whatsapp"
	| "telegram"
	| "meta" // Facebook + Instagram via Graph API
	| "instagram"
	| "email"
	| "sms"
	| "linkedin"
	| "youtube"
	| "x-twitter"
	| "tiktok";

/** Normalized payload passed to the Core CRM API bridge */
export interface NormalizedWebhookPayload {
	platform: "instagram" | "whatsapp" | "telegram" | string;
	eventType: "comment_to_dm" | "direct_message" | "brand_inquiry" | string;
	senderHandle: string;
	senderName: string;
	senderEmail?: string;
	commentId?: string;
	text: string;
	workspaceSlug?: string;
	metadata?: Record<string, unknown>;
}

/** Inbound platform payload shape for typed extraction */
export interface WebhookPayloadShape {
	entry?: Array<{
		id?: string;
		changes?: Array<{
			field?: string;
			value?: {
				comment_id?: string;
				sender_id?: string;
				post_id?: string;
				media_id?: string;
				message?: string;
				text?: string;
				from?: { username?: string; name?: string; id?: string };
				messages?: Array<{
					from?: string;
					id?: string;
					type?: string;
					text?: { body?: string };
					caption?: string;
					timestamp?: string;
				}>;
				contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
				metadata?: { phone_number_id?: string; display_phone_number?: string };
				statuses?: Array<{ recipient_id?: string }>;
			};
		}>;
		messaging?: Array<{
			sender?: { id?: string; username?: string; name?: string };
			message?: { mid?: string; text?: string };
		}>;
	}>;
	message?: {
		message_id?: number;
		from?: {
			id?: number;
			username?: string;
			first_name?: string;
			last_name?: string;
		};
		chat?: {
			id?: number;
			title?: string;
			type?: string;
		};
		text?: string;
		date?: number;
	};
	senderHandle?: string;
	senderName?: string;
	senderEmail?: string;
	commentId?: string;
	text?: string;
	platform?: string;
	eventType?: string;
	workspaceSlug?: string;
	metadata?: Record<string, unknown>;
	raw?: string;
}

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
	/** Optional normalized data pre-extracted or simulated */
	normalized?: NormalizedWebhookPayload;
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
