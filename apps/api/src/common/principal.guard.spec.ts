import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import jwt from "jsonwebtoken";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PrincipalGuard } from "./principal.guard";
import { JwtClaims, RequestWithPrincipal } from "./principal";

function contextWithHeaders(headers: Record<string, string | string[] | undefined>): ExecutionContext {
  const request = { headers, principal: undefined } as unknown as RequestWithPrincipal;
  return {
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
}

describe("PrincipalGuard", () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it("falls back to header-based identity when no bearer token is present", () => {
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
    expect(request.principal).toEqual({ tenantId: "tenant-1", userId: "user-1", role: "auditor", email: "auditor@greecon.earth" });
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
});
