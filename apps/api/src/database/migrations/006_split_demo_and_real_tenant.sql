-- Splits the single seeded demo tenant into two: a pure sales/marketing demo login, and a real,
-- empty working tenant for Greecon's own real pilot. Until now Eridon's real account shared a
-- tenant with fake seeded demo data (sites, telemetry, rules) — harmless while nothing real
-- existed yet, but confusing and wrong the moment a real farm gets provisioned into it. Now that
-- real onboarding exists (005_platform_admin.sql, /platform-admin), there is no reason for that
-- to keep being true.
--
-- Every statement here is written to be a no-op on a rerun (docs/11-deployment-railway.md's
-- migration runner applies every file every time): once Eridon's tenant_id has actually moved,
-- the UPDATE ... WHERE tenant_id = <old> clauses simply match zero rows.

INSERT INTO tenants (id, name, domain, status)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff01', 'Greecon', 'greecon.earth', 'active')
ON CONFLICT (id) DO NOTHING;

-- Move Eridon's existing account into the new tenant. His real password (set by hand outside any
-- migration, after his first live login) is untouched — only tenant_id changes. His new tenant
-- starts with zero sites/devices/telemetry: clean, ready for his real pilot farm via the Admin
-- page once it's actually provisioned.
UPDATE users
SET tenant_id = 'ffffffff-ffff-4fff-8fff-ffffffffff01'
WHERE email = 'eridon.manuka@greecon.earth' AND tenant_id = '11111111-1111-4111-8111-111111111111';

UPDATE memberships
SET tenant_id = 'ffffffff-ffff-4fff-8fff-ffffffffff01'
WHERE user_id = (SELECT id FROM users WHERE email = 'eridon.manuka@greecon.earth')
  AND tenant_id = '11111111-1111-4111-8111-111111111111';

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
INSERT INTO users (id, tenant_id, email, name, status, password_hash)
VALUES (
  'ffffffff-ffff-4fff-8fff-ffffffffff02',
  '11111111-1111-4111-8111-111111111111',
  'demo@greecon.earth',
  'Greecon Demo',
  'active',
  '$2b$10$rO6OR6h6aLLvqMcc73USp.n8sLZCkd5uLC988scCXBqG9xQaO34mm'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO memberships (id, tenant_id, user_id, role)
VALUES ('ffffffff-ffff-4fff-8fff-ffffffffff03', '11111111-1111-4111-8111-111111111111', 'ffffffff-ffff-4fff-8fff-ffffffffff02', 'owner')
ON CONFLICT (id) DO NOTHING;
