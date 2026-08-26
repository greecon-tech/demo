import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from "@nestjs/common";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CreateRuleDto } from "./create-rule.dto";
import { UpdateRuleApprovalDto } from "./update-rule-approval.dto";
import { UpdateRuleDto } from "./update-rule.dto";

@Controller("rules")
export class RulesController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("automation:read")
  list(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.listRules(request.principal, siteId);
  }

  @Post("simulate")
  @RequirePermissions("automation:read")
  simulate(@Query("siteId") siteId: string | undefined, @Req() request: RequestWithPrincipal) {
    return this.platform.simulateRules(request.principal, siteId);
  }

  @Post()
  @RequirePermissions("automation:manage")
  create(@Body() body: CreateRuleDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createRule(body, request.principal);
  }

  @Patch(":ruleId")
  @RequirePermissions("automation:manage")
  update(@Param("ruleId") ruleId: string, @Body() body: UpdateRuleDto, @Req() request: RequestWithPrincipal) {
    return this.platform.updateRule(ruleId, body, request.principal);
  }

  @Patch(":ruleId/approval")
  @RequirePermissions("automation:manage")
  updateApproval(@Param("ruleId") ruleId: string, @Body() body: UpdateRuleApprovalDto, @Req() request: RequestWithPrincipal) {
    return this.platform.setRuleApprovalState(ruleId, body.approvalState, body.reason, request.principal);
  }

  @Delete(":ruleId")
  @RequirePermissions("automation:manage")
  remove(@Param("ruleId") ruleId: string, @Req() request: RequestWithPrincipal) {
    return this.platform.deleteRule(ruleId, request.principal);
  }
}
