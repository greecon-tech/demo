import { hasPermission } from "@greecon/shared";
import { DataTable } from "../../components/DataTable";
import { ManualControlPanel, ManualControlTarget } from "../../components/ManualControlPanel";
import { RuleActions } from "../../components/RuleActions";
import { RuleForm } from "../../components/RuleForm";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { apiGet, DEMO_ROLE } from "../../lib/api";

// This page has Server Actions that mutate data (rule create/approve/disable/delete) and
// re-render it via revalidatePath — Next's static-optimization heuristics otherwise conflict
// with that combined with the no-store fetches in apiGet, producing a DYNAMIC_SERVER_USAGE
// error. Forcing fully dynamic rendering avoids the ambiguity. (The static export build never
// sees this file — see apps/web/scripts/build-static.sh.)
export const dynamic = "force-dynamic";

interface Rule {
  id: string;
  name: string;
  priority: string;
  executionMode: string;
  approvalState: string;
  explanationTemplate: string;
}

interface AuditEvent {
  id: string;
  createdAtUtc: string;
  eventType: string;
  reason?: string;
}

interface SiteOption {
  id: string;
  name: string;
}

interface DeviceOption {
  id: string;
  name: string;
  siteId: string;
}

interface PointOption {
  id: string;
  deviceId: string;
  siteId: string;
  label: string;
  unit: string;
  canonicalName: string;
  capability: string;
}

export default async function AutomationPage() {
  const canManageRules = hasPermission(DEMO_ROLE, "automation:manage");
  const canControl = hasPermission(DEMO_ROLE, "command:create");

  const [rules, auditEvents, sites, devices, points] = await Promise.all([
    apiGet<Rule[]>("/rules"),
    apiGet<AuditEvent[]>("/audit", "auditor"),
    apiGet<SiteOption[]>("/sites"),
    apiGet<DeviceOption[]>("/devices"),
    apiGet<PointOption[]>("/points")
  ]);
  const history = auditEvents.filter((event) => event.eventType.startsWith("command.") || event.eventType.startsWith("manual_override."));

  const siteName = new Map(sites.map((site) => [site.id, site.name]));
  const deviceName = new Map(devices.map((device) => [device.id, device.name]));
  const controllableTargets: ManualControlTarget[] = points
    .filter((point) => point.capability === "write" || point.capability === "read_write")
    .map((point) => ({
      pointId: point.id,
      deviceId: point.deviceId,
      deviceName: deviceName.get(point.deviceId) ?? point.deviceId,
      siteId: point.siteId,
      siteName: siteName.get(point.siteId) ?? point.siteId,
      canonicalName: point.canonicalName,
      label: point.label,
      unit: point.unit
    }));

  return (
    <Shell title="Automation" subtitle="Rules, simulations, command safety, and human-readable action history.">
      <Section title="Rules">
        <DataTable
          rows={rules}
          columns={[
            { key: "name", label: "Rule" },
            { key: "priority", label: "Priority" },
            { key: "executionMode", label: "Execution" },
            { key: "approvalState", label: "Approval", render: (row) => <StatusBadge status={row.approvalState} /> },
            { key: "explanationTemplate", label: "Explanation" },
            ...(canManageRules
              ? [{ key: "id" as const, label: "Manage", render: (row: Rule) => <RuleActions ruleId={row.id} ruleName={row.name} approvalState={row.approvalState} /> }]
              : [])
          ]}
        />
      </Section>
      {canManageRules ? (
        <Section title="Create Rule" aside={<span className="muted">Owner / Admin only</span>}>
          <RuleForm sites={sites} />
        </Section>
      ) : null}
      <div className="split">
        <Section title="Automation History">
          <DataTable
            wide={false}
            rows={history}
            columns={[
              { key: "createdAtUtc", label: "Time" },
              { key: "eventType", label: "Event" },
              { key: "reason", label: "Reason" }
            ]}
          />
        </Section>
        <Section title="Manual Control" aside={<span className="muted">Automatic (rules/AI) is the default mode</span>}>
          {canControl ? (
            <ManualControlPanel targets={controllableTargets} emptyMessage="No manually controllable equipment is configured yet." />
          ) : (
            <p className="muted">Your role does not have permission to dispatch manual commands.</p>
          )}
        </Section>
      </div>
    </Shell>
  );
}
