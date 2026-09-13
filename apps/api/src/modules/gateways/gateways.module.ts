import { Module } from "@nestjs/common";
import { GatewaysController } from "./gateways.controller";

@Module({
  controllers: [GatewaysController]
})
export class GatewaysModule {}
