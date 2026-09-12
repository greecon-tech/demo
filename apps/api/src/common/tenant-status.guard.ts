import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { RequestWithPrincipal } from "./principal";
import { PlatformService } from "../platform/platform.service";

// Runs on every authenticated request, after PrincipalGuard has resolved who the caller is.
// A suspended client's users keep a perfectly valid signed session token for up to 12h (the JWT's
// own expiry) — without this check, suspending a tenant via /platform-admin would do nothing until
// every existing session happened to expire on its own. Platform admins are exempt: they act
// across tenants by design, and the /platform-admin routes are how a tenant gets suspended at all.
@Injectable()
export class TenantStatusGuard implements CanActivate {
  constructor(private readonly platform: PlatformService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const principal = request.principal;

    if (principal.isPlatformAdmin) return true;

    if (!this.platform.isTenantActive(principal.tenantId)) {
      throw new ForbiddenException("This account's client has been suspended. Contact Greecon support.");
    }

    return true;
  }
}
