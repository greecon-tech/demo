import { deviceProtocols } from "@greecon/shared";
import { createDeviceAction } from "../app/sites/[siteId]/actions";

// Plain server-action form, no client JavaScript needed — same reasoning as CreateSiteForm.
export function CreateDeviceForm({ siteId }: { siteId: string }) {
  return (
    <form action={createDeviceAction.bind(null, siteId)} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Name
          <input name="name" placeholder="e.g. Soil Moisture Sensor Zone 1" required />
        </label>
        <label>
          Device type
          <input name="deviceType" placeholder="e.g. soil_moisture_sensor" required />
        </label>
        <label>
          Protocol
          <select name="protocol" defaultValue="modbus">
            {deviceProtocols.map((protocol) => (
              <option key={protocol} value={protocol}>
                {protocol.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Driver
          <input name="driverType" placeholder="e.g. greecon-edge-driver-modbus" required />
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit">Add device</button>
      </div>
    </form>
  );
}
