import { Controller, Get, Param, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("sites")
export class SitesController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("site:read")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listSites(request.principal);
  }

  @Get(":siteId")
  @RequirePermissions("site:read")
  detail(@Param("siteId") siteId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.siteDetail(siteId, request.principal);
  }
}
