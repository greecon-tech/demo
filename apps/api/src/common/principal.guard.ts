import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { JwtClaims, jwtSecret, principalFromClaims, principalFromHeaders, RequestWithPrincipal } from "./principal";

// Session tokens travel in a dedicated header, not the standard Authorization one — on GCP,
// Authorization already carries the Cloud Run service-to-service ID token (see authHeader() in
// apps/web/src/lib/api.ts), which is infrastructure-level access control completely separate
// from a human user's identity. Reusing that header for both would silently break one or the
// other depending on deployment target.
const SESSION_HEADER = "x-greecon-session";

@Injectable()
export class PrincipalGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();
    const token = headerValue(request.headers[SESSION_HEADER]);

    if (token) {
      // A bearer token was presented — it must verify, or the request is rejected. This never
      // falls back to trusting the x-user-role header on a bad/expired token: that would let an
      // attacker regain header-trust access just by sending garbage instead of a real token.
      const secret = jwtSecret();
      if (!secret) {
        throw new UnauthorizedException("This deployment cannot verify session tokens (JWT_SECRET is not configured).");
      }
      try {
        const claims = jwt.verify(token, secret) as JwtClaims;
        request.principal = principalFromClaims(claims);
      } catch {
        throw new UnauthorizedException("Session is invalid or has expired.");
      }
      return true;
    }

    // No bearer token at all — fall back to the header-based identity (the static demo export,
    // which has no server to log in against, and local dev/test convenience). See the comment on
    // principalFromHeaders for why this is safe: it only ever fills in for a request that never
    // attempted real authentication, it does not override a failed one.
    request.principal = principalFromHeaders(request.headers);
    return true;
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
