import { hasPermission } from "@greecon/shared";
import { DataTable } from "../../../components/DataTable";
import { ManualControlPanel } from "../../../components/ManualControlPanel";
import { MetricGrid } from "../../../components/MetricGrid";
import { Section } from "../../../components/Section";
import { SensorMap } from "../../../components/SensorMap";
import { Shell } from "../../../components/Shell";
import { StatusBadge } from "../../../components/StatusBadge";
import { apiGet, DEMO_ROLE } from "../../../lib/api";
import { Metric } from "../../../lib/types";

interface SiteDetail {
  site: { id: string; name: string; type: string; locationName: string; status: string; edgeStatus: string };
  assets: Array<{ id: string; name: string; type: string; status: string }>;
  devices: Array<{ id: string; name: string; deviceType: string; protocol: string; health: string; lastSeenUtc?: string; positionX?: number; positionY?: number; placementNote?: string }>;
  points: Array<{ id: string; deviceId: string; label: string; unit: string; canonicalName: string; capability: string }>;
  latestTelemetry: Array<{ pointId: string; canonicalName: string; value: number | boolean | string; unit: string; quality: string }>;
  rules: Array<{ id: string; name: string; priority: string; executionMode: string; approvalState: string }>;
  alerts: Array<{ id: string; severity: string; title: string; status: string }>;
}

// No generateStaticParams here — this file is only ever used for the SSR build (Railway, GCP),
// which renders each site on request. The static GitHub Pages export uses page.static.tsx
// instead (see apps/web/scripts/build-static.sh), which needs generateStaticParams to
// pre-render every site at build time; on this SSR page, merely having that function present —
// even gated to return [] — was enough to make Next.js treat the route as a static-generation
// candidate and throw DYNAMIC_SERVER_USAGE on the no-store fetch below.
//
// Manual Control now dispatches a Server Action that calls revalidatePath on this route — the
// same combination that forced automation/page.tsx to force-dynamic rendering applies here too.
export const dynamic = "force-dynamic";

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const detail = await apiGet<SiteDetail>(`/sites/${siteId}`);
  const { site } = detail;
  const metrics = buildMetrics(detail);
  const canControl = hasPermission(DEMO_ROLE, "command:create");
  const deviceName = new Map(detail.devices.map((device) => [device.id, device.name]));
  const controllableTargets = detail.points
    .filter((point) => point.capability === "write" || point.capability === "read_write")
    .map((point) => ({
      pointId: point.id,
      deviceId: point.deviceId,
      deviceName: deviceName.get(point.deviceId) ?? point.deviceId,
      siteId: site.id,
      canonicalName: point.canonicalName,
      label: point.label,
      unit: point.unit
    }));

  return (
    <Shell title={site.name} subtitle={`${site.type} · ${site.locationName}`}>
      <div className="tabs">
        {["Summary", "Equipment", "Automation", "Alerts"].map((tab) => (
          <span key={tab}>{tab}</span>
        ))}
      </div>
      <Section title="Summary" aside={<StatusBadge status={site.status} />}>
        <MetricGrid metrics={metrics} />
      </Section>
      <Section title="Equipment">
        <SensorMap devices={detail.devices} points={detail.points} readings={detail.latestTelemetry} />
      </Section>
      {canControl ? (
        <Section title="Manual Control" aside={<span className="muted">Automatic (rules/AI) is the default mode</span>}>
          <ManualControlPanel targets={controllableTargets} emptyMessage="No manually controllable equipment is configured for this site." />
        </Section>
      ) : null}
      <Section title="Automation">
        <DataTable
          rows={detail.rules}
          columns={[
            { key: "name", label: "Rule" },
            { key: "priority", label: "Priority" },
            { key: "executionMode", label: "Mode" },
            { key: "approvalState", label: "State" }
          ]}
        />
      </Section>
      <Section title="Alerts">
        <DataTable
          rows={detail.alerts}
          columns={[
            { key: "severity", label: "Severity", render: (row) => <StatusBadge status={row.severity} /> },
            { key: "title", label: "Alert" },
            { key: "status", label: "Status" }
          ]}
        />
      </Section>
    </Shell>
  );
}

function buildMetrics(detail: SiteDetail): Metric[] {
  return detail.latestTelemetry.map((reading) => ({
    label: reading.canonicalName,
    value: typeof reading.value === "number" ? reading.value.toFixed(1) : String(reading.value),
    unit: reading.unit,
    status: reading.quality === "OK" ? "OK" : reading.quality === "WARN" ? "Watch" : "Critical",
    note: `Quality: ${reading.quality}`
  }));
}
