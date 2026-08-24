import { Body, Controller, Get, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { TelemetryMessageDto } from "./telemetry-reading.dto";

@Controller("telemetry")
export class TelemetryController {
  constructor(private readonly platform: PlatformService) {}

  @Post("ingest")
  @RequirePermissions("telemetry:ingest")
  ingest(@Body() body: TelemetryMessageDto, @Req() request: RequestWithPrincipal) {
    return this.platform.ingestTelemetry(body, request.principal);
  }

  @Get("latest")
  @RequirePermissions("point:read")
  latest(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.latestTelemetry(request.principal, siteId);
  }
}
