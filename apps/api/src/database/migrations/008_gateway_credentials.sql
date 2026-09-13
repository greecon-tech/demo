-- Real per-gateway device credentials (docs/13-pilot-readiness.md, "the whole setup should be
-- possible from app.greecon.earth"). Until now the only way an edge box could authenticate at all
-- was a single shared EDGE_INGEST_TOKEN/EDGE_INGEST_TENANT_ID pair set as Railway environment
-- variables — one fixed secret for one fixed tenant, which cannot support a second real client's
-- edge device at all without Greecon manually reconfiguring Railway per client. A real per-gateway
-- secret, generated and shown once through the "Add gateway" form on a site's own page, replaces
-- that: any number of gateways across any number of tenants, provisioned entirely in the app.
--
-- Stored as a SHA-256 hash, not bcrypt: this is a high-entropy random token (32 random bytes), not
-- a low-entropy human-chosen password, so it doesn't need bcrypt's deliberate slowness against
-- brute force — and a fast, indexable hash is what lets PrincipalGuard look up which gateway
-- presented a given secret in one query instead of bcrypt-comparing against every row.
ALTER TABLE edge_gateways ADD COLUMN IF NOT EXISTS secret_hash text;

CREATE UNIQUE INDEX IF NOT EXISTS edge_gateways_secret_hash_key ON edge_gateways (secret_hash) WHERE secret_hash IS NOT NULL;
