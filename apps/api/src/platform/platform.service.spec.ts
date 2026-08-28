import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_TENANT_ID, TelemetryMessage } from "@greecon/shared";
import { Principal } from "../common/principal";
import { DatabaseService } from "../database/database.service";
import { PlatformService } from "./platform.service";

const OWNER: Principal = {
  tenantId: DEMO_TENANT_ID,
  userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
  role: "owner",
  email: "eridon.manuka@greecon.earth"
};

const OTHER_TENANT: Principal = {
  tenantId: "other-tenant",
  userId: "intruder-1",
  role: "owner",
  email: "intruder@example.com"
};

const VIEWER: Principal = {
  tenantId: DEMO_TENANT_ID,
  userId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5",
  role: "viewer",
  email: "viewer@greecon.earth"
};

const SITE_ID = "22222222-2222-4222-8222-222222222202";
const PUMP_DEVICE_ID = "44444444-4444-4444-8444-444444444404";
const PUMP_POINT_ID = "55555555-5555-4555-8555-555555555509";

describe("PlatformService", () => {
  let platform: PlatformService;

  beforeEach(() => {
    // No DATABASE_URL in the test environment, so DatabaseService.isConfigured() is false and
    // every domain behaves exactly as the pure in-memory service these tests were written
    // against — the same fallback path the static demo and local dev without Postgres use.
    platform = new PlatformService(new DatabaseService());
  });

  describe("tenant isolation", () => {
    it("does not return another tenant's sites", () => {
      expect(platform.listSites(OTHER_TENANT)).toEqual([]);
    });

    it("blocks reading a site that belongs to a different tenant", () => {
      expect(() => platform.siteDetail(SITE_ID, OTHER_TENANT)).toThrow(ForbiddenException);
    });

    it("blocks issuing a command against a device outside the caller's tenant", async () => {
      await expect(
        platform.createCommand(
          {
            siteId: SITE_ID,
            targetDeviceId: PUMP_DEVICE_ID,
            targetPointId: PUMP_POINT_ID,
            requestedValue: "OFF",
            reason: "Cross-tenant probe"
          },
          OTHER_TENANT
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("telemetry ingestion validation", () => {
    it("rejects a telemetry message with an unrecognized quality flag", async () => {
      const message = {
        messageType: "telemetry",
        tenantId: DEMO_TENANT_ID,
        siteId: SITE_ID,
        deviceId: PUMP_DEVICE_ID,
        publishedAtUtc: new Date().toISOString(),
        correlationId: "corr-bad-quality",
        readings: [
          {
            timestampUtc: new Date().toISOString(),
            tenantId: DEMO_TENANT_ID,
            siteId: SITE_ID,
            deviceId: PUMP_DEVICE_ID,
            pointId: PUMP_POINT_ID,
            canonicalName: "water.pump.command",
            value: "ON",
            unit: "state",
            quality: "SUSPECT",
            source: "manual",
            ingestionTimestampUtc: new Date().toISOString()
          }
        ]
      } as unknown as TelemetryMessage;

      const result = await platform.ingestTelemetry(message, OWNER);
      expect(result.accepted).toBe(false);
      expect(result.errors.join(" ")).toContain("quality must be OK, WARN, or BAD");
    });

    it("rejects telemetry addressed to a different tenant than the caller", async () => {
      const message: TelemetryMessage = {
        messageType: "telemetry",
        tenantId: "other-tenant",
        siteId: SITE_ID,
        deviceId: PUMP_DEVICE_ID,
        publishedAtUtc: new Date().toISOString(),
        correlationId: "corr-cross-tenant",
        readings: []
      };

      await expect(platform.ingestTelemetry(message, OWNER)).rejects.toThrow(ForbiddenException);
    });

    it("accepts a well-formed telemetry message and updates point quality", async () => {
      const message: TelemetryMessage = {
        messageType: "telemetry",
        tenantId: DEMO_TENANT_ID,
        siteId: SITE_ID,
        deviceId: PUMP_DEVICE_ID,
        publishedAtUtc: new Date().toISOString(),
        correlationId: "corr-good",
        readings: [
          {
            timestampUtc: new Date().toISOString(),
            tenantId: DEMO_TENANT_ID,
            siteId: SITE_ID,
            deviceId: PUMP_DEVICE_ID,
            pointId: PUMP_POINT_ID,
            canonicalName: "water.pump.command",
            value: "ON",
            unit: "state",
            quality: "WARN",
            source: "manual",
            ingestionTimestampUtc: new Date().toISOString()
          }
        ]
      };

      const result = await platform.ingestTelemetry(message, OWNER);
      expect(result.accepted).toBe(true);
      expect(result.ingested).toBe(1);

      const point = platform.listPoints(OWNER, PUMP_DEVICE_ID).find((candidate) => candidate.id === PUMP_POINT_ID);
      expect(point?.quality).toBe("WARN");
    });
  });

  describe("manual override", () => {
    it("records an audit event for a manual override request", async () => {
      const before = platform.listAudit(OWNER).length;

      await platform.createCommand(
        {
          siteId: SITE_ID,
          targetDeviceId: PUMP_DEVICE_ID,
          targetPointId: PUMP_POINT_ID,
          requestedValue: "OFF",
          reason: "Manual maintenance stop",
          manualOverride: {
            durationMinutes: 15,
            reason: "Operator manually stopping pump for inspection"
          }
        },
        OWNER
      );

      const after = platform.listAudit(OWNER);
      expect(after.length).toBe(before + 2);
      expect(after.some((event) => event.eventType === "manual_override.requested")).toBe(true);
    });

    it("blocks a manual override with an already-expired window", async () => {
      const record = await platform.createCommand(
        {
          siteId: SITE_ID,
          targetDeviceId: PUMP_DEVICE_ID,
          targetPointId: PUMP_POINT_ID,
          requestedValue: "OFF",
          reason: "Manual maintenance stop",
          manualOverride: {
            durationMinutes: -5,
            reason: "Backdated override"
          }
        },
        OWNER
      );

      expect(record.dispatchStatus).toBe("blocked");
      expect(record.safetyEvaluation.reasons.join(" ")).toContain("expired");
    });
  });

  describe("command acknowledgement", () => {
    it("moves a dispatched command to acknowledged on a successful ack", async () => {
      const record = await platform.createCommand(
        {
          siteId: SITE_ID,
          targetDeviceId: PUMP_DEVICE_ID,
          targetPointId: PUMP_POINT_ID,
          requestedValue: "OFF",
          reason: "Routine shutdown"
        },
        OWNER
      );

      const acknowledged = await platform.acknowledgeCommand(
        record.id,
        {
          messageType: "command_ack",
          commandId: record.id,
          tenantId: OWNER.tenantId,
          siteId: SITE_ID,
          deviceId: PUMP_DEVICE_ID,
          status: "executed",
          acknowledgementUtc: new Date().toISOString(),
          result: "Pump stopped.",
          correlationId: "corr-ack-1"
        },
        OWNER
      );

      expect(acknowledged.dispatchStatus).toBe("acknowledged");
      expect(acknowledged.result).toBe("Pump stopped.");
    });
  });

  describe("site/asset/device/point provisioning", () => {
    it("blocks a viewer from creating a site", async () => {
      await expect(
        platform.createSite({ name: "New Site", type: "farm", locationName: "Test" }, VIEWER)
      ).rejects.toThrow(ForbiddenException);
    });

    it("creates a site, then an asset, device, and point on it, and reads them back consistently", async () => {
      const site = await platform.createSite({ name: "Provisioning Test Site", type: "farm", locationName: "Test Field" }, OWNER);
      expect(platform.listSites(OWNER).some((candidate) => candidate.id === site.id)).toBe(true);

      const asset = await platform.createAsset({ siteId: site.id, name: "Test Pump Station", type: "PumpStation" }, OWNER);
      expect(asset.siteId).toBe(site.id);

      const device = await platform.createDevice(
        {
          siteId: site.id,
          assetId: asset.id,
          name: "Test Pump PLC",
          deviceType: "plc",
          protocol: "modbus",
          driverType: "test-driver",
          positionX: 40,
          positionY: 60,
          placementNote: "Test placement"
        },
        OWNER
      );
      expect(device.siteId).toBe(site.id);
      expect(device.positionX).toBe(40);

      const point = await platform.createPoint(
        {
          siteId: site.id,
          assetId: asset.id,
          deviceId: device.id,
          canonicalName: "water.pump.command",
          label: "Test pump command",
          unit: "state",
          capability: "write"
        },
        OWNER
      );
      expect(point.deviceId).toBe(device.id);

      const detail = platform.siteDetail(site.id, OWNER);
      expect(detail.assets.map((candidate) => candidate.id)).toContain(asset.id);
      expect(detail.devices.map((candidate) => candidate.id)).toContain(device.id);
      expect(detail.points.map((candidate) => candidate.id)).toContain(point.id);

      const updatedDevice = await platform.updateDevice(device.id, { health: "Watch", positionX: 55 }, OWNER);
      expect(updatedDevice.health).toBe("Watch");
      expect(updatedDevice.positionX).toBe(55);
      expect(updatedDevice.positionY).toBe(60);

      await platform.deletePoint(point.id, OWNER);
      expect(platform.listPoints(OWNER, device.id)).toHaveLength(0);

      await platform.deleteDevice(device.id, OWNER);
      expect(platform.listDevices(OWNER, site.id)).toHaveLength(0);

      await platform.deleteAsset(asset.id, OWNER);
      expect(platform.listAssets(OWNER, site.id)).toHaveLength(0);

      await platform.deleteSite(site.id, OWNER);
      expect(platform.listSites(OWNER).some((candidate) => candidate.id === site.id)).toBe(false);
    });

    it("refuses to delete a site that still has a registered device", async () => {
      await expect(platform.deleteSite(SITE_ID, OWNER)).rejects.toThrow(ForbiddenException);
    });

    it("blocks creating a device on a site that belongs to a different tenant", async () => {
      await expect(
        platform.createDevice(
          { siteId: SITE_ID, name: "Cross-tenant device", deviceType: "plc", protocol: "modbus", driverType: "test" },
          OTHER_TENANT
        )
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
