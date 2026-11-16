import { describe, expect, it } from "bun:test";
import { verifyMetaSignature, verifyTelegramSecret } from "./security";

describe("Webhook Security", () => {
	it("allows development bypass when secret is unset in non-production", () => {
		delete process.env.META_APP_SECRET;
		delete process.env.NODE_ENV;
		expect(verifyMetaSignature("test", undefined)).toBe(true);
	});

	it("verifies telegram secret token correctly", () => {
		process.env.TELEGRAM_WEBHOOK_SECRET = "super-secret-token";
		expect(verifyTelegramSecret("super-secret-token")).toBe(true);
		expect(verifyTelegramSecret("wrong-token")).toBe(false);
	});
});
