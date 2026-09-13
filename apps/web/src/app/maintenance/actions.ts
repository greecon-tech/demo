"use server";

import { revalidatePath } from "next/cache";
import { apiMutate } from "../../lib/api";

export async function createMaintenanceTaskAction(
  siteId: string,
  title: string,
  notes: string,
  dueAtUtc: string
): Promise<{ error?: string; created?: boolean }> {
  if (!siteId || !title.trim()) {
    return { error: "Site and title are required." };
  }

  try {
    await apiMutate("/maintenance", "POST", {
      siteId,
      title,
      notes: notes.trim() || undefined,
      dueAtUtc: dueAtUtc || undefined
    });
    revalidatePath("/maintenance");
    return { created: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create task." };
  }
}

export async function completeMaintenanceTaskAction(taskId: string, completionLog: string): Promise<{ error?: string }> {
  try {
    await apiMutate(`/maintenance/${taskId}`, "PATCH", { status: "complete", completionLog: completionLog.trim() || undefined });
    revalidatePath("/maintenance");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to complete task." };
  }
}

export async function reopenMaintenanceTaskAction(taskId: string): Promise<{ error?: string }> {
  try {
    await apiMutate(`/maintenance/${taskId}`, "PATCH", { status: "open" });
    revalidatePath("/maintenance");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to reopen task." };
  }
}
