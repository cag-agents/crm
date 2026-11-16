import { db, type Prisma } from "@crm/db";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { requireTeamAgentAttribute } from "../../../lib/session-purpose";

export const askQuestionInputSchema = z.object({
	question: z
		.string()
		.trim()
		.min(1)
		.max(2_000)
		.describe(
			"The question or sponsorship approval decision to present to the creator host",
		),
	options: z
		.array(z.string().trim().min(1))
		.optional()
		.describe("Choice options for one-click confirmation"),
	dealId: z.string().optional().describe("Associated brand collab deal ID"),
	offeredAmountInr: z.number().optional().describe("Sponsorship offer in INR"),
});

export default defineTool({
	description:
		"Ask the creator host a question or pause for human approval on high-stakes sponsorship decisions. Populates pendingInputRequest for one-click confirmation in the CRM UI.",
	inputSchema: askQuestionInputSchema,
	async execute(input, ctx) {
		const runId = requireTeamAgentAttribute(ctx, "runId");

		const requestPayload = {
			kind: "question",
			requestId: ctx.callId,
			prompt: input.question,
			display: input.options && input.options.length > 0 ? "select" : "text",
			options:
				input.options?.map((opt, i) => ({ id: `opt_${i + 1}`, label: opt })) ??
				[],
			metadata: {
				dealId: input.dealId,
				offeredAmountInr: input.offeredAmountInr,
				runId,
			},
		};

		const run = await db.agentRun.findUnique({
			where: { id: runId },
			select: { id: true, sessionId: true },
		});

		const targetSessionId = run?.sessionId || ctx.session.id;

		if (targetSessionId) {
			await db.agentConversation.updateMany({
				where: { sessionId: targetSessionId },
				data: {
					pendingInputRequest: requestPayload as Prisma.InputJsonValue,
				},
			});
		}

		return {
			submitted: true,
			status: "PENDING_HOST_APPROVAL",
			question: input.question,
			options: input.options ?? [],
			dealId: input.dealId,
			offeredAmountInr: input.offeredAmountInr,
		};
	},
});
