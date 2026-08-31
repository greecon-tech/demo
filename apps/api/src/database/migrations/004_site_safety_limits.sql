-- Per-site safety limit overrides (docs/13-pilot-readiness.md, "Irrigation and pump safety limits
-- are not yet admin-configurable per site"). Previously every site and tenant shared one hardcoded
-- SafetyLimits object in packages/gaia-core regardless of that site's actual physical equipment.
ALTER TABLE sites ADD COLUMN IF NOT EXISTS safety_limits jsonb NOT NULL DEFAULT '{}';
