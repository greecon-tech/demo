CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'operator', 'viewer', 'auditor')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('farm', 'greenhouse', 'water_facility', 'energy_site', 'integrated_site', 'demo_site')),
  location_name text NOT NULL,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  status text NOT NULL DEFAULT 'OK',
  edge_status text NOT NULL DEFAULT 'OK',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'OK',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS edge_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'OK',
  last_seen_utc timestamptz,
  software_version text,
  secure_identity_status text NOT NULL DEFAULT 'placeholder',
  mtls_subject_placeholder text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  gateway_id uuid REFERENCES edge_gateways(id) ON DELETE SET NULL,
  name text NOT NULL,
  device_type text NOT NULL,
  protocol text NOT NULL,
  driver_type text NOT NULL,
  health text NOT NULL DEFAULT 'OK',
  last_seen_utc timestamptz,
  firmware_version text,
  secure_identity_status text NOT NULL DEFAULT 'placeholder',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  canonical_name text NOT NULL,
  label text NOT NULL,
  unit text NOT NULL,
  quality text NOT NULL DEFAULT 'OK' CHECK (quality IN ('OK', 'WARN', 'BAD')),
  capability text NOT NULL CHECK (capability IN ('read', 'write', 'read_write')),
  threshold_config jsonb NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS telemetry_readings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  timestamp_utc timestamptz NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  point_id uuid NOT NULL REFERENCES points(id) ON DELETE CASCADE,
  canonical_name text NOT NULL,
  value_numeric double precision,
  value_text text,
  value_bool boolean,
  unit text NOT NULL,
  quality text NOT NULL CHECK (quality IN ('OK', 'WARN', 'BAD')),
  source text NOT NULL,
  ingestion_timestamp_utc timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (id, timestamp_utc)
);

SELECT create_hypertable('telemetry_readings', 'timestamp_utc', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS derived_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  state_key text NOT NULL,
  state_value jsonb NOT NULL,
  severity text NOT NULL,
  confidence numeric(4, 3) NOT NULL,
  reason text NOT NULL,
  source_telemetry_refs jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE CASCADE,
  name text NOT NULL,
  priority text NOT NULL,
  trigger_type text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '[]',
  constraints jsonb NOT NULL DEFAULT '[]',
  actions jsonb NOT NULL DEFAULT '[]',
  execution_mode text NOT NULL,
  explanation_template text NOT NULL,
  rollback_behavior text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  approval_state text NOT NULL DEFAULT 'draft',
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  version integer NOT NULL,
  definition jsonb NOT NULL,
  changed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  change_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id, version)
);

CREATE TABLE IF NOT EXISTS rule_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id uuid NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  approval_state text NOT NULL,
  approval_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  target_device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  target_point_id uuid NOT NULL REFERENCES points(id) ON DELETE CASCADE,
  requested_value jsonb NOT NULL,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  requested_by_role text NOT NULL,
  reason text NOT NULL,
  safety_evaluation jsonb NOT NULL,
  dispatch_status text NOT NULL,
  acknowledgement jsonb,
  result text,
  failure_reason text,
  rollback_status text,
  audit_event_id uuid,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS command_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id uuid NOT NULL REFERENCES commands(id) ON DELETE CASCADE,
  status text NOT NULL,
  acknowledgement jsonb NOT NULL DEFAULT '{}',
  result text,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  category text NOT NULL,
  severity text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  title text NOT NULL,
  suggested_action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES alerts(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open',
  severity text NOT NULL,
  title text NOT NULL,
  investigation_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL,
  title text NOT NULL,
  notes text,
  due_at timestamptz,
  completed_at timestamptz,
  completion_log text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  before_metadata jsonb,
  after_metadata jsonb,
  reason text,
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE commands
  ADD CONSTRAINT commands_audit_event_id_fkey
  FOREIGN KEY (audit_event_id) REFERENCES audit_events(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS edge_sync_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  gateway_id uuid NOT NULL REFERENCES edge_gateways(id) ON DELETE CASCADE,
  status text NOT NULL,
  buffered_readings integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS manual_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  command_id uuid REFERENCES commands(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active',
  audit_event_id uuid REFERENCES audit_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS report_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  site_id uuid REFERENCES sites(id) ON DELETE SET NULL,
  requested_by uuid REFERENCES users(id) ON DELETE SET NULL,
  report_type text NOT NULL,
  parameters jsonb NOT NULL DEFAULT '{}',
  export_status text NOT NULL DEFAULT 'queued',
  storage_uri text,
  audit_event_id uuid REFERENCES audit_events(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id ON memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sites_tenant_id ON sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_tenant_site ON assets(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS idx_assets_type_status ON assets(type, status);
CREATE INDEX IF NOT EXISTS idx_devices_tenant_site ON devices(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS idx_devices_asset_id ON devices(asset_id);
CREATE INDEX IF NOT EXISTS idx_devices_health ON devices(health);
CREATE INDEX IF NOT EXISTS idx_points_tenant_site_device ON points(tenant_id, site_id, device_id);
CREATE INDEX IF NOT EXISTS idx_points_asset_id ON points(asset_id);
CREATE INDEX IF NOT EXISTS idx_points_canonical_name ON points(canonical_name);
CREATE INDEX IF NOT EXISTS idx_telemetry_tenant_timestamp ON telemetry_readings(tenant_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_site_timestamp ON telemetry_readings(site_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_asset_timestamp ON telemetry_readings(asset_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_timestamp ON telemetry_readings(device_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_point_timestamp ON telemetry_readings(point_id, timestamp_utc DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_quality ON telemetry_readings(quality);
CREATE INDEX IF NOT EXISTS idx_states_tenant_site_key ON derived_states(tenant_id, site_id, state_key);
CREATE INDEX IF NOT EXISTS idx_states_severity ON derived_states(severity);
CREATE INDEX IF NOT EXISTS idx_rules_tenant_site ON rules(tenant_id, site_id);
CREATE INDEX IF NOT EXISTS idx_rules_enabled_priority ON rules(enabled, priority);
CREATE INDEX IF NOT EXISTS idx_commands_tenant_site_status ON commands(tenant_id, site_id, dispatch_status);
CREATE INDEX IF NOT EXISTS idx_commands_device ON commands(target_device_id);
CREATE INDEX IF NOT EXISTS idx_alerts_tenant_site_status ON alerts(tenant_id, site_id, status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant_status ON incidents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant_status_due ON maintenance_tasks(tenant_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_audit_tenant_event ON audit_events(tenant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_site ON audit_events(site_id);
CREATE INDEX IF NOT EXISTS idx_edge_sync_tenant_site_status ON edge_sync_batches(tenant_id, site_id, status);
CREATE INDEX IF NOT EXISTS idx_manual_overrides_tenant_site_status ON manual_overrides(tenant_id, site_id, status);
CREATE INDEX IF NOT EXISTS idx_report_exports_tenant_status ON report_exports(tenant_id, export_status);
