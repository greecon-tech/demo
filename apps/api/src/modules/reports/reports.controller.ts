import { Body, Controller, Get, Post, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateReportExportDto } from "./create-report-export.dto";

@Controller("reports")
export class ReportsController {
  constructor(private readonly platform: PlatformService) {}

  @Get("templates")
  @RequirePermissions("report:export")
  templates() {
    return this.platform.reportTemplates();
  }

  @Post("exports")
  @RequirePermissions("report:export")
  createExport(@Body() body: CreateReportExportDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createReportExport(body, request.principal);
  }
}
