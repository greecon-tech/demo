import { IsIn, IsNotEmpty, IsString } from "class-validator";
import { assetTypes } from "@greecon/shared";

export class CreateAssetDto {
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(assetTypes)
  type!: (typeof assetTypes)[number];
}
