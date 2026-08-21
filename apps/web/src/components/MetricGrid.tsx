import { Metric } from "../lib/types";
import { StatusBadge } from "./StatusBadge";

export function MetricGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <section className="metric-grid" aria-label="Operational metrics">
      {metrics.map((metric) => (
        <article className="metric-card" key={metric.label}>
          <div className="metric-card__header">
            <p>{metric.label}</p>
            <StatusBadge status={metric.status} />
          </div>
          <div className="metric-card__value">
            <span>{metric.value}</span>
            {metric.unit ? <small>{metric.unit}</small> : null}
          </div>
          <p className="muted">{metric.note}</p>
        </article>
      ))}
    </section>
  );
}
