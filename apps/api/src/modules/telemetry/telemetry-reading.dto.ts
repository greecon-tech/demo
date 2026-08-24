import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested } from "class-validator";
import { canonicalPoints, qualityFlags } from "@greecon/shared";

export class TelemetryReadingDto {
  @IsString()
  @IsNotEmpty()
  timestampUtc!: string;

  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsNotEmpty()
  pointId!: string;

  @IsIn(canonicalPoints)
  canonicalName!: (typeof canonicalPoints)[number];

  @IsNotEmpty()
  value!: number | boolean | string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsIn(qualityFlags)
  quality!: (typeof qualityFlags)[number];

  @IsIn(["edge", "cloud", "simulator", "manual"])
  source!: "edge" | "cloud" | "simulator" | "manual";

  @IsString()
  @IsNotEmpty()
  ingestionTimestampUtc!: string;
}

export class TelemetryMessageDto {
  @IsIn(["telemetry"])
  messageType!: "telemetry";

  @IsString()
  @IsNotEmpty()
  tenantId!: string;

  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TelemetryReadingDto)
  readings!: TelemetryReadingDto[];

  @IsString()
  @IsNotEmpty()
  publishedAtUtc!: string;

  @IsString()
  @IsNotEmpty()
  correlationId!: string;
}
