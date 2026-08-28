import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateAssetDto } from "./create-asset.dto";
import { UpdateAssetDto } from "./update-asset.dto";

@Controller("assets")
export class AssetsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("asset:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listAssets(request.principal, siteId);
  }

  @Post()
  @RequirePermissions("asset:manage")
  create(@Body() body: CreateAssetDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createAsset(body, request.principal);
  }

  @Patch(":assetId")
  @RequirePermissions("asset:manage")
  update(@Param("assetId") assetId: string, @Body() body: UpdateAssetDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updateAsset(assetId, body, request.principal);
  }

  @Delete(":assetId")
  @RequirePermissions("asset:manage")
  remove(@Param("assetId") assetId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.deleteAsset(assetId, request.principal);
  }
}
