import { Module } from "@nestjs/common";
import { OmnichannelRouter } from "./omnichannel.router";
import { OmnichannelService } from "./omnichannel.service";

@Module({
	providers: [OmnichannelService, OmnichannelRouter],
	exports: [OmnichannelService],
})
export class OmnichannelModule {}
