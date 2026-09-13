"use client";

import { FormEvent, useState, useTransition } from "react";
import { assetTypes } from "@greecon/shared";
import { createAssetAction } from "../app/sites/[siteId]/actions";

// A client component so a real failure shows up as a message instead of silently doing nothing —
// same reasoning as CreateSiteForm.
export function CreateAssetForm({ siteId }: { siteId: string }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof assetTypes)[number]>(assetTypes[0]);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(false);
    startTransition(async () => {
      const result = await createAssetAction(siteId, name, type);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated(true);
      setName("");
    });
  }

  return (
    <form onSubmit={submit} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Pump Station 1" required />
        </label>
        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value as (typeof assetTypes)[number])}>
            {assetTypes.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add asset"}
        </button>
        {error ? (
          <p className="rule-actions__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {created ? (
        <p className="form-success" role="status">
          Asset added.
        </p>
      ) : null}
    </form>
  );
}
