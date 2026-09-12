import { DataTable } from "../../components/DataTable";
import { CreateTenantForm } from "../../components/CreateTenantForm";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { requirePlatformAdmin } from "../../lib/access";
import { apiGet } from "../../lib/api";
import { getSession } from "../../lib/session";

interface TenantSummary {
  id: string;
  name: string;
  domain: string;
  status: string;
  userCount: number;
  siteCount: number;
}

// Manages Greecon's own clients (tenants) — separate from /admin, which manages users/sites
// within one client's own account. Only ever reachable by a real logged-in platform-admin session
// (see apps/api/src/common/principal.ts); this page is only used for the SSR build (Railway/GCP)
// — see platform/page.static.tsx for the static GitHub Pages twin.
export const dynamic = "force-dynamic";

export default async function PlatformAdminPage() {
  const session = await getSession();
  requirePlatformAdmin(session?.user.isPlatformAdmin ?? false);

  const tenants = await apiGet<TenantSummary[]>("/platform-admin/tenants");

  return (
    <Shell title="Clients" subtitle="Onboard and manage every Greecon client account. Visible only to Greecon platform administrators.">
      <Section title="Onboard a new client" aside={<span className="muted">Creates the client's account and its first owner login</span>}>
        <CreateTenantForm />
      </Section>
      <Section title="All clients">
        <DataTable
          rows={tenants}
          columns={[
            { key: "name", label: "Client" },
            { key: "domain", label: "Domain" },
            { key: "status", label: "Status" },
            { key: "userCount", label: "Users" },
            { key: "siteCount", label: "Sites" }
          ]}
        />
      </Section>
    </Shell>
  );
}
