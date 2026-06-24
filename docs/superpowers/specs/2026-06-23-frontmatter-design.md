# Frontmatter — design spec (v1)

**Status:** Draft (2026-06-23). Brainstorming output; precedes the plan.
**Name:** Frontmatter — the human writing that deserves to be **upfront**.
Publishing-term family: Daybook, Galley, Compositor.
**Mission anchor:** `docs/MISSION.md` — *merit ≠ reach; merit should travel.*
Frontmatter is the **affirmative end of the mission**: don't just diagnose —
find the deserving work that isn't reaching, and champion it to the front.

---

## 1. The job

Operationalise **merit ≠ reach** for a newsroom's *own* published work: surface
the stories that are **high in merit but low in reach**, say **why** each one
isn't travelling, and hand over the **fix**. Merit-based prominence — put the
work that earns it, up front.

Not the tech-literal "metadata header." The *front matter* of the newsroom: what
deserves to lead.

## 2. The v1 mechanic — the merit↔reach gap

For each published story, two scores already computable from the engine:

- **Merit** (is the journalism strong?): depth/word-count substance,
  originality vs commodity/wire-match (differentiation), primary-sourcing,
  EEAT/topic authority, framing quality, reader-need served. *Editorial worth,
  not popularity.*
- **Reach** (is it actually travelling?): surface-readiness + observed
  prominence/performance across the surfaces (Discover/News/Search/AI/Direct),
  homepage placement, trend trajectory.

**The gap = merit − reach.** A high positive gap = deserving work being failed.
Frontmatter ranks by that gap and, per story, shows:
1. **Why it isn't travelling** — the specific reasons (the MISSION table:
   built-for-the-page, wrong headline, buried on the homepage, no topic
   authority, mistimed…).
2. **The fix** — shift-left moves (→ Compositor: headlines/schema/timing) and
   placement/amplify actions; tie rising-trend ones to Potential ("invest now").

## 3. Reuses (no reinvention)

Story Scores / audit (surface-readiness) · Hidden Gems (low-prominence
detection) · Potential (trajectory) · the EEAT + differentiation lenses ·
locale-relative value · the surface model. Frontmatter is the **ranked,
why+fix, champion-this** layer *over* these — the affirmative dashboard.

## 4. Frontmatter vs Hidden Gems

Hidden Gems *detects* buried work (a list). Frontmatter *ranks deserving work by
how badly reach is failing it, explains why, and drives the fix* — merit
deserves the front. Frontmatter likely **subsumes/promotes** Gems as one input.

## 5. v1 scope

- **Where:** a surface in Arena first (the engine + signals already live there),
  reusing Scores/Gems/Potential. Spin out as a standalone suite product later
  **only if it earns it** (self-contained-vendoring applies then).
- **Surface:** a ranked list (highest merit↔reach gap first) + a per-story panel
  — merit signals, reach signals, *why it isn't travelling*, *the fix*.
- **Ground-up:** every "why" and "fix" is explained, so the reporter learns what
  makes work travel — not just told.
- **Vendor-neutral:** outlet/sources/taxonomy from tenant config; locale-relative
  merit + reach (deserving *here*, against *this* market).

## 6. Open forks (confirm before the plan)

1. **In-Arena surface (v1) vs standalone product from day one** — recommend
   in-Arena surface first; spin out later.
2. **Merit signal weighting** — which signals define "merit," and how weighted?
   (depth · originality/differentiation · primary-sourcing · EEAT · framing ·
   need-served). Start with a transparent, explainable default; tune later.
3. **Reach signal source** — surface-readiness (computable now from the audit)
   vs observed performance (needs analytics/CMS data per tenant). v1 can lead
   with surface-readiness + homepage placement, add observed reach when wired.

## 7. Out of scope (later)
Standalone repo + vendoring; live analytics ingestion for observed reach;
auto-amplify actions (push/newsletter/social) — v1 recommends, humans act.

---

**Done (v1) means:** the desk opens Frontmatter and sees its own deserving,
under-reaching stories ranked by the merit↔reach gap — each with *why it isn't
travelling* and *the fix* — so good work gets championed to the front.
Mission, made operable.
