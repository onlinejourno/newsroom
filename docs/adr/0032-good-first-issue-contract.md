# ADR 0032 — Good-first-issue contract

**Status:** Accepted (2026-06-04 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030).

## Context

Xtnd v0.1 (Open Capability-Tier Release, ADR 0008) ships with breadth-shallow features. Most distribution-fit surfaces, CMS adapters, commission router targets, social schedulers, post-publish data source adapters, narrative-coherence rules, fair-chance audit visualisations, and localisations are deferred to OSS community contribution as good-first-issues.

Solo-founder PR review capacity is capped at 1 hr/wk per platform ADR 0026. Mathematically: ≤4 PRs/month if each PR review takes 15 minutes; ≤8 PRs/month if review takes 7-8 minutes; fewer if PRs require iteration. To scale features via community at this cap, **each good-first-issue must be aggressively scoped so PR review is fast and predictable.**

Without an explicit contract on what makes a good first issue *good* — and what makes a PR landing-ready — community PRs will arrive partial, mis-architected, lacking tests, or out-of-scope; founder review time will balloon; PRs will bounce; community frustration will compound; reputation will erode.

This ADR locks the contract.

## Decision

Every good-first-issue created in `onlinejourno/xtnd` must conform to the following template before publication. Every PR addressing a good-first-issue must satisfy the acceptance criteria before merge.

### Good-first-issue template

