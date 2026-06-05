# Roadmap

**Status**: Drafted Wk 0 of Xtnd (alongside platform Wk 0). All dates are projections; ADR 0007 lists preconditions before any Xtnd build starts.

## Five-year arc

| Year | Focus | Output |
|------|-------|--------|
| Y1 | Platform-only. Xtnd = docs. | This repo; no code. |
| Y2 | **OnlineJourno Xtnd v0.1 — Open Capability-Tier Release** (per ADR 0008). | Backbone production-grade across schema, agent runtime, role surfaces, RLS, deploy. Two exemplar modules fully implemented (`m-narrative-spine`, `m-distribution-fit` partial). One CMS read adapter (`m-cms-read-adapter-wp`). Mobile PWA skeleton. Demo tenant with seed data. Public flip at Wk 100. Good-first-issue list for community. |
| Y3 | Xtnd module set 2. | Post-publish diagnostic, placement support, commission router UI, social scheduler, fair-chance audit dashboard, narrative-coherence advisory rules. |
| Y4 | Optional head mode. | CMS write adapter. Gated on customer pull (per ADR 0004 triggers). |
| Y5 | Federated fair-chance benchmarks. | Cross-newsroom learning, consent-gated. |

## Role × capability matrix

Y indicates the year the capability first ships in production, against the primary role-surface.

| # | Capability | Reporter | Desk | Section editor | Data viz | Video | Audio | Social | Hierarchy |
|---|------------|----------|------|----------------|----------|-------|-------|--------|-----------|
| 1 | Beat signal notifier | Y1 platform |  |  |  |  |  |  |  |
| 2 | Source provenance + reporter's prior cluster | Y1 platform |  |  |  |  |  |  |  |
| 3 | Trend + LLM priming | Y1 platform |  |  |  |  |  |  |  |
| 4 | Multi-modal workflow guide | Y2 | Y2 |  | Y3 | Y3 | Y3 |  |  |
| 5 | Distribution-fit cue pre-publish | Y2 | Y2 |  |  |  |  |  |  |
| 6 | Post-publish diagnostic | Y3 | Y3 | Y3 |  |  |  |  | Y3 |
| 7 | Placement support (homepage/section) |  | Y3 | Y3 |  |  |  |  |  |
| 8 | Commission router (Slack webhook) |  | Y2 |  | Y2 | Y2 | Y2 |  |  |
| 9 | Commission router (dedicated UI) |  | Y3 |  | Y3 | Y3 | Y3 |  |  |
| 10 | Story enhancement auto-suggestions |  | Y3 |  |  |  |  |  |  |
| 11 | Social scheduling + channel-fit cue |  | Y3 |  |  |  |  | Y3 |  |
| 12 | Fair-chance audit |  | Y3 | Y3 |  |  |  |  | Y3 |
| 13 | CMS read adapter (WordPress) | Y2 (sees draft state in brief) | Y2 |  |  |  |  |  |  |
| 14 | CMS read adapter (Ghost) | Y3 | Y3 |  |  |  |  |  |  |
| 15 | CMS read adapter (Méthode / Cue — proprietary) | Y4 if customer pulls | Y4 |  |  |  |  |  |  |
| 16 | CMS write adapter (optional head mode) | Y4 | Y4 | Y4 |  |  |  | Y4 |  |
| 17 | Federated fair-chance benchmarks (consent-gated) |  |  |  |  |  |  |  | Y5 |

## Y2 — OnlineJourno Xtnd v0.1 (Open Capability-Tier Release)

**Earliest start:** Wk 60 of platform timeline (≈Y2 H1).  
**Preconditions:** see ADR 0007 (Precondition C — 18-month stretch — is default for v0.1 scope).  
**Strategy:** see ADR 0008 (Open Capability-Tier Release).  
**Public flip:** see ADR 0010 (Wk 100 target, preconditions-gated).  
**Contributor contract:** see ADR 0009.

| Item | Type | Effort (founder hr) |
|------|------|---------------------|
| Xtnd schema migrations (all tables per `docs/INTEGRATION-SPEC.md`) | Migration | 12 |
| Platform upstream PRs: role enum extension, agent path enum extension | Upstream PR | 4 + platform review |
| All 7 `x-*` module skeletons w/ Module Contract (config, lifecycle, storage, agents, ui, jobs, README) | Module scaffolding | 56 |
| Agent runtime registration for Xtnd agents | Runtime | 6 |
| RLS policies for Xtnd-owned tables | Security | 8 |
| Tenant config namespace `xtnd:` with Zod validation | Config | 8 |
| Auth + RBAC middleware for new roles | Security | 10 |
| Role surface routes stub'd in `apps/web` (desk, mobile PWA root, diagnose, audit, commission, section, canonical narrative) | UI | 40 |
| Demo tenant + seed data (per `docs/DEMO-TENANT-SPEC.md`) | Data | 32 |
| Role switcher in dev mode | UI | 6 |
| **Exemplar module 1: `m-narrative-spine`** (canonical narrative editor + deterministic continuity + governance log) | Module | 40 |
| **Exemplar module 2: `m-distribution-fit`** (Discover image checker + Search keyword analyzer; other surfaces deferred to GFIs) | Module | 40 |
| One CMS read adapter: `m-cms-read-adapter-wp` (vanilla WP + Gutenberg + Yoast) | Module | 40 |
| Mobile PWA skeleton (manifest + service worker + iOS install hint) | UI | 12 |
| Eval harness extended for Xtnd modules + 2 exemplar goldsets | Eval | 16 |
| Deploy to Fly.io alongside platform + `xtnd.onlinejourno.com` CNAME | Ops | 8 |
| Marketing landing page on subdomain (Next.js route) | UI | 12 |
| Public-flip prep: SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, README disclaimer | Docs | 8 |
| Good-first-issue list — 30+ tightly-scoped issues per ADR 0009 | Docs | 24 |
| Per-role demo walkthrough docs | Docs | 12 |
| **Total backbone** | | **~394 hr** |

