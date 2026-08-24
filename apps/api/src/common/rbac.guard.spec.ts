import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it } from "vitest";
import { RbacGuard } from "./rbac.guard";
import { Principal } from "./principal";

describe("RbacGuard", () => {
  const viewer: Principal = { tenantId: "tenant-1", userId: "user-1", role: "viewer", email: "viewer@greecon.earth" };
  const owner: Principal = { tenantId: "tenant-1", userId: "user-2", role: "owner", email: "owner@greecon.earth" };

  it("allows a route with no required permissions", () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RbacGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ principal: viewer }) })
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it("blocks a viewer from a command:create route", () => {
    const reflector = { getAllAndOverride: () => ["command:create"] } as unknown as Reflector;
    const guard = new RbacGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ principal: viewer }) })
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it("allows an owner on a command:create route", () => {
    const reflector = { getAllAndOverride: () => ["command:create"] } as unknown as Reflector;
    const guard = new RbacGuard(reflector);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ principal: owner }) })
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });
});
