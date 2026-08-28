import { DEMO_TENANT_ID, UserRole, userRoles } from "@greecon/shared";

export const DEMO_OWNER_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
export const DEMO_OPERATOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
export const DEMO_AUDITOR_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";

export interface Principal {
  tenantId: string;
  userId: string;
  role: UserRole;
  email: string;
}

export interface JwtClaims {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

export function jwtSecret(): string | undefined {
  return process.env.JWT_SECRET;
}

export interface RequestWithPrincipal {
  headers: Record<string, string | string[] | undefined>;
  principal: Principal;
}

export function principalFromClaims(claims: JwtClaims): Principal {
  const role: UserRole = userRoles.includes(claims.role) ? claims.role : "viewer";
  return {
    tenantId: claims.tenantId,
    userId: claims.sub,
    role,
    email: claims.email
  };
}

/** Header-based identity — the ONLY path before real login existed. Now used solely as a
 * fallback when no bearer token is present at all: the static GitHub Pages export (which has no
 * server to log in against) and local dev convenience. A request that presents a bearer token
 * must have it verify, or it's rejected outright (see principal.guard.ts) — this fallback never
 * overrides a bad token, only fills in for a request that never tried to authenticate. */
export function principalFromHeaders(headers: Record<string, string | string[] | undefined>): Principal {
  const role = headerValue(headers["x-user-role"]);
  const safeRole: UserRole = role && userRoles.includes(role as UserRole) ? (role as UserRole) : "operator";
  const tenantId = headerValue(headers["x-tenant-id"]) ?? process.env.GREECON_DEFAULT_TENANT_ID ?? DEMO_TENANT_ID;
  const userId = headerValue(headers["x-user-id"]) ?? userIdForRole(safeRole);
  const email = headerValue(headers["x-user-email"]) ?? emailForRole(safeRole);

  return {
    tenantId,
    userId,
    role: safeRole,
    email
  };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function userIdForRole(role: UserRole): string {
  if (role === "auditor") return DEMO_AUDITOR_ID;
  if (role === "operator") return DEMO_OPERATOR_ID;
  return DEMO_OWNER_ID;
}

function emailForRole(role: UserRole): string {
  if (role === "auditor") return "auditor@greecon.earth";
  if (role === "operator") return "operator@greecon.earth";
  return "eridon.manuka@greecon.earth";
}