At 16-20 founder hours/week available for Xtnd alongside platform Y1 maintenance, this is **22-26 calendar weeks** (~5-6 months). Pushes public flip into Wk 100 realistic. Schedule-stretch path (ADR 0007 Precondition C) is default unless Precondition A or B activates earlier.

## Y2 sequencing

| Window | Track | Output |
|--------|-------|--------|
| Wk 52-60 | Xtnd preparation | Lock scope (this section). Decide Precondition A/B/C path. Finalise demo-tenant spec. Begin platform upstream PRs (role enum, agent path enum). |
| Wk 60-72 | Backbone build phase 1 | Schema + module skeletons + role surface stubs. ~180 hr. Internal only. |
| Wk 72-90 | Backbone build phase 2 | Two exemplar modules + WP adapter + mobile PWA + eval harness. ~150 hr. Internal demo accessible to founder + design partner. **Narrow PoC validation runs on design-partner tenant in parallel.** |
| Wk 90-100 | Public-flip prep | Demo seed data + marketing page + SECURITY/CONTRIBUTING/CoC + good-first-issue list + walkthrough docs. ~64 hr. Internal-tested by founder + 1-2 trusted reviewers. |
| **Wk 100** | **Public flip** | All ADR 0010 preconditions confirmed → repo public; demo live; good-first-issues open; v0.1 release tagged. |
| Wk 100+ | Community ramp | 1 hr/wk PR review (ADR 0026). Quarterly releases. Founder ships exemplar features in Y3 module set 2. |

## Y3 — Xtnd module set 2

| Item | Type |
|------|------|
| `m-post-publish-diagnostic` module | Module |
| `m-placement-support` module (decision-support, never autopilot) | Module |
| `m-commission-router` dedicated UI | UI + module |
| `m-social-scheduler` module | Module |
| `m-cms-read-adapter-ghost` module | Module |
| Fair-chance audit dashboard | UI |
| Story enhancement auto-suggestions (chart / video / explainer / map) | Agent |
| Reporter native app (iOS/Android via Capacitor or React Native) | App |
| Customer #3-#5 onboarding for Xtnd modules | Sales |

**Preconditions before Y3 build:** Y2 modules adopted by ≥2 newsrooms with ≥8 weeks production use each. ARR + contributor + co-founder math per ADR 0007.

## Y4+ — optional head mode

**Trigger:** customer-pull signal. ≥3 design partners say *"we want to publish through Xtnd to distribution surfaces, not just inform alongside our CMS."* Until then, head mode stays a roadmap-fenced ambition.

| Item | Type | Notes |
|------|------|-------|
| CMS write adapter (WordPress first) | Module | Customer-pull triggered. Adapter contract per platform ADR 0007. |
| C2PA-style content credentials on publish | Module | Provenance signing at publish time. |
| Multi-surface output renderers (RSS, AMP, AI answer cards, MCP feed) | Module | Each ships as own module. |
| Subscription paywall integration | Module | Read paywall signals + license headers + paywall-gate. |
| AI crawler licensing surface | Module | `ai.txt`, Cloudflare AI gate, Common Crawl opt-out, per-piece license header. Could ship earlier per ADR 0006 watch-trigger. |

## Y5 — federated fair-chance benchmarks

Speculative. Direction: opt-in, consent-gated, cross-newsroom learning that lets a newsroom benchmark its fair-chance audit against an anonymised industry baseline.

Refuses by design:
- Any aggregate that re-identifies per-newsroom editorial choices.
- Any feature that exfiltrates content, briefs, or editorial DNA.
- Any mandatory-upload clause (consistent with platform ADR 0025).

## What is rejected

These are deliberately out of scope, with reasons:

| Rejected idea | Reason |
|---------------|--------|
| Replacing existing newsroom CMS | Premortems #2 and #12 of platform; head mode deferred to Y4+ at earliest. |
| Autopilot placement / scheduling / slotting | Algorithmic-editorial drift. ADR 0003. |
| Mandatory contributor upload | Platform ADR 0025; same principle here. |
| Standalone Xtnd tenancy (no platform install) | Xtnd lives on platform tenancy through Y3. Reduces sales surface, integration risk. |
| Generative drafting at scale | Platform `MVP-SCOPE.md` defers to Wk 25+; Xtnd does not pull this forward. |
| Big-budget native apps Y2 | PWA Y2 is the right size for solo founder; native Y3+. |
| Marketplace plugin SDK Y2 | Platform's plugin SDK ships Y2+; Xtnd does not duplicate. |
| Cross-newsroom analytics without consent gate | Confidentiality promise (platform ADR 0025). |
| Region expansion beyond India Y1-3 | Founder bandwidth; Indian newsroom focus until ARR justifies. |

## Quarterly cadence

Inherits platform ADR 0026 sustainability rules. Major releases of Xtnd quarterly, patch releases as needed for security or material bugs only. No monthly release schedule.

## Revisit

This roadmap is reviewed at the end of every platform quarter. Updates committed under a `CHANGELOG.md` entry. The roadmap is not a deadline schedule; it is a direction statement.
