import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { auditEvents } from "../../lib/demo-data";

export default function AuditPage() {
  return (
    <Shell title="Audit" subtitle="Access, commands, automation, rule approvals, and operational evidence.">
      <Section title="Audit Log">
        <DataTable
          rows={auditEvents}
          columns={[
            { key: "time", label: "Timestamp" },
            { key: "user", label: "User" },
            { key: "event", label: "Event Type" },
            { key: "site", label: "Site" },
            { key: "entity", label: "Entity" },
            { key: "reason", label: "Reason" }
          ]}
        />
      </Section>
    </Shell>
  );
}
