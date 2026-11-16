import type { EmailAddress, EmailAttachment, ParsedEmail } from "./types";

/**
 * Decodes MIME encoded-words (=?charset?encoding?encoded_text?=)
 * Supports B (base64) and Q (quoted-printable)
 */
export function decodeMimeWords(text: string): string {
	return text.replace(
		/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g,
		(_, _charset, encoding, encoded) => {
			try {
				const enc = encoding.toUpperCase();
				if (enc === "B") {
					return Buffer.from(encoded, "base64").toString("utf-8");
				}
				if (enc === "Q") {
					const qp = encoded.replace(/_/g, " ");
					return decodeQuotedPrintable(qp);
				}
			} catch {
				// Fallback to raw text if decoding fails
			}
			return encoded;
		},
	);
}

/**
 * Decodes Quoted-Printable encoded strings
 */
export function decodeQuotedPrintable(input: string): string {
	// 1. Remove soft line breaks (equal sign at end of line)
	const cleaned = input.replace(/=\r?\n/g, "");
	// 2. Decode =XX hex sequences
	return cleaned.replace(/=([A-Fa-f0-9]{2})/g, (_, hex) => {
		try {
			return String.fromCharCode(Number.parseInt(hex, 16));
		} catch {
			return `=${hex}`;
		}
	});
}

/**
 * Parses an email address string like 'John Doe <john@example.com>' or 'john@example.com'
 */
