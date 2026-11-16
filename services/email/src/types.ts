export interface EmailAddress {
	name?: string;
	address: string;
}

export interface EmailAttachment {
	filename: string;
	contentType: string;
	size: number;
	content?: string; // base64 or raw text representation
}

export interface ParsedEmail {
	messageId: string;
	inReplyTo?: string;
	references: string[];
	subject: string;
	from: EmailAddress;
	to: EmailAddress[];
	cc: EmailAddress[];
	bcc: EmailAddress[];
	date: Date;
	text?: string;
	html?: string;
	attachments: EmailAttachment[];
	headers: Record<string, string | string[]>;
}

export interface SendEmailParams {
	channelId?: string;
	to: string;
	subject: string;
	text: string;
	html?: string;
	conversationId?: string;
	inReplyTo?: string;
	references?: string[];
	from?: string;
	smtpHost?: string;
	smtpPort?: number;
	smtpUser?: string;
	smtpPass?: string;
}

export interface SendEmailResult {
	success: boolean;
	messageId?: string;
	conversationId?: string;
	error?: string;
}

export interface InboundEmailResult {
	success: boolean;
	conversationId?: string;
	messageId?: string;
	contactId?: string;
	channelId?: string;
	error?: string;
}

export interface EmailProviderConfig {
	imap?: {
		host: string;
		port: number;
		user: string;
		pass: string;
		tls?: boolean;
	};
	smtp?: {
		host: string;
		port: number;
		user: string;
		pass: string;
		secure?: boolean;
	};
}
