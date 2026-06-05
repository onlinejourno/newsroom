# ADR 0039 — Sustainability preconditions for capability-tier build

**Status:** Accepted (2026-06-03 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030).

## Context

Platform ADR 0026 codifies the maintainer-sustainability rules for the founder operating OnlineJourno Platform alone:

- 2 hours/week issue triage.
- 1 hour/week PR review.
- Quarterly major releases.
- One protected deep-work day per week.
- Single-maintainer disclaimer in the public README.

Those rules assume **one product** — the platform — sized for one founder. Xtnd doubles the product surface across two repositories, two ADR queues, two release cadences, and (eventually) two customer-facing surfaces.

The Y2 Xtnd scope was revised at Wk 0 (per ADR 0008) from a narrow ~234-hour module-set-1 build to a **~394-hour Open Capability-Tier Release (v0.1)** that includes backbone production-grade scaffolding, two exemplar modules fully implemented, one CMS read adapter, mobile PWA skeleton, demo tenant with seed data, public flip prep, and 30+ good-first-issues. At 16-20 hours/week available for Xtnd alongside platform Y1 maintenance, this is **22-26 calendar weeks** of focused work, not 12-15.

The revised effort forces **Precondition C (schedule stretch to ~18-22 months) as the default path** unless Precondition A or B activates earlier. Y3 module set 2 builds on top of v0.1 capability-tier release and is sized comparably; preconditions for Y3 are restated below.

