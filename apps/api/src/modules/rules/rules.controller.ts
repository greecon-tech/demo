import { Controller, Get, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("rules")
export class RulesController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("automation:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listRules(request.principal, siteId);
  }

  @Post("simulate")
  @RequirePermissions("automation:read")
  simulate(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.simulateRules(request.principal, siteId);
  }
}
