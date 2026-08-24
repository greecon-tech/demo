import { Module } from "@nestjs/common";
import { DerivedStatesController } from "./derived-states.controller";

@Module({
  controllers: [DerivedStatesController]
})
export class DerivedStatesModule {}
