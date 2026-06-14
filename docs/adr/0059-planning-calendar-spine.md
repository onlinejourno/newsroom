# ADR 0059 — Planning: the Calendar is the spine; a lead grows into a plan

**Status:** Accepted (2026-06-14). Model recorded; build **phased and deferred**
(no code yet — this ADR fixes the concept so the build is unambiguous later).

## Context

ADR 0058 set the story's life as the spine and cut the nav by job — **Plan ·
Produce · Check · Newsroom**. "Plan" needed a precise definition. The founder
gave it, and in doing so surfaced a conflation:

- **`/potential` was built forward** — it scores the *inflow* (signals ranked by
  trend-match: "what to take up first").
- **"Discover Potential" is conceptually post-facto** — a *published* story
  measured against a trending search term, where the worth of re-investing now
  depends on whether the trend is **rising or fading**, plus *which factors to
  optimise to get it going.*

Two different jobs wore one name.

## Decision

### 1. Split Potential
- **Forward** ("is this signal worth planning?") = a **trend-potential sort on
  Signals** — a *planning input*, not a standalone room.
- **Post-facto** ("amplify a published winner") = published story × trend
  trajectory (↑/↓) + the factors to optimise now. It belongs in **Check**,
  beside Scores — it is optimisation of published work, not planning of new work.

### 2. Planning is orchestration over time; the Calendar is its spine
- The **Calendar** lays out stories **today *and* ahead, by beat**, and is where
  you commission ahead. It is the **centre of *planning*** — the platform's
  anticipatory edge.
- **Signals stays the co-equal *reactive* door** for unforeseeable/breaking
  news. The **lead remains the atom**; Calendar (time axis) and Newslist (status
  axis) are two projections of it. Centre the Calendar for *planning*, not as the
  only way in.

### 3. A lead grows into a *plan*
Beyond title/beat/assignee, a planned story carries:
- **trend-potential** — ↑ rising / ↓ fading: is it worth investing now
- **EEAT-on-topic** — is the outlet authoritative on this subject
- **surface-potential** — projected performance per surface/platform (the
  surface-driven audit: Discover · News · Search · one AI-answer-engines surface
  · Direct · Subscription)
- **format & desk** — text · interactive · **video / multimedia**, routed to the
  right desk *in time to go live with the news story*
- **multi-bureau** — one story, several bureaus
- **hierarchy approval** — the *plan* is signed off before execution

→ effective **planning → commissioning → execution-prep**, before a word is
written. This is where the reporter sees a story, reads its potential and the
outlet's authority on it, plans its multi-modal shape, and gets it approved.

## Build — phased, deferred
- **A — the lead becomes a plan:** add `format · bureaus[] · target_surfaces[] ·
  plan_approval` (schema + UI). The foundation everything else hangs on.
- **B — Calendar planning board:** time × beat, commission-ahead, set
  format/bureau there; calendar events + leads-with-deadlines on one timeline.
- **C — decision inputs on the plan:** trend-potential, EEAT-on-topic,
  surface-potential surfaced *while planning*.
- **D — Potential → Check:** the post-facto amplify reframe (split #1).

## Open questions (resolve before building)
- **Two approval gates.** Planning-approval (sign off the *plan*) is distinct
  from the lifecycle's editorial approve (filed → approved, signing off the
  *written* story, ADR 0056). The plan needs its own state — don't overload the
  lifecycle one.
- **surface-potential depends on** the surface-driven audit (AI-as-one-surface
  rubric) being built first.
- **EEAT-on-topic** needs an authority computation (archive depth + own-coverage
  EEAT scores), beyond today's raw archive-match count.

## References
ADR 0058 (IA / four-job spine), 0057 (Calendar / Predictive Editorial Calendar),
0056 (story lifecycle / Newslist), 0049 (User Needs), 0052 (probity), 0050
(primary sources), 0046 (canonical model · framing).
