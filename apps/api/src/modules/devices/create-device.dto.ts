import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from "class-validator";
import { deviceProtocols } from "@greecon/shared";

export class CreateDeviceDto {
  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsOptional()
  @IsString()
  assetId?: string;

  @IsOptional()
  @IsString()
  gatewayId?: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  deviceType!: string;

  @IsIn(deviceProtocols)
  protocol!: (typeof deviceProtocols)[number];

  @IsString()
  @IsNotEmpty()
  driverType!: string;

  // Physical placement on the site's land layout (percentage, 0-100) — see
  // docs/13-pilot-readiness.md, "Sensor map showed a computed layout, not real placement".
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  positionX?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  positionY?: number;

  @IsOptional()
  @IsString()
  placementNote?: string;
}
