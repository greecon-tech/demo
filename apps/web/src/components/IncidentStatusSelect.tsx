"use client";

import { useState, useTransition } from "react";
import { IncidentStatus, incidentStatuses } from "@greecon/shared";
import { updateIncidentStatusAction } from "../app/alerts/actions";

export function IncidentStatusSelect({ incidentId, status }: { incidentId: string; status: IncidentStatus }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value as IncidentStatus;
    setError(null);
    startTransition(async () => {
      const result = await updateIncidentStatusAction(incidentId, next);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <select defaultValue={status} onChange={change} disabled={isPending}>
        {incidentStatuses.map((candidate) => (
          <option key={candidate} value={candidate}>
            {candidate.charAt(0).toUpperCase() + candidate.slice(1)}
          </option>
        ))}
      </select>
      {error ? (
        <p className="rule-actions__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
