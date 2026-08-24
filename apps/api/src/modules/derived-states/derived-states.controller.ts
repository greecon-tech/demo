import { Controller, Get, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("derived-states")
export class DerivedStatesController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("point:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listDerivedStates(request.principal, siteId);
  }
}
