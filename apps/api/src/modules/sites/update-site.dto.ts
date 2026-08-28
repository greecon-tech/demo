import { IsIn, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { siteTypes, statusLabels } from "@greecon/shared";

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
}
