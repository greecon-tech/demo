import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { CommandAckMessage } from "@greecon/shared";
import { RequirePermissions } from "../../common/require-permissions.decorator";
import { RequestWithPrincipal } from "../../common/principal";
import { PlatformService } from "../../platform/platform.service";
import { CommandAckDto } from "./command-ack.dto";
import { CreateCommandDto } from "./create-command.dto";
import { ManualOverrideCommandDto } from "./manual-override-command.dto";

@Controller("commands")
export class CommandsController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  @RequirePermissions("command:create")
  list(@Req() request: RequestWithPrincipal) {
    return this.platform.listCommands(request.principal);
  }

  @Post()
  @RequirePermissions("command:create")
  create(@Body() body: CreateCommandDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createCommand(body, request.principal);
  }

  @Post("manual-override")
  @RequirePermissions("command:create")
  createWithManualOverride(@Body() body: ManualOverrideCommandDto, @Req() request: RequestWithPrincipal) {
    return this.platform.createCommand(body, request.principal);
  }

  @Post(":commandId/ack")
  @RequirePermissions("command:create")
  acknowledge(@Param("commandId") commandId: string, @Body() body: CommandAckDto, @Req() request: RequestWithPrincipal) {
    const ack: CommandAckMessage = {
      messageType: "command_ack",
      commandId,
      tenantId: request.principal.tenantId,
      siteId: body.siteId,
      deviceId: body.deviceId,
      status: body.status,
      acknowledgementUtc: new Date().toISOString(),
      result: body.result,
      failureReason: body.failureReason,
      correlationId: body.correlationId
    };
    return this.platform.acknowledgeCommand(commandId, ack, request.principal);
  }
}
