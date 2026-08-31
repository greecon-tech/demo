import { IsNumber, IsOptional, Min } from "class-validator";

export class SiteSafetyLimitsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPressureBar?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dryRunFlowLpm?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPumpRuntimeMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minPumpRestMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxIrrigationRunMinutes?: number;
}
