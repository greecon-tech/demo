import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
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
  // against until this succeeds. Rate-limited far tighter than the global default: 8 attempts per
  // minute per caller IP is enough for a genuine user who mistypes a password, not enough for a
  // credential-stuffing run (docs/15-master-roadmap.md, Phase 0).
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  @Post("login")
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @Get("session")
  session(@Req() request: RequestWithPrincipal) {
    return this.platform.session(request.principal);
  }
}
