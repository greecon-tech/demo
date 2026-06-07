import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { tenant } from "../../lib/demo-data";

export default function SettingsPage() {
  return (
    <Shell title="Settings" subtitle="Organization profile, notifications, API keys, edge configuration, and future billing.">
      <Section title="Organization Profile">
        <div className="panel stack">
          <label>
            Organization
            <input defaultValue={tenant.company} />
          </label>
          <label>
            Public domain
            <input defaultValue={tenant.domain} />
          </label>
          <label>
            Public email
            <input defaultValue="info@greecon.earth" />
          </label>
        </div>
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
