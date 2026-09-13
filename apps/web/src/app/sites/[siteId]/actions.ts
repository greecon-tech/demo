"use server";

import { revalidatePath } from "next/cache";
import { apiMutate } from "../../../lib/api";

export async function createDeviceAction(siteId: string, formData: FormData): Promise<void> {
  const name = formData.get("name");
  const deviceType = formData.get("deviceType");
  const protocol = formData.get("protocol");
  const driverType = formData.get("driverType");
  if (typeof name !== "string" || typeof deviceType !== "string" || typeof protocol !== "string" || typeof driverType !== "string") return;
  if (!name.trim() || !deviceType.trim() || !driverType.trim()) return;

  await apiMutate("/devices", "POST", { siteId, name, deviceType, protocol, driverType });
  revalidatePath(`/sites/${siteId}`);
}

export async function createPointAction(siteId: string, formData: FormData): Promise<void> {
  const deviceId = formData.get("deviceId");
  const canonicalName = formData.get("canonicalName");
  const label = formData.get("label");
  const unit = formData.get("unit");
  const capability = formData.get("capability");
  if (
    typeof deviceId !== "string" ||
    typeof canonicalName !== "string" ||
    typeof label !== "string" ||
    typeof unit !== "string" ||
    typeof capability !== "string"
  ) {
    return;
  }
  if (!deviceId || !label.trim() || !unit.trim()) return;

  await apiMutate("/points", "POST", { siteId, deviceId, canonicalName, label, unit, capability });
  revalidatePath(`/sites/${siteId}`);
}
