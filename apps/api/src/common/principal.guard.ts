import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { principalFromHeaders, RequestWithPrincipal } from "./principal";

@Injectable()
export class PrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    request.principal = principalFromHeaders(request.headers);
    return true;
  }
}
