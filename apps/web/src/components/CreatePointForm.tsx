"use client";

import { FormEvent, useState, useTransition } from "react";
import { canonicalPoints, CanonicalPointName, pointCapabilities } from "@greecon/shared";
import { createPointAction } from "../app/sites/[siteId]/actions";

interface DeviceOption {
  id: string;
  name: string;
}

// A client component so a real failure shows up as a message instead of silently doing nothing —
// same reasoning as CreateSiteForm. A point always belongs to a device, so this needs at least one
// device to already exist on the site (see CreateDeviceForm above it).
export function CreatePointForm({ siteId, devices }: { siteId: string; devices: readonly DeviceOption[] }) {
  const [deviceId, setDeviceId] = useState(devices[0]?.id ?? "");
  const [canonicalName, setCanonicalName] = useState<CanonicalPointName>(canonicalPoints[0]);
  const [label, setLabel] = useState("");
  const [unit, setUnit] = useState("");
  const [capability, setCapability] = useState("read");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(false);
    startTransition(async () => {
      const result = await createPointAction(siteId, deviceId, canonicalName, label, unit, capability);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated(true);
      setLabel("");
      setUnit("");
    });
  }

  return (
    <form onSubmit={submit} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Device
          <select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Reading type
          <select value={canonicalName} onChange={(event) => setCanonicalName(event.target.value as CanonicalPointName)}>
            {canonicalPoints.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Label
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Soil moisture" required />
        </label>
        <label>
          Unit
          <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="e.g. %" required />
        </label>
        <label>
          Capability
          <select value={capability} onChange={(event) => setCapability(event.target.value)}>
            {pointCapabilities.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate.replace(/_/g, "/")}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add point"}
        </button>
        {error ? (
          <p className="rule-actions__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {created ? (
        <p className="form-success" role="status">
          Point added.
        </p>
      ) : null}
    </form>
  );
}
