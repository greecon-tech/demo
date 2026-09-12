"use client";

import { FormEvent, useState, useTransition } from "react";
import { UserRole, userRoles } from "@greecon/shared";
import { createUserAction } from "../app/admin/actions";

// Shows the generated temporary password exactly once, right after creation — the API never
// stores or logs the plaintext anywhere else (docs/07-security-and-rbac.md), so this screen is
// the only place it will ever appear. Whoever creates the account is responsible for passing it
// to the new user out of band; there is no self-service reset flow yet.
export function CreateUserForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("operator");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUserAction(name, email, role);
      if (result.error || !result.user || !result.temporaryPassword) {
        setError(result.error ?? "Failed to create user.");
        return;
      }
      setCreated({ email: result.user.email, temporaryPassword: result.temporaryPassword });
      setName("");
      setEmail("");
      setRole("operator");
    });
  }

  return (
    <form onSubmit={submit} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" required />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@greecon.earth" required />
        </label>
        <label>
          Role
          <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
            {userRoles.map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate.charAt(0).toUpperCase() + candidate.slice(1)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit" disabled={isPending}>
          {isPending ? "Creating…" : "Create user"}
        </button>
        {error ? (
          <p className="rule-actions__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {created ? (
        <div className="credential-notice" role="status">
          <strong>User created — save this password now</strong>
          <p>
            Shown once and never stored in plaintext. Send it to <strong>{created.email}</strong> directly, not by email.
          </p>
          <p className="credential-notice__value">{created.temporaryPassword}</p>
        </div>
      ) : null}
    </form>
  );
}
