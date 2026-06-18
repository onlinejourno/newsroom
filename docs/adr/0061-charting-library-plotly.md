# ADR 0061 — Charting library: Plotly for interactive trend visualizations

**Status:** Accepted (2026-06-18).

## Context

The Trends + intelligence surfaces must replicate the discover-dashboard prototype (`localhost:8501`) **graphically** — an **Interest Trajectory** line chart and a **Topic Momentum** horizontal bar chart, interactive (hover, zoom/pan, topic multiselect), matching the founder's repeatedly-shown reference (tracked in #107). The web app had **no charting capability** — only a hand-rolled SVG `Sparkline` — so these views were never built. A charting library is a new top-level dependency, hence this ADR: it is the missing decision that kept the graphical views deferred.

## Decision

Adopt **`react-plotly.js`** (with `plotly.js-dist-min`) for interactive charts on the intelligence surfaces.

- Matches the 8501 reference exactly (the same Plotly modebar: zoom / pan / autoscale / reset / download).
- Interactive out of the box (hover tooltips, zoom/pan, legend toggle) — the fastest path to functional parity after repeated misses.
- Themed to the design tokens, not Plotly defaults.

## Implementation rules

1. **Client components only**, loaded via `next/dynamic` with `ssr: false` (Plotly is browser-only and heavy) — it must never enter the server bundle or non-chart routes.
2. Use **`plotly.js-dist-min`** via `createPlotlyComponent` (not the full `plotly.js` source build) to keep the bundle and the build sane.
3. **Theme to ADR 0013 tokens**: `paper_bgcolor` / `plot_bgcolor` transparent, broadsheet fonts (`--font-ui` / `--font-display`), palette colours (brand green, urgent red, amber, ink). No Plotly default blue.
4. One isolated chart component per visual under `components/charts/*`, so the library stays swappable.

## Alternatives considered

- **Recharts** (~100 KB, SVG, themeable, SSR-friendlier) — lighter and more on-brand, but lacks the Plotly modebar the founder showed. **Documented fallback** if Plotly's bundle / cold-start cost on the Fly `shared-cpu-1x` + scale-to-zero image proves too high; the swap is contained (isolated chart components).
- **Hand-rolled SVG** — no dep, broadsheet-native (used for the `Sparkline`), but reimplements interactivity; not worth it for full interactive charts.

## Consequences

- Bundle weight grows on chart routes only (mitigated by dynamic import + lazy-load). Revisit with a bundle check after the first charts land; fall back to Recharts if it hurts cold starts.
- The discover-dashboard graphical parity (#107) becomes buildable: the **Topic Momentum bar chart** first (data ready via `topicMomentum`), then the **Interest Trajectory** line chart.

## References

#107 (Trends graphical replication), discover-dashboard prototype (`localhost:8501`), ADR 0013 (design tokens), ADR 0043 (configurable surfaces), `apps/web/lib/trends.ts` (momentum / trajectory).
