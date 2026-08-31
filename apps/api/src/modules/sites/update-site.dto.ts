import { Type } from "class-transformer";
import { IsIn, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { siteTypes, statusLabels } from "@greecon/shared";
import { SiteSafetyLimitsDto } from "./site-safety-limits.dto";

export class UpdateSiteDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(siteTypes)
  type?: (typeof siteTypes)[number];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  locationName?: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsIn(statusLabels)
  status?: (typeof statusLabels)[number];

  @IsOptional()
  @IsIn(statusLabels)
  edgeStatus?: (typeof statusLabels)[number];

  // A field present with an empty object {} clears every override back to defaultSafetyLimits;
  // a field left out of the request body entirely leaves existing overrides untouched (see the
  // Object.fromEntries(...) patch pattern in PlatformService.updateSite).
  @IsOptional()
  @ValidateNested()
  @Type(() => SiteSafetyLimitsDto)
  safetyLimits?: SiteSafetyLimitsDto;
}
