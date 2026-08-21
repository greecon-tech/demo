import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { apiGet } from "../../lib/api";

interface AuditEvent {
  id: string;
  createdAtUtc: string;
  userId: string;
  eventType: string;
  entityType: string;
  reason?: string;
}

export default async function AuditPage() {
  const auditEvents = await apiGet<AuditEvent[]>("/audit", "auditor");

  return (
    <Shell title="Audit" subtitle="Access, commands, automation, rule approvals, and operational evidence.">
      <Section title="Audit Log">
        <DataTable
          rows={auditEvents}
          columns={[
            { key: "createdAtUtc", label: "Timestamp" },
            { key: "userId", label: "User" },
            { key: "eventType", label: "Event Type" },
            { key: "entityType", label: "Entity" },
            { key: "reason", label: "Reason" }
          ]}
        />
      </Section>
    </Shell>
  );
}
