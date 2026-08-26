import { UserRole, userRoles } from "@greecon/shared";

const API_BASE_URL = process.env.GREECON_API_URL ?? "http://localhost:4000";

export type DemoRole = UserRole;

// Which role this build's pages fetch as by default when a call doesn't pin a specific role
// (see docs/12-deployment-github-pages.md) — set per build so "publish all role views" can bake
// five separate static snapshots, one per role, from the same source.
const rawDemoRole = process.env.GREECON_DEMO_ROLE;
export const DEMO_ROLE: DemoRole = userRoles.includes(rawDemoRole as DemoRole) ? (rawDemoRole as DemoRole) : "operator";

export async function apiGet<T>(path: string, role: DemoRole = DEMO_ROLE): Promise<T> {
  // A static export (NEXT_OUTPUT_EXPORT=1, see docs/12-deployment-github-pages.md) has no
  // server to re-fetch on each request — every page bakes in whatever the API returns at
  // build time, so `no-store` (which Next.js's static export forbids outright) doesn't apply.
  const isStaticExport = process.env.NEXT_OUTPUT_EXPORT === "1";

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "x-user-role": role,
      ...(await authHeader())
    },
    ...(isStaticExport ? {} : { cache: "no-store" as const })
  });

  if (!response.ok) {
    throw new Error(`Greecon API request failed: ${role} ${path} -> ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function authHeader(): Promise<Record<string, string>> {
  if (!process.env.K_SERVICE) {
    return {};
  }

  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth();
  const client = await auth.getIdTokenClient(API_BASE_URL);
  const idToken = await client.idTokenProvider.fetchIdToken(API_BASE_URL);
  return { Authorization: `Bearer ${idToken}` };
}
