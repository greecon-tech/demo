import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateDeviceDto } from "./create-device.dto";
import { UpdateDeviceDto } from "./update-device.dto";

@Controller("devices")
export class DevicesController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("device:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listDevices(request.principal, siteId);
  }

  @Post()
  @RequirePermissions("device:manage")
  create(@Body() body: CreateDeviceDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createDevice(body, request.principal);
  }

  @Patch(":deviceId")
  @RequirePermissions("device:manage")
  update(@Param("deviceId") deviceId: string, @Body() body: UpdateDeviceDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updateDevice(deviceId, body, request.principal);
  }

  @Delete(":deviceId")
  @RequirePermissions("device:manage")
  remove(@Param("deviceId") deviceId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.deleteDevice(deviceId, request.principal);
  }
}
