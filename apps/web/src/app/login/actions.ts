"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_TOKEN_COOKIE, SESSION_USER_COOKIE, SessionUser } from "../../lib/session";

const API_BASE_URL = process.env.GREECON_API_URL ?? "http://localhost:4000";

export async function loginAction(email: string, password: string): Promise<{ error?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    return { error: "Invalid email or password." };
  }

  const { token, user } = (await response.json()) as { token: string; user: SessionUser };
  const store = await cookies();
  // Matches the API's own 12h token expiry (apps/api/src/modules/auth/auth.service.ts) — the
  // cookie should never outlive the token it holds.
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 12
  };
  store.set(SESSION_TOKEN_COOKIE, token, cookieOptions);
  store.set(SESSION_USER_COOKIE, JSON.stringify(user), cookieOptions);

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_TOKEN_COOKIE);
  store.delete(SESSION_USER_COOKIE);
  redirect("/login");
}
