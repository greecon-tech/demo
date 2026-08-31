import { IsIn, IsISO8601, IsNotEmpty, IsOptional, IsString } from "class-validator";

const maintenanceStatuses = ["open", "complete"] as const;

export class UpdateMaintenanceTaskDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsISO8601()
  dueAtUtc?: string;

  @IsOptional()
  @IsIn(maintenanceStatuses)
  status?: (typeof maintenanceStatuses)[number];

  @IsOptional()
  @IsString()
  completionLog?: string;
}
