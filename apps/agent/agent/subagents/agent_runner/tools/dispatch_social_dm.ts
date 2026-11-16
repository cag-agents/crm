import { defineTool } from "eve/tools";
import {
	dispatchSocialDmInputSchema,
	executeDispatchSocialDm,
} from "../../../tools/dispatch_social_dm";

export default defineTool({
	description:
		"Slave 2 Omnichannel tool to dispatch an automated social reply across Instagram, WhatsApp, or Telegram using REIC and log the action as a CRM Activity.",
	inputSchema: dispatchSocialDmInputSchema,
	async execute(input) {
		return executeDispatchSocialDm(input);
	},
});
