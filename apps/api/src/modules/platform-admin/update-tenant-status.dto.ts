import { IsIn } from "class-validator";

const tenantStatuses = ["active", "suspended"] as const;

export class UpdateTenantStatusDto {
  @IsIn(tenantStatuses)
  status!: (typeof tenantStatuses)[number];
}
