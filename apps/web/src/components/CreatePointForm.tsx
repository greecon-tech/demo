import { canonicalPoints, pointCapabilities } from "@greecon/shared";
import { createPointAction } from "../app/sites/[siteId]/actions";

interface DeviceOption {
  id: string;
  name: string;
}

// Plain server-action form, no client JavaScript needed — same reasoning as CreateSiteForm. A
// point always belongs to a device, so this needs at least one device to already exist on the
// site (see CreateDeviceForm above it).
export function CreatePointForm({ siteId, devices }: { siteId: string; devices: readonly DeviceOption[] }) {
  return (
    <form action={createPointAction.bind(null, siteId)} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Device
          <select name="deviceId">
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reading type
          <select name="canonicalName">
            {canonicalPoints.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Label
          <input name="label" placeholder="e.g. Soil moisture" required />
        </label>
        <label>
          Unit
          <input name="unit" placeholder="e.g. %" required />
        </label>
        <label>
          Capability
          <select name="capability" defaultValue="read">
            {pointCapabilities.map((capability) => (
              <option key={capability} value={capability}>
                {capability.replace(/_/g, "/")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit">Add point</button>
      </div>
    </form>
  );
}
