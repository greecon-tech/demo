"use client";

import { FormEvent, useState, useTransition } from "react";
import { loginAction } from "../app/login/actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await loginAction(email, password);
      // A successful login redirects server-side and never returns here — only a failure does.
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit}>
      <label>
        Email
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@greecon.earth" required />
      </label>
      <label>
        Password
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      <button type="submit" disabled={isPending}>
        {isPending ? "Signing in…" : "Continue"}
      </button>
      {error ? (
        <p className="login-error" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
