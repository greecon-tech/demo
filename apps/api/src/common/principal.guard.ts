import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { edgeDeviceIngestPrincipal, JwtClaims, jwtSecret, principalFromClaims, principalFromHeaders, RequestWithPrincipal } from "./principal";

// Session tokens travel in a dedicated header, not the standard Authorization one — on GCP,
// Authorization already carries the Cloud Run service-to-service ID token (see authHeader() in
// apps/web/src/lib/api.ts), which is infrastructure-level access control completely separate
// from a human user's identity. Reusing that header for both would silently break one or the
// other depending on deployment target.
const SESSION_HEADER = "x-greecon-session";
const EDGE_DEVICE_TOKEN_HEADER = "x-edge-device-token";

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

    // No session token. A real edge device (an industrial PC at a farm site, reachable over the
    // open internet — docs/14-edge-hardware-deployment.md) authenticates with a single shared
    // secret instead of a login, scoped to exactly this one route: the "simple lock" chosen over a
    // private tunnel for the first real pilot. EDGE_INGEST_TOKEN/EDGE_INGEST_TENANT_ID must both
    // be explicitly configured — unset (the default) means this path never grants anything.
    if (isEdgeIngestRequest(request)) {
      const deviceToken = headerValue(request.headers[EDGE_DEVICE_TOKEN_HEADER]);
      const expectedToken = process.env.EDGE_INGEST_TOKEN;
      const expectedTenantId = process.env.EDGE_INGEST_TENANT_ID;
      if (expectedToken && expectedTenantId && deviceToken === expectedToken) {
        request.principal = edgeDeviceIngestPrincipal(expectedTenantId);
        return true;
      }
    }

    // No token of any kind. The header-based fallback (x-user-role/x-tenant-id) is trusted only
    // outside production — local dev convenience, and the static GitHub Pages export, which builds
    // by running the API locally with no public exposure at all (docs/12-deployment-github-pages.
    // md). Once this API has a public domain (Railway, so the edge device above can reach it),
    // trusting a self-asserted role header from literally anyone on the internet would let them
    // impersonate any role with zero credentials — so a real deployment (NODE_ENV=production, set
    // by both Dockerfiles) rejects outright here instead of falling back.
    if (process.env.NODE_ENV === "production") {
      throw new UnauthorizedException("Authentication required.");
    }

    request.principal = principalFromHeaders(request.headers);
    return true;
  }
}

function isEdgeIngestRequest(request: RequestWithPrincipal): boolean {
  return request.method === "POST" && request.path === "/telemetry/ingest";
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
