export interface WhatsAppWebhookPayload {
	object: string;
	entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
	id: string;
	changes: WhatsAppChange[];
}

export interface WhatsAppChange {
	field: string;
	value: WhatsAppChangeValue;
}

export interface WhatsAppMetadata {
	display_phone_number: string;
	phone_number_id: string;
}

export interface WhatsAppContactProfile {
	profile: {
		name: string;
	};
	wa_id: string;
}

export interface WhatsAppMediaObject {
	id: string;
	mime_type: string;
	sha256?: string;
	caption?: string;
}

export interface WhatsAppDocumentObject {
	id: string;
	filename?: string;
	mime_type: string;
	caption?: string;
}

export interface WhatsAppLocationObject {
	latitude: number;
	longitude: number;
	name?: string;
	address?: string;
}

export interface WhatsAppInteractiveObject {
	type: "button_reply" | "list_reply";
	button_reply?: {
		id: string;
		title: string;
	};
	list_reply?: {
		id: string;
		title: string;
		description?: string;
	};
}

export interface WhatsAppInboundMessage {
	from: string;
	id: string;
	timestamp: string;
	type:
		| "text"
		| "image"
		| "audio"
		| "video"
		| "document"
		| "location"
		| "interactive"
		| "button";
	text?: {
		body: string;
	};
	image?: WhatsAppMediaObject;
	audio?: WhatsAppMediaObject;
	video?: WhatsAppMediaObject;
	document?: WhatsAppDocumentObject;
	location?: WhatsAppLocationObject;
	interactive?: WhatsAppInteractiveObject;
	button?: {
		text: string;
		payload: string;
	};
}

export interface WhatsAppStatusUpdate {
	id: string;
	status: "sent" | "delivered" | "read" | "failed";
	timestamp: string;
	recipient_id: string;
	errors?: Array<{
		code: number;
		title: string;
		message?: string;
	}>;
}

export interface WhatsAppChangeValue {
	messaging_product: string;
	metadata: WhatsAppMetadata;
	contacts?: WhatsAppContactProfile[];
	messages?: WhatsAppInboundMessage[];
	statuses?: WhatsAppStatusUpdate[];
}

export interface WhatsAppTemplateParameter {
	type: "text" | "currency" | "date_time" | "image" | "document" | "video";
	text?: string;
	image?: { link: string };
	document?: { link: string; filename?: string };
	video?: { link: string };
}

export interface WhatsAppTemplateComponent {
	type: "header" | "body" | "button";
	sub_type?: "quick_reply" | "url";
	index?: string | number;
	parameters: WhatsAppTemplateParameter[];
}

export interface SendMessageParams {
	channelId: string;
	recipientPhone: string;
	text?: string;
	mediaType?: "image" | "audio" | "video" | "document";
	mediaUrl?: string;
	caption?: string;
	interactiveButtons?: Array<{ id: string; title: string }>;
	phoneNumberId?: string;
	accessToken?: string;
}

export interface SendTemplateParams {
	channelId: string;
	recipientPhone: string;
	templateName: string;
	languageCode?: string;
	components?: WhatsAppTemplateComponent[];
	phoneNumberId?: string;
	accessToken?: string;
}

export interface WhatsAppApiResponse {
	messaging_product?: string;
	contacts?: Array<{
		input: string;
		wa_id: string;
	}>;
	messages?: Array<{
		id: string;
		message_status?: string;
	}>;
	error?: {
		message: string;
		type: string;
		code: number;
		fbtrace_id?: string;
	};
}

export interface SendResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

export interface ConversationMetadata {
	cswExpiresAt?: string;
	[key: string]: unknown;
}
