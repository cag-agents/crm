import { db, type Prisma } from "@crm/db";
import { defineTool } from "eve/tools";
import { askQuestionInputSchema } from "../subagents/agent_runner/tools/ask_question";

export default defineTool({
	description:
		"Ask the creator host a question or pause for human approval on high-stakes sponsorship decisions. Populates pendingInputRequest for one-click confirmation in the CRM UI.",
	inputSchema: askQuestionInputSchema,
	async execute(input, ctx) {
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
			},
		};

		if (ctx.session?.id) {
			await db.agentConversation.updateMany({
				where: { sessionId: ctx.session.id },
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
