import { MetricGrid } from "../../components/MetricGrid";
import { Section } from "../../components/Section";
import { Shell } from "../../components/Shell";
import { agricultureMetrics, energyMetrics, waterMetrics } from "../../lib/demo-data";

export default function MonitoringPage() {
  return (
    <Shell title="Monitoring" subtitle="Current operating state across energy, water, agriculture, and environmental points.">
      <Section title="Energy">
        <MetricGrid metrics={energyMetrics} />
      </Section>
      <Section title="Water">
        <MetricGrid metrics={waterMetrics} />
      </Section>
      <Section title="Agriculture">
        <MetricGrid metrics={agricultureMetrics} />
      </Section>
    </Shell>
  );
}
