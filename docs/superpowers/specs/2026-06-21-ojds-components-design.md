# Design spec — OJDS component library + per-surface (Slice 2)

**Status:** Drafted 2026-06-21. Slice 2 of the OnlineJourno Design System rollout (Slice 1 =
foundation tokens+fonts, ADR 0063, live). Extends the existing `apps/web/components/ui/` library.

## Why

The foundation put every surface on the OJDS palette + fonts, but the **component vocabulary** is
still partial (`button`, `page-header`, `score-badge`) and surfaces use ad-hoc `ds-*` markup +
some **stale hardcoded hex**. This slice builds the OJDS primitives the demo surfaces need, applies
them, and kills the residual hardcoded colour.

## Decisions (founder)

- **Core 6 primitives** now: Card, Tag, Badge, Tabs, Banner, Input. Forms (Select/Checkbox/Switch/
  Avatar) deferred (YAGNI).
- **Top demo-facing surfaces**: Calendar, Brief·Today, Signals, Story Scores/Potential, Trends,
  Newslist. The other ~25 surfaces already inherit OJDS via tokens.
- Colour follows the **OJDS tokens** (ink primary, vermilion accent, green-functional, gold-warning),
  NOT the stale "navy/crimson" wording in the bundle's `.prompt.md` files.

## Components (`apps/web/components/ui/`, token-based, `cva` like `button.tsx`)

| Component | API | OJDS styling (tokens) |
|---|---|---|
| `Card` | `eyebrow? title? action? footer? accent? padded?` + children | white surface, hairline `--color-rule`, square; `eyebrow` = IBM Plex Sans uppercase tracked **vermilion** kicker; `title` = display serif; `accent` = vermilion top rule; `padded={false}` flush |
| `Tag` | `interactive? removable? onRemove?` + children | square chip (taxonomy: beats/topics/filters); IBM Plex Sans; hairline border; hover when `interactive`; `×` when `removable`. Replaces `.ds-chip` usage |
| `Badge` | `tone` (neutral/ink/critical/warning/info/positive) `solid? dot?` | pill, status; soft tint default (`--color-*-bg`), `solid` filled; `dot` leading dot. critical=vermilion, warning=gold, positive=green, info=blue, ink=ink |
| `Tabs` | `tabs` (string[] or {value,label,count}[]) `value/defaultValue onChange` | underline bar; **vermilion** active underline + semibold; `count` = mono pill. Replaces `.ds-tab` |
| `Banner` | `tone` (info/critical/warning/positive) `title? icon? action? onDismiss?` + children | inline alert; coloured **left rule**; tinted bg; not a toast |
| `Input` | `label? hint? error? prefix? suffix? size?` + input attrs | label + hint; `error` → vermilion border + message; prefix/suffix adornments; sizes sm/md/lg |

Showcase all 6 (with variants) on `/[locale]/ui-kit`. Update `components/ui/README.md`.

## Per-surface application

| Surface | Change |
|---|---|
| **Brief·Today** | lead cards → `Card`; severity → `Badge` tones; topic/potential tags → `Tag`/`Badge`; the layout demo banner → `Banner` |
| **Signals** | signal cards → `Card`; `SignalChips` framing chips → `Tag` + **tokenize** its hex (see below) |
| **Calendar** | event/deadline cards → `Card`; countdown / at-risk → `Badge` tones |
| **Story Scores / Potential** | filter chips → `Tag`; score chips → existing `ScoreBadge`; migrate per-page score chips (known follow-up) |
| **Trends** | topic cards → `Card`; position tags (`.ds-tag-*`) → `Badge` tones; charts colour fix (below) |
| **Newslist** | pipeline lead rows → `Card`/`Tag` where it reduces ad-hoc markup |
| **layout.tsx** | demo read-only banner → `Banner tone="warning"` |

## Kill hardcoded hex (tokenize)

- **Framing-category palette** (`SignalChips.tsx`, + reused in charts): add tokens to `globals.css`:
  `--color-framing-combative: var(--color-red-600)` (vermilion), `--color-framing-explanatory:
  #0e8a7e` (teal), `--color-framing-straight: var(--color-ink-500)`, `--color-framing-policy:
  #2b5fb0` (blue), `--color-framing-other: var(--color-amber-600)` (gold). Replace the raw hex in
  `SignalChips.tsx` with these.
- **Charts** (`MomentumBar.tsx`, `InterestTrajectory.tsx`): replace the stale JS hex palette
  (`#2d7a4f`, `#d32b2b`, `#b35d00`, `#1a1a1a`, `#d4cfc6`, `#888888`) with the **current OJDS values**
  (green `#2e7d46`, vermilion `#c0392b`, gold `#9a6a14`, ink `#181610`, rule `#c5bda9`, stone
  `#6f6757`) — keep the JS-palette pattern (SVG attrs need literals), just OJDS-correct.

## Testing & success criteria

- `type-check` + `build` green.
- `/ui-kit` renders all 6 primitives + variants.
- The 6 surfaces render using the components; no visual regression (warm cream + ink + vermilion).
- `grep` shows no hardcoded hex left in `SignalChips.tsx` / the charts (tokens/OJDS values only).
- Multilingual intact (hi/ar). Prod verify after deploy.

## Out of scope

Forms primitives (Select/Checkbox/Switch/Avatar); the other ~25 surfaces; masthead wordmark/mark
swap + the canonical-wordmark decision; the WordPress theme; marketing kit.

## References

- OJDS bundle `components/*/*.prompt.md` (structure/API; ignore "navy/crimson" colour wording),
  `ui_kits/dashboard/*.jsx` (surface layout reference). ADR 0063. Existing `components/ui/`.
