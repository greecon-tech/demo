import { IsIn, IsLatitude, IsLongitude, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { siteTypes } from "@greecon/shared";

export class CreateSiteDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(siteTypes)
  type!: (typeof siteTypes)[number];

  @IsString()
  @IsNotEmpty()
  locationName!: string;

  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;
}
