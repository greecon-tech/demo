# Testing and Verification

The MVP includes tests for:

- RBAC enforcement.
- Tenant isolation.
- Telemetry ingestion validation.
- Quality flag handling.
- Rule simulation.
- Dry-run protection.
- Overpressure cutoff.
- Command blocked by BAD sensor quality.
- Manual override audit.
- Edge offline buffer behavior.
- Command acknowledgement flow.

## Safety Scenarios

Covered or represented in tests and safety primitives:

- Internet loss: edge offline buffer retains and flushes messages.
- Sensor BAD data: command safety blocks actuation.
- Command failure: acknowledgement supports failed/rejected states.
- Gateway reboot: health messages and retained MQTT state are planned in edge health.
- Time drift: health message includes `clockDriftMs`.
- Pump on with flow zero: dry-run protection blocks.
- Overpressure: pressure limit blocks.
- Rule conflict: priority model exists in `packages/gaia-core`.
- Manual override expiration: safety check blocks expired override.

Run:

```bash
npm test
```
