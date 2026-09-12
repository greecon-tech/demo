import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { PlatformAdminGuard } from "../../common/platform-admin.guard";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateTenantDto } from "./create-tenant.dto";

// Manages Greecon's clients (tenants) themselves — separate from the per-tenant Admin page
// (/admin, apps/web/src/app/admin), which manages users/sites within one client's own account.
// Every route here requires isPlatformAdmin, not a tenant-scoped role (see platform-admin.guard.ts).
@Controller("platform-admin")
@UseGuards(PlatformAdminGuard)
export class PlatformAdminController {
  constructor(private readonly platform: PlatformService) {}

  @Get("tenants")
  listTenants(@Req() request: RequestWithPrincipal) {
    return this.platform.listAllTenants(request.principal);
  }

  @Post("tenants")
  createTenant(@Body() body: CreateTenantDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createTenant(body, request.principal);
  }
}
