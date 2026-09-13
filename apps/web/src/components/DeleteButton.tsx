"use client";

import { useState, useTransition } from "react";

// A small confirm-then-call-a-server-action button, reused everywhere something gets deleted
// (devices, points, gateways) — matches RuleActions.tsx's existing delete pattern (window.confirm,
// useTransition, inline error) rather than a bare form submit, since deleting hardware deserves a
// confirmation step a plain <form action> can't show without client JS anyway.
export function DeleteButton({ action, confirmMessage, label = "Delete" }: { action: () => Promise<{ error?: string }>; confirmMessage: string; label?: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="stack">
      <button type="button" className="button-ghost" disabled={isPending} onClick={handleClick}>
        {isPending ? "Deleting…" : label}
      </button>
      {error ? (
        <p className="rule-actions__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
