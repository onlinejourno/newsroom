# ADR 0030 — Merge Xtnd as a capability tier of OnlineJourno Platform

**Status:** Accepted (2026-06-05).

## Context

A separate `onlinejourno/xtnd` repository was created on 2026-06-03 to hold the converged-newsroom-orchestration product (working name "OnlineJourno Xtnd"), intended as a downstream sibling of `onlinejourno/platform`. The Xtnd repo accumulated:

- 10 ADRs (relation-to-platform; roles-and-surfaces; decision-support-not-autopilot; CMS-adapter-read-only-Y1-3; module-naming `x-*`; AI-surface watch-trigger; sustainability preconditions; Open Backbone Release v0.1 strategy; good-first-issue contract; public-flip preconditions).
- Long-form docs: `CONTEXT.md`, `VISION.md`, `ROADMAP.md`, `RELATION-TO-PLATFORM.md`, `BRAND-DECISION.md`, `IDENTITY.md`, `PREMORTEM.md`, `INTEGRATION-SPEC.md`, `DEMO-TENANT-SPEC.md`, `MARKETING-SITE-SPEC.md`, `QUARTERLY-REVIEW-template.md`.
- `CONTRIBUTING.md` skeleton.
- `docs/good-first-issues/INDEX.md` + 5 exemplar templates.
- Zero code (Wk 0 of Xtnd was doc-only by design).

Honest reassessment surfaced a structural concern: the split adds operational overhead (two ADR queues, two CHANGELOGs, two release cadences, two CONTRIBUTING files, workspace-link plumbing, upstream-PR cycle for every Xtnd schema need, two community ramps, two demo tenants, two public-flip preconditions gates, founder context-switching tax) without addressing a real risk the platform's existing module-plugin architecture (ADR 0006) doesn't already address. Platform's module-plugin architecture already permits modules to exist in the codebase without shipping at MVP launch (current example: `m-framing-pej`, `m-discover-seo`, `m-platform-dep`, `m-ai-visibility`, `m-recirculation` — all defined, all disabled by default). Adding the Xtnd module set as `m-*` modules disabled-by-default at MVP is the natural fit; the separate repo provides no additional discipline that ADR 0006 + ADR 0026 (sustainability rules) + `MVP-SCOPE.md` verbatim out-of-scope statement don't already provide.

The split was a defensive over-correction to the legitimate concern *"don't violate platform Y1 MVP-SCOPE."* The concern is fully addressed by existing guards; the split adds cost without protection.

## Decision

Merge `onlinejourno/xtnd` into `onlinejourno/platform`. Treat **Xtnd as a capability tier within the OnlineJourno product**, not a separate product. Specifically:

1. **One product:** OnlineJourno. Two capability tiers: the **MVP tier** (daily brief for working reporters; markets/regulatory wedge Y1) and the **Xtnd tier** (converged-newsroom orchestration; multi-role surfaces; companion to CMS; ships post-MVP through Y2-Y5 as `m-*` modules disabled at MVP launch).
2. **One repository:** `onlinejourno/platform`. The Xtnd repo content migrates here.
3. **One ADR queue:** This ADR is 0030; the 9 substantive Xtnd ADRs migrate as 0031-0039 (chronologically after 0029 and this ADR).
4. **One module naming convention:** `m-*` only. Previously planned `x-*` prefix is dropped; the `m-*` prefix already conveys "module"; the tier distinction is documented in module README + `ROADMAP.md`, not in directory naming.
5. **One CONTRIBUTING, one SECURITY, one CoC, one LICENSE, one CHANGELOG, one release cadence.**
6. **One demo tenant:** the fictional "Demo Daily" newsroom defined in `docs/DEMO-TENANT-SPEC.md` (merged from Xtnd repo) extends to include both MVP-tier and Xtnd-tier capabilities, with role switcher demonstrating each.
7. **One public-flip:** platform's existing layered-launch sequence (ADR 0027) governs. The Xtnd-tier modules light up on the same `app.onlinejourno.com` instance as MVP modules, behind per-tenant config opt-in. There is no separate Xtnd-tier public flip; the `xtnd.onlinejourno.com` subdomain (per Xtnd `BRAND-DECISION.md`) remains as a branded marketing surface that routes to the same Fly.io app via Host-header routing.
8. **One sustainability budget:** ADR 0026 sustainability rules apply across MVP-tier + Xtnd-tier work cumulatively; the previously-locked schedule-stretch preconditions for Xtnd-tier build (was Xtnd ADR 0007, now ADR 0039) continue to govern Y2 module-tier build, but now operate inside the single platform release cadence.
9. **`onlinejourno/xtnd` repository archived** after this merge lands. README points to platform.

The capability-tier framing preserves the marketing value of "OnlineJourno Xtnd" as a named tier (similar to "Notion AI" or "GitHub Copilot Workspace" — capability tier within a product) without the operational cost of a separate codebase.

