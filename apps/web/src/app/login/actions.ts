"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_TOKEN_COOKIE, SESSION_USER_COOKIE, SessionUser } from "../../lib/session";

const API_BASE_URL = process.env.GREECON_API_URL ?? "http://localhost:4000";

export async function loginAction(email: string, password: string, intendedArea: "client" | "staff" = "client"): Promise<{ error?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    return { error: "Invalid email or password." };
  }

  // Parsed defensively rather than a bare response.json() — an unreadable body here previously
  // surfaced as an opaque "Unexpected end of JSON input" crash with no indication of what the API
  // actually sent back, which made a real misconfiguration (e.g. the API returning an empty body)
  // impossible to diagnose from the browser alone.
  const raw = await response.text();
  let parsed: { token: string; user: SessionUser };
  try {
    parsed = JSON.parse(raw) as { token: string; user: SessionUser };
  } catch {
    return { error: `The server sent back something unreadable (status ${response.status}). Raw response: ${raw.slice(0, 300) || "(empty)"}` };
  }
  const { token, user } = parsed;

  // The credentials are real either way — this only decides which door they walked through. A
  // client account trying the "Greecon team" button is turned back here rather than silently
  // landing on the client dashboard, so the two options actually mean something.
  if (intendedArea === "staff" && !user.isPlatformAdmin) {
    return { error: "This account doesn't have Greecon team access. Use \"Client login\" instead." };
  }

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

  redirect(intendedArea === "staff" ? "/platform" : "/");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_TOKEN_COOKIE);
  store.delete(SESSION_USER_COOKIE);
  redirect("/login");
}
