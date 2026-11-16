import { describe, expect, it } from "bun:test";
import {
	HIGH_STAKES_SPONSORSHIP_THRESHOLDS,
	isHighStakesSponsorship,
} from "../agent/lib/approval";
import { executeDispatchSocialDm } from "../agent/subagents/agent_runner/tools/dispatch_social_dm";
import {
	calculateCreatorBenchmarkRate,
	executeEvaluateSponsorshipOffer,
} from "../agent/subagents/agent_runner/tools/evaluate_sponsorship_offer";

describe("dispatch_social_dm tool", () => {
	it("constructs compliant /v19.0/{comment_id}/messages endpoint for Instagram keyword_link_request", async () => {
		const result = await executeDispatchSocialDm({
			contactId: "contact_test_1",
			platform: "instagram",
			messageBody:
				"Here is your requested product link: https://creator.store/deal",
			commentId: "comment_insta_987",
			intentCategory: "keyword_link_request",
		});

		expect(result.dispatched).toBe(true);
		expect(result.endpoint).toBe("/v19.0/comment_insta_987/messages");
		expect(result.cswWindowOpened).toBe(true);
		expect(result.platform).toBe("instagram");
		expect(result.intentCategory).toBe("keyword_link_request");
	});

	it("throws when Instagram keyword_link_request lacks required commentId", async () => {
		expect(
			executeDispatchSocialDm({
				contactId: "contact_test_2",
				platform: "instagram",
				messageBody: "Here is your link",
				intentCategory: "keyword_link_request",
			}),
		).rejects.toThrow("commentId is required");
	});

	it("uses /v19.0/me/messages for standard Instagram DM without commentId", async () => {
		const result = await executeDispatchSocialDm({
			contactId: "contact_test_3",
			platform: "instagram",
			messageBody: "Thanks for reaching out!",
			intentCategory: "general",
		});

		expect(result.dispatched).toBe(true);
		expect(result.endpoint).toBe("/v19.0/me/messages");
		expect(result.cswWindowOpened).toBe(false);
	});

	it("uses /v21.0/messages for WhatsApp dispatches", async () => {
		const result = await executeDispatchSocialDm({
			contactId: "contact_test_4",
			platform: "whatsapp",
			messageBody: "Hello from creator talent team!",
			intentCategory: "collab_inquiry",
		});

		expect(result.dispatched).toBe(true);
		expect(result.endpoint).toBe("/v21.0/messages");
		expect(result.cswWindowOpened).toBe(false);
	});

	it("uses /bot/sendMessage for Telegram dispatches", async () => {
		const result = await executeDispatchSocialDm({
			contactId: "contact_test_5",
			platform: "telegram",
			messageBody: "Welcome to the superfan group!",
			intentCategory: "fan_support",
		});

		expect(result.dispatched).toBe(true);
		expect(result.endpoint).toBe("/bot/sendMessage");
		expect(result.cswWindowOpened).toBe(false);
	});
});

describe("evaluate_sponsorship_offer tool", () => {
	it("correctly calculates benchmark for 1x Dedicated YT Video + 2x IG Reels", () => {
		const benchmark = calculateCreatorBenchmarkRate(
			"1x Dedicated YT Video + 2x IG Reels",
			0,
		);
		expect(benchmark).toBe(250_000);
	});

	it("adds exclusivity surcharge to benchmark rate", () => {
		const benchmark = calculateCreatorBenchmarkRate(
			"1x Dedicated YT Video + 2x IG Reels",
			10,
		);
		expect(benchmark).toBe(275_000);
	});

	it("approves offer meeting benchmark and flags HITL for offers >= ₹2 Lakhs", () => {
		const evaluation = executeEvaluateSponsorshipOffer({
			brandName: "Acme Tech",
			deliverables: "1x Dedicated YT Video + 2x IG Reels",
			offeredAmountInr: 250_000,
			exclusivityDays: 0,
		});

		expect(evaluation.status).toBe("APPROVE_READY");
		expect(evaluation.requiresHostApproval).toBe(true);
		expect(evaluation.benchmarkInr).toBe(250_000);
		expect(evaluation.approvalSummary).toContain("Acme Tech");
		expect(evaluation.approvalSummary).toContain("APPROVE_READY");
	});

	it("recommends counter-offer when offer is between 70% and 100% of benchmark", () => {
		const evaluation = executeEvaluateSponsorshipOffer({
			brandName: "Beta Snacks",
			deliverables: "2x IG Reels",
			offeredAmountInr: 80_000,
			exclusivityDays: 0,
		});

		expect(evaluation.status).toBe("COUNTER_OFFER_RECOMMENDED");
		expect(evaluation.requiresHostApproval).toBe(false);
		expect(evaluation.counterOfferDraft).toContain("Beta Snacks");
	});

	it("flags HIGH_RISK_ESCALATION when offer is below 70% of benchmark", () => {
		const evaluation = executeEvaluateSponsorshipOffer({
			brandName: "Lowball Apparel",
			deliverables: "1x Dedicated YT Video + 2x IG Reels",
			offeredAmountInr: 100_000,
			exclusivityDays: 0,
		});

		expect(evaluation.status).toBe("HIGH_RISK_ESCALATION");
		expect(evaluation.requiresHostApproval).toBe(false);
	});

	it("flags requiresHostApproval for exclusivity exceeding 30 days regardless of budget", () => {
		const evaluation = executeEvaluateSponsorshipOffer({
			brandName: "Exclusive Drink",
			deliverables: "1x IG Reel",
			offeredAmountInr: 50_000,
			exclusivityDays: 45,
		});

		expect(evaluation.requiresHostApproval).toBe(true);
		expect(evaluation.approvalSummary).toContain("45 days");
	});

	it("flags requiresHostApproval when offered budget is exactly ₹2 Lakhs", () => {
		const evaluation = executeEvaluateSponsorshipOffer({
			brandName: "Growth Brand",
			deliverables: "1x Dedicated YT Video",
			offeredAmountInr: 200_000,
			exclusivityDays: 0,
		});

		expect(evaluation.requiresHostApproval).toBe(true);
	});
});

describe("HITL approval thresholds", () => {
	it("correctly defines threshold constants", () => {
		expect(HIGH_STAKES_SPONSORSHIP_THRESHOLDS.amountInr).toBe(200_000);
		expect(HIGH_STAKES_SPONSORSHIP_THRESHOLDS.exclusivityDays).toBe(30);
	});

	it("evaluates high-stakes sponsorship thresholds", () => {
		expect(isHighStakesSponsorship(200_000, 0)).toBe(true);
		expect(isHighStakesSponsorship(250_000, 10)).toBe(true);
		expect(isHighStakesSponsorship(100_000, 35)).toBe(true);
		expect(isHighStakesSponsorship(150_000, 20)).toBe(false);
		expect(isHighStakesSponsorship(50_000, 0)).toBe(false);
	});
});
