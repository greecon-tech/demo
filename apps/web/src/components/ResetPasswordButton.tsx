"use client";

import { useState, useTransition } from "react";
import { resetUserPasswordAction } from "../app/admin/actions";

// Stands in for self-service "forgot password" until real email delivery exists (see
// PlatformService.resetUserPassword) — an admin triggers this on the user's behalf and the new
// temporary password is shown exactly once, right here, same handling as CreateUserForm.
export function ResetPasswordButton({ userId }: { userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ password?: string; error?: string } | null>(null);

  function reset() {
    setResult(null);
    startTransition(async () => {
      const response = await resetUserPasswordAction(userId);
      setResult(response.error ? { error: response.error } : { password: response.temporaryPassword });
    });
  }

  return (
    <div>
      <button type="button" className="button-ghost" onClick={reset} disabled={isPending}>
        {isPending ? "Resetting…" : "Reset password"}
      </button>
      {result?.error ? (
        <p className="rule-actions__error" role="alert">
          {result.error}
        </p>
      ) : null}
      {result?.password ? (
        <div className="credential-notice" role="status">
          <strong>New password — save it now</strong>
          <p>Shown once. Send it to this user directly.</p>
          <p className="credential-notice__value">{result.password}</p>
        </div>
      ) : null}
    </div>
  );
}
