"use client";

import { FormEvent, useState, useTransition } from "react";
import { siteTypes } from "@greecon/shared";
import { createSiteAction } from "../app/admin/actions";

// A client component (not the plain progressive-enhancement form used elsewhere in this file's
// siblings) so a real failure — a duplicate name, the API being briefly unreachable — shows up as
// a real message instead of either silently doing nothing or crashing to Next.js's generic error
// page. Matches CreateUserForm's error/success pattern.
export function CreateSiteForm() {
  const [name, setName] = useState("");
  const [type, setType] = useState("farm");
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(false);
    startTransition(async () => {
      const result = await createSiteAction(name, type, locationName);
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated(true);
      setName("");
      setLocationName("");
    });
  }

  return (
    <form onSubmit={submit} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Durres Farm Site" required />
        </label>
        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value)}>
            {siteTypes
              .filter((candidate) => candidate !== "demo_site")
              .map((candidate) => (
                <option key={candidate} value={candidate}>
                  {candidate.replace(/_/g, " ")}
                </option>
              ))}
          </select>
        </label>
        <label>
          Location
          <input value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder="e.g. Durres, Albania" required />
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create site"}
        </button>
        {error ? (
          <p className="rule-actions__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {created ? (
        <p className="form-success" role="status">
          Site created.
        </p>
      ) : null}
    </form>
  );
}
