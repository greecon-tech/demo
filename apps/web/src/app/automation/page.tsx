import { DataTable } from "../../components/DataTable";
import { ManualOverridePanel } from "../../components/ManualOverridePanel";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { StatusBadge } from "../../components/StatusBadge";
import { apiGet } from "../../lib/api";

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

export default async function AutomationPage() {
  const [rules, auditEvents] = await Promise.all([apiGet<Rule[]>("/rules"), apiGet<AuditEvent[]>("/audit", "auditor")]);
  const history = auditEvents.filter((event) => event.eventType.startsWith("command.") || event.eventType.startsWith("manual_override."));

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
            { key: "explanationTemplate", label: "Explanation" }
          ]}
        />
      </Section>
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
        <Section title="Manual Override">
          <ManualOverridePanel />
        </Section>
      </div>
    </Shell>
  );
}
