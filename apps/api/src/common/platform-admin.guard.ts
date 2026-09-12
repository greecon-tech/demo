import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { RequestWithPrincipal } from "./principal";

// Separate from RbacGuard/@RequirePermissions on purpose: platform-admin status is a cross-tenant
// capability held by Greecon's own staff, not a role within a tenant's own RBAC model (see
// principal.ts). Applied directly to the platform-admin controller, not per-route metadata.
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    if (!request.principal.isPlatformAdmin) {
      throw new ForbiddenException("This action requires Greecon platform-administrator access.");
    }
    return true;
  }
}
