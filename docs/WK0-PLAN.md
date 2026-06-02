# Wk 0 Plan — Mon Jun 1 → Fri Jun 5

Hard cap: Fri Jun 5 18:00 IST. Saturday is review-only. Monday Jun 8 = Wk 1 build starts whether or not every doc is finished.

## Day-by-day

### Mon Jun 1 — Read + classify
- [x] Read `~/Desktop/eip-handover.zip → premortem.md` (267 lines, 18 failure modes)
- [x] Skim `~/projects/journalism agents/docs/`:
  - [x] `founder_honest_assessment.md`
  - [x] `hindu_implementation_priority.md`
  - [x] `integrated_vision_complete.md`
  - [x] `onlinejournalism_platform_rethink.md`
  - [x] `newsroom_agentic_stack_toolkit.md`
- [x] Skim `~/Data Protection/discover-dashboard/CLAUDE.md` and `CONTEXT.md`
- [x] Capture notes in `docs/notes/wk0-mon-reading.md`

**Mon outcome:** five plan additions surfaced (cost simulator, portal-health module, doc-first discipline, adapter-contract ADR, module auto-deactivation). Six discover-dashboard ADRs to harvest. See `docs/notes/wk0-mon-reading.md`.

### Tue Jun 2 — Asset ledger
- [x] Walk each existing project; per file or dir, tag REUSE / REWRITE / REFERENCE / RETIRE
- [x] Flag risky deps (heavy ML, niche libs, deprecated APIs)
- [x] Fill `docs/WK0-LEDGER.md`

**Tue outcome:** ~300 files inventoried across 8 locations. ~80 REUSE, ~12 REWRITE, ~120 REFERENCE, ~25 RETIRE, ~5 CONFIDENTIAL (do not carry), ~21 IGNORE (Goldrush — different product category, founder decision). 10 additional ADRs surfaced (0007–0016) — 6 are direct ports from discover-dashboard, 4 new (adapter contracts, module deactivation, plug-in registry extensibility, two-tier fetch). Five open questions for Fri reconcile.

### Wed Jun 3 — Repo + license + IP
- [x] Push `onlinejourno/platform` to GitHub (private) — done Mon
- [x] Confirm `LICENSE.md` and `IP-PROVENANCE.md` stub
- [x] Decide module open-source plan — deferred; private Y1, modules MIT Y2+ (recorded in BRAND-DECISION)
- [x] Domain DNS pointed — `onlinejourno.com` live on Bluehost.in WordPress; GoDaddy nameservers set to `ns1.bluehost.com` / `ns2.bluehost.com`
- [x] Fly.io account created (Wk 1 will reserve `onlinejourno-platform` app name + set hard ₹2,000 spend cap)

**Wed outcome:** marketing surface live at `onlinejourno.com`. Hosting strategy locked in BRAND-DECISION: WordPress on Bluehost for marketing, Fly.io PAYG Mumbai (BOM) for product (Y1 ~₹250-2,500/mo). Subdomain reservation plan for `app.`, `api.`, `docs.`, `status.` documented.

### Thu Jun 4 — Schema + MVP scope
- [x] Refine `infra/schema.sql` — added `tenants.primary_locale` / `supported_locales` / `data_residency`, `users.locale`, `briefs.locale`, `beats.locale`, `sources.expected_languages` / `last_seen_at` / `consecutive_failures`, `portal_health_alerts` table, `eval_gates` table
- [x] Lock tenancy model (row-level `tenant_id`) — ADR 0005 locked
- [x] Fill `docs/MVP-SCOPE.md` — markets/regulatory wedge, 25 sources, two-agent architecture, success criteria, free-pilot framing, multilingual posture

### Fri Jun 5 — Design partner + reconcile
- [ ] List 3 warm-network publishers for markets/regulatory pilot — TEMPLATE in place; **needs founder input**
- [ ] Draft personalized outreach for each (1 paragraph) — blocked on above
- [x] Cross-check Wk 0 docs against premortem; fill `docs/PREMORTEM-RECONCILIATION.md` — 18 EIP failure modes mapped: 8 addressed, 4 partial, 6 N/A, 0 unaddressed
- [ ] End-of-week review; capture any slipped items into Wk 1 backlog

### Sat–Sun — Buffer (review only)

## Wk 0 deliverables checklist

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | `docs/WK0-LEDGER.md` filled | DONE Tue |
| 2 | `docs/PREMORTEM-RECONCILIATION.md` filled | DONE Wed compressed |
| 3 | `docs/BRAND-DECISION.md` filled | DONE Mon, expanded Wed |
| 4 | `infra/schema.sql` draft | DONE Wed compressed |
| 5 | `docs/MVP-SCOPE.md` filled | DONE Wed compressed |
| 6 | `docs/DESIGN-PARTNER-SHORTLIST.md` filled | TEMPLATE shipped; founder fills 3 candidate names + outreach Mon Jun 8 |
| A | Empty repo created, named, licensed | DONE Mon |
| B | Repo pushed to GitHub | DONE Mon |
| C | Domain `onlinejourno.com` reserved + live | DONE Wed |
| D | Visual identity locked (ADR 0013, BRAND visual section) | DONE Wed |
| E | License set (Apache 2.0, LICENSE.md + NOTICE) | DONE Wed compressed |
| F | ADRs 0024 (Apache 2.0), 0025 (voluntary contribution), 0026 (sustainability) | DONE Wed compressed |

## Hard rules for Wk 0

1. No production code commits (only scaffolding).
2. No perfect docs — drafts, not artifacts.
3. Fri 18:00 IST = stop. Don't drift into weekend.
4. One decision per session — don't bundle.
5. No new tools evaluated. Existing knowledge only.

## Risks

- **Name paralysis** — resolved (OnlineJourno).
- **Architecture rabbit hole** — schema "good enough," refine via migrations.
- **Reading instead of deciding** — 3 hrs max on each strategy doc.
- **Design partner cold feet** — schedule outreach last (Fri).
- **Premortem demoralizing** — read with "what did I learn?" frame.
