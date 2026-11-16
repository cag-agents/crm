import { describe, expect, it } from "bun:test";
import { calculateCswExpiry, isCswActive } from "./csw";
import appObj from "./index";

describe("WhatsApp Microservice Webhook and API Tests", () => {
	it("GET /health returns status ok", async () => {
		const res = await appObj.fetch(new Request("http://localhost:3004/health"));
		expect(res.status).toBe(200);
		const data = (await res.json()) as { status: string; service: string };
		expect(data.status).toBe("ok");
		expect(data.service).toBe("whatsapp");
	});

	it("GET /webhook/whatsapp verifies with valid token", async () => {
		const challenge = "CHALLENGE_WHATSAPP_98765";
		const token = process.env.WHATSAPP_VERIFY_TOKEN || "cag_crm_whatsapp_token";

		const res = await appObj.fetch(
			new Request(
				`http://localhost:3004/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${token}&hub.challenge=${challenge}`,
			),
		);

		expect(res.status).toBe(200);
		const body = await res.text();
		expect(body).toBe(challenge);
	});

	it("GET /webhook/whatsapp rejects invalid token", async () => {
		const res = await appObj.fetch(
			new Request(
				"http://localhost:3004/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=123",
			),
		);

		expect(res.status).toBe(403);
	});

	it("POST /webhook/whatsapp returns 200 EVENT_RECEIVED for text message payload", async () => {
		const samplePayload = {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "waba_123456789",
					changes: [
						{
							field: "messages",
							value: {
								messaging_product: "whatsapp",
								metadata: {
									display_phone_number: "+15551234567",
									phone_number_id: "phone_id_999",
								},
								contacts: [
									{
										profile: {
											name: "Test Customer",
										},
										wa_id: "15559876543",
									},
								],
								messages: [
									{
										from: "15559876543",
										id: "wamid.HBgLMTE1NTU5ODc2NTQzFQIAEhggM",
										timestamp: String(Math.floor(Date.now() / 1000)),
										type: "text",
										text: {
											body: "Hello, I want to inquire about pricing.",
										},
									},
								],
							},
						},
					],
				},
			],
		};

		const res = await appObj.fetch(
			new Request("http://localhost:3004/webhook/whatsapp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(samplePayload),
			}),
		);

		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toBe("EVENT_RECEIVED");
	});

	it("POST /webhook/whatsapp handles media and button payloads", async () => {
		const mediaPayload = {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "waba_123456789",
					changes: [
						{
							field: "messages",
							value: {
								messaging_product: "whatsapp",
								metadata: {
									display_phone_number: "+15551234567",
									phone_number_id: "phone_id_999",
								},
								messages: [
									{
										from: "15559876543",
										id: "wamid.IMAGE_123",
										timestamp: String(Math.floor(Date.now() / 1000)),
										type: "image",
										image: {
											id: "media_img_1",
											mime_type: "image/jpeg",
											caption: "Photo of receipt",
										},
									},
									{
										from: "15559876543",
										id: "wamid.BTN_456",
										timestamp: String(Math.floor(Date.now() / 1000)),
										type: "interactive",
										interactive: {
											type: "button_reply",
											button_reply: {
												id: "btn_confirm",
												title: "Confirm Order",
											},
										},
									},
								],
							},
						},
					],
				},
			],
		};

		const res = await appObj.fetch(
			new Request("http://localhost:3004/webhook/whatsapp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(mediaPayload),
			}),
		);

		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toBe("EVENT_RECEIVED");
	});

	it("POST /webhook/whatsapp handles delivery statuses", async () => {
		const statusPayload = {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "waba_123456789",
					changes: [
						{
							field: "messages",
							value: {
								messaging_product: "whatsapp",
								metadata: {
									display_phone_number: "+15551234567",
									phone_number_id: "phone_id_999",
								},
								statuses: [
									{
										id: "wamid.HBgLMTE1NTU5ODc2NTQzFQIAEhggM",
										status: "delivered",
										timestamp: String(Math.floor(Date.now() / 1000)),
										recipient_id: "15559876543",
									},
									{
										id: "wamid.HBgLMTE1NTU5ODc2NTQzFQIAEhggM",
										status: "read",
										timestamp: String(Math.floor(Date.now() / 1000)),
										recipient_id: "15559876543",
									},
								],
							},
						},
					],
				},
			],
		};

		const res = await appObj.fetch(
			new Request("http://localhost:3004/webhook/whatsapp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(statusPayload),
			}),
		);

		expect(res.status).toBe(200);
		const text = await res.text();
		expect(text).toBe("EVENT_RECEIVED");
	});

	it("POST /api/send rejects requests with missing channelId or recipientPhone", async () => {
		const res = await appObj.fetch(
			new Request("http://localhost:3004/api/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ text: "Hello" }),
			}),
		);

		expect(res.status).toBe(400);
		const data = (await res.json()) as { error: string };
		expect(data.error).toContain("required");
	});

	it("POST /api/send rejects requests with no text, media, or buttons", async () => {
		const res = await appObj.fetch(
			new Request("http://localhost:3004/api/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					channelId: "wa_123",
					recipientPhone: "15559876543",
				}),
			}),
		);

		expect(res.status).toBe(400);
		const data = (await res.json()) as { error: string };
		expect(data.error).toContain("required");
	});

	it("POST /api/template/send rejects requests with missing templateName", async () => {
		const res = await appObj.fetch(
			new Request("http://localhost:3004/api/template/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					channelId: "wa_123",
					recipientPhone: "15559876543",
				}),
			}),
		);

		expect(res.status).toBe(400);
		const data = (await res.json()) as { error: string };
		expect(data.error).toContain("templateName");
	});

	it("CSW tracker computes 24-hour expiry and checks active status", () => {
		const now = new Date();
		const expiry = calculateCswExpiry(now);
		expect(expiry.getTime() - now.getTime()).toBe(24 * 60 * 60 * 1000);

		const activeFuture = new Date(Date.now() + 10000);
		expect(isCswActive(activeFuture)).toBe(true);

		const expiredPast = new Date(Date.now() - 10000);
		expect(isCswActive(expiredPast)).toBe(false);

		expect(isCswActive(null)).toBe(false);
		expect(isCswActive(undefined)).toBe(false);
		expect(isCswActive("invalid-date")).toBe(false);
	});
});
