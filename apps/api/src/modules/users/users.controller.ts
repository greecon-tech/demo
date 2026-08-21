import { Controller, Get, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";

@Controller("users")
export class UsersController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("user:manage")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listUsers(request.principal);
  }
}
