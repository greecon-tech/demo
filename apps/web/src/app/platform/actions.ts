"use server";

import { revalidatePath } from "next/cache";
import { apiMutate } from "../../lib/api";

interface CreatedTenant {
  id: string;
  name: string;
  domain: string;
  status: string;
}

interface CreatedOwner {
  id: string;
  email: string;
  name: string;
}

export async function createTenantAction(
  name: string,
  domain: string,
  ownerName: string,
  ownerEmail: string
): Promise<{ error?: string; tenant?: CreatedTenant; owner?: CreatedOwner; temporaryPassword?: string }> {
  try {
    const result = await apiMutate<{ tenant: CreatedTenant; owner: CreatedOwner; temporaryPassword: string }>("/platform-admin/tenants", "POST", {
      name,
      domain,
      ownerName,
      ownerEmail
    });
    revalidatePath("/platform");
    return { tenant: result.tenant, owner: result.owner, temporaryPassword: result.temporaryPassword };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to onboard client." };
  }
}
