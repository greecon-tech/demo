import { normalizeStatus, StatusBadge } from "./StatusBadge";

interface SensorMapDevice {
  id: string;
  name: string;
  deviceType: string;
  protocol: string;
  health: string;
  lastSeenUtc?: string;
}

interface SensorMapPoint {
  id: string;
  deviceId: string;
  label: string;
  unit: string;
}

interface SensorMapReading {
  pointId: string;
  value: number | boolean | string;
  quality: string;
}

const LEGEND_ORDER = ["ok", "watch", "warning", "critical"];
const LEGEND_LABEL: Record<string, string> = { ok: "Normal", watch: "Watch", warning: "Warning", critical: "Critical" };
const BUCKET_RANK: Record<string, number> = { ok: 0, watch: 1, warning: 2, critical: 3 };

export function SensorMap({
  devices,
  points,
  readings
}: {
  devices: readonly SensorMapDevice[];
  points: readonly SensorMapPoint[];
  readings: readonly SensorMapReading[];
}) {
  if (devices.length === 0) {
    return <div className="empty-state">No devices registered for this site</div>;
  }

  const readingByPoint = new Map(readings.map((reading) => [reading.pointId, reading]));
  const devicesWithPosition = layoutDevices(devices);
  const deviceBuckets = new Map(devices.map((device) => [device.id, worstBucket(device, points, readingByPoint)]));
  const presentStatuses = new Set(deviceBuckets.values());

  return (
    <div className="site-map-block">
      <div className="site-map" role="img" aria-label="Schematic layout of site devices by status">
        {devicesWithPosition.map(({ device, x, y }) => {
          const bucket = deviceBuckets.get(device.id) ?? "ok";
          return (
            <div
              className="site-map__node"
              key={device.id}
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${device.name} — ${LEGEND_LABEL[bucket]}`}
            >
              <span className={`site-map__dot status-${bucket}`} />
              <span className="site-map__label">{device.name}</span>
            </div>
          );
        })}
      </div>
      <div className="site-map__legend">
        {LEGEND_ORDER.filter((bucket) => presentStatuses.has(bucket)).map((bucket) => (
          <span className="site-map__legend-item" key={bucket}>
            <span className={`site-map__dot status-${bucket}`} />
            {LEGEND_LABEL[bucket]}
          </span>
        ))}
      </div>
      <div className="sensor-map">
        {devices.map((device) => {
          const devicePoints = points.filter((point) => point.deviceId === device.id);
          return (
            <article className="sensor-node" key={device.id}>
              <div className="sensor-node__header">
                <div>
                  <strong>{device.name}</strong>
                  <p>{formatDeviceType(device.deviceType)} · {device.protocol}</p>
                </div>
                <StatusBadge status={device.health} />
              </div>
              <div className="sensor-node__readings">
                {devicePoints.length === 0 ? (
                  <p className="muted">No points configured</p>
                ) : (
                  devicePoints.map((point) => {
                    const reading = readingByPoint.get(point.id);
                    return (
                      <div className="sensor-node__reading" key={point.id}>
                        <span>{point.label}</span>
                        <div className="sensor-node__reading-value">
                          <strong>
                            {reading ? formatValue(reading.value) : "—"}
                            {point.unit ? <small> {point.unit}</small> : null}
                          </strong>
                          {reading ? <StatusBadge status={qualityToStatus(reading.quality)} /> : <span className="muted">No data</span>}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {device.lastSeenUtc ? <p className="sensor-node__meta">Last seen {formatTimestamp(device.lastSeenUtc)}</p> : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

/** Even grid positions (as percentages) within the map area — devices have no real coordinates,
 * so this lays them out deterministically by index rather than a fixed pixel arrangement. */
function layoutDevices(devices: readonly SensorMapDevice[]): Array<{ device: SensorMapDevice; x: number; y: number }> {
  const count = devices.length;
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const placed: Array<{ device: SensorMapDevice; x: number; y: number }> = [];

  let index = 0;
  for (let row = 0; row < rows; row++) {
    const itemsInRow = Math.min(columns, count - row * columns);
    for (let col = 0; col < itemsInRow; col++) {
      const device = devices[index];
      if (device) {
        placed.push({
          device,
          x: ((col + 1) / (itemsInRow + 1)) * 100,
          y: ((row + 1) / (rows + 1)) * 100
        });
      }
      index++;
    }
  }

  return placed;
}

function legendBucket(status: string): string {
  const normalized = normalizeStatus(status);
  if (normalized === "ok") return "ok";
  if (normalized === "watch" || normalized === "simulated" || normalized === "manual-override") return "watch";
  if (normalized === "warning") return "warning";
  return "critical";
}

/** A device can look healthy (health: OK) while one of its readings has degraded quality —
 * the map should surface whichever is worse so a problem reading isn't hidden behind a green dot. */
function worstBucket(device: SensorMapDevice, points: readonly SensorMapPoint[], readingByPoint: Map<string, SensorMapReading>): string {
  let bucket = legendBucket(device.health);
  for (const point of points) {
    if (point.deviceId !== device.id) continue;
    const reading = readingByPoint.get(point.id);
    if (!reading) continue;
    const readingBucket = legendBucket(qualityToStatus(reading.quality));
    if ((BUCKET_RANK[readingBucket] ?? 0) > (BUCKET_RANK[bucket] ?? 0)) bucket = readingBucket;
  }
  return bucket;
}

function formatDeviceType(deviceType: string): string {
  const spaced = deviceType.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(value: number | boolean | string): string {
  if (typeof value === "number") return value.toFixed(1);
  return String(value);
}

function formatTimestamp(timestampUtc: string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestampUtc));
}

function qualityToStatus(quality: string): string {
  if (quality === "OK") return "OK";
  if (quality === "WARN") return "Watch";
  return "Critical";
}
