import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrincipalGuard } from "./principal.guard";
import { JwtClaims, RequestWithPrincipal } from "./principal";

function contextWithHeaders(
  headers: Record<string, string | string[] | undefined>,
  route: { path: string; method: string } = { path: "/", method: "GET" }
): ExecutionContext {
  const request = { headers, path: route.path, method: route.method, principal: undefined } as unknown as RequestWithPrincipal;
  return {
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
}

describe("PrincipalGuard", () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalEdgeToken = process.env.EDGE_INGEST_TOKEN;
  const originalEdgeTenant = process.env.EDGE_INGEST_TENANT_ID;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
    delete process.env.NODE_ENV;
    delete process.env.EDGE_INGEST_TOKEN;
    delete process.env.EDGE_INGEST_TENANT_ID;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalEdgeToken === undefined) delete process.env.EDGE_INGEST_TOKEN;
    else process.env.EDGE_INGEST_TOKEN = originalEdgeToken;
    if (originalEdgeTenant === undefined) delete process.env.EDGE_INGEST_TENANT_ID;
    else process.env.EDGE_INGEST_TENANT_ID = originalEdgeTenant;
  });

  it("falls back to header-based identity when no bearer token is present and this isn't production", () => {
    const guard = new PrincipalGuard();
    const context = contextWithHeaders({ "x-user-role": "operator" });
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();

    expect(guard.canActivate(context)).toBe(true);
    expect(request.principal.role).toBe("operator");
  });

  it("builds the principal from a valid bearer token's claims, not from any headers sent alongside it", () => {
    const claims: JwtClaims = { sub: "user-1", tenantId: "tenant-1", role: "auditor", email: "auditor@greecon.earth" };
    const token = jwt.sign(claims, "test-secret");
    const guard = new PrincipalGuard();
    // A malicious/stale x-user-role header sent alongside a valid token for a different role
    // must be ignored — the token is the only thing trusted once one is present.
    const context = contextWithHeaders({ "x-greecon-session": token, "x-user-role": "owner" });
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();

    expect(guard.canActivate(context)).toBe(true);
    expect(request.principal).toEqual({
      tenantId: "tenant-1",
      userId: "user-1",
      role: "auditor",
      email: "auditor@greecon.earth",
      isPlatformAdmin: false
    });
  });

  it("carries isPlatformAdmin through from the token's claims when present", () => {
    const claims: JwtClaims = { sub: "user-1", tenantId: "tenant-1", role: "owner", email: "eridon.manuka@greecon.earth", isPlatformAdmin: true };
    const token = jwt.sign(claims, "test-secret");
    const guard = new PrincipalGuard();
    const context = contextWithHeaders({ "x-greecon-session": token });
    const request = context.switchToHttp().getRequest<RequestWithPrincipal>();

    expect(guard.canActivate(context)).toBe(true);
    expect(request.principal.isPlatformAdmin).toBe(true);
  });

  it("rejects a bearer token that fails verification rather than falling back to headers", () => {
    const guard = new PrincipalGuard();
    const context = contextWithHeaders({ "x-greecon-session": "not-a-real-token", "x-user-role": "owner" });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it("rejects a bearer token when JWT_SECRET is not configured", () => {
    delete process.env.JWT_SECRET;
    const token = jwt.sign({ sub: "user-1", tenantId: "tenant-1", role: "owner", email: "owner@greecon.earth" }, "some-secret");
    const guard = new PrincipalGuard();
    const context = contextWithHeaders({ "x-greecon-session": token });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  describe("production lockout", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("rejects an unauthenticated request outright instead of falling back to the role header", () => {
      const guard = new PrincipalGuard();
      const context = contextWithHeaders({ "x-user-role": "owner" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it("still verifies a real session token normally", () => {
      const claims: JwtClaims = { sub: "user-1", tenantId: "tenant-1", role: "owner", email: "owner@greecon.earth" };
      const token = jwt.sign(claims, "test-secret");
      const guard = new PrincipalGuard();
      const context = contextWithHeaders({ "x-greecon-session": token });

      expect(guard.canActivate(context)).toBe(true);
    });
  });

  describe("edge device ingest token", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
      process.env.EDGE_INGEST_TOKEN = "shared-secret";
      process.env.EDGE_INGEST_TENANT_ID = "farm-tenant";
    });

    it("grants a scoped operator principal on POST /telemetry/ingest with the right token", () => {
      const guard = new PrincipalGuard();
      const context = contextWithHeaders({ "x-edge-device-token": "shared-secret" }, { path: "/telemetry/ingest", method: "POST" });
      const request = context.switchToHttp().getRequest<RequestWithPrincipal>();

      expect(guard.canActivate(context)).toBe(true);
      expect(request.principal).toEqual({
        tenantId: "farm-tenant",
        userId: "edge-device",
        role: "operator",
        email: "edge-device@greecon.earth",
        isPlatformAdmin: false
      });
    });

    it("rejects the right token on any other route", () => {
      const guard = new PrincipalGuard();
      const context = contextWithHeaders({ "x-edge-device-token": "shared-secret" }, { path: "/sites", method: "GET" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it("rejects a wrong token on the ingest route", () => {
      const guard = new PrincipalGuard();
      const context = contextWithHeaders({ "x-edge-device-token": "wrong" }, { path: "/telemetry/ingest", method: "POST" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it("never grants access when EDGE_INGEST_TOKEN isn't configured, even with a token header present", () => {
      delete process.env.EDGE_INGEST_TOKEN;
      const guard = new PrincipalGuard();
      const context = contextWithHeaders({ "x-edge-device-token": "shared-secret" }, { path: "/telemetry/ingest", method: "POST" });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
