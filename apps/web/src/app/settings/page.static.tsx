import { GREECON_COMPANY, GREECON_DOMAIN, dashboardWidgetCatalog } from "@greecon/shared";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";

// Static-export twin of page.tsx (see apps/web/scripts/build-static.sh). Dashboard customization
// binds real Server Actions to persist per-user preferences — nothing to persist to without a
// server, so this shows the same table read-only instead.
export default function SettingsPage() {
  return (
    <Shell title="Settings" subtitle="Organization profile, dashboard customization, and future billing.">
      <Section title="Organization Profile">
        <div className="panel stack">
          <label>
            Organization
            <input defaultValue={GREECON_COMPANY} />
          </label>
          <label>
            Public domain
            <input defaultValue={GREECON_DOMAIN} />
          </label>
          <label>
            Public email
            <input defaultValue="info@greecon.earth" />
          </label>
        </div>
      </Section>
      <Section title="Dashboard" aside={<span className="muted">Which cards show on your Overview page, their order, and size</span>}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Widget</th>
                <th>Visible</th>
                <th>Size</th>
              </tr>
            </thead>
            <tbody>
              {dashboardWidgetCatalog.map((key) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>Visible</td>
                  <td>Medium</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">Customizing requires a live deployment (Railway or Google Cloud) with a real logged-in session. See docs/12-deployment-github-pages.md.</p>
      </Section>
      <Section title="Operational Settings">
        <div className="metric-grid">
          <div className="panel">
            <h3>Notifications</h3>
            <p className="muted">Alert routing placeholder.</p>
          </div>
          <div className="panel">
            <h3>API Keys</h3>
            <p className="muted">No keys generated in MVP.</p>
          </div>
          <div className="panel">
            <h3>Edge Gateway</h3>
            <p className="muted">Certificate identity placeholder.</p>
          </div>
          <div className="panel">
            <h3>Billing</h3>
            <p className="muted">Stripe planned as a later module.</p>
          </div>
        </div>
      </Section>
    </Shell>
  );
}
