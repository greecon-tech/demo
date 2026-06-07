import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { sites, tenant } from "../../lib/demo-data";

const roles = [
  { role: "Owner", scope: "Tenant, billing, users, sites, rules, audit" },
  { role: "Admin", scope: "Sites, assets, devices, users, approved rules" },
  { role: "Operator", scope: "Monitoring and operation within safety policy" },
  { role: "Viewer", scope: "Read-only operational access" },
  { role: "Auditor", scope: "Reports, audit logs, automation history, compliance evidence" }
] as const;

export default function AdminPage() {
  return (
    <Shell title="Admin" subtitle="Tenant, users, roles, devices, retention, and security settings.">
      <Section title="Tenant">
        <div className="panel">
          <strong>{tenant.name}</strong>
          <p className="muted">{tenant.company} · {tenant.domain}</p>
        </div>
      </Section>
      <Section title="Sites">
        <DataTable
          rows={sites}
          columns={[
            { key: "name", label: "Site" },
            { key: "type", label: "Type" },
            { key: "location", label: "Location" },
            { key: "status", label: "Status" }
          ]}
        />
      </Section>
      <Section title="Roles">
        <DataTable rows={roles} columns={[{ key: "role", label: "Role" }, { key: "scope", label: "Scope" }]} />
      </Section>
    </Shell>
  );
}
