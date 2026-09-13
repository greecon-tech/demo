import { AutomationRule, CanonicalPointName, RuleAction, RuleCondition, RuleExecutionMode, RulePriorityLevel } from "@greecon/shared";
import { RuleFormInput } from "./actions";

export interface SingleConditionRuleFormValues {
  siteId?: string;
  name: string;
  priority: RulePriorityLevel;
  point: CanonicalPointName;
  operator: RuleCondition["operator"];
  conditionValue: string;
  actionType: RuleAction["type"];
  targetCanonicalName?: CanonicalPointName;
  actionValue: string;
  message: string;
  executionMode: RuleExecutionMode;
  explanationTemplate: string;
  rollbackBehavior: string;
}

// The full AutomationRule schema supports multiple conditions/actions, but a pilot's first
// rules are almost always "when this one reading crosses a threshold, do this one thing" — so
// the create form only builds that shape. Multi-condition rules still display, approve, disable,
// and delete fine; they just aren't editable through this simple form.
export function buildSingleConditionRule(input: SingleConditionRuleFormValues): RuleFormInput {
  return {
    siteId: input.siteId || undefined,
    name: input.name,
    priority: input.priority,
    triggerType: "threshold",
    conditions: [{ point: input.point, operator: input.operator, value: parseRuleValue(input.conditionValue) }],
    constraints: [],
    actions: [
      {
        type: input.actionType,
        targetCanonicalName: input.actionType === "command" ? input.targetCanonicalName : undefined,
        value: input.actionType === "command" ? parseRuleValue(input.actionValue) : undefined,
        message: input.message
      }
    ],
    executionMode: input.executionMode,
    explanationTemplate: input.explanationTemplate,
    rollbackBehavior: input.rollbackBehavior
  };
}

// The reverse of buildSingleConditionRule, used to pre-fill RuleForm when editing an existing
// rule. Returns null for anything the simple form can't represent (more than one condition or
// action, any constraint, or a condition keyed off a derived state rather than a point reading) —
// those rules still display, approve, disable, and delete fine, they just aren't editable here.
export function extractSingleConditionFormValues(rule: AutomationRule): SingleConditionRuleFormValues | null {
  if (rule.conditions.length !== 1 || rule.constraints.length !== 0 || rule.actions.length !== 1) return null;
  const condition = rule.conditions[0];
  const action = rule.actions[0];
  if (!condition || !action || !condition.point) return null;

  return {
    siteId: rule.siteId,
    name: rule.name,
    priority: rule.priority,
    point: condition.point,
    operator: condition.operator,
    conditionValue: String(condition.value),
    actionType: action.type,
    targetCanonicalName: action.targetCanonicalName,
    actionValue: action.value !== undefined ? String(action.value) : "",
    message: action.message,
    executionMode: rule.executionMode,
    explanationTemplate: rule.explanationTemplate,
    rollbackBehavior: rule.rollbackBehavior
  };
}

function parseRuleValue(raw: string): number | boolean | string {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const numeric = Number(raw);
  return raw.trim() !== "" && !Number.isNaN(numeric) ? numeric : raw;
}
