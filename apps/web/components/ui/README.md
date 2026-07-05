# Web UI kit

The platform's visual vocabulary. Two rules:

1. **Never hardcode hex.** Use the `--color-*` tokens from `app/globals.css`
   (`@theme`, ADR 0013): `--color-brand`, `--color-urgent`, `--color-amber-600`,
   `--color-ink-*`, `--color-paper`, `--color-rule`, …
2. **Don't hand-roll structure.** Use the `.ds-*` utilities or the primitives
   below — don't reinvent headings, chips, panels, or stats.

## `.ds-*` utilities (in `app/globals.css`)

| Class | Use |
|-------|-----|
| `.ds-page` / `.ds-page-narrow` | page content wrapper |
| `.ds-h1` / `.ds-h2` / `.ds-mast` | display headings (Playfair) |
| `.ds-label` | uppercase red eyebrow |
| `.ds-deck` | standfirst / body lede |
| `.ds-meta` | small uppercase column label |
| `.ds-frame` / `.ds-panel` | card / inner panel (square, framed) |
| `.ds-bar` + `.ds-bar-swatch` | section header bar |
| `.ds-chip` / `.ds-chip-on` | filter chip (square; fills on active) |
| `.ds-tab` / `.ds-tab-on` | tab strip |
| `.ds-stat` | big broadsheet stat number |

## React primitives (`components/ui/`)

- **`<PageHeader eyebrow title deck />`** — the standard page header
  (`.ds-label` + `.ds-h1` + `.ds-deck`).
- **`<ScoreBadge score label? showLabel? size? />`** — quality/composite score
  chip (0-100, higher = better). Bands: ≥75 HIGH (brand), ≥50 MEDIUM (amber),
  else LOW (urgent). For **urgency/heat** labels (higher = more urgent, e.g. the
  Potential page) use a dedicated component, not this one.
- **`<Button variant size />`** — see `button.tsx`.

Preview everything live at `/<locale>/ui-kit`.

## Known follow-ups (adoption — not yet done)

- Tokenize `components/SignalChips.tsx` (it hardcodes `#2563eb` etc.).
- Migrate per-page score chips (`scores`, `potential`, `story-analyser`) to
  `ScoreBadge` once the IA realignment settles.
