"use server";

import { revalidatePath } from "next/cache";
import { IncidentStatus } from "@greecon/shared";
import { apiMutate } from "../../lib/api";

export async function acknowledgeAlertAction(alertId: string): Promise<{ error?: string }> {
  try {
    await apiMutate(`/alerts/${alertId}/acknowledge`, "POST");
    revalidatePath("/alerts");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to acknowledge alert." };
  }
}

export async function updateIncidentStatusAction(incidentId: string, status: IncidentStatus): Promise<{ error?: string }> {
  try {
    await apiMutate(`/incidents/${incidentId}/status`, "PATCH", { status });
    revalidatePath("/alerts");
    return {};
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update incident status." };
  }
}
