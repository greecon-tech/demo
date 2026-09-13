"use client";

import { FormEvent, useState, useTransition } from "react";
import { createGatewayAction } from "../app/sites/[siteId]/actions";

// Shows the generated secret exactly once, right after creation — same one-time-disclosure
// handling as CreateUserForm's temporary password. The API never stores or logs the plaintext
// anywhere else (only its hash — see apps/api/src/common/gateway-secret.ts), so this screen is the
// only place it will ever appear. Whoever creates the gateway is responsible for putting it into
// that box's edge.env file (docs/14-edge-hardware-deployment.md) before leaving this page.
export function CreateGatewayForm({ siteId }: { siteId: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; secret: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createGatewayAction(siteId, name);
      if (result.error || !result.gateway || !result.secret) {
        setError(result.error ?? "Failed to add gateway.");
        return;
      }
      setCreated({ name: result.gateway.name, secret: result.secret });
      setName("");
    });
  }

  return (
    <form onSubmit={submit} className="rule-form">
      <div className="rule-form__grid">
        <label>
          Name
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Farm Site Gateway" required />
        </label>
      </div>
      <div className="rule-form__footer">
        <button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add gateway"}
        </button>
        {error ? (
          <p className="rule-actions__error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
      {created ? (
        <div className="credential-notice" role="status">
          <strong>Gateway &quot;{created.name}&quot; created — save this secret now</strong>
          <p>
            Shown once and never stored in plaintext. Put it in this box&apos;s <code>edge.env</code> as <code>EDGE_TOKEN</code> — see{" "}
            <code>docs/14-edge-hardware-deployment.md</code>.
          </p>
          <p className="credential-notice__value">{created.secret}</p>
        </div>
      ) : null}
    </form>
  );
}
