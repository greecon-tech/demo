"use server";

import { apiMutate } from "../../lib/api";

export async function createReportExportAction(reportType: string): Promise<{ error?: string; queued?: boolean }> {
  try {
    await apiMutate("/reports/exports", "POST", { reportType });
    return { queued: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to queue export." };
  }
}
