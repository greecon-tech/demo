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
