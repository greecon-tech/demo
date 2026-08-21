import { Controller, Get, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller()
export class TenantsController {
  constructor(private readonly platform: PlatformService) {}

  @Get("tenants")
  @RequirePermissions("tenant:read")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listTenants(request.principal);
  }

  @Get("overview")
  @RequirePermissions("tenant:read")
  overview(@Req() request: RequestWithPrincipal) {
    return this.platform.overview(request.principal);
  }
}
