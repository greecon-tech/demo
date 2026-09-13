"use client";

import { useState } from "react";
import { AutomationRule } from "@greecon/shared";
import { extractSingleConditionFormValues } from "../app/automation/rule-form-utils";
import { DataTable } from "./DataTable";
import { RuleActions } from "./RuleActions";
import { RuleForm } from "./RuleForm";
import { Section } from "./Section";
import { StatusBadge } from "./StatusBadge";

interface SiteOption {
  id: string;
  name: string;
}

// Owns which rule (if any) is being edited — RuleForm is a single shared instance below the
// table, not one per row, so this state has to live above both of them.
export function RulesSection({ rules, sites }: { rules: readonly AutomationRule[]; sites: readonly SiteOption[] }) {
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const editingRule = editingRuleId ? rules.find((rule) => rule.id === editingRuleId) : undefined;
  const editingFormValues = editingRule ? extractSingleConditionFormValues(editingRule) : null;

  return (
    <>
      <Section title="Rules">
        <DataTable
          rows={rules}
          columns={[
            { key: "name", label: "Rule" },
            { key: "priority", label: "Priority" },
            { key: "executionMode", label: "Execution" },
            { key: "approvalState", label: "Approval", render: (row) => <StatusBadge status={row.approvalState} /> },
            { key: "explanationTemplate", label: "Explanation" },
            {
              key: "id",
              label: "Manage",
              render: (row) => (
                <div className="stack">
                  <RuleActions ruleId={row.id} ruleName={row.name} approvalState={row.approvalState} />
                  {extractSingleConditionFormValues(row) ? (
                    <button type="button" className="button-ghost" onClick={() => setEditingRuleId(row.id)}>
                      Edit
                    </button>
                  ) : (
                    <span className="muted">Not editable here — has more than one condition or action</span>
                  )}
                </div>
              )
            }
          ]}
        />
      </Section>
      <Section title={editingRule ? `Edit rule: ${editingRule.name}` : "Create Rule"} aside={<span className="muted">Owner / Admin only</span>}>
        <RuleForm
          sites={sites}
          editingRule={editingFormValues && editingRuleId ? { ...editingFormValues, id: editingRuleId } : null}
          onCancelEdit={() => setEditingRuleId(null)}
          onSaved={() => setEditingRuleId(null)}
        />
      </Section>
    </>
  );
}
