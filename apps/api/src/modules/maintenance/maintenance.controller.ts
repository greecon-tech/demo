import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateMaintenanceTaskDto } from "./create-maintenance-task.dto";
import { UpdateMaintenanceTaskDto } from "./update-maintenance-task.dto";

@Controller("maintenance")
export class MaintenanceController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("maintenance:manage")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listMaintenance(request.principal);
  }

  @Post()
  @RequirePermissions("maintenance:manage")
  create(@Body() body: CreateMaintenanceTaskDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createMaintenanceTask(body, request.principal);
  }

  @Patch(":taskId")
  @RequirePermissions("maintenance:manage")
  update(@Param("taskId") taskId: string, @Body() body: UpdateMaintenanceTaskDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updateMaintenanceTask(taskId, body, request.principal);
  }
}
