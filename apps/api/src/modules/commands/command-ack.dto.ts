import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CommandAckDto {
  @IsString()
  @IsNotEmpty()
  deviceId!: string;

  @IsString()
  @IsNotEmpty()
  siteId!: string;

  @IsIn(["accepted", "rejected", "executed", "failed"])
  status!: "accepted" | "rejected" | "executed" | "failed";

  @IsOptional()
  @IsString()
  result?: string;

  @IsOptional()
  @IsString()
  failureReason?: string;

  @IsString()
  @IsNotEmpty()
  correlationId!: string;
}
