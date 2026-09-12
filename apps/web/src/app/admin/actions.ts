"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@greecon/shared";
import { apiMutate } from "../../lib/api";

interface CreatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: string;
}

export async function createUserAction(
  name: string,
  email: string,
  role: UserRole
): Promise<{ error?: string; user?: CreatedUser; temporaryPassword?: string }> {
  try {
    const result = await apiMutate<{ user: CreatedUser; temporaryPassword: string }>("/users", "POST", { name, email, role });
    revalidatePath("/admin");
    return { user: result.user, temporaryPassword: result.temporaryPassword };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to create user." };
  }
}

// Bound to a specific userId per row (see admin/page.tsx) — the role <select> submits this
// directly with no client-side JavaScript required, same progressive-enhancement pattern as the
// logout form in components/Shell.tsx.
export async function updateUserRoleAction(userId: string, formData: FormData): Promise<void> {
  const role = formData.get("role");
  if (typeof role !== "string") return;
  await apiMutate(`/users/${userId}`, "PATCH", { role });
  revalidatePath("/admin");
}

export async function updateUserStatusAction(userId: string, nextStatus: "active" | "disabled"): Promise<void> {
  await apiMutate(`/users/${userId}`, "PATCH", { status: nextStatus });
  revalidatePath("/admin");
}

export async function resetUserPasswordAction(userId: string): Promise<{ error?: string; temporaryPassword?: string }> {
  try {
    const result = await apiMutate<{ temporaryPassword: string }>(`/users/${userId}/reset-password`, "POST");
    revalidatePath("/admin");
    return { temporaryPassword: result.temporaryPassword };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to reset password." };
  }
}

export async function createSiteAction(formData: FormData): Promise<void> {
  const name = formData.get("name");
  const type = formData.get("type");
  const locationName = formData.get("locationName");
  if (typeof name !== "string" || typeof type !== "string" || typeof locationName !== "string") return;
  if (!name.trim() || !locationName.trim()) return;

  await apiMutate("/sites", "POST", { name, type, locationName });
  revalidatePath("/admin");
}
