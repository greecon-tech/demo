import { ForbiddenException } from "@nestjs/common";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_TENANT_ID, TelemetryMessage } from "@greecon/shared";
import { Principal } from "../common/principal";
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

const SITE_ID = "22222222-2222-4222-8222-222222222202";
const PUMP_DEVICE_ID = "44444444-4444-4444-8444-444444444404";
const PUMP_POINT_ID = "55555555-5555-4555-8555-555555555509";

describe("PlatformService", () => {
  let platform: PlatformService;

  beforeEach(() => {
    platform = new PlatformService();
  });

  describe("tenant isolation", () => {
    it("does not return another tenant's sites", () => {
      expect(platform.listSites(OTHER_TENANT)).toEqual([]);
    });

    it("blocks reading a site that belongs to a different tenant", () => {
      expect(() => platform.siteDetail(SITE_ID, OTHER_TENANT)).toThrow(ForbiddenException);
    });

    it("blocks issuing a command against a device outside the caller's tenant", () => {
      expect(() =>
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
      ).toThrow(ForbiddenException);
    });
  });

  describe("telemetry ingestion validation", () => {
    it("rejects a telemetry message with an unrecognized quality flag", () => {
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

      const result = platform.ingestTelemetry(message, OWNER);
      expect(result.accepted).toBe(false);
      expect(result.errors.join(" ")).toContain("quality must be OK, WARN, or BAD");
    });

    it("rejects telemetry addressed to a different tenant than the caller", () => {
      const message: TelemetryMessage = {
        messageType: "telemetry",
        tenantId: "other-tenant",
        siteId: SITE_ID,
        deviceId: PUMP_DEVICE_ID,
        publishedAtUtc: new Date().toISOString(),
        correlationId: "corr-cross-tenant",
        readings: []
      };

      expect(() => platform.ingestTelemetry(message, OWNER)).toThrow(ForbiddenException);
    });

    it("accepts a well-formed telemetry message and updates point quality", () => {
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

      const result = platform.ingestTelemetry(message, OWNER);
      expect(result.accepted).toBe(true);
      expect(result.ingested).toBe(1);

      const point = platform.listPoints(OWNER, PUMP_DEVICE_ID).find((candidate) => candidate.id === PUMP_POINT_ID);
      expect(point?.quality).toBe("WARN");
    });
  });

  describe("manual override", () => {
    it("records an audit event for a manual override request", () => {
      const before = platform.listAudit(OWNER).length;

      platform.createCommand(
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

    it("blocks a manual override with an already-expired window", () => {
      const record = platform.createCommand(
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
    it("moves a dispatched command to acknowledged on a successful ack", () => {
      const record = platform.createCommand(
        {
          siteId: SITE_ID,
          targetDeviceId: PUMP_DEVICE_ID,
          targetPointId: PUMP_POINT_ID,
          requestedValue: "OFF",
          reason: "Routine shutdown"
        },
        OWNER
      );

      const acknowledged = platform.acknowledgeCommand(
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
});
