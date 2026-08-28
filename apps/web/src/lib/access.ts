import { notFound } from "next/navigation";
import { Permission, UserRole, hasPermission } from "@greecon/shared";

/** Nav.tsx already hides a link a role can't use, but that alone never stopped a direct visit to
 * the URL — anyone who guessed/bookmarked it could still fetch whatever the page fetched. Call
 * this at the top of a page gated by a specific permission so a role that lacks it gets a 404
 * instead of the page rendering (or throwing) with data it shouldn't have reached. */
export function requirePermission(role: UserRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    notFound();
  }
}
