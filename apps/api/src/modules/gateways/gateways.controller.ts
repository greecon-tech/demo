import { Body, Controller, Delete, Get, Param, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateGatewayDto } from "./create-gateway.dto";

@Controller("gateways")
export class GatewaysController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("device:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listGateways(request.principal, siteId);
  }

  // Returns the real one-time secret in the response body alongside the gateway record — never
  // stored anywhere except as a hash, same one-time-disclosure handling as a new user's temporary
  // password (see PlatformService.createGateway).
  @Post()
  @RequirePermissions("device:manage")
  create(@Body() body: CreateGatewayDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createGateway(body, request.principal);
  }

  @Delete(":gatewayId")
  @RequirePermissions("device:manage")
  remove(@Param("gatewayId") gatewayId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.deleteGateway(gatewayId, request.principal);
  }
}
