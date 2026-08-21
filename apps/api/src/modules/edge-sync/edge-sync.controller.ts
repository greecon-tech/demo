import { Body, Controller, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { EdgeSyncDto } from "./edge-sync.dto";

@Controller("edge-sync")
export class EdgeSyncController {
  constructor(private readonly platform: PlatformService) {}

  @Post("batches")
  @RequirePermissions("telemetry:ingest")
  create(@Body() body: EdgeSyncDto, @Req() request: RequestWithPrincipal) {
    return this.platform.recordEdgeSync(body, request.principal);
  }
}
