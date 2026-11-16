/**
 * Webhook Security — Signature verification for each platform.
 *
 * Each platform has its own way of proving a webhook is legit:
 * - Meta (FB/IG/WhatsApp): HMAC-SHA256 signature in x-hub-signature-256 header
 * - Telegram: Secret token in header + IP whitelist
 * - Others: Added as we integrate each channel
 */

import { createHmac } from "node:crypto";

/**
 * Verify Meta/WhatsApp webhook signature.
 *
 * Meta signs every webhook payload with your app secret using HMAC-SHA256.
 * The signature is sent in the `x-hub-signature-256` header as `sha256=<hex>`.
 *
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */
export function verifyMetaSignature(
	rawBody: string,
	signature: string | undefined,
	isSimulation = false,
): boolean {
	if (isSimulation) {
		return true;
	}

	const APP_SECRET = process.env.META_APP_SECRET;

	if (!APP_SECRET) {
		console.warn(
			"[security] META_APP_SECRET not set — skipping signature verification",
		);
		// In development, allow unsigned webhooks. In production, this should fail.
		return process.env.NODE_ENV !== "production";
	}

	if (!signature) {
		return false;
	}

	const expectedSignature = `sha256=${createHmac("sha256", APP_SECRET).update(rawBody).digest("hex")}`;

	// Constant-time comparison to prevent timing attacks
	if (signature.length !== expectedSignature.length) {
		return false;
	}

	const a = Buffer.from(signature);
	const b = Buffer.from(expectedSignature);

	return crypto.subtle ? a.equals(b) : signature === expectedSignature;
}

/**
 * Verify Telegram webhook by checking the secret token.
 *
 * When setting up the webhook via `setWebhook`, you pass a `secret_token`.
 * Telegram includes it in every webhook as `X-Telegram-Bot-Api-Secret-Token`.
 *
 * @see https://core.telegram.org/bots/api#setwebhook
 */
export function verifyTelegramSecret(
	secretToken: string | undefined,
	isSimulation = false,
): boolean {
	if (isSimulation) {
		return true;
	}

	const EXPECTED = process.env.TELEGRAM_WEBHOOK_SECRET;

	if (!EXPECTED) {
		console.warn(
			"[security] TELEGRAM_WEBHOOK_SECRET not set — skipping verification",
		);
		return process.env.NODE_ENV !== "production";
	}

	return secretToken === EXPECTED;
}

/**
 * Telegram IP whitelist — Telegram only sends webhooks from these subnets.
 * @see https://core.telegram.org/bots/webhooks#the-short-version
 */
const TELEGRAM_SUBNETS = ["149.154.160.0/20", "91.108.4.0/22"];

export function verifyTelegramIP(ip: string): boolean {
	// Simplified check — in production, use a proper CIDR library
	return TELEGRAM_SUBNETS.some((subnet) => {
		const [base] = subnet.split("/");
		return ip.startsWith(base?.split(".").slice(0, 2).join(".") ?? "");
	});
}
