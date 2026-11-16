import { defineTool } from "eve/tools";
import { z } from "zod";

export const evaluateSponsorshipOfferInputSchema = z.object({
	brandName: z.string().min(1).describe("Name of the sponsoring brand"),
	deliverables: z
		.string()
		.min(1)
		.describe(
			"Requested deliverables, e.g. 1x Dedicated YT Video + 2x IG Reels",
		),
	offeredAmountInr: z
		.number()
		.nonnegative()
		.describe("Offered sponsorship budget in INR"),
	exclusivityDays: z
		.number()
		.int()
		.nonnegative()
		.default(0)
		.describe("Number of category exclusivity days requested"),
	dealId: z
		.string()
		.optional()
		.describe("Existing deal ID in CRM if already tracked"),
});

export type EvaluateSponsorshipOfferInput = z.infer<
	typeof evaluateSponsorshipOfferInputSchema
>;

export function calculateCreatorBenchmarkRate(
	deliverables: string,
	exclusivityDays = 0,
): number {
	const text = deliverables.toLowerCase();
	let base = 0;

	if (
		text.includes("dedicated") ||
		text.includes("yt video") ||
		text.includes("youtube")
	) {
		const match = text.match(
			/(\d+)\s*(?:x)?\s*(?:dedicated)?\s*(?:yt|youtube)/,
		);
		const count = match ? Number(match[1]) : 1;
		base += count * 150_000;
	}

	if (
		text.includes("reel") ||
		text.includes("ig") ||
		text.includes("instagram")
	) {
		const match = text.match(/(\d+)\s*(?:x)?\s*(?:ig|instagram)?\s*reel/);
		const count = match ? Number(match[1]) : text.includes("reel") ? 1 : 0;
		base += count * 50_000;
	}

	if (text.includes("story") || text.includes("stories")) {
		const match = text.match(/(\d+)\s*(?:x)?\s*(?:ig|instagram)?\s*stor/);
		const count = match ? Number(match[1]) : 1;
		base += count * 20_000;
	}

	if (text.includes("integration") || text.includes("integrated")) {
		const match = text.match(/(\d+)\s*(?:x)?\s*integrat/);
		const count = match ? Number(match[1]) : 1;
		base += count * 75_000;
	}

	if (base === 0) {
		base = 100_000;
	}

	const exclusivitySurcharge = Math.round(base * (exclusivityDays * 0.01));
	return base + exclusivitySurcharge;
}

export function executeEvaluateSponsorshipOffer(
	input: EvaluateSponsorshipOfferInput,
) {
	const benchmarkInr = calculateCreatorBenchmarkRate(
		input.deliverables,
		input.exclusivityDays,
	);

	let status:
		| "APPROVE_READY"
		| "COUNTER_OFFER_RECOMMENDED"
		| "HIGH_RISK_ESCALATION";

	if (input.offeredAmountInr >= benchmarkInr) {
		status = "APPROVE_READY";
	} else if (input.offeredAmountInr >= benchmarkInr * 0.7) {
		status = "COUNTER_OFFER_RECOMMENDED";
	} else {
		status = "HIGH_RISK_ESCALATION";
	}

	const requiresHostApproval =
		input.offeredAmountInr >= 200_000 || input.exclusivityDays > 30;

	const targetCounterInr = Math.max(benchmarkInr, input.offeredAmountInr);

	const counterOfferDraft = [
		`Subject: Partnership Proposal & Commercial Terms — ${input.brandName} x Creator`,
		"",
		`Hi ${input.brandName} Team,`,
		"",
		`Thank you for reaching out regarding a collaboration for: ${input.deliverables}.`,
		"",
		`Based on our current engagement metrics, demographic reach, and production requirements, our creator rate-card benchmark for these deliverables is ₹${benchmarkInr.toLocaleString("en-IN")} INR${
			input.exclusivityDays > 0
				? ` (including ${input.exclusivityDays} days of category exclusivity)`
				: ""
		}.`,
		"",
		`We propose a commercial package of ₹${targetCounterInr.toLocaleString("en-IN")} INR covering:`,
		`- ${input.deliverables}`,
		`- Deliverable turnaround: 7-10 business days following script approval`,
		`- Commercial terms: 50% advance on agreement, 50% on deliverable publication`,
		"",
		"Please confirm if this works for your campaign timeline so we can reserve production dates.",
		"",
		"Best regards,",
		"Creator Talent Partnerships Team",
	].join("\n");

	const reasons: string[] = [];
	if (input.offeredAmountInr >= 200_000) {
		reasons.push(
			`Offered budget exceeds ₹2 Lakhs threshold (₹${input.offeredAmountInr.toLocaleString("en-IN")} INR)`,
		);
	}
	if (input.exclusivityDays > 30) {
		reasons.push(
			`Category exclusivity exceeds 30-day limit (${input.exclusivityDays} days)`,
		);
	}
	if (status === "HIGH_RISK_ESCALATION") {
		reasons.push(
			`Significant budget gap (Offered: ₹${input.offeredAmountInr.toLocaleString("en-IN")} vs Benchmark: ₹${benchmarkInr.toLocaleString("en-IN")})`,
		);
	}

	const approvalSummary = [
		`### Brand Collab Approval Request: ${input.brandName}`,
		`- **Deliverables**: ${input.deliverables}`,
		`- **Offered Budget**: ₹${input.offeredAmountInr.toLocaleString("en-IN")} INR`,
		`- **Benchmark Rate**: ₹${benchmarkInr.toLocaleString("en-IN")} INR`,
		`- **Exclusivity**: ${input.exclusivityDays} days`,
		`- **Offer Status**: ${status}`,
		`- **Requires Host Approval (HITL)**: ${requiresHostApproval ? "YES" : "NO"}`,
		requiresHostApproval
			? `- **Escalation Reason**: ${reasons.join("; ")}`
			: "- **Action**: Offer within autonomous creator parameters",
	].join("\n");

	return {
		brandName: input.brandName,
		deliverables: input.deliverables,
		offeredAmountInr: input.offeredAmountInr,
		benchmarkInr,
		status,
		requiresHostApproval,
		counterOfferDraft,
		approvalSummary,
		dealId: input.dealId,
	};
}

export default defineTool({
	description:
		"Slave 1 Brand Sponsorship tool to evaluate sponsor brand budget offers in INR against creator rate cards and trigger HITL approval gates.",
	inputSchema: evaluateSponsorshipOfferInputSchema,
	async execute(input) {
		return executeEvaluateSponsorshipOffer(input);
	},
});
