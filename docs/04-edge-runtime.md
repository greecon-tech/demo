# Edge Runtime

The edge runtime is designed as a local control layer that can operate during internet loss.

## Responsibilities

- Collect telemetry from drivers.
- Publish telemetry to MQTT.
- Execute safety rules locally.
- Execute approved automation rules locally.
- Maintain last known good configuration.
- Buffer data during internet outages.
- Sync buffered data when connectivity returns.
- Provide manual override with strict permissions.
- Report watchdog and gateway health.

## MVP Components

- Local MQTT broker: Mosquitto.
- `edge-collector`: represented by the simulator telemetry publisher.
- `edge-runtime`: represented by local safety concepts in `packages/gaia-core`.
- `edge-controller`: represented by command acknowledgement simulation.
- `edge-buffer`: implemented as `OfflineBuffer`.
- `edge-health`: simulated MQTT health messages.

## Safety Interlocks

Required MVP interlocks:

- Emergency stop path.
- Max runtime limits.
- Minimum rest/cooldown times.
- Dry-run detection: pump ON and flow zero.
- Overpressure cutoff.
- Sensor-quality gating.
- Fail-safe command behavior.
- Manual override reason, identity, timestamp, duration, and audit event.
- Remote users cannot bypass hard safety rules.

## MQTT Topics

- `greecon/{tenantId}/{siteId}/telemetry/{deviceId}`
- `greecon/{tenantId}/{siteId}/health/{gatewayId}`
- `greecon/{tenantId}/{siteId}/commands/{deviceId}`
- `greecon/{tenantId}/{siteId}/commands/{deviceId}/ack`
- `greecon/{tenantId}/{siteId}/edge/{gatewayId}/sync`
- `greecon/{tenantId}/{siteId}/alerts`