export function parseEmailAddress(raw: string): EmailAddress {
	const trimmed = raw.trim();
	const match = trimmed.match(/^(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
	if (match) {
		const name = match[1]?.trim();
		const address = match[2]?.trim().toLowerCase() || "";
		return name ? { name: decodeMimeWords(name), address } : { address };
	}
	return { address: trimmed.replace(/[<>]/g, "").toLowerCase() };
}

/**
 * Parses a comma-separated list of email addresses
 */
export function parseEmailAddressList(raw: string | undefined): EmailAddress[] {
	if (!raw) return [];
	// Split on commas not inside quotes
	const parts = raw.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
	return parts
		.map((p) => parseEmailAddress(p))
		.filter((a) => a.address.length > 0 && a.address.includes("@"));
}

/**
 * Parses raw RFC 822 email headers into key-value pairs (unfolding multi-line headers)
 */
export function parseRawHeaders(
	rawHeaders: string,
): Record<string, string | string[]> {
	const headers: Record<string, string | string[]> = {};
	const lines = rawHeaders.split(/\r?\n/);
	let currentKey = "";
	let currentValue = "";

	for (const line of lines) {
		if (/^[ \t]/.test(line) && currentKey) {
			// Continuation line (unfolding)
			currentValue += ` ${line.trim()}`;
		} else {
			if (currentKey) {
				const decodedVal = decodeMimeWords(currentValue.trim());
				const lowerKey = currentKey.toLowerCase();
				const existing = headers[lowerKey];
				if (existing) {
					if (Array.isArray(existing)) {
						existing.push(decodedVal);
					} else {
						headers[lowerKey] = [existing, decodedVal];
					}
				} else {
					headers[lowerKey] = decodedVal;
				}
			}
			const colonIdx = line.indexOf(":");
			if (colonIdx > 0) {
				currentKey = line.slice(0, colonIdx).trim();
				currentValue = line.slice(colonIdx + 1);
			} else {
				currentKey = "";
				currentValue = "";
			}
		}
	}

	if (currentKey) {
		const decodedVal = decodeMimeWords(currentValue.trim());
		const lowerKey = currentKey.toLowerCase();
		const existing = headers[lowerKey];
		if (existing) {
			if (Array.isArray(existing)) {
				existing.push(decodedVal);
			} else {
				headers[lowerKey] = [existing, decodedVal];
			}
		} else {
			headers[lowerKey] = decodedVal;
		}
	}

	return headers;
}

/**
 * Extracts boundary string from Content-Type header
 */
function extractBoundary(contentType: string): string | null {
	const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
	if (!match) return null;
	const val = match[1] ?? match[2];
	return val ? val.trim() : null;
}

/**
 * Decodes body content according to Content-Transfer-Encoding
 */
function decodeContent(content: string, encoding?: string): string {
	const enc = encoding?.trim().toLowerCase();
	if (enc === "base64") {
		try {
			return Buffer.from(content.replace(/\s/g, ""), "base64").toString(
				"utf-8",
			);
		} catch {
			return content;
		}
	}
	if (enc === "quoted-printable") {
		return decodeQuotedPrintable(content);
	}
	return content;
}

/**
 * Parses MIME body and extracts text, html, and attachments
 */
function parseMimeBody(
	bodyText: string,
	contentTypeHeader = "",
	transferEncoding = "",
): { text?: string; html?: string; attachments: EmailAttachment[] } {
	const boundary = extractBoundary(contentTypeHeader);
	const attachments: EmailAttachment[] = [];
	let text: string | undefined;
	let html: string | undefined;

	if (!boundary) {
		// Single part
		const decoded = decodeContent(bodyText, transferEncoding);
		if (contentTypeHeader.toLowerCase().includes("text/html")) {
			html = decoded;
		} else {
			text = decoded;
		}
		return { text, html, attachments };
	}

	// Split multipart by boundary delimiter
	const parts = bodyText.split(new RegExp(`--${boundary}(?:--)?\r?\n?`));

	for (const part of parts) {
		const trimmedPart = part.trim();
		if (!trimmedPart || trimmedPart === "--") continue;

		// Split part headers and part body
		const headerSplit = trimmedPart.split(/\r?\n\r?\n/);
		if (headerSplit.length < 2) continue;

		const partHeaderStr = headerSplit[0] ?? "";
		const partBody = headerSplit.slice(1).join("\n\n");
		const partHeaders = parseRawHeaders(partHeaderStr);

		const partContentType = String(partHeaders["content-type"] || "text/plain");
		const partEncoding = String(partHeaders["content-transfer-encoding"] || "");
		const partDisposition = String(partHeaders["content-disposition"] || "");

		// Check if attachment
		const filenameMatch =
			partDisposition.match(/filename=(?:"([^"]+)"|([^;\s]+))/i) ||
			partContentType.match(/name=(?:"([^"]+)"|([^;\s]+))/i);

		if (filenameMatch || partDisposition.toLowerCase().includes("attachment")) {
			const filename = filenameMatch
				? filenameMatch[1] || filenameMatch[2]
				: "attachment.bin";
			const cleanContent =
				partEncoding.toLowerCase() === "base64"
					? partBody.replace(/\s/g, "")
					: partBody;
			attachments.push({
				filename: decodeMimeWords(filename || "attachment.bin"),
				contentType:
					partContentType.split(";")[0]?.trim() || "application/octet-stream",
				size: cleanContent.length,
				content: cleanContent,
			});
			continue;
		}

		// Check for nested multipart
		if (partContentType.toLowerCase().includes("multipart/")) {
			const nested = parseMimeBody(partBody, partContentType, partEncoding);
			if (nested.text && !text) text = nested.text;
			if (nested.html && !html) html = nested.html;
			attachments.push(...nested.attachments);
			continue;
		}

		// Text parts
		const decoded = decodeContent(partBody || "", partEncoding);
		if (partContentType.toLowerCase().includes("text/html")) {
			html = decoded;
		} else if (partContentType.toLowerCase().includes("text/plain")) {
			text = decoded;
		}
	}

	return { text, html, attachments };
}

/**
 * Parses raw RFC 822 email string into structured ParsedEmail
 */
export function parseRfc822Email(rawEmail: string): ParsedEmail {
	// Normalize line endings
	const normalized = rawEmail.replace(/\r\n/g, "\n");
	const splitIdx = normalized.indexOf("\n\n");

	const headerStr =
		splitIdx !== -1 ? normalized.slice(0, splitIdx) : normalized;
	const bodyStr = splitIdx !== -1 ? normalized.slice(splitIdx + 2) : "";

	const headers = parseRawHeaders(headerStr);

	// Message-ID
	const rawMsgId = String(headers["message-id"] || headers.message_id || "");
	const messageId =
		rawMsgId.replace(/[<>]/g, "").trim() ||
		`email-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	// In-Reply-To
	const rawInReplyTo = String(headers["in-reply-to"] || "");
	const inReplyTo = rawInReplyTo.replace(/[<>]/g, "").trim() || undefined;

	// References
	const rawReferences = String(headers.references || "");
	const references = rawReferences
		? rawReferences
				.split(/\s+/)
				.map((r) => r.replace(/[<>]/g, "").trim())
				.filter(Boolean)
		: [];

	// Subject
	const subject = String(headers.subject || "(No Subject)");

	// From
	const rawFrom = String(headers.from || "unknown@domain.com");
	const from = parseEmailAddress(rawFrom);

	// To, Cc, Bcc
	const to = parseEmailAddressList(headers.to ? String(headers.to) : undefined);
	const cc = parseEmailAddressList(headers.cc ? String(headers.cc) : undefined);
	const bcc = parseEmailAddressList(
		headers.bcc ? String(headers.bcc) : undefined,
	);

	// Date
	const rawDate = String(headers.date || "");
	const parsedDate = rawDate ? new Date(rawDate) : new Date();
	const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

	// Body and Attachments
	const contentType = String(headers["content-type"] || "text/plain");
	const transferEncoding = String(headers["content-transfer-encoding"] || "");
	const { text, html, attachments } = parseMimeBody(
		bodyStr,
		contentType,
		transferEncoding,
	);

	return {
		messageId,
		inReplyTo,
		references,
		subject,
		from,
		to,
		cc,
		bcc,
		date,
		text: text?.trim(),
		html: html?.trim(),
		attachments,
		headers,
	};
}