Solo-founder math does not extend cleanly to two products. Burnout (platform premortem failure mode #9 / #17 equivalent) becomes the dominant risk if Xtnd Y2 build starts without one of the following preconditions met.

## Decision

Xtnd Y2 build does **not** start until **one or more** of the following preconditions is met:

### Precondition A — Platform Y1 paid revenue covers a part-time contributor

Platform Y1 ARR ≥ ₹20 lakh (Y1 target range is ₹15-30 lakh per platform `docs/BRAND-DECISION.md`), with monthly recurring revenue sufficient to retain a part-time contributor (≈10-15 hours/week) for Xtnd module work.

Contributor profile preferred: a journalist-developer (cf. platform `docs/COMMUNITY-LAUNCH-PLAN.md`) capable of writing modules without intensive supervision. Hire structure: contract or part-time employment, not equity-only.

### Precondition B — Values-aligned co-founder

A second person joins as a co-founder under a values-aligned arrangement (equity split, joint ownership of roadmap, shared maintainer responsibility). Co-founder profile: editorial-product senior, technical or journalism-domain background, capable of owning Xtnd while founder owns platform.

Co-founder onboarding includes:

- Joint review of platform `docs/CONTEXT.md`, all platform ADRs 0001-0027, Xtnd `RELATION-TO-PLATFORM.md`, Xtnd ADRs 0001-0007.
- Explicit ratification of platform ADR 0026 sustainability rules (now applies to two people).
- Cap-table update (`docs/CAP-TABLE.md` in platform side).
- New ADR documenting role split between founder and co-founder.

### Precondition C — Schedule stretch accepted (default path for v0.1)

Founder explicitly accepts that Y2 Xtnd v0.1 build (Open Capability-Tier Release, ADR 0008) will stretch to ≈18-22 calendar months (not 12), with the additional time absorbed by:

- Founder Wk 52-60 finishes platform Y1 stabilisation and Xtnd preparation (scope lock, demo-tenant spec, upstream PR drafts).
- Founder Wk 60-72 ships Xtnd backbone phase 1 (schema + module skeletons + role surface stubs) at ≈16-20 hours/week on Xtnd, balance on platform.
- Founder Wk 72-90 ships Xtnd backbone phase 2 (exemplar modules + WP adapter + mobile PWA + eval harness). Narrow PoC validation runs on design-partner tenant in parallel.
- Founder Wk 90-100 prepares public flip (demo seed data + marketing + good-first-issues + docs).
- **Public flip at Wk 100** (per ADR 0010 preconditions). Effectively Y2 H2 → Y3 H1 boundary.
- Platform's quarterly release cadence stays intact; Xtnd ships quarterly aligned with platform.
- Founder protects 1 deep-work day/week per platform ADR 0026; deep-work days alternate between platform-feature work and Xtnd-feature work.
- No new design partner onboarded during this stretch beyond the existing platform pilot. Y2 customer pull is paused at +1 newsroom maximum.

This precondition is the **default** for v0.1 unless Precondition A or B activates, in which case the schedule can compress modestly (not by more than ~25%).

Precondition C is the **default** if neither A nor B is met by end of platform Y1.

### Y3 Xtnd build preconditions

Y3 build (`ROADMAP.md` module set 2) requires **both** of:

1. Y2 Xtnd modules adopted by ≥2 newsrooms with ≥8 weeks production use each (validates the Y2 build was the right product).
2. **Either** part-time contributor → full-time, **or** co-founder in place, **or** founder accepts further schedule stretch (Y3 calendar runs to Y4).

Single-founder shipping Xtnd Y3 module set 2 entirely solo is **not** an option — the surface is too large. If neither contributor / co-founder material nor revenue exists to fund growth, Y3 scope is reduced to a single module (most-likely candidate: `m-post-publish-diagnostic`) with the rest deferred to Y4.

## Quarterly preconditions review

Each platform quarter ends with a preconditions review:

- [ ] What is current platform ARR? Does it satisfy Precondition A threshold?
- [ ] Is there a credible co-founder conversation in progress? Does it satisfy Precondition B?
- [ ] If neither, is the schedule-stretch path realistic for the next quarter?
- [ ] Update `ROADMAP.md` Y2 / Y3 schedule projections based on current state.

The review outcome is documented in a `docs/QUARTERLY-REVIEW-YYYY-QN.md` file in the Xtnd repo (created at first review, end of platform Q1 / Wk 13).

## Hard refusal conditions

Xtnd Y2 build **will not** start if **any** of the following is true:

- Platform Y1 design partner pilot has stalled (no shortlist trust by Wk 16 per platform `docs/MVP-SCOPE.md` success criteria).
- Founder is in burnout state (objective signal: 2 consecutive deep-work days skipped for non-vacation reasons; subjective signal: lost faith in either product).
- Cumulative founder hours across platform + Xtnd exceed 60/week for 4 consecutive weeks.
- A platform-side architectural issue (schema / agent runtime / module contract) is unresolved and would block Xtnd module work from landing cleanly.

Hard-refusal conditions take precedence over preconditions A/B/C. Founder health and platform stability come before Xtnd build.

## Consequences

- **Y2 Xtnd build is gated, not scheduled.** The earliest start is Wk 52-60 of platform timeline; the realistic start is later depending on which precondition path activates.
- **Schedule honesty.** Customer conversations Y1 do not promise Y2 Xtnd module dates. Roadmap is direction, not commitment.
- **Founder burnout is treated as a project-killer.** Hard-refusal conditions force a pause even when preconditions look met on paper.
- **Co-founder / contributor onboarding has structured criteria.** Not "we got along on a call" — explicit ADR ratification, cap-table update, role-split ADR.
- **Customer pull cannot override sustainability.** A customer demand for Y2 Xtnd module that arrives before preconditions are met is documented as deferred and revisited at next quarterly review.

## Anti-patterns refused

- "Just one module Y2; we can do that in 4 weeks." Refuse — one module turns into three turns into seven. Preconditions remain.
- "We'll bring in a co-founder after Y2 launch." Refuse — co-founder onboarding *during* a build sprint is the burnout vector.
- "Skip the quarterly review for one quarter; we're sprinting." Refuse — the review is the discipline.
- "Founder will do 70 hours/week to ship Y2 faster." Refuse — burnout cost compounds; not negotiable.
- "Customer is offering ₹20 lakh services contract; let's expand scope." Document the offer, complete the work as services revenue (which funds Precondition A indirectly), do not let scope expand Xtnd's module set unilaterally.

## Revisit

This ADR is revisited:

- End of platform Y1 (binding decision point: do Y2 build preconditions warrant starting?).
- After any precondition fires (e.g., contributor hired → onboarding ADR filed).
- After any hard-refusal condition fires (e.g., burnout signal → pause documented).
- When platform Y1 success criteria are re-evaluated (potentially shifting Y2 build timing in either direction).

## References

- Platform ADR 0026 (indie maintainer sustainability rules)
- Platform `docs/BRAND-DECISION.md` (Y1 ARR target, ₹2K/mo burn, hire posture)
- Platform `docs/MVP-SCOPE.md` (Y1 success criteria Wk 16)
- Xtnd `ROADMAP.md` (Y2 effort estimate, Y3 module set 2)
- Xtnd `docs/PREMORTEM.md` failure modes #1, #2, #17
- Xtnd `RELATION-TO-PLATFORM.md` (downstream rule preserves platform Y1)
