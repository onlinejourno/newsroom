# Trend → reporter feed (Lever B, Step 3)

- **Date:** 2026-06-15
- **Status:** Approved design — ready for implementation plan
- **Scope:** `packages/agents-py` only. No `apps/web`, no `alerts.py`, no changes to the trend engine.

## Problem

The trend engine (`trend_score.py:topic_momentum`, run via `cmd_trends`) already
writes `trend_score` (0–100) and `trend_reason` (e.g. `"still building — peak not
yet reached · SEBI"`) onto signals. But the reporter's pull feed
(`db.signals_for_journalist` → `cmd_feed`) routes signals by beat/region and
renders only `[beat/region] headline · entities`. It does **not** surface the
trend, rank by it, or explain the urgency.

Per the product's ground-up principle (a surface must *educate* the reporter —
show the *why* and the implication, not just route an item), the feed should
answer: *"this is trending on your beat, it's still building, so write now to
catch it."*

## Goal

The reporter's pull feed leads with the hottest on-beat signals and renders an
act-now line — score + trajectory (why) + urgency cue — reusing the existing
`trend_score`/`trend_reason` (no recompute).

## Non-goals

- No `apps/web` changes (the frontend is being reshaped concurrently).
- No `alerts.py` changes (that's the separate push channel).
- No new trend computation — consume what `cmd_trends` already wrote.

## Architecture

### `db.py` — `signals_for_journalist`

- Add `s.trend_score, s.trend_reason` to the SELECT.
- Change `ORDER BY` to `trend_score desc nulls last, <existing recency> desc` so
  scored/hot items lead and unscored items fall back to recency.
- The beat/region routing WHERE clause is unchanged.

### `feed_view.py` (new, pure — the "educate the reporter" layer)

- `urgency_cue(trend_reason: str | None) -> str` maps the trajectory vocabulary
  (from `predict_trajectory`) to an act-now label:
  - contains `"building"` → `"act now — still rising"`
  - contains `"near peak"` → `"move fast — near peak"`
  - contains `"at peak"` → `"now or never — at peak"`
  - contains `"cooling"` or `"fading"` → `"likely late — cooling"`
  - steady / `"no signal"` / `None` → `""`
- `format_feed_signal(signal: dict) -> str` composes one feed line:
  - trending (score present): `[beat/region] 🔥{score:.0f} {cue} · {headline} · why: {trend_reason}`
  - non-trending (no score): `[beat/region] {headline} · {entities}` (today's format)
- Pure, no I/O — fully unit-testable.

### `cli.py` — `cmd_feed`

- Render each routed row with `format_feed_signal` (rows already trend-ranked by
  the query). Thin; no logic beyond iteration + print.

## Data flow

`cmd_trends` (existing) writes `trend_score`/`trend_reason` → `signals_for_journalist`
selects + trend-ranks → `format_feed_signal` renders the act-now line → `cmd_feed`
prints.

## Error handling

- Signals with `trend_score IS NULL` (not yet scored) rank last and render in the
  plain (non-trending) format — no cue, no crash.
- `trend_reason` NULL/empty → `urgency_cue` returns `""`.

## Testing

**Default CI — pure, no DB/network:**

- `urgency_cue`: one case per trajectory phrase (building / near peak / at peak /
  cooling / fading / steady) + `None` → expected label / `""`.
- `format_feed_signal`: a trending signal (score + reason) → line includes the
  score, the cue, and `why:`; a non-trending signal (no score) → plain line, no
  cue, no `🔥`.

**Manual live verify (DB):**

- `cmd_trends` then `cmd_feed --journalist <slug>` → output leads with the
  highest-`trend_score` on-beat signals, each showing score + cue + why; lower /
  unscored items follow.

## Success criteria

1. A journalist's feed is ordered hottest-trend-first (unscored last).
2. Each trending line shows `trend_score`, an act-now cue derived from the
   trajectory, and the `trend_reason` (why).
3. Non-trending signals still appear, in the existing plain format.
4. Default CI green (pure `feed_view` tests); no DB/network in unit tests.

## Risks & judgment calls

- **Ranking by trend** (vs. recency-primary + annotation) is deliberate — it
  matches the "catch the trend" intent. Unscored items still surface (ranked
  last), so nothing is hidden.
- `urgency_cue` keys off the trajectory **text** in `trend_reason`; it stays in
  sync because both come from `predict_trajectory`'s fixed vocabulary. If that
  vocabulary changes, the cue mapping is the one place to update (documented).