```markdown
## What

[One paragraph: what the contributor builds. Concrete, narrow, single-module.]

## Why

[One paragraph: why this matters to Xtnd users. Reference ADR or roadmap item.]

## Module / location

[Exact directory path under `packages/modules/x-*` or `apps/web/app/*`.]

## Module Contract scaffold

[Path to scaffold file or starter template.]

## Inputs / outputs

[Concrete data shapes the contribution reads and writes. Reference INTEGRATION-SPEC.md table column types.]

## Acceptance criteria

- [ ] Module Contract complete: `module.config.ts`, `module.lifecycle.ts`, `storage/` (if owned tables), `agents/` (if uses agents), `ui/` (if has slots), `jobs/` (if scheduled), `README.md`.
- [ ] Inputs validated by Zod schema declared in `module.config.ts`.
- [ ] Outputs match the data shape declared in INTEGRATION-SPEC.md.
- [ ] RLS-aware: all DB queries include `tenant_id` filter.
- [ ] Cost-budget aware: any agent calls register through platform's `agent_traces` infrastructure.
- [ ] Unit tests for the module's pure functions (`pnpm test` passes in the module directory).
- [ ] Eval fixtures: `eval/goldset/demo.csv` exists with at least 20 examples and the module's eval harness runs (`pnpm eval` passes).
- [ ] No new top-level dependencies (per platform CLAUDE.md). If a new dependency is genuinely required, file a separate ADR PR first.
- [ ] No edits outside the module directory or the immediately consuming UI slot file.
- [ ] Documentation: module `README.md` follows the template at `docs/templates/MODULE-README.md`.
- [ ] Demo tenant seed data extended where relevant (`docs/DEMO-TENANT-SPEC.md` reference).
- [ ] Decision-support, not decision-making (ADR 0035). Any user-facing recommendation is advisory; no autopilot.

## Estimated effort

[Founder estimate of solo-founder hours to do this; contributor's expected ballpark.]

## Skill level

[`first-timer-friendly` | `experienced-contributor` | `advanced`]

## Review SLA

Reviewed in the next Friday review window (per platform ADR 0026). Expect ~15-30 min initial review; may require one round of iteration.

## Out of scope

[Specifically what this issue does not cover. Prevents scope creep in the PR.]

## References

[Links to relevant ADRs, INTEGRATION-SPEC sections, related modules.]
```

### Module Contract scaffold (provided alongside every issue)

Every good-first-issue links to a scaffold template stored in the Xtnd repo. The scaffold provides:

- `module.config.ts` — Zod schema stub with TODO placeholders.
- `module.lifecycle.ts` — `onEnable`, `onDisable`, `onConfigChange` stubs.
- `storage/001_initial.sql` — migration template (if module owns tables).
- `agents/` — agent registration stub (if module uses agents).
- `ui/` — React component slot mount stub (if module has UI surface).
- `jobs/` — scheduled job stub (if module has cron jobs).
- `eval/goldset/demo.csv` — eval-fixture template with header row.
- `tests/` — unit test stub.
- `README.md` — module documentation template.

Scaffold path: `docs/templates/module-scaffold/`. A contributor copies the scaffold to `packages/modules/x-<name>/`, replaces TODOs, ships PR.

### Acceptance criteria enforcement

Acceptance criteria are not optional. PRs that do not satisfy criteria are commented with:

> Thanks for the PR. The acceptance criteria for this good-first-issue are not yet met. Specifically: [list checklist items]. Please update the PR; I'll re-review at the next Friday review window (per ADR 0026).

No exceptions. No "we'll merge and fix later" path. The criteria exist to make review fast and predictable; relaxing them shifts the cost back to founder time.

### Review SLA

- **PRs receive an acknowledgement comment within 7 days** ("Received. Reviewing this weekend.").
- **First substantive review by the next Friday** (per platform ADR 0026 PR review window).
- **Subsequent iteration reviews on the same Friday cadence.**
- **No same-day promises.** Contributors are told upfront.
- **PRs idle without contributor response for 30 days are commented** ("Are you still working on this? If not, I'll close in 7 days; happy to reopen if you return.").
- **PRs idle for 60 days are closed** with a "feel free to reopen" message.

### Skill levels and labelling

| Skill level | Description | Examples |
|-------------|-------------|----------|
| `first-timer-friendly` | Single-file change. Scaffold provides 80% of the code. Contributor fills in narrow gaps. Estimated 2-4 hours. | Add one Discover image scorer rule. Add one social channel template. Add one localised string. |
| `experienced-contributor` | Multi-file change within a single module. Module Contract complete. Estimated 8-16 hours. | Implement one full CMS read adapter. Implement one social scheduler channel adapter. Implement one fair-chance audit visualisation. |
| `advanced` | Cross-module change OR new module skeleton with multiple agents OR substantial UI surface. Estimated 24-60 hours. | Implement multi-modal coherence checker. Implement a new role surface. Implement an entire new module type (e.g., AI-surface licensing). |

Issues labelled `first-timer-friendly` are protected: at least 8 such issues open at any time. Reserved for new contributors; experienced contributors directed to `experienced-contributor` or `advanced` issues.

### Recognition

Contributors are recognised through:

- `CONTRIBUTORS.md` updated on merge.
- Contributor name + handle attached to the module's README "Curated by …" field.
- Annual community-contributors post on `onlinejourno.in` (sister publication).
- For substantial contributions: named credit in release notes.

### Refusing scope creep in PRs

A PR that goes beyond the good-first-issue scope is treated as out-of-bounds. The reviewer comments:

> Thanks for the PR. The work outside the original issue scope (specifically: [list]) is appreciated but should be split into a separate PR for a separate good-first-issue. I'll merge the in-scope portion when criteria are met. Please open a follow-up PR for the additional work; I'll create an issue for it if one doesn't exist.

This protects review time and keeps PR review predictable.

### Refusing low-value PRs

Refused PR categories (closed with reason):

- Cosmetic-only PRs (whitespace, comment grammar) without functional change. Reason: review-cost-to-value ratio.
- Dependency-bump PRs without a security or capability justification. Reason: founder runs `pnpm update` quarterly during release windows.
- "Improvement" PRs that violate locked ADRs. Example: a PR adding autopilot placement violates ADR 0035. Reason: ADR is the source of truth; violations close.
- PRs without acceptance criteria satisfied after one iteration round. Reason: review-bandwidth protection (close, not block forever; can reopen with criteria met).

## Consequences

- **Community contribution becomes predictable.** Contributors know what is required, what they get, when they'll be reviewed.
- **Founder review time stays inside ADR 0026 1-hr/wk cap.** Predictable PR shape = predictable review time.
- **Quality bar is explicit, not implicit.** Contributors see the bar before they start work; no surprise rejections.
- **Module Contract drives consistency.** Every contributed module looks like the exemplar modules; the codebase doesn't fragment.
- **Some contributors will be frustrated by the bar.** Acceptable. The bar exists to protect bandwidth + code quality; relaxing it kills both.
- **First-timer-friendly issues create on-ramp.** New contributors don't bounce; they land their first PR fast.

## Anti-patterns refused

- Vague good-first-issues ("improve the social scheduler"). Specific scope or no issue.
- Open-ended PRs that "explore" something. Issue must define done.
- Auto-merge by bot. Every PR has a human review.
- Issues without acceptance criteria. Founder writes the criteria before publishing the issue.
- Removing the Module Contract requirement to "be welcoming." Welcoming is in the tone; the contract stays.
- Allowing contributor PRs to add top-level dependencies. ADR-gated per platform CLAUDE.md.
- Allowing contributor PRs to modify locked ADRs in the same PR as a feature. ADR changes are separate PRs, separately reviewed.
- Promising response times faster than ADR 0026 allows. Same-day comments degrade into expectation.

## Revisit

When:

- Sustained PR throughput exceeds 8 PRs/month for 8 weeks → ADR 0026 review cap may need adjustment (more contributor time, or another reviewer).
- Specific categories of issues (e.g., CMS adapters) show repeated quality issues → tighten the scaffold or split into smaller scope.
- A specific skill-level category bounces contributors (high abandon rate) → re-tune the difficulty labels.

## References

- ADR 0031 (Open Capability-Tier Release strategy)
- ADR 0033 (public-flip preconditions)
- Xtnd `docs/INTEGRATION-SPEC.md` (data shapes for module input/output)
- Platform ADR 0006 (module plugin architecture — the contract this ADR enforces)
- Platform ADR 0025 (voluntary contribution)
- Platform ADR 0026 (indie sustainability rules — review cap)
- Platform `CLAUDE.md` (no-new-dependency rule)
