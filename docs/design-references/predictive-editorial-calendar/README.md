# Design reference — Predictive Editorial Calendar

Hi-fi prototype of the calendar UI. Open `index.html` in a browser — no build step (loads React + Babel from a CDN).

IOJ-only: OnlineJournalism.in branding throughout. All The Hindu brand tokens and the design-environment "tweaks panel" from the original handoff have been stripped.

## Files

- `index.html` — entry; the `App` shell (filters, tabs, view switching)
- `data.jsx` — sample dataset (events, past-due, sources, beats) + pure date helpers
- `shell.jsx` — masthead, tabs, filter strip
- `timeline.jsx` — Forward Calendar (Gantt-style timeline)
- `views.jsx` — Event Feed, Past-due, Pipeline views
- `detail.jsx` — slide-in event drawer
- `ds/colors_and_type.css` — design tokens (colour, type, spacing)
- `ds/logo.png` — masthead logo + favicon
- `ds/ioj-logo.svg` — wordmark (alternate logo asset)

## For the real build

This is the design spec, not the shipping app. The production frontend is a
React + Vite build that consumes a JSON API from the Python backend. Carry the
component boundaries across as-is.

Do **not** port the JS date helpers in `data.jsx` / `timeline.jsx` as permanent
logic — the Python **Calendar Engine** owns date / bucket / lead-time logic as
the single source of truth. The frontend renders computed fields from the API.

`PipelineView` numbers and module-health are static mock content — wire them to
the live pipeline.
