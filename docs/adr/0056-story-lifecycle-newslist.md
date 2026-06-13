# ADR 0056 — The story lifecycle: signal → published, the workflow that makes the rooms sing

**Status:** Accepted (2026-06-13).

## Context

The founder's decisive correction: the menu items (signals, potential, trends,
gems, scores, feeds) are "disjointed pieces of a puzzle" until one workflow
threads them — **the story's journey from signal to published**, with every
state visible to everyone on a shared dashboard. That flow is the
quintessential requirement; everything else hangs off it.

## Decision — `story_lead`, a state machine, and the Newslist

A **story lead** is the unit that travels the newsroom. One table,
`story_leads`, carries it through its life and links the pieces:
`signal_id` (the public-record trigger) → … → `story_id` (the published
article that gets audited).

### States
`idea → pitched → assigned → filed → approved → published` (+ `killed`).

### Origin (how a lead is born) — the three doors
- **assigned** — an editor / bureau chief / desk sees a signal and commissions
  it to a bureau or a named reporter (ETA + importance set).
- **pitched** — a reporter on the beat sees a signal/trend and pitches it to
  the bureau chief, who approves → it becomes `assigned`.
- **requested** — the digital desk requests it because the topic is trending
  (topic dominance / update-of-previous), routed to a bureau.

### Transitions and who may do them (role-gated, ADR 0055 tiers)
| From → To | Who |
|-----------|-----|
| create `assigned`/`requested` | editor, desk |
| create `pitched` | reporter |
| `pitched → assigned` (approve) / `→ killed` | editor, desk |
| `assigned → filed` | the assignee, or desk |
| `filed → approved` / `→ killed` | editor, desk |
| `approved → published` (link `story_id`) | editor, desk |

Each transition stamps its timestamp (`pitched_at`, `assigned_at`,
`filed_at`, `approved_at`, `published_at`).

### Indicators carried on every lead
importance (low/normal/high/urgent) · trend_score snapshot · keywords ·
topic · who's filing (assignee) · who commissioned · ETA · **on-time**
(published_at ≤ eta) · and — once published — the surface audit + a "should
this be audited for better performance?" prompt.

### The Newslist dashboard (`/en/newslist`) — visible to everyone
Every lead in flight, grouped by state (idea · pitched · assigned · filed ·
approved · published), each card showing headline, owner, ETA + on-time dot,
bureau/beat, trend chip + keywords, importance. Filter by bureau / beat /
mine. The desk's shift view: headlines with ETA and by-whom; the editor's
strategic view: what's moving where. This is the symphony view — the rooms
become one score.

## Consequences
- The disjointed surfaces gain a backbone: a signal can be **commissioned**
  from its detail page; a reporter can **pitch** from her feed; the lead then
  lives on the Newslist until it is published and audited — closing the loop
  the whole product is named for (every story a fair chance).
- ADR 0055's named `story_flags` / `story_pitches` are absorbed: a pitch is a
  `pitched` lead; an editor flag is a `requested`/`assigned` lead with a note.

## Build order
1. This slice: table + state machine + Newslist + commission-from-signal +
   pitch + role-gated transitions + demo leads across states.
2. Follow-on: ETA breach alerts (ntfy), per-bureau newslist filters in the
   masthead, auto-link `published` → matching CMS story, editor flag-to-bureau
   broadcast.

## References
- ADR 0053 (lifecycle rooms), 0055 (RBAC tiers + the workflow tables named),
  0049 (user needs), `stories`/`signals`/`users` tables.
