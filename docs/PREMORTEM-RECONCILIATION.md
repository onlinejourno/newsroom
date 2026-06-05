# Premortem Reconciliation

Filled Wed Jun 3, 2026.

Source: `~/Desktop/eip-handover.zip → editorial-intelligence-demo/premortem.md` (267 lines, 18 failure modes), digested in `docs/notes/wk0-mon-reading.md`.

For each EIP failure mode, this document states whether the OnlineJourno plan addresses it, and where.

## Failure-mode table

| # | EIP failure mode | Applies to OnlineJourno? | Status in current plan | Where addressed |
|---|------------------|--------------------------|------------------------|-----------------|
| 1 | Adoption stalled at month 6 — reach feedback loop slipped | Yes | **Partial** | MVP-SCOPE bakes editorial trust into success criteria (14-day reject-rate threshold, weekly reasoning-trace use). Brief generation aims to prove daily value within 60 days, not Phase 3. Risk: solo founder cannot match the EIP team's notification cadence — mitigated by free pilot setup where editor commits to 8-week daily use before pilot begins. |
| 2 | Sarvajna integration depth shortfall | No | **N/A** | Hindu-specific. OnlineJourno uses pgvector, not Sarvajna. No third-party-vector-store integration risk. |
| 3 | AI cost overran 2.5× projection | Yes | **Yes** | Shortlist path is structurally limited (no Opus, max 2 tool calls, ADR 0004). Per-newsroom daily cap (₹150 MVP, configurable). Cost simulator commitment (`docs/COST-MODEL.md` planned for Thu work outside MVP build start). Cost telemetry in `agent_traces` table. Eval harness includes cost regression alerts. |
| 4 | Vernacular quality below threshold for some languages | Yes | **Yes** | ADR 0018 (language detection on every signal). ADR 0019 (per-beat language config). ADR 0020 (per-language eval gate before brief launch — no language ships until native-speaker eval clears). MVP-SCOPE ships English only; vernacular ships post-eval. |
| 5 | Editorial culture rejected the fast-lane (auto-publish) | Partial | **Yes (by exclusion)** | OnlineJourno MVP does not include auto-publish, fast-lane, or any pre-publication automation. Brief is editorial assist, not editorial action. Trust ladder explicit in CONTEXT.md. |
| 6 | Govt portal scrapers broke and weren't maintained | Yes | **Yes** | `m-portal-health` module is first-class. `sources.consecutive_failures` + `portal_health_alerts` table surface scraper-rot as **editorial alert** in the brief itself, not silent engineering log. Maintenance labour budget = 4–8 hrs/week explicit in WK0-PLAN's sustainability rules (ADR 0026). |
| 7 | Dhristi port consumed Q2 entirely | Partial | **Yes** | WK0-LEDGER recognises discover-dashboard's `dashboard/app.py` as RETIRE entirely; only the scoring lib and fetchers are REUSE. No 160 KB Streamlit→Next.js port attempted. Modules ship one at a time, not as a bulk port. |
| 8 | Reach loop never closed | Yes | **Yes (by exclusion)** | MVP-SCOPE excludes reach attribution. Editorial-DNA learning loop is data-capture-only Y1, learning agent Y2 (Mon notes #C). Avoids the EIP failure pattern of building learning before evidence the upstream loop works. |
| 9 | Talent attrition mid-project | Partial | **Yes** | Solo founder; no team to attrit. Documentation discipline from Wk 1 (CLAUDE.md rule 6). ADR 0026 sustainability rules prevent founder burnout (the solo-equivalent failure mode). |
| 10 | Legal exposure on personal uploads | Yes | **Yes (by exclusion)** | MVP-SCOPE excludes all user uploads except style guides (which are documents the newsroom already owns). Reporter notes, drafts, leaks, RTI documents — all out of scope for Y1. Defer legal opinion to before any such feature ships. |
| 11 | Cue / Geneea vendor capacity cap | No | **N/A / By choice** | OnlineJourno does not depend on Geneea (ADR 0024 LEDGER decision: defer Wk 9+). No Cue CMS integration in MVP. Vendor risk surface materially smaller. |
| 12 | Capability creep without product owner | Yes | **Yes** | Module auto-deactivation rule (ADR 0008, planned). Solo founder = single product owner by default. ADR 0026 explicitly refuses scope creep. MVP-SCOPE has verbatim out-of-scope statement. |
| 13 | Trust-score model for fast lane never agreed | No | **N/A** | No fast-lane / trust-score / auto-publish concept in OnlineJourno MVP. |
| 14 | Editor (top sponsor) turnover at customer | Yes | **Partial** | DESIGN-PARTNER-SHORTLIST criteria include "champion identification beyond signer" and "30-minute visible value to incoming editor." Recovery plan: design partner contract names a backup champion at signing. Cannot fully prevent customer-side change of management. |
| 15 | Digital Editor (donor) exits with no successor | No | **N/A** | OnlineJourno has no donor; the founder is the operational owner. |
| 16 | Handover sprint incomplete on donor exit day | No | **N/A** | No handover; the founder operates the project. |
| 17 | Adopted third-party dependency goes unmaintained | Yes | **Yes** | ADR 0007 (adapter contracts on every external dependency, planned). Every dep must be wrapped in a typed adapter so swapping is days, not months. IP-PROVENANCE annual maintenance audit. Refuses GPL deps in core (ADR 0024) limits the surface. |
| 18 | Editor's monthly town-hall slot delegated | No | **N/A** | OnlineJourno has no required customer-side cultural ritual. Engagement is bilateral and customer-paced, not founder-mandated. |

## Summary by status

| Status | Count | Failure modes |
|--------|-------|---------------|
| **Yes — directly addressed** | 8 | #3, #4, #5, #6, #8, #10, #12, #17 |
| **Partial — partly addressed, residual risk acknowledged** | 4 | #1, #7, #9, #14 |
| **N/A — Hindu / EIP-specific, not applicable** | 6 | #2, #11, #13, #15, #16, #18 |
| **No — accepted as live risk** | 0 | — |

## Net assessment

The current plan answers every cross-cutting EIP failure mode either directly or with explicit acceptance of residual risk. The Hindu-specific failure modes (donor exit, Sarvajna, Cue, town-hall ritual) do not apply because OnlineJourno is a different operating shape: solo founder, no large customer org dependency, no in-house vector store.

The four residual risks (adoption stall, port time, founder attrition equivalent, customer editor turnover) are real and not eliminable. Each has a stated mitigation; none warrants delaying Wk 1 build.

## Plan changes triggered by reconciliation

The reconciliation did not surface any new failure mode requiring a plan change beyond what was already captured in Mon reading notes and the ADR queue (0007 adapters, 0008 module auto-deactivation, 0017 IA templates, 0018-0023 multilingual stack). All five "plan additions" from Mon notes are reflected in MVP-SCOPE, schema, and ADRs.

The reconciliation confirms — does not contradict — the decision to:

1. Ship English-only briefs in MVP, multilingual deferred to post-eval.
2. Carve scraper rot as a first-class module (`m-portal-health`) not an engineering side concern.
3. Use the editor's hand-labelled goldset as the eval set from Day 1.
4. Exclude all auto-publish, drafting, and personal-upload features from Y1.
5. Adopt structural cost discipline (model routing, depth caps, daily caps) rather than relying on operator discipline.

## What this document does not cover

The premortem was written for a large multi-newsroom, multi-language project with a 40-lakh budget and team of engineers. Several of its failure modes scale down trivially or vanish entirely at the indie-OSS-sustainable scale OnlineJourno is operating at. This reconciliation does not attempt to manufacture analogues for failure modes that do not have a meaningful indie-scale parallel.

A separate reconciliation will be needed when (if) the project moves beyond solo operation or beyond a single design partner. The mechanism above (table format, per-mode mitigation citation) is reusable.

---

## Xtnd-tier failure-mode appendix (added 2026-06-05 via ADR 0030)

The Xtnd capability tier (Y2+ build per ADR 0031) introduces its own failure-mode surface beyond the MVP-tier risks above. The table below applies the same per-mode mitigation pattern.

| # | Failure mode (Xtnd-tier) | Status in current plan | Where addressed |
|---|--------------------------|------------------------|------------------|
| X1 | Xtnd-tier scope creep contaminates MVP-tier Y1 | **Yes** | Module-plugin architecture (ADR 0006) keeps Xtnd-tier modules disabled at MVP launch. ADR 0030 records that one-repo merge does not weaken this guard — module-tier metadata in README + ROADMAP.md keeps the tier distinction legible without contaminating MVP. |
| X2 | Solo founder cannot ship Y2 capability-tier release | **Partial** | ADR 0039 names sustainability preconditions (Precondition A — ARR; B — co-founder; C — schedule stretch as default). v0.1 effort ~394 hr; calendar 22-26 wk; Y2 stretches to 18-22 mo unless A or B activates. |
| X3 | Identity drift — Xtnd-tier becomes "workflow tool" not "intelligence layer" | **Yes** | `docs/BRAND-DECISION.md` Xtnd-tier identity guardrails; refusal pattern documented. Quarterly review against tagline anchor "Give every story a fair chance." |
| X4 | First CMS read adapter (WordPress) takes longer than estimate | **Yes (by exclusion)** | Adapter contract per ADR 0007 wrapper rule. Supported topology explicitly: vanilla WP + Gutenberg + Yoast SEO + standard taxonomies. Refuse to onboard newsrooms with bespoke plugin stacks Y2. |
| X5 | Distribution-fit predictions wrong; reporter trust collapses | **Yes** | Eval set Day 1; F1 threshold (≥0.65 to start, ≥0.75 by Wk 4); replay harness on every prompt change; reasoning trace on every cue; per-tenant per-surface gates. |
| X6 | Desk surface adoption fails — editors reject decision-support framing | **Yes** | ADR 0035 lock — decision-support, never decision-making. Frame in onboarding: "we show signals, you decide." Placement support opt-in toggle Y2. |
| X7 | Commission router floods teams; commissions ignored | **Yes** | Editor-confirmation required before commission posts. Per-team weekly budget configurable. Auto-throttle when team acceptance drops below 30%. |
| X8 | Mobile PWA iOS install friction kills reporter adoption | **Partial** | PWA Y2 is "good enough" floor; native React Native / Capacitor Y3 if friction real. Test on iOS Safari before declaring acceptable. iOS PWA UX is hostile; native may be required earlier. |
| X9 | CMS read adapter mis-maps draft semantics (e.g., scheduled-but-not-live confused with published) | **Yes** | Adapter test fixtures cover state edge cases. Design partner reviews mapping before turn-on. Adapter version pinning; explicit changelog when mapping changes. |
| X10 | Fair-chance audit politicised internally; attacks editors | **Yes** | Audit shows patterns at desk-shift / week / month — not individual editor attribution. Onboarding doc frames audit as systemic, not individual. |
| X11 | Y2 design partner uses a CMS the WP-adapter cannot serve | **Yes** | Y2 first-adapter decision (WordPress assumed) reviewed at end of MVP Y1 against actual customer base. If Y1 partner uses Ghost and Y2 prospects mostly WP, WP wins. If both differ, adapter decision delayed Y2 H2; Y2 effort goes to desk + PWA + mobile. |
| X12 | Trust ladder regression — Xtnd-tier bugs erode MVP-tier trust | **Yes** | Xtnd-tier modules behind opt-in toggle per tenant. Eval thresholds before turn-on per module. Per-module rollback path (disable Xtnd-tier module without losing MVP brief). |
| X13 | Apache 2.0 + Indian newsroom-tech competitor adopts + rebrands | **Yes (accepted)** | ADR 0024 already accepts this risk. Trademark + maintainer authenticity + community trust are the defence. Xtnd-tier inherits same posture. |
| X14 | CMS write adapter (Y4+) becomes the demand; companion-mode rejected | **Yes** | Companion-mode locked Y1-3 by ADR 0036. Customer pressure documented; ≥3 design partners hard-block on head-mode triggers ADR revision (high bar). Plan-B revenue from MVP-tier customers. |
| X15 | AI surface (MCP, AI answer cards) standardises before Y3; Xtnd-tier misses window | **Yes** | ADR 0038 watch-trigger. If ≥3 major Indian outlets ship MCP feeds OR Google/Anthropic ship MCP-feed indexing, accelerate Y3 → Y2 H2. Quarterly checklist. |
| X16 | CMS vendor (Naviga, Atex, Méthode owner) restricts API access mid-Y3 | **Yes** | Adapter contract per ADR 0007 — every adapter wrapped; swap path days not months. Customer notified per CHANGELOG. |
| X17 | Founder solo-burnout from one product, two tiers, plus MVP customer pilot | **Partial** | ADR 0039 sustainability preconditions before Y2 build start. Quarterly review of cumulative hours. ADR 0026 annual recharge week. Single-repo (post-merge) makes governance load lower than two-repo would have. |
| X18 | Editorial DNA leakage via Xtnd-tier cross-role surfaces | **Yes** | Per-role visibility rules in `tenants.config -> 'modules'`. Default: rejection reasons private to reporter + editor (not whole desk). Opt-in to share. |

## Summary by status (Xtnd-tier)

| Status | Count | Failure modes |
|--------|-------|---------------|
| Yes — directly addressed | 13 | X1, X3, X4, X5, X6, X7, X9, X10, X11, X12, X14, X15, X16, X18 |
| Partial — partly addressed, residual risk acknowledged | 4 | X2, X8, X17 |
| Yes — accepted as live risk | 1 | X13 |

## Plan changes triggered by Xtnd-tier reconciliation

All Xtnd-tier mitigations reflected in:

- New ADRs 0031-0039 (capability-tier release strategy, GFI contract, launch preconditions, roles + surfaces, decision-support, CMS adapter read-only, module naming, AI-surface watch-trigger, sustainability preconditions).
- `docs/MARKETING-SITE-SPEC.md` (identity guardrails).
- `docs/QUARTERLY-REVIEW-template.md` (preconditions + watch-trigger + premortem-follow-up review per quarter).
- `docs/DEMO-TENANT-SPEC.md` (fictional newsroom; no real-publisher data risk).

## Revisit

- End of MVP Y1 (binding decision point for Y2 build per ADR 0039).
- After every Xtnd-tier quarter once build begins.
- After any Xtnd-tier-related incident that exposed an unlisted failure mode.
