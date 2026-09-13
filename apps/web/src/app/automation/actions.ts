"use server";

import { revalidatePath } from "next/cache";
import { RuleAction, RuleCondition, RuleExecutionMode, RulePriorityLevel } from "@greecon/shared";
import { apiMutate } from "../../lib/api";

export interface RuleFormInput {
  siteId?: string;
  name: string;
  priority: RulePriorityLevel;
  triggerType: string;
  conditions: RuleCondition[];
  constraints: RuleCondition[];
  actions: RuleAction[];
  executionMode: RuleExecutionMode;
  explanationTemplate: string;
  rollbackBehavior: string;
}

export async function createRuleAction(input: RuleFormInput): Promise<{ error?: string }> {
  try {
    await apiMutate("/rules", "POST", input);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create rule." };
  }
  revalidatePath("/automation");
  return {};
}

// UpdateRuleDto (unlike CreateRuleDto) doesn't accept siteId or triggerType at all — a rule's
// site and trigger type are fixed at creation — and the API's ValidationPipe rejects any request
// carrying a property its DTO doesn't declare, so those two must be left out here rather than
// just being harmlessly ignored.
export async function updateRuleAction(ruleId: string, input: RuleFormInput): Promise<{ error?: string }> {
  const { name, priority, conditions, constraints, actions, executionMode, explanationTemplate, rollbackBehavior } = input;
  try {
    await apiMutate(`/rules/${ruleId}`, "PATCH", { name, priority, conditions, constraints, actions, executionMode, explanationTemplate, rollbackBehavior });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update rule." };
  }
  revalidatePath("/automation");
  return {};
}

export async function setRuleApprovalAction(ruleId: string, approvalState: "draft" | "approved" | "disabled", reason: string): Promise<{ error?: string }> {
  try {
    await apiMutate(`/rules/${ruleId}/approval`, "PATCH", { approvalState, reason });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update rule approval." };
  }
  revalidatePath("/automation");
  return {};
}

export async function deleteRuleAction(ruleId: string): Promise<{ error?: string }> {
  try {
    await apiMutate(`/rules/${ruleId}`, "DELETE");
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to delete rule." };
  }
  revalidatePath("/automation");
  return {};
}
