# ADR 0054 — Draft-assistive, never draft-generative; and what the strategy papers contribute

**Status:** Accepted (2026-06-11). Founder's ruling.

## 1. The ruling: draft-assistive, never draft-generative

The platform assists the journalist's draft — briefs, precedents, fact
suggestions, optimisation fixes — and **never generates article drafts**.
This closes the question the universal strategy framework left open (its
Phase 2 proposes AI first-draft generation) in favour of ADR 0035
(decision-support, not autopilot) and the trust logic the Business Standard
paper itself states: one hallucinated number in a trusted masthead does more
damage than in any free site.

Consequences: no draft-generation feature ships, ever, under this product's
name; "assist" features must leave authorship and accountability visibly
human (ADR 0029 disclosure primitives apply to any assisted fragment).

## 2. Adopted from the strategy papers (founder-approved)

From *News Publisher AI-Era Strategy Framework* and the *Business Standard
AI-Era Strategy*:

- **A. Coverage Gap Matrix** — the per-section 🟢🟡🔴 view of source health:
  which beats have enabled sources and real 7-day flow, which are thin,
  which are uncovered. Pure computation on the registry + signals.
  Lives in the Newsroom room (`/coverage`).

- **B. The Differentiation Ratio** — every own story classified
  `table_stakes | conversion_driver | renewal_driver` (the BS paper's
  commodity-vs-defensible taxonomy); the ratio of driver content to
  commodity content is "the single most important number" for a
  subscription masthead. v1 is a **documented heuristic** over the PEJ frame
  and reader need (configurable; human override later):
  frames {Policy Explored, Reality Check, Institutional Critique,
  Wrongdoing Exposed, Historical Outlook, Personality Profile} →
  conversion_driver; need *do*, or explainer frames {Process, Trend} with
  need *understand* → renewal_driver; Straight News / need *know* / the
  rest → table_stakes. Prerequisite honoured: the Classify and Framing
  passes now run on **own stories**, not only signals. Shown where own
  output lives (`/scores` panel), with classified-coverage stated.

- **C. AI-crawler policy as conscious config** — allow / block / license per
  AI crawler, checked by the AI-surface scorers (ADR 0053 build-item 3)
  against robots.txt / llms.txt, flagging drift between declared policy and
  served reality. Folded into that work; no separate feature.

- **E. The Adoption Playbook** (`docs/ADOPTION.md`) — the universal
  framework rewritten platform-shaped: how any newsroom maps sections to
  beats, tiers and registers sources, phases the rollout with the
  platform's actual commands. Completes "download from GitHub and run it".

## 3. Explicitly not adopted

- AI first-draft generation (§1).
- FTE/budget tables — strategy-doc material, not product.
- Speed-and-scale Path A — the platform optimises Path B/C (quality and
  authority as a disciplined hybrid), per both papers and ADR 0041.

## References

- The two strategy papers (Documents/Claude/Projects/Business Standard/).
- ADR 0035 (decision support), 0029 (disclosure), 0041 (one product),
  0053 (lifecycle IA and build sequence).
