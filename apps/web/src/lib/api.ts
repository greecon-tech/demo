import { UserRole, userRoles } from "@greecon/shared";
import { getSession } from "./session";

const API_BASE_URL = process.env.GREECON_API_URL ?? "http://localhost:4000";

export type DemoRole = UserRole;

// Which role this build's pages fetch as by default when a call doesn't pin a specific role
// (see docs/12-deployment-github-pages.md) — set per build so "publish all role views" can bake
// five separate static snapshots, one per role, from the same source. Only meaningful for the
// static export: the live deployment uses the real logged-in session's role instead (see
// requestHeaders() below) and ignores this entirely.
const rawDemoRole = process.env.GREECON_DEMO_ROLE;
export const DEMO_ROLE: DemoRole = userRoles.includes(rawDemoRole as DemoRole) ? (rawDemoRole as DemoRole) : "operator";

export async function apiGet<T>(path: string, role: DemoRole = DEMO_ROLE): Promise<T> {
  // A static export (NEXT_OUTPUT_EXPORT=1, see docs/12-deployment-github-pages.md) has no
  // server to re-fetch on each request — every page bakes in whatever the API returns at
  // build time, so `no-store` (which Next.js's static export forbids outright) doesn't apply.
  const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === "1";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: await requestHeaders(role),
    ...(isStaticExport ? {} : { cache: "no-store" as const })
  });

  if (!response.ok) {
    throw new Error(`Greecon API request failed: ${role} ${path} -> ${response.status}`);
  }

  return response.json() as Promise<T>;
}

/** Mutations only work against a live server (Railway/GCP) — the static GitHub Pages export
 * has nothing to send them to, so callers must gate this behind NEXT_OUTPUT_EXPORT themselves. */
export async function apiMutate<T>(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown, role: DemoRole = DEMO_ROLE): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { "content-type": "application/json", ...(await requestHeaders(role)) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Greecon API request failed: ${role} ${method} ${path} -> ${response.status} ${detail}`);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/** Real identity, when there is one, always wins over an explicitly-passed role — a caller
 * cannot ask to be treated as "auditor" for one call while actually logged in as "operator"; the
 * API only trusts the session it can verify itself (see apps/api/src/common/principal.guard.ts).
 * The `role` argument only still matters when there is no session at all: the static export
 * (which never has one) and any request made before a user has logged in. */
async function requestHeaders(role: DemoRole): Promise<Record<string, string>> {
  const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === "1";
  const session = isStaticExport ? undefined : await getSession();

  return {
    ...(session ? { "x-greecon-session": session.token } : { "x-user-role": role }),
    ...(await gcpServiceAuthHeader())
  };
}

/** Cloud Run service-to-service auth — proves the web service is allowed to reach the API at
 * all on GCP's private network. Unrelated to the human user's identity above: that's why it's a
 * separate header (Authorization) from x-greecon-session, not a replacement for it. */
async function gcpServiceAuthHeader(): Promise<Record<string, string>> {
  if (!process.env.K_SERVICE) {
    return {};
  }

  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(API_BASE_URL);
  const idToken = await client.idTokenProvider.fetchIdToken(API_BASE_URL);
  return { Authorization: `Bearer ${idToken}` };
}
