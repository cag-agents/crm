import { Module } from "@nestjs/common";
import { AgentModule } from "../agent/agent.module";
import { TrpcModule } from "../trpc/trpc.module";
import { ConversationAttachmentsController } from "./conversation-attachments.controller";
import { ConversationSharingService } from "./conversation-sharing.service";
import { ConversationsRouter } from "./conversations.router";
import { ConversationsService } from "./conversations.service";
import { WebhookIngestController } from "./webhook-ingest.controller";

@Module({
	imports: [TrpcModule, AgentModule],
	controllers: [ConversationAttachmentsController, WebhookIngestController],
	providers: [
		ConversationsService,
		ConversationSharingService,
		ConversationsRouter,
	],
	exports: [ConversationsService],
})
export class ConversationsModule {}
