"use server";

import { revalidatePath } from "next/cache";
import { apiMutate } from "../../../lib/api";

export async function createDeviceAction(
  siteId: string,
  name: string,
  deviceType: string,
  protocol: string,
  driverType: string
): Promise<{ error?: string; created?: boolean }> {
  if (!name.trim() || !deviceType.trim() || !driverType.trim()) {
    return { error: "Name, device type, and driver are required." };
  }

  try {
    await apiMutate("/devices", "POST", { siteId, name, deviceType, protocol, driverType });
    revalidatePath(`/sites/${siteId}`);
    return { created: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to add device." };
  }
}

interface CreatedGateway {
  id: string;
  name: string;
}

export async function createGatewayAction(siteId: string, name: string): Promise<{ error?: string; gateway?: CreatedGateway; secret?: string }> {
  if (!name.trim()) {
    return { error: "Name is required." };
  }

  try {
    const result = await apiMutate<{ gateway: CreatedGateway; secret: string }>("/gateways", "POST", { siteId, name });
    revalidatePath(`/sites/${siteId}`);
    return { gateway: result.gateway, secret: result.secret };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to add gateway." };
  }
}

export async function createPointAction(
  siteId: string,
  deviceId: string,
  canonicalName: string,
  label: string,
  unit: string,
  capability: string
): Promise<{ error?: string; created?: boolean }> {
  if (!deviceId || !label.trim() || !unit.trim()) {
    return { error: "Device, label, and unit are required." };
  }

  try {
    await apiMutate("/points", "POST", { siteId, deviceId, canonicalName, label, unit, capability });
    revalidatePath(`/sites/${siteId}`);
    return { created: true };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to add point." };
  }
}
