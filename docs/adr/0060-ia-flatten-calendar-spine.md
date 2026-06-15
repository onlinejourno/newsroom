# ADR 0060 — Information architecture: flat intelligence suite, Calendar as spine

**Status:** Accepted (2026-06-15). Supersedes ADR 0058.

## Context

ADR 0058 organised the masthead into four job-rooms (Plan / Produce / Check /
Newsroom). In practice the rooms drifted from the founder's north-star — the
original *discover-dashboard* — and produced a confused "Plan" submenu that
buried the intelligence tools the editorial team uses most. The masthead no
longer matched the mental model of reporters or the product's own design spec.

Specific symptoms:
- Calendar (the planning spine) was hidden inside "Plan" alongside three other
  items; it was not obviously home base.
- The seven intelligence tabs from the original discover-dashboard were split
  across rooms, making cross-tab comparison unnatural.
- Three separate places (masthead, homepage front-door cards, breadcrumbs) each
  hard-coded their own nav list, so labels and order diverged.

## Decision

Flatten the masthead to a **single-level intelligence suite** with the
**Calendar as the spine/home**, mirroring the original discover-dashboard's tab
layout.

1. **Calendar first.** It is the planning spine; it is where the day starts.

2. **PRIMARY — the intelligence suite** (nine items, in original order):
   - Calendar — promises ahead, the planning spine
   - Trending Topics — moving topics, right now
   - Story Scores — published stories ranked to optimise for the trends
   - Story Analyser — audit one story (SEO + E-E-A-T, every signal)
   - Topic → Domains — which domains own a topic
   - Local Pulse — what's trending by state & city
   - Hidden Gems — already-published, buried — worth re-optimising
   - EIP Signals — subscription & editorial-intelligence signals
   - Signals — the raw public record flowing in

3. **WORKFLOW — secondary group** (reachable, not top-level rooms):
   - Newslist, Surface Scores, Probity, Compliance, Journalists, Morning brief

4. **ADMIN — separate, admin-only:**
   - Accounts & approvals, Sources, Connectors, Surfaces, Architecture

5. **One registry.** `apps/web/lib/nav.ts` exports `PRIMARY`, `WORKFLOW`,
   `ADMIN`, and a `LABEL_BY_PATH` lookup. Masthead, homepage front-door, and
   breadcrumbs all consume this single source so they can never disagree.

## Consequences

- Route paths are **unchanged** — no link breakage, no redirects needed.
- ADR 0058 is superseded; the four-job rooms are retired.
- The "Plan" submenu is dissolved; Calendar becomes the top-level home.
- Any component that previously hard-coded nav items must migrate to
  `LABEL_BY_PATH` / `PRIMARY` / `WORKFLOW` from `apps/web/lib/nav.ts`.

## References

- ADR 0058 (four-job rooms — superseded)
- ADR 0057 (Calendar surface)
- ADR 0053 (five noun-rooms — previously superseded by 0058)
- Spec: `docs/superpowers/specs/2026-06-15-ia-realignment-design.md`
