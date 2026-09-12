import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { TenantStatusGuard } from "./tenant-status.guard";
import { Principal, RequestWithPrincipal } from "./principal";
import { PlatformService } from "../platform/platform.service";

function contextWithPrincipal(principal: Principal): ExecutionContext {
  const request = { headers: {}, principal } as RequestWithPrincipal;
  return {
    switchToHttp: () => ({ getRequest: () => request })
  } as unknown as ExecutionContext;
}

function fakePlatform(isTenantActive: boolean): PlatformService {
  return { isTenantActive: vi.fn().mockReturnValue(isTenantActive) } as unknown as PlatformService;
}

describe("TenantStatusGuard", () => {
  it("allows a request for an active tenant through", () => {
    const guard = new TenantStatusGuard(fakePlatform(true));
    const principal: Principal = { tenantId: "t1", userId: "u1", role: "owner", email: "a@b.com", isPlatformAdmin: false };

    expect(guard.canActivate(contextWithPrincipal(principal))).toBe(true);
  });

  it("rejects a request for a suspended tenant", () => {
    const guard = new TenantStatusGuard(fakePlatform(false));
    const principal: Principal = { tenantId: "t1", userId: "u1", role: "owner", email: "a@b.com", isPlatformAdmin: false };

    expect(() => guard.canActivate(contextWithPrincipal(principal))).toThrow(ForbiddenException);
  });

  it("never blocks a platform admin, even if their own tenant lookup would otherwise fail", () => {
    const guard = new TenantStatusGuard(fakePlatform(false));
    const principal: Principal = { tenantId: "t1", userId: "u1", role: "owner", email: "admin@greecon.earth", isPlatformAdmin: true };

    expect(guard.canActivate(contextWithPrincipal(principal))).toBe(true);
  });
});
