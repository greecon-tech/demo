import { IsIn, IsOptional } from "class-validator";
import { userRoles } from "@greecon/shared";

const userStatuses = ["active", "disabled"] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsIn(userRoles)
  role?: (typeof userRoles)[number];

  @IsOptional()
  @IsIn(userStatuses)
  status?: (typeof userStatuses)[number];
}
