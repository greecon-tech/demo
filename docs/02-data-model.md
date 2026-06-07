# Data Model

The database foundation targets PostgreSQL with TimescaleDB for telemetry. The schema is defined in `apps/api/src/database/migrations`.

## Core Tables

- `tenants`
- `users`
- `memberships`
- `sites`
- `assets`
- `edge_gateways`
- `devices`
- `points`
- `telemetry_readings`
- `derived_states`
- `rules`
- `rule_versions`
- `rule_approvals`
- `commands`
- `command_results`
- `alerts`
- `incidents`
- `maintenance_tasks`
- `audit_events`
- `edge_sync_batches`
- `manual_overrides`
- `report_exports`

## Telemetry

Every telemetry reading carries UTC timestamp, tenant ID, site ID, optional asset ID, device ID, point ID, canonical point name, value, unit, quality flag, source, and ingestion timestamp.

`telemetry_readings` is a TimescaleDB hypertable partitioned by `timestamp_utc`.

## Indexing

The migration adds indexes for tenant, site, asset, device, point, timestamp, severity, status, and audit event type. These indexes support tenant isolation, site views, operational filtering, and time-series retrieval.

## Repository Decision

The MVP API uses an in-memory demo repository behind service methods so the interface and safety behavior can be tested without a local database. The SQL schema is already present for the durable repository phase. No ORM is introduced yet; this keeps the schema explicit and avoids early abstraction cost.
