# ADR 0031 — OnlineJourno v0.1 Open Capability-Tier Release strategy

**Status:** Accepted (2026-06-04 in `onlinejourno/xtnd`; merged into `onlinejourno/platform` 2026-06-05 per ADR 0030).

## Context

Two product-shape options existed for Xtnd's first shipped release:

- **Option N — Narrow hypothesis-validation PoC.** Five items (canonical narrative schema, deterministic continuity check, beat-editor canonical UI, governance log, velocity counter display). 60-80 founder hours. Goal: validate that editors adopt canonical narrative as a working artifact. Yields hypothesis evidence; does not yield a public artefact.

- **Option B — Open Capability-Tier Release ("v0.1").** Backbone production-grade across schema, agent runtime, RLS, role surfaces, deploy. Breadth-shallow: all 7 `x-*` module skeletons wired to Module Contract (per platform ADR 0006). Two exemplar modules fully implemented (`m-narrative-spine`, `m-distribution-fit`). One CMS read adapter (`m-cms-read-adapter-wp`). Mobile PWA skeleton. Fictional demo tenant with seed data. Public flip at Wk 100. Goal: convey the full scope of Xtnd to the OSS community + future contributors + future design partners while keeping bells-and-whistles feature work as good-first-issues.

Option B is what the founder chose at end of Xtnd Wk 0. Reasons:

1. **Marketing surface honesty.** A narrow PoC is internal evidence; an open backbone release is a public artefact that shows the product family's full scope. The community can see what Xtnd *is*, not just what one validation gate proved.
2. **Community-leveraged scope.** The backbone is solo founder's responsibility; feature breadth lives in good-first-issues for the OSS community. This is the only realistic way solo founder ships multi-modal, multi-CMS, multi-channel orchestration without a 5-year horizon.
3. **Production-grade demonstration.** A demo behind a fictional tenant is testable, screenshot-able, embeddable in design-partner conversations, and provable to future co-founders / contributors / investors / grant funders.
4. **Hypothesis still validated.** Narrow PoC is not abandoned — it runs in parallel on the live design-partner tenant. Backbone is the public release; narrow PoC is the private editor-validation track. Same code, different data, different audience.

## Decision

OnlineJourno Xtnd's first shipped release is **OnlineJourno Xtnd v0.1 — Open Capability-Tier Release**.

### Scope split

**Backbone (founder ships solo before public flip):**

