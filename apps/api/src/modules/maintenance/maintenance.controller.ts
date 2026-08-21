import { Controller, Get, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("maintenance:manage")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listMaintenance(request.principal);
  }
}
