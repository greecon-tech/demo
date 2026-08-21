import { Type } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { ManualOverrideDto } from "./manual-override.dto";

export class CreateCommandDto {
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsString()
  @IsNotEmpty()
  targetDeviceId!: string;

  @IsString()
  @IsNotEmpty()
  targetPointId!: string;

  @IsNotEmpty()
  requestedValue!: number | boolean | string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ManualOverrideDto)
  manualOverride?: ManualOverrideDto;
}
