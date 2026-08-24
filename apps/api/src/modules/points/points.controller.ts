import { Controller, Get, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("points")
export class PointsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("point:read")
  list(@Query("deviceId") deviceId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listPoints(request.principal, deviceId);
  }
}
