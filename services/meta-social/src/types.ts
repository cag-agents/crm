/**
 * Meta (Facebook Page & Instagram) Graph API Webhook & Messaging Types
 */

export interface MetaWebhookPayload {
	object: "page" | "instagram";
	entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
	id: string; // Page ID or Instagram Account ID
	time: number;
	messaging?: MetaMessagingEvent[];
	changes?: MetaChangeEvent[];
}

export interface MetaMessagingEvent {
	sender: {
		id: string; // PSID (Page-Scoped ID) or IGSID (Instagram-Scoped ID)
	};
	recipient: {
		id: string; // Page ID or Instagram Account ID
	};
	timestamp: number;
	message?: {
		mid: string;
		text?: string;
		attachments?: Array<{
			type: "image" | "video" | "audio" | "file" | "location" | "fallback";
			payload: {
				url?: string;
				title?: string;
			};
		}>;
		reply_to?: {
			mid: string;
		};
	};
	postback?: {
		title: string;
		payload: string;
		mid?: string;
	};
	read?: {
		watermark: number;
	};
	delivery?: {
		mids?: string[];
		watermark: number;
	};
}

export interface MetaChangeEvent {
	field: string;
	value: {
		item?: string;
		verb?: "add" | "edit" | "delete" | "remove";
		comment_id?: string;
		post_id?: string;
		message?: string;
		from?: {
			id: string;
			name?: string;
		};
		created_time?: number;
		[key: string]: unknown;
	};
}

export interface SendMessageParams {
	channelId: string;
	recipientId: string;
	text: string;
	pageAccessToken?: string;
}

export interface MetaGraphApiResponse {
	recipient_id?: string;
	message_id?: string;
	error?: {
		message: string;
		type: string;
		code: number;
		error_subcode?: number;
		fbtrace_id?: string;
	};
}
