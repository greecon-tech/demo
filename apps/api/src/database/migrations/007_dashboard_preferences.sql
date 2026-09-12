-- Per-user customization of the Overview dashboard: which metric cards show, in what order
-- (priority), and at what display size. Keyed by user, not tenant — two teammates on the same
-- account can each arrange their own view without affecting the other's.
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  widgets jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now()
);
