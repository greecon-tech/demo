"use client";

import { FormEvent, useState } from "react";

export function ManualOverridePanel() {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("30");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState("No manual override active");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
  }

  function confirmOverride() {
    if (reason.trim().length < 8) {
      setResult("Action blocked by safety policy: reason is required.");
      setPending(false);
      return;
    }
    setResult(`Manual override simulated for ${duration} minutes. Audit event queued.`);
    setPending(false);
  }

  return (
    <div className="override-panel">
      <form onSubmit={submit}>
        <label>
          Reason
          <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Inspection, maintenance, or controlled operation" />
        </label>
        <label>
          Duration
          <select value={duration} onChange={(event) => setDuration(event.target.value)}>
            <option value="15">15 minutes</option>
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </label>
        <button type="submit">Request Manual Override</button>
      </form>
      <p className="muted">{result}</p>
      {pending ? (
        <div className="dialog" role="dialog" aria-modal="true" aria-label="Confirm manual override">
          <div>
            <strong>Confirm manual override</strong>
            <p>Remote users cannot bypass hard safety rules. This action remains simulated in MVP.</p>
            <div className="dialog__actions">
              <button type="button" onClick={() => setPending(false)}>
                Cancel
              </button>
              <button type="button" onClick={confirmOverride}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
