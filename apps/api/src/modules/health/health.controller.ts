import { Controller, Get } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { PlatformService } from "../../platform/platform.service";

@Controller("health")
export class HealthController {
  constructor(
    private readonly platform: PlatformService,
    private readonly database: DatabaseService
  ) {}

  @Get()
  async health() {
    const base = this.platform.health();
    return {
      ...base,
      database: await this.database.health()
    };
  }
}
