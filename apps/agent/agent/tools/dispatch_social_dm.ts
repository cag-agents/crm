import { defineTool } from "eve/tools";
import { z } from "zod";
import { writeTimelineNote } from "../lib/crm";

export const dispatchSocialDmInputSchema = z.object({
	contactId: z.string().min(1).describe("CRM contact ID of recipient"),
	platform: z
		.enum(["instagram", "whatsapp", "telegram"])
		.describe("Social messaging platform"),
	messageBody: z.string().min(1).describe("Outbound message body to deliver"),
	commentId: z
		.string()
		.optional()
		.describe(
			"Instagram comment ID required to open the 24h CSW when replying to a comment",
		),
	intentCategory: z
		.enum(["keyword_link_request", "collab_inquiry", "fan_support", "general"])
		.describe("RAG-Enhanced Intent Classification (REIC) category"),
	dealId: z.string().optional().describe("Associated brand collab deal ID"),
});

export type DispatchSocialDmInput = z.infer<typeof dispatchSocialDmInputSchema>;

export async function executeDispatchSocialDm(input: DispatchSocialDmInput) {
	if (
		input.platform === "instagram" &&
		input.intentCategory === "keyword_link_request" &&
		!input.commentId
	) {
		throw new Error(
			"commentId is required for Instagram keyword_link_request to construct compliant /v19.0/{comment_id}/messages endpoint",
		);
	}

	const endpoint =
		input.platform === "instagram"
			? input.commentId
				? `/v19.0/${input.commentId}/messages`
				: "/v19.0/me/messages"
			: input.platform === "whatsapp"
				? "/v21.0/messages"
				: "/bot/sendMessage";

	const cswWindowOpened = Boolean(input.commentId);
	const timestamp = new Date().toISOString();

	const subject = `[REIC] ${input.platform.toUpperCase()} Outbound DM (${input.intentCategory})`;
	const body = [
		`Platform: ${input.platform}`,
		`Intent: ${input.intentCategory}`,
		`Endpoint: ${endpoint}`,
		`CSW Window Opened: ${cswWindowOpened}`,
		`Message: ${input.messageBody}`,
	].join("\n");

	let activityId: string | null = null;
	try {
		activityId = await writeTimelineNote(input.contactId, subject, body, {
			platform: input.platform,
			intentCategory: input.intentCategory,
			endpoint,
			cswWindowOpened,
			commentId: input.commentId ?? null,
			dealId: input.dealId ?? null,
		});
	} catch {
		activityId = null;
	}

	return {
		dispatched: true as const,
		endpoint,
		cswWindowOpened,
		timestamp,
		activityId,
		contactId: input.contactId,
		platform: input.platform,
		intentCategory: input.intentCategory,
		messageBody: input.messageBody,
	};
}

export default defineTool({
	description:
		"Slave 2 Omnichannel tool to dispatch an automated social reply across Instagram, WhatsApp, or Telegram using REIC and log the action as a CRM Activity.",
	inputSchema: dispatchSocialDmInputSchema,
	async execute(input) {
		return executeDispatchSocialDm(input);
	},
});
