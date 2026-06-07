import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Permission, hasPermission } from "@greecon/shared";
import { RequestWithPrincipal } from "./principal";

export const REQUIRED_PERMISSIONS = "required_permissions";

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const principal = request.principal;
    const denied = required.filter((permission) => !hasPermission(principal.role, permission));

    if (denied.length > 0) {
      throw new ForbiddenException({
        message: "Action blocked by access policy.",
        required: denied,
        role: principal.role
      });
    }

    return true;
  }
}
