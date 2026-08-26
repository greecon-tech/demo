import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { CanonicalPointName, canonicalPoints } from "@greecon/shared";

export class RuleActionDto {
  @IsIn(["command", "alert", "recommendation"])
  type!: "command" | "alert" | "recommendation";

  @IsOptional()
  @IsIn(canonicalPoints)
  targetCanonicalName?: CanonicalPointName;

  @IsOptional()
  value?: number | boolean | string;

  @IsString()
  @IsNotEmpty()
  message!: string;
}
