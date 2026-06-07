import { Controller, Get, Req } from "@nestjs/common";
import { PlatformService } from "../../platform/platform.service";
import { RequestWithPrincipal } from "../../common/principal";

@Controller("auth")
export class AuthController {
  constructor(private readonly platform: PlatformService) {}

  @Get("session")
  session(@Req() request: RequestWithPrincipal) {
    return this.platform.session(request.principal);
  }
}
