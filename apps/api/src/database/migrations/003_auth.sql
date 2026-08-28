-- Real per-user authentication (docs/13-pilot-readiness.md, "no real authentication"). Previously
-- every request's identity came from a self-asserted x-user-role header with no login at all.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Demo credentials for the five seeded users (002_seed_demo.sql, one per role). Password for all
-- five is "greecon-demo-2026" — for demo/pilot bring-up only. There is no reset flow yet
-- (docs/15-master-roadmap.md, Phase 0), so change this by updating password_hash directly with a
-- freshly bcrypt-hashed value before using this seed data for anything beyond a demo.
UPDATE users
SET password_hash = '$2b$10$uaQDHxzYiU.u7qZl/lCbCui7Fq8kbjFuqnKI5Htzx3MxLYEuxJ3IG'
WHERE email IN (
  'eridon.manuka@greecon.earth',
  'operator@greecon.earth',
  'auditor@greecon.earth',
  'admin@greecon.earth',
  'viewer@greecon.earth'
);
