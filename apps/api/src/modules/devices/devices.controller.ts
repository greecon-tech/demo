import { Controller, Get, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("devices")
export class DevicesController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("device:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listDevices(request.principal, siteId);
  }
}
