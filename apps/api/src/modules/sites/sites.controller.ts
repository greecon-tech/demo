import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateSiteDto } from "./create-site.dto";
import { UpdateSiteDto } from "./update-site.dto";

@Controller("sites")
export class SitesController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("site:read")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listSites(request.principal);
  }

  @Get(":siteId")
  @RequirePermissions("site:read")
  detail(@Param("siteId") siteId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.siteDetail(siteId, request.principal);
  }

  @Post()
  @RequirePermissions("site:manage")
  create(@Body() body: CreateSiteDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createSite(body, request.principal);
  }

  @Patch(":siteId")
  @RequirePermissions("site:manage")
  update(@Param("siteId") siteId: string, @Body() body: UpdateSiteDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updateSite(siteId, body, request.principal);
  }

  @Delete(":siteId")
  @RequirePermissions("site:manage")
  remove(@Param("siteId") siteId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.deleteSite(siteId, request.principal);
  }
}
