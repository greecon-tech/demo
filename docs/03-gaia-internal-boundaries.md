# GAIA Internal Boundaries

GAIA Tech is confidential internal architecture. It must not expose trade-secret formulas, detailed priority logic, internal rule scoring, private orchestration heuristics, credentials, or device-specific secrets in public UI, public docs, API responses intended for browsers, browser bundles, or marketing copy.

## Public-Safe Explanation

GAIA Tech can be described publicly as the internal intelligence layer that integrates sensors and infrastructure into a unified system for monitoring, automation, and optimization across energy, water, and agriculture.

Public-safe copy may say:

- System stable.
- Sensor quality degraded.
- Rule simulated.
- Action blocked by safety policy.
- Manual override active.
- Edge connectivity degraded.

## Internal Engineering Concepts

Internal engineering may reference:

- Device Abstraction Framework.
- Real-Time Data Engine.
- State Modeling Engine.
- Rules Engine.
- Orchestration Engine.
- Edge execution, cloud-assisted execution, advisory mode, and simulation mode.

These concepts belong in private engineering documentation, code comments when necessary, and internal review.

## Confidential Logic

Do not expose:

- Proprietary rule formulas.
- Detailed conflict resolution heuristics beyond public safety statements.
- Model weights, optimization scoring, or forecasting internals.
- Device credentials or gateway certificates.
- Customer-specific operating constraints.
- Internal GAIA roadmap details.

## Browser Boundary

The web app must show outcomes and explanations, not confidential mechanics. For example, the browser may show `Action blocked by safety policy` and the relevant sensor quality state. It must not ship private formula code or hidden decision weights.

## Logo Placement

The current web app includes `apps/web/public/greecon-logo-placeholder.svg`. Replace it with the official Greecon logo when available.

GAIA Tech marks should not be placed in public UI by default. If an internal GAIA logo is needed, store it outside `apps/web/public` in a private internal asset location and keep it out of browser bundles.
