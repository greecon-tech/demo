import { IsIn, IsObject, IsOptional, IsString } from "class-validator";

export class CreateReportExportDto {
  @IsOptional()
  @IsString()
  siteId?: string;

  @IsIn(["operational", "sustainability", "audit", "incident"])
  reportType!: "operational" | "sustainability" | "audit" | "incident";

  @IsOptional()
  @IsObject()
  parameters?: Record<string, string | number | boolean>;
}
