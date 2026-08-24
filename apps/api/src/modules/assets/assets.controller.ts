import { Controller, Get, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("assets")
export class AssetsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("asset:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listAssets(request.principal, siteId);
  }
}
