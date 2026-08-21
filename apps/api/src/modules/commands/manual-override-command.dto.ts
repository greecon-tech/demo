import { Type } from "class-transformer";
import { IsNotEmpty, IsString, ValidateNested } from "class-validator";
import { ManualOverrideDto } from "./manual-override.dto";

export class ManualOverrideCommandDto {
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

  @ValidateNested()
  @Type(() => ManualOverrideDto)
  manualOverride!: ManualOverrideDto;
}
