import { Body, Controller, Get, Param, Patch, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { UpdateIncidentStatusDto } from "./update-incident-status.dto";

@Controller("incidents")
export class IncidentsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("incident:manage")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listIncidents(request.principal);
  }

  @Patch(":incidentId/status")
  @RequirePermissions("incident:manage")
  updateStatus(@Param("incidentId") incidentId: string, @Body() body: UpdateIncidentStatusDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updateIncidentStatus(incidentId, body.status, request.principal);
  }
}