### Files migrated by this commit

| From Xtnd repo | To platform repo | Adaptation |
|---|---|---|
| `README.md` | (not migrated — platform `README.md` updated separately) | — |
| `CONTEXT.md` | merged into platform `CONTEXT.md` (capability-tier section appended) | role map + Xtnd-tier principles added |
| `VISION.md` | `VISION.md` at platform root | new file; reporter vignette unchanged |
| `ROADMAP.md` | `ROADMAP.md` at platform root | new file; capability-tier sequencing preserved; `x-*` → `m-*` |
| `RELATION-TO-PLATFORM.md` | (not migrated — obsolete) | this ADR records why |
| `LICENSE.md` | (not migrated — platform already has it) | identical Apache 2.0 |
| `NOTICE` | merged into platform `NOTICE` (Xtnd-tier attribution appended) | — |
| `CONTRIBUTING.md` | `CONTRIBUTING.md` at platform root | new file |
| `docs/BRAND-DECISION.md` | merged into platform `docs/BRAND-DECISION.md` (capability-tier section appended) | — |
| `docs/IDENTITY.md` | merged into platform `docs/BRAND-DECISION.md` Identity section | — |
| `docs/PREMORTEM.md` | merged into platform `docs/PREMORTEM-RECONCILIATION.md` (Xtnd-tier failure modes appended) | — |
| `docs/INTEGRATION-SPEC.md` | `docs/INTEGRATION-SPEC.md` at platform | new file; renamed schema tables (`xtnd_*` and `x_*` → consistent `m_*`-tier-aware prefixes documented inside the file) |
| `docs/DEMO-TENANT-SPEC.md` | `docs/DEMO-TENANT-SPEC.md` at platform | new file |
| `docs/MARKETING-SITE-SPEC.md` | `docs/MARKETING-SITE-SPEC.md` at platform | new file |
| `docs/QUARTERLY-REVIEW-template.md` | `docs/QUARTERLY-REVIEW-template.md` at platform | new file |
| `docs/good-first-issues/INDEX.md` | `docs/good-first-issues/INDEX.md` at platform | new file; `x-*` → `m-*` |
| `docs/good-first-issues/gfi-*.md` (5 templates) | `docs/good-first-issues/gfi-*.md` at platform | new files; `x-*` → `m-*` |
| `docs/adr/0001-relation-to-platform.md` | (not migrated — superseded by this ADR 0030) | — |
| `docs/adr/0002-roles-and-surfaces.md` | `docs/adr/0034-roles-and-surfaces.md` | renumbered; references adjusted |
| `docs/adr/0003-decision-support-not-autopilot.md` | `docs/adr/0035-decision-support-not-autopilot.md` | renumbered |
| `docs/adr/0004-cms-adapter-read-only-y2.md` | `docs/adr/0036-cms-adapter-read-only-y2.md` | renumbered |
| `docs/adr/0005-module-naming-x-prefix.md` | `docs/adr/0037-module-naming.md` | renumbered + content rewritten to lock `m-*` only (no `x-*`) |
| `docs/adr/0006-ai-surface-watch-trigger.md` | `docs/adr/0038-ai-surface-watch-trigger.md` | renumbered |
| `docs/adr/0007-sustainability-y2-y3-preconditions.md` | `docs/adr/0039-sustainability-capability-tier-preconditions.md` | renumbered + framing adjusted to capability-tier |
| `docs/adr/0008-open-backbone-release.md` | `docs/adr/0031-open-capability-tier-release.md` | renumbered + renamed |
| `docs/adr/0009-good-first-issue-contract.md` | `docs/adr/0032-good-first-issue-contract.md` | renumbered |
| `docs/adr/0010-public-flip-preconditions.md` | `docs/adr/0033-capability-tier-launch-preconditions.md` | renumbered + framing adjusted (no separate flip; tier-launch alongside platform's release cadence) |

(Note: ADR 0029 is reserved by the open trust-primitives PR #2; this PR's first new ADR is 0030. If PR #2 lands second, no number conflict — both PRs touch different files.)

### `x-*` → `m-*` rename

Module directory naming uses `m-*` exclusively. Future Xtnd-tier modules:

- `m-distribution-fit` (was `x-distribution-fit`)
- `m-cms-read-adapter-wp` (was `x-cms-read-adapter-wp`)
- `m-narrative-spine` (was `x-narrative-spine`)
- `m-post-publish-diagnostic` (was `x-post-publish-diagnostic`)
- `m-placement-support` (was `x-placement-support`)
- `m-commission-router` (was `x-commission-router`)
- `m-social-scheduler` (was `x-social-scheduler`)
- `m-fair-chance-audit` (was `x-fair-chance-audit`)
- (Y3+) `m-narrative-coherence` (was `x-narrative-coherence`)

Schema table prefixes:

- Cross-tier capability tables (e.g., story lifecycle, commissions, placement, distribution-fit scores, post-publish diagnoses, social schedules, fair-chance audits) use `cap_*` prefix (capability-tier).
- Module-owned tables continue to use the module name as prefix (e.g., `m_cms_wp_credentials`, `m_distribution_fit_eval_runs`) per existing ADR 0006.

### `RELATION-TO-PLATFORM.md` obsolescence

The downstream-rule, schema-boundary rules, workspace-link pattern, and upstream-PR cycle from Xtnd `RELATION-TO-PLATFORM.md` are no longer needed once the merge lands. This ADR records why; the file itself is not migrated.

## Consequences

- **One ADR queue, one ROADMAP, one CHANGELOG, one release cadence.** Sustainability load drops materially.
- **One CONTRIBUTING + one SECURITY + one CoC + one LICENSE.** Contributor confusion ("which repo?") eliminated.
- **Schema changes ship directly.** No upstream-PR cycle to self. Role enum extension (Y2), agent path enum extension (Y2), `threads.canonical_narrative` (Y2-Y3) — all land via normal platform PR.
- **Demo tenant unified.** One fictional newsroom, with both MVP-tier and Xtnd-tier capabilities visible via role switcher.
- **Public-flip simplified.** Platform's existing ADR 0027 layered-launch sequence governs. Xtnd-tier modules light up when ready, per-tenant opt-in, without separate flip ceremony.
- **`xtnd.onlinejourno.com` retained** as branded marketing surface for the capability tier; routes to same Fly.io app via Host-header. No infrastructure change.
- **`onlinejourno/xtnd` repo archived** with README pointer to platform. Git history preserved; no work lost.
- **Marketing narrative preserved.** "OnlineJourno Xtnd" remains a named capability tier customers can adopt; pitched as "the converged-newsroom orchestration tier on top of OnlineJourno." Pricing Y2-Y3 is opt-in line items on platform invoicing (per Xtnd `BRAND-DECISION.md`).
- **Editorial principles preserved.** Decision-support not autopilot, companion-to-CMS read-only Y1-3, reporter-first test, information symmetry, fair-chance ethos — all migrate as platform ADRs.
- **The previously-named "Open Backbone Release v0.1"** becomes the **"Open Capability-Tier Release v0.1"** of platform — same scope (backbone production-grade + 2 exemplar modules + 1 CMS adapter + mobile PWA skeleton + demo tenant + 30+ good-first-issues + public flip prep) — but ships inside platform's repo.
- **Sustainability preconditions** for the capability-tier build (was Xtnd ADR 0007; now ADR 0039) continue to apply.

## Anti-patterns refused (by this merge)

- Maintaining two repos by the same solo founder forever, with workspace-link plumbing, upstream-PR cycle ceremony, and two community ramps. Architecture theatre disguised as discipline.
- Module-name prefix segregation (`x-*` vs `m-*`) inside the same product. Confusing for contributors; serves no real purpose now that the tier separation is at the marketing layer, not the code layer.
- Two CONTRIBUTING files telling contributors different things about the same product.
- Two release cadences synchronised by founder discipline alone. Single release cadence is more honest.

## What this ADR does not change

- MVP-tier scope (markets/regulatory wedge; single design partner; locked in `docs/MVP-SCOPE.md`).
- Trust primitives shipped in MVP (per PR #2 / ADR 0029).
- Editorial principles (decision-support not autopilot; companion to CMS; reporter-first; information symmetry; fair-chance ethos).
- Long-arc vision (Y2 capability-tier launch; Y3 module set 2; Y4+ optional head mode; Y5 federated fair-chance benchmarks).
- Marketing surface plan (umbrella site at `onlinejourno.com` shows the product with capability-tier framing; `xtnd.onlinejourno.com` as branded subdomain for the tier).
- License (Apache 2.0).
- Sustainability rules (ADR 0026); they now apply to one repo, which is easier.

## Revisit

Only if a customer materially benefits from Xtnd being a separate code product (e.g., customer wants to license Xtnd separately from platform; customer wants Xtnd's source without platform's). No such customer exists Y1-Y3. If one appears Y4+, this ADR is revisited and the split rebuilt with deliberate scoping; the merge documented here doesn't preclude that future fork.

## References

- ADR 0006 (module plugin architecture — already supports disabled-by-default modules)
- ADR 0024 (Apache 2.0 license — unchanged by merge)
- ADR 0025 (voluntary contribution — unchanged)
- ADR 0026 (indie sustainability rules — easier to honour with one repo)
- ADR 0027 (layered launch sequence — governs capability-tier launch too)
- ADR 0029 (trust primitives — PR #2; unchanged by merge)
- New ADRs 0031-0039 in this PR (Xtnd ADRs renumbered + adapted)
- Archived `onlinejourno/xtnd` repository (https://github.com/onlinejourno/xtnd — pre-merge git history preserved)
