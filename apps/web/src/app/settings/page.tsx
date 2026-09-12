import { GREECON_COMPANY, GREECON_DOMAIN } from "@greecon/shared";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { cycleWidgetSizeAction, loadWidgetPreferences, moveWidgetAction, toggleWidgetVisibilityAction } from "./actions";

// This page is only ever used for the SSR build (Railway/GCP) — see page.static.tsx for the
// static GitHub Pages twin, and build-static.sh for why the swap exists (the dashboard
// customization controls below bind real Server Actions).
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const widgets = await loadWidgetPreferences();

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
      <div id="dashboard" />
      <Section title="Dashboard" aside={<span className="muted">Which cards show on your Overview page, their order, and size — this is your own view, not shared with teammates</span>}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Widget</th>
                <th>Visible</th>
                <th>Size</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {widgets.map((widget) => (
                <tr key={widget.key}>
                  <td>{widget.key}</td>
                  <td>
                    <form action={toggleWidgetVisibilityAction.bind(null, widget.key)}>
                      <button type="submit" className="button-ghost">
                        {widget.visible ? "Visible" : "Hidden"}
                      </button>
                    </form>
                  </td>
                  <td>
                    <form action={cycleWidgetSizeAction.bind(null, widget.key)}>
                      <button type="submit" className="button-ghost">
                        {widget.size.charAt(0).toUpperCase() + widget.size.slice(1)}
                      </button>
                    </form>
                  </td>
                  <td>
                    <div className="dashboard-order-controls">
                      <form action={moveWidgetAction.bind(null, widget.key, "up")}>
                        <button type="submit" className="button-ghost" aria-label={`Move ${widget.key} up`}>
                          ↑
                        </button>
                      </form>
                      <form action={moveWidgetAction.bind(null, widget.key, "down")}>
                        <button type="submit" className="button-ghost" aria-label={`Move ${widget.key} down`}>
                          ↓
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
