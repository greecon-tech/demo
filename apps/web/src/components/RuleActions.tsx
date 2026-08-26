"use client";

import { useState, useTransition } from "react";
import { deleteRuleAction, setRuleApprovalAction } from "../app/automation/actions";

export function RuleActions({ ruleId, ruleName, approvalState }: { ruleId: string; ruleName: string; approvalState: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function approve() {
    setError(null);
    startTransition(async () => {
      const result = await setRuleApprovalAction(ruleId, "approved", "Approved from the Automation console.");
      if (result.error) setError(result.error);
    });
  }

  function disable() {
    setError(null);
    startTransition(async () => {
      const result = await setRuleApprovalAction(ruleId, "disabled", "Disabled from the Automation console.");
      if (result.error) setError(result.error);
    });
  }

  function remove() {
    if (!window.confirm(`Delete rule "${ruleName}"? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteRuleAction(ruleId);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="rule-actions">
      {approvalState !== "approved" ? (
        <button type="button" className="button-ghost" disabled={isPending} onClick={approve}>
          Approve
        </button>
      ) : null}
      {approvalState !== "disabled" ? (
        <button type="button" className="button-ghost" disabled={isPending} onClick={disable}>
          Disable
        </button>
      ) : null}
      <button type="button" className="button-ghost" disabled={isPending} onClick={remove}>
        Delete
      </button>
      {error ? <p className="rule-actions__error">{error}</p> : null}
    </div>
  );
}
