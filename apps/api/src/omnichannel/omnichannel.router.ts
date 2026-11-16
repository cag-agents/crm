import { Inject } from "@nestjs/common";
import {
	Ctx,
	Input,
	Mutation,
	Query,
	Router,
	UseMiddlewares,
} from "nestjs-trpc";
import type { z } from "zod";
import type { AuthedTrpcContext } from "../trpc/context.types";
import { AuthMiddleware } from "../trpc/middlewares/auth.middleware";
import { restMeta } from "../trpc/openapi";
import {
	getMessagesInput,
	getMessagesOutput,
	getMetricsInput,
	getMetricsOutput,
	listConversationsInput,
	listConversationsOutput,
	sendReplyInput,
	sendReplyOutput,
	updateConversationInput,
	updateConversationOutput,
} from "./omnichannel.contracts";
import { OmnichannelService } from "./omnichannel.service";

@Router({ alias: "omnichannel" })
@UseMiddlewares(AuthMiddleware)
export class OmnichannelRouter {
	constructor(
		@Inject(OmnichannelService)
		private readonly omnichannel: OmnichannelService,
	) {}

	@Query({
		input: listConversationsInput,
		output: listConversationsOutput,
		meta: restMeta("GET", "/omnichannel/conversations", ["Omnichannel"]),
	})
	async list(
		@Ctx() _ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof listConversationsInput>,
	) {
		return this.omnichannel.listConversations(input);
	}

	@Query({
		input: getMessagesInput,
		output: getMessagesOutput,
		meta: restMeta("GET", "/omnichannel/messages", ["Omnichannel"]),
	})
	async messages(
		@Ctx() _ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof getMessagesInput>,
	) {
		return this.omnichannel.getMessages(input);
	}

	@Mutation({
		input: sendReplyInput,
		output: sendReplyOutput,
		meta: restMeta("POST", "/omnichannel/reply", ["Omnichannel"]),
	})
	async reply(
		@Ctx() ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof sendReplyInput>,
	) {
		return this.omnichannel.sendReply(input, ctx.user?.id);
	}

	@Mutation({
		input: updateConversationInput,
		output: updateConversationOutput,
		meta: restMeta("PATCH", "/omnichannel/conversations", ["Omnichannel"]),
	})
	async update(
		@Ctx() _ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof updateConversationInput>,
	) {
		return this.omnichannel.updateConversation(input);
	}

	@Query({
		input: getMetricsInput,
		output: getMetricsOutput,
		meta: restMeta("GET", "/omnichannel/metrics", ["Omnichannel"]),
	})
	async metrics(
		@Ctx() _ctx: AuthedTrpcContext,
		@Input() input: z.infer<typeof getMetricsInput>,
	) {
		return this.omnichannel.getMetrics(input);
	}
}
