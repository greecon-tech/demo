"use client";

import { useState, useTransition } from "react";
import { createReportExportAction } from "../app/reports/actions";

// The API records a real audit event for this request (docs/13-pilot-readiness.md) but doesn't
// generate an actual file yet — no real report-rendering pipeline exists. This is honest about
// that: it confirms the request was logged rather than implying a download is coming.
export function RequestExportForm({ templates }: { templates: readonly string[] }) {
  const [reportType, setReportType] = useState(templates[0] ?? "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);

  function submit() {
    setError(null);
    setQueued(false);
    startTransition(async () => {
      const result = await createReportExportAction(reportType);
      if (result.error) {
        setError(result.error);
        return;
      }
      setQueued(true);
    });
  }

  return (
    <div className="panel stack">
      <label>
        Report type
        <select value={reportType} onChange={(event) => setReportType(event.target.value)}>
          {templates.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <button type="button" disabled={isPending} onClick={submit}>
        {isPending ? "Requesting…" : "Request export"}
      </button>
      {error ? (
        <p className="rule-actions__error" role="alert">
          {error}
        </p>
      ) : null}
      {queued ? (
        <p className="form-success" role="status">
          Request logged. There is no automated file generation yet — a Greecon admin can pull the
          underlying data directly until that exists.
        </p>
      ) : null}
    </div>
  );
}
