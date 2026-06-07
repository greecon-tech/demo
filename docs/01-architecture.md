# Architecture

Greecon uses a hybrid Edge + Cloud architecture. The cloud enhances the system, but basic safety and local operation must remain possible at the edge.

## Layer Model

1. Physical Layer: pumps, valves, inverters, batteries, sensors, wastewater units, PLCs, meters, greenhouse equipment, irrigation equipment.
2. Edge Control Layer: gateways, drivers, local rules runtime, local safety interlocks, offline operation, device command handling.
3. Messaging Layer: MQTT telemetry, command, acknowledgement, health, alert, and sync channels.
4. Cloud Intelligence Layer: ingestion, time-series storage, state modeling, orchestration, analytics, reporting, anomaly detection, optimization.
5. Platform Layer: APIs, dashboards, reports, admin tools, access control, audit logs.

## Golden Rule

Control must be possible at the edge. Cloud-assisted logic can optimize, forecast, analyze, and coordinate, but it must not be required for hard safety or basic local operation.

## Internal GAIA Role

GAIA Tech is the internal intelligence layer that integrates sensors and infrastructure into a unified system for monitoring, automation, and optimization across energy, water, and agriculture.

GAIA is not the UI and not the sensor network. It is the orchestration, rules, autonomy, and decision layer behind the platform.

## Monorepo

- `apps/web`: Next.js interface.
- `apps/api`: NestJS API.
- `apps/edge-simulator`: simulated edge runtime.
- `packages/shared`: public-safe contracts and MQTT schemas.
- `packages/gaia-core`: internal safety and rule primitives.
- `packages/config`: design and environment constants.
- `infra/docker`: local stack.
- `infra/terraform`: Google Cloud foundation.
- `docs`: architecture and operating documentation.
