import { GREECON_COMPANY, GREECON_DOMAIN } from "@greecon/shared";
import { DataTable } from "../../components/DataTable";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { requirePermission } from "../../lib/access";
import { apiGet, DEMO_ROLE } from "../../lib/api";
import { getSession } from "../../lib/session";

interface Site {
  id: string;
  name: string;
  type: string;
  locationName: string;
  status: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

const roles = [
  { role: "Owner", scope: "Tenant, billing, users, sites, rules, audit" },
  { role: "Admin", scope: "Sites, assets, devices, users, approved rules" },
  { role: "Operator", scope: "Monitoring and operation within safety policy" },
  { role: "Viewer", scope: "Read-only operational access" },
  { role: "Auditor", scope: "Reports, audit logs, automation history, compliance evidence" }
] as const;

export default async function AdminPage() {
  const session = await getSession();
  const role = session?.user.role ?? DEMO_ROLE;
  requirePermission(role, "user:manage");

  const [sites, users] = await Promise.all([apiGet<Site[]>("/sites"), apiGet<User[]>("/users")]);

  return (
    <Shell title="Admin" subtitle="Tenant, users, roles, devices, retention, and security settings.">
      <Section title="Tenant">
        <div className="panel">
          <strong>{GREECON_COMPANY}</strong>
          <p className="muted">{GREECON_DOMAIN}</p>
        </div>
      </Section>
      <Section title="Users">
        <DataTable
          rows={users}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            { key: "status", label: "Status" }
          ]}
        />
      </Section>
      <Section title="Sites">
        <DataTable
          rows={sites}
          columns={[
            { key: "name", label: "Site" },
            { key: "type", label: "Type" },
            { key: "locationName", label: "Location" },
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
