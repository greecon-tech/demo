import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { assetTypes, statusLabels } from "@greecon/shared";

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsIn(assetTypes)
  type?: (typeof assetTypes)[number];

  @IsOptional()
  @IsIn(statusLabels)
  status?: (typeof statusLabels)[number];
}
