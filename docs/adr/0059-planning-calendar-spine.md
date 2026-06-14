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
- **production shape** — text · interactive · **video / multimedia** · graphic,
  and **multi-bureau** — modelled as *child production tasks* (see §4), each
  routed to its desk with its own ETA, all timed to land before the story goes live
- **hierarchy approval** — the *plan* is signed off before execution

→ effective **planning → commissioning → execution-prep**, before a word is
written. This is where the reporter sees a story, reads its potential and the
outlet's authority on it, plans its multi-modal shape, and gets it approved.

### 4. A plan is a parent of production tasks (decided — option b)
A story is a small **production**, not a single task. The plan is a **parent**;
its multi-modal / multi-bureau elements are **child production tasks** — text,
video, interactive, graphic, or a bureau's slice — each **assignable to its desk
with its own ETA**. The parent publishes only when the pieces land. A lone text
story is just a plan with one task. (The cheaper "format tag on one lead" was
rejected: it cannot coordinate "the video, done *in time* for the story to go
live.")

### 5. Ground-up — the planning surface teaches
This platform is built **ground-up**: it does not merely route an editor's
orders, it makes the **reporter** aware and, over time, capable. So every
planning choice is also a **teaching moment** — going multi-modal or multi-bureau
(vs a lone story) **shows its logistical and technical implications**: the extra
desks pulled in, the added lead time, the coordination, the effect on the ETA.
The decision inputs — trend trajectory, topic authority (EEAT), surface-potential
— are shown **with explanation**, so a reporter learns to *read* them, not just
obey them. Assistive for those new to digital; a workhorse for the cognoscenti
(continuing the "explains itself" intent of the old Learn room). This is a
**platform-wide value**; Planning is its sharpest expression.

## Build — phased, deferred
- **A — the lead becomes a plan:** a `production_tasks` child table (kind ∈
  text / video / interactive / graphic, desk, assignee, eta, status) +
  `target_surfaces[]` + `plan_approval` on the lead. Each planning choice renders
  its implications (the ground-up teaching surface, §5). The foundation
  everything else hangs on.
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
