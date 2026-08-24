const API_BASE_URL = process.env.GREECON_API_URL ?? "http://localhost:4000";

export type DemoRole = "owner" | "admin" | "operator" | "viewer" | "auditor";

export async function apiGet<T>(path: string, role: DemoRole = "operator"): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "x-user-role": role,
      ...(await authHeader())
    },
    cache: "no-store"
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
