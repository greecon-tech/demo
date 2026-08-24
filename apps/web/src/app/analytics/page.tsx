import { MetricGrid } from "../../components/MetricGrid";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";

const analyticsMetrics = [
  { label: "Energy self-use", value: "82", unit: "%", status: "OK", note: "Local renewable use estimate" },
  { label: "Water efficiency", value: "74", unit: "%", status: "Watch", note: "Planning baseline" },
  { label: "Irrigation demand", value: "Moderate", status: "Watch", note: "Soil moisture trend" },
  { label: "Incident load", value: "1", unit: "open", status: "Watch", note: "Water planning review" }
] as const;

export default function AnalyticsPage() {
  return (
    <Shell title="Analytics" subtitle="Historical performance, resource usage, efficiency, and sustainability tracking.">
      <Section title="Performance">
        <MetricGrid metrics={[...analyticsMetrics]} />
      </Section>
      <Section title="Time Range">
        <div className="tabs">
          <span>24 hours</span>
          <span>7 days</span>
          <span>30 days</span>
          <span>Quarter</span>
        </div>
      </Section>
    </Shell>
  );
}
