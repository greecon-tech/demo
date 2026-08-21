import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "./modules/audit/audit.module";
import { AlertsModule } from "./modules/alerts/alerts.module";
import { AssetsModule } from "./modules/assets/assets.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CommandsModule } from "./modules/commands/commands.module";
import { DerivedStatesModule } from "./modules/derived-states/derived-states.module";
import { DevicesModule } from "./modules/devices/devices.module";
import { EdgeSyncModule } from "./modules/edge-sync/edge-sync.module";
import { HealthModule } from "./modules/health/health.module";
import { IncidentsModule } from "./modules/incidents/incidents.module";
import { MaintenanceModule } from "./modules/maintenance/maintenance.module";
import { PointsModule } from "./modules/points/points.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { RulesModule } from "./modules/rules/rules.module";
import { SitesModule } from "./modules/sites/sites.module";
import { TelemetryModule } from "./modules/telemetry/telemetry.module";
import { TenantsModule } from "./modules/tenants/tenants.module";
import { UsersModule } from "./modules/users/users.module";
import { PrincipalGuard } from "./common/principal.guard";
import { RbacGuard } from "./common/rbac.guard";
import { DatabaseModule } from "./database/database.module";
import { PlatformModule } from "./platform/platform.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    PlatformModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    SitesModule,
    AssetsModule,
    DevicesModule,
    PointsModule,
    TelemetryModule,
    DerivedStatesModule,
    RulesModule,
    CommandsModule,
    AlertsModule,
    IncidentsModule,
    MaintenanceModule,
    ReportsModule,
    AuditModule,
    EdgeSyncModule,
    HealthModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: PrincipalGuard },
    { provide: APP_GUARD, useClass: RbacGuard }
  ]
})
export class AppModule {}
