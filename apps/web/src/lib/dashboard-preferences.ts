import { DashboardWidgetPreference } from "@greecon/shared";
import { Metric } from "./types";

/** Applies a saved per-user preference list to whatever metrics the Overview page actually built
 * for this tenant (apps/web/src/app/page.tsx's buildMetrics). A metric the tenant doesn't
 * currently have (no matching key in `metrics`) is silently skipped — the preference just has
 * nothing to apply to yet. A metric present in `metrics` but never customized (no matching
 * preference entry) keeps its default position, appended after every customized one, and stays
 * visible at the default "medium" size — customizing is opt-in, not required to see the default
 * dashboard. */
export function applyDashboardPreferences(metrics: Metric[], preferences: DashboardWidgetPreference[]): Metric[] {
  if (preferences.length === 0) return metrics;

  const byLabel = new Map(metrics.map((metric) => [metric.label, metric]));
  const ordered: Metric[] = [];
  const seen = new Set<string>();

  for (const preference of preferences) {
    const metric = byLabel.get(preference.key);
    if (!metric) continue;
    seen.add(preference.key);
    if (!preference.visible) continue;
    ordered.push({ ...metric, size: preference.size });
  }

  for (const metric of metrics) {
    if (seen.has(metric.label)) continue;
    ordered.push(metric);
  }

  return ordered;
}
