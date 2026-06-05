# ADR 0033 — Capability-tier launch preconditions for v0.1

**Status:** Accepted (2026-06-04 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030). Reframed: no separate-repo flip; v0.1 capability-tier launch rides on platform release cadence (ADR 0027).

## Context

Xtnd v0.1 (Open Capability-Tier Release, per ADR 0008) is scheduled to public-flip the `onlinejourno/xtnd` repository at Wk 100 of platform timeline. Public-flip is irreversible in spirit — once the world has seen the code, the demo, and the good-first-issues, the founder takes the community-scrutiny load described in platform ADR 0026.

A public flip with missing preconditions is a worse outcome than a delayed flip:

- Contributors arriving without `CONTRIBUTING.md` waste time guessing the rules.
- Demo seed data with embarrassing artefacts (real publisher names, broken UI, mis-configured modules) compromises the launch.
- Missing good-first-issues mean only senior contributors can engage; first-timers bounce.
- No `SECURITY.md` means vulnerability reports arrive on public issues, exposing the project.
- Premature flip ahead of design-partner-tenant validation means the demo asserts a product the editor pilot may not endorse.

This ADR locks the preconditions.

## Decision

The Wk 100 public-flip happens only when **all** of the following preconditions are met. Founder confirms each in a `docs/PUBLIC-FLIP-CHECKLIST.md` filed before the flip.

### Backbone preconditions

1. **All 7 `x-*` module skeletons exist** with complete Module Contract (`module.config.ts`, `module.lifecycle.ts`, `storage/` migrations, `agents/` stubs, `ui/` slots, `jobs/` stubs, `README.md`).
2. **Two exemplar modules fully implemented and functional in the demo tenant:**
   - `m-narrative-spine` — canonical narrative editor + deterministic continuity check + `narrative_decisions` log.
   - `m-distribution-fit` — Discover image checker + Search keyword analyzer (other surfaces deferred to good-first-issues).
3. **One CMS read adapter fully implemented:** `m-cms-read-adapter-wp` for vanilla WordPress + Gutenberg + Yoast.
4. **Mobile PWA skeleton functional** — manifest + service worker + iOS install hint working on iPhone Safari + Android Chrome.
5. **All Xtnd schema migrations applied** to the demo Postgres instance; RLS policies in place; tenant config namespace `xtnd:` operational with Zod validation.
6. **Platform upstream PRs merged:** role enum extension (`digital_desk`, `section_editor`, `social_team`, `video_team`, `dataviz_team`, `audio_team`, `newsroom_hierarchy`, `photo_team`); agent path enum extension (`xtnd_*` paths).
7. **Agent runtime registration** for Xtnd agents working through platform's Claude Agent SDK runtime; cost telemetry flowing to `agent_traces` with `xtnd_*` paths.
8. **Eval harness extended** for Xtnd modules; two exemplar goldsets shipped (one for `m-narrative-spine`, one for `m-distribution-fit`).

### Demo preconditions

9. **Demo tenant seed data complete** per `docs/DEMO-TENANT-SPEC.md`:
   - Fictional newsroom (never a real publisher name).
   - 3 beats; 5 fictional reporters; 20 fictional sources; 50 signals; 5 threads with canonical narratives; 10 published stories; 30 distribution-fit scores; 8 commissions; 15 post-publish diagnoses; 1 fair-chance audit.
   - Seed data security-reviewed: no personal data, no real organisation names, no real journalist names.
10. **Role switcher functional in dev mode** — `?as=desk` or `?as=section_editor` URL parameter switches the active role for demo browsing.
11. **Per-role demo walkthrough docs** at `docs/walkthrough/<role>.md` for each of: reporter, digital_desk, section_editor, dataviz_team, video_team, social_team, newsroom_hierarchy. Each walkthrough has screenshots.
12. **Marketing landing page** at `xtnd.onlinejourno.com/` (Next.js route) explains: what Xtnd is, what v0.1 ships, what is community contribution territory, where to start contributing, who the maintainer is. Tagline visible: *"Give every story a fair chance."*
13. **Demo internal-tested by founder + 1-2 trusted reviewers.** Reviewers report no embarrassing artefacts; no broken role surfaces; no orphan modules; no `TODO: implement me` text visible to demo users without context.

### Repository preconditions

14. **`README.md` at repo root** with:
    - Project description.
    - Single-maintainer disclaimer (per platform ADR 0026 wording).
    - Quick-start (install, link to platform, run demo locally).
    - Link to `docs/`, ADR index, roadmap.
    - License notice.
15. **`SECURITY.md`** with vulnerability disclosure process (email + GPG key + response-time expectations).
16. **`CONTRIBUTING.md`** with:
    - Good-first-issue contract pointer to ADR 0009.
    - PR review SLA per ADR 0026.
    - Module Contract template pointer.
    - Local development setup (workspace link to platform; demo tenant bootstrap; `pnpm install`, `pnpm dev`, `pnpm test`, `pnpm eval`).
17. **`CODE_OF_CONDUCT.md`** — Contributor Covenant 2.1 (or equivalent).
18. **`CHANGELOG.md`** with the v0.1 release notes drafted.
19. **`LICENSE.md`** present (already in repo from Wk 0).
20. **`NOTICE`** present (already in repo from Wk 0).

### Good-first-issue preconditions

21. **At least 30 good-first-issues drafted and ready to publish** per ADR 0009 template, distributed across skill levels:
    - `first-timer-friendly`: at least 8 issues open.
    - `experienced-contributor`: at least 15 issues open.
    - `advanced`: at least 7 issues open.
