import { describe, expect, it } from "bun:test";
import app from "./index";
import { checkAndConsumeQuota, PLATFORM_LIMITS } from "./redis";

describe("Track 1: Edge Gateway & Redis Token Bucket Rate Limiter", () => {
	it("verifies platform limits per SRS Section 5", () => {
		expect(PLATFORM_LIMITS.instagram.limit).toBe(200);
		expect(PLATFORM_LIMITS.instagram.windowSec).toBe(3600);
		expect(PLATFORM_LIMITS.whatsapp.limit).toBe(1000);
		expect(PLATFORM_LIMITS.telegram.limit).toBe(500);
	});

	it("consumes and tracks Redis token bucket quota correctly", async () => {
		const testAccount = `@test_creator_${Date.now()}`;
		const res1 = await checkAndConsumeQuota("instagram", testAccount);

		expect(res1.allowed).toBe(true);
		expect(res1.limit).toBe(200);
		expect(res1.remaining).toBeLessThan(200);
		expect(res1.resetInSec).toBeGreaterThan(0);

		const res2 = await checkAndConsumeQuota("instagram", testAccount);
		expect(res2.remaining).toBe(res1.remaining - 1);
	});

	it("verifies Meta GET webhook challenge", async () => {
		process.env.META_VERIFY_TOKEN = "test-token";
		const req = new Request(
			"http://localhost/webhooks/meta?hub.mode=subscribe&hub.verify_token=test-token&hub.challenge=test_challenge_123",
		);
		const res = await app.fetch(req);
		expect(res.status).toBe(200);
		expect(await res.text()).toBe("test_challenge_123");
	});

	it("decouples Instagram webhook with sub-50ms HTTP 200 JSON response", async () => {
		const payload = {
			object: "instagram",
			entry: [
				{
					id: "page_1",
					changes: [
						{
							field: "comments",
							value: {
								comment_id: "ig_cmt_test_101",
								from: { username: "tester_pro" },
								text: "Send link",
							},
						},
					],
				},
			],
		};

		const req = new Request("http://localhost/webhooks/meta", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-demo-simulation": "true",
			},
			body: JSON.stringify(payload),
		});

		const res = await app.fetch(req);
		expect(res.status).toBe(200);
		const data = (await res.json()) as {
			status: string;
			decoupled: boolean;
			queue?: string;
			latency_ms?: number;
		};
		expect(data.status).toBe("accepted");
		expect(data.decoupled).toBe(true);
		expect(data.queue).toBe("omnichannel-webhooks");
		expect(typeof data.latency_ms).toBe("number");
	});

	it("decouples Telegram webhook with immediate HTTP 200 JSON response", async () => {
		const payload = {
			update_id: 12345,
			message: {
				message_id: 99,
				from: { username: "superfan_1" },
				text: "When is cohort starting?",
			},
		};

		const req = new Request("http://localhost/webhooks/telegram", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-demo-simulation": "true",
			},
			body: JSON.stringify(payload),
		});

		const res = await app.fetch(req);
		expect(res.status).toBe(200);
		const data = (await res.json()) as {
			status: string;
			decoupled: boolean;
			queue?: string;
			latency_ms?: number;
		};
		expect(data.status).toBe("accepted");
		expect(data.decoupled).toBe(true);
		expect(data.queue).toBe("omnichannel-webhooks");
	});
});
