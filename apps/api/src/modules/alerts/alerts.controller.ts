import { Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("alerts")
export class AlertsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("alert:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listAlerts(request.principal, siteId);
  }

  @Post(":alertId/acknowledge")
  @RequirePermissions("alert:acknowledge")
  acknowledge(@Param("alertId") alertId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.acknowledgeAlert(alertId, request.principal);
  }
}
