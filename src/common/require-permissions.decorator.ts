import { SetMetadata } from "@nestjs/common";
import { Permission } from "@greecon/shared";
import { REQUIRED_PERMISSIONS } from "./rbac.guard";

export const RequirePermissions = (...permissions: Permission[]) => SetMetadata(REQUIRED_PERMISSIONS, permissions);
