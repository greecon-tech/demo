-- Splits the single seeded demo tenant into two: a pure sales/marketing demo login, and a real,
-- empty working tenant for Greecon's own real pilot. Until now Eridon's real account shared a
-- tenant with fake seeded demo data (sites, telemetry, rules) — harmless while nothing real
-- existed yet, but confusing and wrong the moment a real farm gets provisioned into it. Now that
-- real onboarding exists (005_platform_admin.sql, /platform-admin), there is no reason for that
-- to keep being true.
--
-- Rewritten to be self-healing rather than assuming a single prior attempt either fully committed
-- or fully rolled back: resolves the real tenant/user ids by their natural keys (domain, email)
-- at each step instead of trusting a hardcoded UUID matched, and upserts by (tenant_id, email) /
-- (tenant_id, user_id) rather than only by id — so it converges to the same end state no matter
-- what a previous partial run already changed.

INSERT INTO tenants (id, name, domain, status)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff01', 'Greecon', 'greecon.earth', 'active')
ON CONFLICT (domain) DO NOTHING;

DO $$
DECLARE
  real_tenant_id uuid;
  eridon_id uuid;
BEGIN
  SELECT id INTO real_tenant_id FROM tenants WHERE domain = 'greecon.earth';
  SELECT id INTO eridon_id FROM users WHERE email = 'eridon.manuka@greecon.earth';

  IF real_tenant_id IS NOT NULL AND eridon_id IS NOT NULL THEN
    -- Move Eridon's existing account into the real tenant. His real password (set by hand
    -- outside any migration, after his first live login) is untouched — only tenant_id changes.
    UPDATE users SET tenant_id = real_tenant_id WHERE id = eridon_id AND tenant_id <> real_tenant_id;
    UPDATE memberships SET tenant_id = real_tenant_id WHERE user_id = eridon_id AND tenant_id <> real_tenant_id;
  END IF;
END $$;

-- The demo tenant keeps every existing seeded site/asset/device/telemetry/rule/alert — that fake
-- data is exactly what makes it useful for a sales demo. It just no longer needs five different
-- logins to show it off; one is simpler and safer to hand to a prospect.
DELETE FROM users WHERE id IN (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', -- operator@greecon.earth
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', -- auditor@greecon.earth
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', -- admin@greecon.earth
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'  -- viewer@greecon.earth
);

-- Password is "demo123" — deliberately simple and publicly documented (docs/11-deployment-
-- railway.md), since this account only ever shows fake seeded data to a prospect and holds no
-- real permissions over anything real. Never reuse this pattern for a real client account.
-- Upserts by (tenant_id, email) rather than id: if a row already exists for this tenant+email
-- (from an earlier partial attempt, under any id), its password/name/status are refreshed in
-- place instead of erroring.
INSERT INTO users (id, tenant_id, email, name, status, password_hash)
VALUES (
  'ffffffff-ffff-4fff-8fff-ffffffffff02',
  '11111111-1111-4111-8111-111111111111',
  'demo@greecon.earth',
  'Greecon Demo',
  'active',
  '$2b$10$rO6OR6h6aLLvqMcc73USp.n8sLZCkd5uLC988scCXBqG9xQaO34mm'
)
ON CONFLICT (tenant_id, email) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, password_hash = EXCLUDED.password_hash;

-- Looked up by (tenant_id, email) rather than assuming the id above is the one that actually took
-- effect — the demo user's real id under this tenant, whatever it is, gets the membership below.
--
-- Deliberately "operator", not "owner": a sales prospect holding this login should be able to see
-- and operate everything (every read permission, plus command:create for Manual Control) but
-- never reach /admin or /platform — no creating users, no resetting anyone's password (including
-- its own, which the "operator" role also structurally can't do, since resetting a password
-- requires the user:manage permission this role doesn't have — see docs/07-security-and-rbac.md).
-- This upsert re-applies the role on every rerun, so a demo account someone manually promoted or
-- re-passworded gets put back here the next time db:migrate runs.
INSERT INTO memberships (id, tenant_id, user_id, role)
SELECT 'ffffffff-ffff-4fff-8fff-ffffffffff03', u.tenant_id, u.id, 'operator'
FROM users u
WHERE u.tenant_id = '11111111-1111-4111-8111-111111111111' AND u.email = 'demo@greecon.earth'
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = EXCLUDED.role;
