import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { PlatformService } from "../../platform/platform.service";
import { RequestWithPrincipal } from "../../common/principal";
import { AuthService } from "./auth.service";
import { LoginDto } from "./login.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly platform: PlatformService,
    private readonly auth: AuthService
  ) {}

  // Deliberately not behind @RequirePermissions — there is no principal to check permissions
  // against until this succeeds.
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Get("session")
  session(@Req() request: RequestWithPrincipal) {
    return this.platform.session(request.principal);
  }
}
