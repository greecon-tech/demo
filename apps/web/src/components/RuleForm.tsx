"use client";

import { FormEvent, useState, useTransition } from "react";
import { CanonicalPointName, canonicalPoints, RuleAction, RuleCondition, RuleExecutionMode, ruleExecutionModes, RulePriorityLevel, rulePriorityLevels } from "@greecon/shared";
import { createRuleAction } from "../app/automation/actions";
import { buildSingleConditionRule } from "../app/automation/rule-form-utils";

const operators: ReadonlyArray<RuleCondition["operator"]> = ["lt", "lte", "gt", "gte", "eq", "neq"];
const actionTypes: ReadonlyArray<RuleAction["type"]> = ["command", "alert", "recommendation"];

export function RuleForm({ sites }: { sites: ReadonlyArray<{ id: string; name: string }> }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    // React nulls out the synthetic event (including currentTarget) once this handler returns,
    // but startTransition's callback runs later — so the form element must be captured now.
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const actionType = form.get("actionType") as RuleAction["type"];
    const rule = buildSingleConditionRule({
      siteId: String(form.get("siteId") ?? ""),
      name: String(form.get("name") ?? ""),
      priority: form.get("priority") as RulePriorityLevel,
      point: form.get("point") as CanonicalPointName,
      operator: form.get("operator") as RuleCondition["operator"],
      conditionValue: String(form.get("conditionValue") ?? ""),
      actionType,
      targetCanonicalName: actionType === "command" ? (form.get("targetCanonicalName") as CanonicalPointName) : undefined,
      actionValue: String(form.get("actionValue") ?? ""),
      message: String(form.get("message") ?? ""),
      executionMode: form.get("executionMode") as RuleExecutionMode,
      explanationTemplate: String(form.get("explanationTemplate") ?? ""),
      rollbackBehavior: String(form.get("rollbackBehavior") ?? "")
    });

    startTransition(async () => {
      const result = await createRuleAction(rule);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        formElement.reset();
      }
    });
  }

  return (
    <form className="rule-form" onSubmit={submit}>
      <div className="rule-form__grid">
        <label>
          Name
          <input name="name" required placeholder="Stop irrigation when tank is low" />
        </label>
        <label>
          Site
          <select name="siteId" defaultValue="">
            <option value="">All sites</option>
            {sites.map((site) => (
              <option value={site.id} key={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue="optimization">
            {rulePriorityLevels.map((level) => (
              <option value={level} key={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
        <label>
          Execution mode
          <select name="executionMode" defaultValue="simulation">
            {ruleExecutionModes.map((mode) => (
              <option value={mode} key={mode}>
                {mode}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="rule-form__section-label">When</p>
      <div className="rule-form__grid">
        <label>
          Point
          <select name="point" defaultValue={canonicalPoints[0]}>
            {canonicalPoints.map((point) => (
              <option value={point} key={point}>
                {point}
              </option>
            ))}
          </select>
        </label>
        <label>
          Operator
          <select name="operator" defaultValue="lt">
            {operators.map((operator) => (
              <option value={operator} key={operator}>
                {operator}
              </option>
            ))}
          </select>
        </label>
        <label>
          Value
          <input name="conditionValue" required placeholder="28" />
        </label>
      </div>

      <p className="rule-form__section-label">Then</p>
      <div className="rule-form__grid">
        <label>
          Action type
          <select name="actionType" defaultValue="command">
            {actionTypes.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label>
          Target point
          <select name="targetCanonicalName" defaultValue={canonicalPoints[0]}>
            {canonicalPoints.map((point) => (
              <option value={point} key={point}>
                {point}
              </option>
            ))}
          </select>
        </label>
        <label>
          Value
          <input name="actionValue" placeholder="ON" />
        </label>
      </div>
      <label>
        Message
        <input name="message" required placeholder="Start irrigation because soil moisture is low." />
      </label>

      <div className="rule-form__grid">
        <label>
          Explanation
          <input name="explanationTemplate" required placeholder="Why this rule exists, in plain language." />
        </label>
        <label>
          Rollback behavior
          <input name="rollbackBehavior" required placeholder="What happens if this needs to be undone." />
        </label>
      </div>

      <div className="rule-form__footer">
        <button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create rule (as draft)"}
        </button>
        {error ? <p className="rule-actions__error">{error}</p> : null}
        {success ? <p className="muted">Rule created as a draft — approve it above to enable it.</p> : null}
      </div>
    </form>
  );
}
