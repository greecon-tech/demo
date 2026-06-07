import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class EdgeSyncDto {
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsString()
  @IsNotEmpty()
  gatewayId!: string;

  @IsString()
  @IsIn(["started", "completed", "failed"])
  status!: "started" | "completed" | "failed";

  @IsInt()
  @Min(0)
  bufferedReadings!: number;

  @IsString()
  @IsNotEmpty()
  startedAtUtc!: string;

  @IsOptional()
  @IsString()
  completedAtUtc?: string;
}
