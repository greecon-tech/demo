-- Real multi-tenant onboarding (docs/15-master-roadmap.md, Phase 2 "Tenant-level
-- administration"). Platform-admin status is independent of tenant membership/role — it is a
-- cross-tenant capability held by Greecon's own staff, not something a client's own owner/admin
-- role grants them over other clients.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

UPDATE users SET is_platform_admin = true WHERE email = 'eridon.manuka@greecon.earth';
