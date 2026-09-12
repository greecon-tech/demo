import { Body, Controller, Get, Put, Req } from "@nestjs/common";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { SaveDashboardPreferencesDto } from "./dashboard-preferences.dto";

// Deliberately no @RequirePermissions here — every role can arrange their own view of their own
// dashboard, and this only ever reads/writes the caller's own row (keyed by principal.userId),
// never anyone else's.
@Controller("dashboard-preferences")
export class DashboardController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  get(@Req() request: RequestWithPrincipal) {
    return this.platform.getDashboardPreferences(request.principal);
  }

  @Put()
  save(@Body() body: SaveDashboardPreferencesDto, @Req() request: RequestWithPrincipal) {
    return this.platform.saveDashboardPreferences(body.widgets, request.principal);
  }
}
