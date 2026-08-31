import { IsISO8601, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMaintenanceTaskDto {
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  incidentId?: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsISO8601()
  dueAtUtc?: string;
}
