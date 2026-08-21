import { IsIn } from "class-validator";
import { incidentStatuses } from "@greecon/shared";

export class UpdateIncidentStatusDto {
  @IsIn(incidentStatuses)
  status!: (typeof incidentStatuses)[number];
}
