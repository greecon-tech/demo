# Security and RBAC

Security is part of the platform structure, not a later visual layer.

## Roles

- Owner: full tenant control, billing, users, sites, rules, and audit.
- Admin: manage sites, assets, devices, users, and approved rules.
- Operator: monitor and operate equipment within safety policy.
- Viewer: read-only access.
- Auditor: read-only reports, audit logs, automation history, and compliance evidence.

## Backend Enforcement

The frontend hides unauthorized actions, but the API enforces RBAC with guards. Tenant isolation is enforced in service methods. Operators can command only within safety policy. Viewers and auditors cannot command.

## Manual Override

Manual override requires:

- Reason.
- User identity.
- Timestamp.
- Duration.
- Audit event.
- Safety evaluation.

Manual override does not bypass hard safety rules.

## Secrets

No real secrets are stored in source control. `.env.example` contains local placeholders only. Production secrets belong in Google Secret Manager.

## Gateway Identity

Certificate-based identity and mTLS are planned for gateway provisioning. The schema includes placeholders for secure identity status and mTLS subject metadata.
