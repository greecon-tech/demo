import { Controller, Get, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("audit")
export class AuditController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("audit:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listAudit(request.principal, siteId);
  }
}
