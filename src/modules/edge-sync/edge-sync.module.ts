import { Module } from "@nestjs/common";
import { EdgeSyncController } from "./edge-sync.controller";

@Module({
  controllers: [EdgeSyncController]
})
export class EdgeSyncModule {}
