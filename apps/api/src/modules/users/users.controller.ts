import { Body, Controller, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateUserDto } from "./create-user.dto";
import { UpdateUserDto } from "./update-user.dto";

@Controller("users")
export class UsersController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("user:manage")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listUsers(request.principal);
  }

  @Post()
  @RequirePermissions("user:manage")
  create(@Body() body: CreateUserDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createUser(body, request.principal);
  }

  @Patch(":userId")
  @RequirePermissions("user:manage")
  update(@Param("userId") userId: string, @Body() body: UpdateUserDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updateUser(userId, body, request.principal);
  }
}
