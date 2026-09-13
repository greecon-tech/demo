import { createHash, randomBytes } from "crypto";

// A gateway credential is a high-entropy random token, not a human-chosen password — it doesn't
// need bcrypt's deliberate slowness against brute force, and a fast, indexable hash is what lets
// PrincipalGuard look up which gateway presented a given secret in one query (WHERE secret_hash =
// $1) instead of bcrypt-comparing against every registered gateway on every telemetry request.
export function generateGatewaySecret(): string {
  return randomBytes(32).toString("hex");
}

export function hashGatewaySecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}
