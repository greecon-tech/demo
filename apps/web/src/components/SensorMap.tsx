import { StatusBadge } from "./StatusBadge";

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

  return (
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
  );
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
