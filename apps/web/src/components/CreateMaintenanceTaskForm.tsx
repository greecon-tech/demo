"use client";

import { FormEvent, useState, useTransition } from "react";
import { createMaintenanceTaskAction } from "../app/maintenance/actions";

interface SiteOption {
  id: string;
  name: string;
}

export function CreateMaintenanceTaskForm({ sites }: { sites: readonly SiteOption[] }) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueAtUtc, setDueAtUtc] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCreated(false);
    startTransition(async () => {
      const result = await createMaintenanceTaskAction(siteId, title, notes, dueAtUtc ? new Date(dueAtUtc).toISOString() : "");
      if (result.error) {
        setError(result.error);
        return;
      }
      setCreated(true);
      setTitle("");
      setNotes("");
      setDueAtUtc("");
    });
  }

  return (
    <form onSubmit={submit} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Site
          <select value={siteId} onChange={(event) => setSiteId(event.target.value)}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Replace intake filter" required />
        </label>
        <label>
          Due date
          <input type="date" value={dueAtUtc} onChange={(event) => setDueAtUtc(event.target.value)} />
        </label>
      </div>
      <label>
        Notes
        <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional detail for whoever handles this" />
      </label>
      <div className="rule-form__footer">
        <button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create task"}
        </button>
        {error ? (
          <p className="rule-actions__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {created ? (
        <p className="form-success" role="status">
          Task created.
        </p>
      ) : null}
    </form>
  );
}
