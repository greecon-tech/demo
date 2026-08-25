# Frontend Design System

The interface must feel calm, precise, stable, minimal, and long-term.

## Typography

Primary font: the system UI sans-serif stack (`ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`) — Notion's own default typeface choice, and it ships with zero font-loading cost or external dependency.

## Colors

Notion-inspired neutrals with the Greecon brand green kept as the sole accent:

- Background: `#ffffff`
- Sidebar/surface: `#fbfbfa`
- Ink (text): `#37352f`
- Border: `rgba(55, 53, 47, 0.1)`
- Accent (brand green): `#448561`
- Status colors use soft tinted-background pills rather than outlined ones — see `.status-*` in `globals.css`.

## UI Rules

- Flat over boxed: subtle 1px borders and hover-triggered elevation, not heavy tinted card backgrounds.
- Generous whitespace and hover affordances (row highlight, active-nav state) over dense chrome.
- Keep cards to operational data, repeated items, and dialogs.
- Avoid neon colors, startup gradients, flashy motion, glassmorphism, excessive shadows, and hype copy.
- Use calm status labels: OK, Watch, Warning, Critical, Offline, Simulated, Manual Override.
- Prefer direct operational language: `System stable`, `Sensor quality degraded`, `Rule simulated`, `Action blocked by safety policy`.

## Assets

`apps/web/public/greecon-logo.svg` is the real Greecon mark.

Do not put confidential GAIA Tech identity or internals into public UI unless explicitly approved for internal-only deployments.
