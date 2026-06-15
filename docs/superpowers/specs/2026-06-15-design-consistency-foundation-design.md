# Design-consistency foundation (additive primitive kit)

- **Date:** 2026-06-15
- **Status:** Approved scope (foundation-first, additive) — ready for implementation plan
- **Scope:** `apps/web` only, **purely additive** (new files). No page migration, no edits to existing components/pages (the IA actor has heavy uncommitted apps/web work — additive-only avoids collision).

## Problem

`apps/web` already has a real design system: a token block (`@theme` in
`globals.css`, ADR 0013 — colors, serif/sans type stacks, spacing) **and** a
`.ds-*` utility layer (`.ds-page`, `.ds-h1`, `.ds-h2`, `.ds-label`, `.ds-deck`,
`.ds-chip`, `.ds-panel`, `.ds-stat`, `.ds-tab`, …). The inconsistency is **not a
missing system — it's inconsistent adoption**:

- Components/pages hardcode hex instead of tokens (e.g. `SignalChips.tsx` uses
  `#2563eb`, `#7c3aed`, `#16a34a`).
- Pages hand-roll instead of using `.ds-*` (e.g. `story-analyser/page.tsx` uses
  raw `text-4xl font-extrabold` + inline `style={{fontFamily: var(--font-display)}}`
  rather than `.ds-h1`).
- The score→band→color badge logic is reimplemented per page.

## Goal

Make the existing system the obvious default by (1) documenting it as canonical
and (2) adding only the React primitives that encapsulate **logic/composition**
the `.ds-*` classes can't — without duplicating those classes. Additive and
zero-collision; adoption across pages happens later.

## Non-goals

- **No new `Chip`/`Card`/`Table` components** — they would duplicate `.ds-chip`
  / `.ds-panel` / `.ds-stat`. The guide points people at those instead.
- No page migration; no editing `SignalChips` or any existing component/page now
  (the IA actor's territory — tokenizing `SignalChips` is documented as a
  follow-up, not done here).
- No new test framework (apps/web has none); verification is type-check + build +
  the preview route.

## Deliverables

### 1. `apps/web/components/ui/README.md` — usage guide

Canonical reference: the token names (colors / `--font-*` / `--space-*`), the
`.ds-*` utility catalogue with when-to-use, and two rules — **never hardcode hex
(use `--color-*`)** and **don't hand-roll headings/chips/panels (use `.ds-*` or
the primitives below)**. Lists the known follow-up adoptions (e.g. tokenize
`SignalChips`).

### 2. `apps/web/components/ui/score-badge.tsx` — `ScoreBadge`

```
ScoreBadge({ score, label?, size? })
```
- Maps `score` (0–100) → band (LOW / MEDIUM / HIGH) using the **exact thresholds
  already used in the scores UI** (pinned in the plan), → a token color
  (`--color-urgent` / `--color-amber-600` / `--color-brand`).
- Renders on `.ds-chip` / `.ds-stat` + tokens (no hex). Optional `label`
  (e.g. `MEDIUM`) and `size`.
- Uses `class-variance-authority` + `clsx` + `tailwind-merge` (already deps),
  the repo's idiom.
- Replaces the per-page score-chip reimplementation (the `74 MEDIUM` / `D·N·S`
  badges) with one source of truth.

### 3. `apps/web/components/ui/page-header.tsx` — `PageHeader`

```
PageHeader({ eyebrow, title, deck? })
```
- Composes `.ds-label` (eyebrow) + `.ds-h1` (title) + `.ds-deck` (deck). One
  component for the page-header pattern every page hand-rolls.

### 4. `apps/web/app/[locale]/ui-kit/page.tsx` — preview route

A static page rendering: `PageHeader`, `ScoreBadge` across the bands/sizes, and
a short live reference of the `.ds-*` classes. Lets the maintainer eyeball the
kit without touching a real page. New route → additive, no nav wiring required.

## Data flow / dependencies

Pure presentational components; no data, no I/O. Depend only on the existing
tokens, `.ds-*` classes, and `cva`/`clsx`/`tailwind-merge`.

## Verification

- `cd apps/web && npx tsc --noEmit` — type-clean.
- `cd apps/web && npm run build` — compiles (the new route + components build).
- Load `/<locale>/ui-kit` in `next dev` and screenshot — bands render in the
  right token colors; `PageHeader` matches the `.ds-*` look.
- No unit tests (no framework in apps/web; adding one is out of scope).

## Success criteria

1. `ScoreBadge` + `PageHeader` exist in `components/ui/`, built on tokens +
   `.ds-*` with **zero hardcoded hex**.
2. The usage guide documents tokens + `.ds-*` as canonical with the two rules.
3. The `/ui-kit` preview renders all `ScoreBadge` bands + `PageHeader` correctly;
   `tsc --noEmit` and `build` pass.
4. Nothing existing is modified — purely additive (no collision with the IA work).

## Risks & judgment calls

- **Don't duplicate `.ds-*`.** The primitives wrap *logic/composition*
  (band→color, header structure), not raw style already covered by `.ds-chip` /
  `.ds-panel`. New `Chip`/`Card`/`Table` are explicitly excluded.
- **Additive-only** is deliberate: the IA actor has uncommitted page work, and
  committed pages (e.g. `story-analyser`) are stale stubs vs the live app, so
  editing pages now is unsafe. Adoption is a later, post-IA pass.
- **Band thresholds** must match the existing scores UI exactly (pinned from the
  real code in the plan) — otherwise `ScoreBadge` introduces a *new*
  inconsistency.