| Item | Effort (hr) |
|------|-------------|
| Xtnd schema migrations (all tables per `docs/INTEGRATION-SPEC.md`) | 12 |
| Platform-side upstream PRs: role enum extension, agent path enum extension | 4 (Xtnd side) + platform review |
| All 7 `x-*` module skeletons w/ Module Contract (config schema, lifecycle hooks, storage migrations, agents stub, UI slots, jobs, README) | 56 |
| Agent runtime registration for Xtnd agents | 6 |
| RLS policies for Xtnd-owned tables | 8 |
| Tenant config namespace `xtnd:` with Zod validation | 8 |
| Auth + RBAC middleware for new roles | 10 |
| Role surface routes stub'd in `apps/web` (desk, mobile PWA root, diagnose, audit, commission, section, canonical narrative editor) | 40 |
| Demo tenant + seed data (per `docs/DEMO-TENANT-SPEC.md`) | 32 |
| Role switcher in dev mode (`?as=desk` URL param) | 6 |
| **Two exemplar modules fully implemented:** `m-narrative-spine` (canonical narrative + deterministic continuity check) + `m-distribution-fit` (Discover image checker + Search keyword analyzer only — other surfaces deferred to good-first-issues) | 80 |
| One CMS read adapter fully implemented: `m-cms-read-adapter-wp` (vanilla WP + Gutenberg + Yoast topology only) | 40 |
| Mobile PWA skeleton (manifest + service worker + iOS install hint) | 12 |
| Eval harness extended for Xtnd modules + 2 exemplar goldsets | 16 |
| Deploy to Fly.io alongside platform + `xtnd.onlinejourno.com` CNAME | 8 |
| Marketing landing page on subdomain (Next.js route, not WordPress, for demo) | 12 |
| Public-flip prep: `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, single-maintainer disclaimer at README top | 8 |
| Good-first-issue list — 30+ tightly-scoped issues per `docs/adr/0009-good-first-issue-contract.md` | 24 |
| Demo walkthrough docs (per role, with screenshots) | 12 |
| **Backbone total** | **~394 hr** |

**Features (deferred to OSS contribution after public flip):**

- Remaining CMS read adapters (Ghost, Strapi, Drupal, Wix, Hugo, Jekyll, Eleventy, Sanity, Contentful, Storyblok, Payload, Directus + generic REST/GraphQL templates).
- Remaining distribution-fit surfaces (Subscription kicker scorer, Direct-fit predictor, Social-momentum reader, AI-answer-card readiness, RSS validator, AMP validator, OG image scorer, hreflang checker, Newsletter-fit scorer).
- Commission router targets (Slack, Discord, MS Teams, email, Linear, Jira, Asana, Trello, Monday, Basecamp, ClickUp, Notion + generic webhook template).
- Social schedulers (X, LinkedIn, Mastodon, Bluesky, FB, IG, Threads, WhatsApp Channels, Telegram, Pinterest, Reddit + generic OAuth template).
- Post-publish data source adapters (GSC, Discover API, Bing Webmaster, Plausible, GA4, Matomo, Umami, Fathom, Cloudflare Web Analytics + first-party template).
- Narrative-coherence advisory rules (entity-overlap, temporal-proximity, embargo flag, sub-judice flag, defamation-risk heuristic, factual-contradiction template).
- Fair-chance audit visualization variants (byline-gender, placement-CTR variance, surface-coverage heatmap, time-of-day patterns, beat-velocity comparator).
- Multi-modal coherence (Y3+ — Whisper-transcript fact-extractor, image alt-text validator, video-thumbnail consistency).
- UI translations per locale (platform ADR 0019/0020 pattern).
- Eval set contributions (per-tenant goldsets for each distribution-fit surface, per-language brief composition).

Full taxonomy in `docs/good-first-issues/INDEX.md` (drafted alongside this ADR).

### Sequencing

| Window | Track | Output |
|--------|-------|--------|
| Platform Wk 52-60 | Xtnd preparation | Lock backbone scope. Decide Precondition A / B / C path (ADR 0039). Demo tenant spec finalised. |
| Wk 60-72 | Xtnd backbone build phase 1 | Schema migrations + module skeletons + role surface stubs (~180 hr). Internal only. |
| Wk 72-90 | Xtnd backbone build phase 2 | Two exemplar modules + WP adapter + mobile PWA + eval harness (~150 hr). Internal demo accessible to founder + design partner. **Narrow PoC validation runs on design-partner tenant in parallel.** |
| Wk 90-100 | Public-flip prep | Demo tenant seed data + marketing page + SECURITY/CONTRIBUTING/CoC + good-first-issue list + walkthrough docs (~64 hr). Demo internal-tested by founder + 1-2 trusted reviewers. |
| **Wk 100** | **Public flip** | `github.com/onlinejourno/xtnd` → public. `xtnd.onlinejourno.com` demo live. Good-first-issues open. v0.1 release tagged. |
| Wk 100+ | Community ramp | 1 hr/wk PR review (ADR 0026). Quarterly releases. Founder ships exemplar features for Y3 module set 2. |

### Naming

Locked: **OnlineJourno Xtnd v0.1 — Open Capability-Tier Release**.

Conveys:
- Backbone is production-grade ("Open" — Apache 2.0 + transparent + auditable).
- Features are community-built ("Backbone Release" — not feature-complete; foundation for additions).
- "v0.1" semver discipline (per platform ADR 0026 quarterly cadence; subsequent releases v0.2, v0.3 quarterly).

### Parallel narrow PoC

Backbone build does **not** replace the narrow PoC hypothesis validation. Both run concurrently:

- **Public demo** at `xtnd.onlinejourno.com` shows the full backbone with fictional seed data; community + future contributors + future design partners + grant funders evaluate scope.
- **Design partner private tenant** at `app.onlinejourno.com` (per platform Y1 pilot) runs the same backbone with real data + narrow PoC validation gate: does the design-partner editor adopt the canonical narrative as a working artifact within 4-6 weeks of backbone v0.1 going live to them?

If narrow PoC fails on the design-partner tenant, v0.1 ships publicly anyway (community + contributors + future customers still see the scope), but the editor-adoption track triggers a v0.2 redesign of canonical-narrative UX before module-set-2 build starts.

## Consequences

- **Y2 build effort revises from ~234 hr to ~394 hr.** Calendar pushes from 12-15 wk to 22-26 wk. ADR 0039 Precondition C (schedule stretch) becomes the default path; ADR 0007 updated to reflect.
- **Public flip is the milestone.** All hard-refusal conditions and preconditions in ADR 0007 + ADR 0010 must clear before Wk 100 flip.
- **Community ramp is real labour from Wk 100.** ADR 0009 codifies the contract that prevents low-quality PRs from consuming founder bandwidth beyond the 1 hr/wk review cap.
- **Demo tenant data must be fictional.** Real publisher names / journalist names / beat sources cannot appear. ADR specifies the fictional newsroom; spec in `docs/DEMO-TENANT-SPEC.md`.
- **Backbone is production-grade, not toy.** RLS, eval harness, cost telemetry, RBAC, agent runtime registration — all wired to the same standard as platform Y1. No shortcuts that would embarrass at public flip.
- **One CMS adapter at flip; rest are community work.** Adapter contract proven by WP; community contributes the rest under that contract. Indian newsroom CMSes (Méthode, Cue, Quantum) remain Y4+ paid services lane (ADR 0036).
- **Two exemplar modules set the contribution pattern.** `m-narrative-spine` and `m-distribution-fit` (partial) demonstrate Module Contract end-to-end for contributors to model new modules on.

## Anti-patterns refused

- Ship backbone without exemplar modules. Community has no template; PRs fragmented.
- Ship backbone without CMS adapter. Demo lacks integration story; cannot prove companion-mode design.
- Public flip before SECURITY + CONTRIBUTING + CoC. Community comes in cold; founder absorbs scrutiny load without disclaimers.
- Public flip before good-first-issue list ready. Community has no entry point; PRs come from senior contributors only; junior contributors bounce.
- Demo seed data using real publishers. Reputational / legal risk; refusal absolute.
- "v1.0" naming at flip. Conveys feature-completeness; v0.1 is honest.
- Skip narrow PoC validation track. Public demo can succeed marketing-wise while failing editorial-wise; both tracks required.

## Revisit

- After Wk 100 public flip — review whether scope split (backbone vs feature) needs adjustment based on actual contributor pipeline.
- If Precondition A or B activates before Wk 60, scope can expand to include one additional exemplar module from the Y3 list (e.g., `m-post-publish-diagnostic`); revisit at that point.
- If narrow PoC fails on design-partner tenant after backbone is live to them, v0.2 redesigns canonical-narrative UX before any module-set-2 work starts; that triggers ADR amendment.
- If community PR throughput exceeds 1 hr/wk review cap sustainably (≥8 weeks above cap), revisit ADR 0026 sustainability rules.

## References

- ADR 0030 (merge decision) (relation to platform), ADR 0006 (AI-surface watch-trigger), ADR 0007 (sustainability preconditions)
- ADR 0032 (good-first-issue contract), ADR 0010 (public-flip preconditions)
- Xtnd `docs/INTEGRATION-SPEC.md` (schema and module contract specifics)
- Xtnd `docs/DEMO-TENANT-SPEC.md` (fictional newsroom)
- Xtnd `ROADMAP.md` (revised Y2 schedule)
- Platform ADR 0006 (module plugin architecture)
- Platform ADR 0026 (indie sustainability rules)
- Platform `docs/MVP-SCOPE.md` (Y1 success criteria — must clear before backbone build starts per ADR 0007)
