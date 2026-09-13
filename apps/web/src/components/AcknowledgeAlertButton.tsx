"use client";

import { useState, useTransition } from "react";
import { acknowledgeAlertAction } from "../app/alerts/actions";

export function AcknowledgeAlertButton({ alertId }: { alertId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function acknowledge() {
    setError(null);
    startTransition(async () => {
      const result = await acknowledgeAlertAction(alertId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <button type="button" className="button-ghost" disabled={isPending} onClick={acknowledge}>
        {isPending ? "Acknowledging…" : "Acknowledge"}
      </button>
      {error ? (
        <p className="rule-actions__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