22. **Module Contract scaffold ready** at `docs/templates/module-scaffold/` referenced by every good-first-issue.
23. **`docs/good-first-issues/INDEX.md`** lists the issue categories (CMS adapters, distribution-fit surfaces, commission router targets, social schedulers, post-publish data sources, narrative-coherence rules, fair-chance audit visualisations, multi-modal coherence, localisations, eval-set contributions).

### Validation preconditions

24. **Narrow PoC validation has run for at least 4 weeks** on the design-partner tenant (private). Outcome documented in `docs/NARROW-POC-OUTCOME.md`:
    - Editor adopted canonical narrative (target: ≥3 canonical narratives actively maintained without prompting).
    - Continuity check usable (target: ≥40% advisory popups acted on).
    - No reporter complaint about wiki-burden (qualitative).
    - Governance log shows ≥10 actions (`edit_canonical`, `approve_divergence`, `dismiss_continuity`, `link_signal`, `unlink_signal`).
    - **Outcome must be documented even if mixed or negative.** v0.1 ships either way; outcome shapes v0.2 roadmap.
25. **Cost ceiling tested.** Demo tenant + agent-runtime work confirms daily Anthropic spend stays within platform's ₹150/day cap; cost telemetry flowing.

### Infrastructure preconditions

26. **`xtnd.onlinejourno.com` CNAME live**, certificate issued (per `docs/BRAND-DECISION.md`).
27. **Fly.io deploy successful** on same Fly.io account as platform (per `docs/BRAND-DECISION.md`). Host-header routing for the subdomain working.
28. **`onlinejourno.com` WordPress site updated** per `docs/MARKETING-SITE-SPEC.md`: Platform + Xtnd both shown in nav; Xtnd page links to `xtnd.onlinejourno.com`.

### Sustainability preconditions

29. **ADR 0039 sustainability preconditions confirmed:** the chosen path (A, B, or C) is still in effect; no hard-refusal condition fires; founder energy is sustainable.
30. **First quarterly review since Y1 close has been filed** at `docs/QUARTERLY-REVIEW-YYYY-QN.md` per ADR 0006 + 0007 checklists; reviewer-judgement confirms v0.1 launch is on time and within scope.

## Action sequence at public flip (Wk 100)

When all preconditions are confirmed in `docs/PUBLIC-FLIP-CHECKLIST.md`:

1. Tag release: `git tag v0.1.0 -m "OnlineJourno Xtnd v0.1 — Open Capability-Tier Release"`.
2. Flip repo visibility: `gh repo edit onlinejourno/xtnd --visibility public --accept-visibility-change-consequences`.
3. Publish release on GitHub with `CHANGELOG.md` v0.1 entry as release notes.
4. Open the 30+ good-first-issues from the ready pool.
5. Post launch announcement on `onlinejourno.in` (sister publication).
6. Update `onlinejourno.com` WordPress site Xtnd page status from "in design" → "v0.1 — Open Capability-Tier Release".
7. Email design partner with launch summary + thanks for narrow-PoC participation.
8. Notify platform Y1 customers (if any) that Xtnd backbone is now publicly available; opt-in to module activation on their tenant.
9. Begin first triage window: Friday 4:00 PM IST, per platform ADR 0026.

## What this ADR does not lock

- Specific date of public flip (Wk 100 is target; preconditions are the gate).
- Specific number of contributors that should engage in first month (community emerges on its own pace).
- Specific exemplar modules beyond `m-narrative-spine` + `m-distribution-fit` (ADR 0008 lists these; other modules are skeletons at flip).
- Specific marketing copy on `xtnd.onlinejourno.com/` (founder writes at flip prep time).
- Specific GA / Plausible / Fathom analytics — first-party only, per platform BRAND-DECISION.

## Consequences

- **A delayed flip is correct if any precondition fails.** No artificial deadline; preconditions are the gate.
- **Demo tenant is the public face.** It must look complete enough to convey scope, even though the underlying code is breadth-shallow. Hand-curated seed data does the work that a year of customer use would do.
- **Narrow PoC outcome is published either way.** Honest outcome reporting builds trust; suppressing a mixed/negative outcome would be the worse choice.
- **Backbone code, not module count, is the standard.** Reviewers + contributors look at what's there and evaluate code quality, not feature count. The scaffold and the exemplar modules are the signal.

## Anti-patterns refused

- "Launch first, fix later" public-flip without preconditions. Reputation is set at the flip; recovery is expensive.
- Cherry-picking preconditions to flip on time. Either all or none.
- Marketing-driven flip date. Engineering completeness drives the flip.
- Public flip without narrow-PoC outcome documented. Pretending the editor pilot doesn't matter, doesn't make it not matter.

## Revisit

Only when a precondition is materially renegotiated (e.g., the founder decides 20 good-first-issues is enough, not 30; ADR amendment required) or when post-flip experience surfaces a missing precondition (added to a v0.2 launch ADR).

## References

- ADR 0039 (sustainability preconditions)
- ADR 0031 (Open Capability-Tier Release strategy)
- ADR 0032 (good-first-issue contract)
- Xtnd `docs/BRAND-DECISION.md` (domain + Fly.io infra)
- Xtnd `docs/MARKETING-SITE-SPEC.md` (WordPress nav updates required)
- Xtnd `docs/QUARTERLY-REVIEW-template.md` (filing requirement)
- Xtnd `docs/DEMO-TENANT-SPEC.md` (fictional newsroom)
- Platform ADR 0024 (Apache 2.0 license; operational rules at first public-source moment)
- Platform ADR 0025 (voluntary contribution)
- Platform ADR 0026 (sustainability rules)
- Platform ADR 0027 (layered launch sequence)
