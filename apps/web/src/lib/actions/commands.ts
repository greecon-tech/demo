"use server";

import { revalidatePath } from "next/cache";
import { apiMutate } from "../api";

export interface ManualCommandInput {
  siteId: string;
  targetDeviceId: string;
  targetPointId: string;
  requestedValue: string | number | boolean;
  reason: string;
  durationMinutes?: number;
}

interface CommandResult {
  dispatchStatus: string;
  failureReason?: string;
}

// Backs both the site-level Manual Control panel (irrigation, pump, etc. on a single site) and
// the Automation page's Manual Override panel (any writable point tenant-wide) — both submit a
// real command to POST /commands, which runs it through the same GAIA safety evaluation as an
// automated rule would (dry-run protection, expired-override checks, and so on).
export async function createManualCommandAction(input: ManualCommandInput): Promise<{ error?: string } & Partial<CommandResult>> {
  try {
    const record = await apiMutate<CommandResult>("/commands", "POST", {
      siteId: input.siteId,
      targetDeviceId: input.targetDeviceId,
      targetPointId: input.targetPointId,
      requestedValue: input.requestedValue,
      reason: input.reason,
      manualOverride: input.durationMinutes ? { durationMinutes: input.durationMinutes, reason: input.reason } : undefined
    });
    revalidatePath(`/sites/${input.siteId}`);
    revalidatePath("/automation");
    return { dispatchStatus: record.dispatchStatus, failureReason: record.failureReason };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to dispatch manual command." };
  }
}
