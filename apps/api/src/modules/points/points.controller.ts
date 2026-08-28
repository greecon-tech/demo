import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreatePointDto } from "./create-point.dto";
import { UpdatePointDto } from "./update-point.dto";

@Controller("points")
export class PointsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("point:read")
  list(@Query("deviceId") deviceId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listPoints(request.principal, deviceId);
  }

  // Points always belong to a device, and there's no separate point:manage permission —
  // managing a device's points is part of managing the device (docs/07-security-and-rbac.md's
  // role table already describes it that way: "manage sites, assets, devices").
  @Post()
  @RequirePermissions("device:manage")
  create(@Body() body: CreatePointDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createPoint(body, request.principal);
  }

  @Patch(":pointId")
  @RequirePermissions("device:manage")
  update(@Param("pointId") pointId: string, @Body() body: UpdatePointDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updatePoint(pointId, body, request.principal);
  }

  @Delete(":pointId")
  @RequirePermissions("device:manage")
  remove(@Param("pointId") pointId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.deletePoint(pointId, request.principal);
  }
}
