# Wk 0 Plan — Mon Jun 1 → Fri Jun 5

Hard cap: Fri Jun 5 18:00 IST. Saturday is review-only. Monday Jun 8 = Wk 1 build starts whether or not every doc is finished.

## Day-by-day

### Mon Jun 1 — Read + classify
- [ ] Read `~/Desktop/eip-handover.zip → premortem.md` (25 KB)
- [ ] Skim `~/projects/journalism agents/docs/`:
  - [x] `founder_honest_assessment.md`
  - [ ] `hindu_implementation_priority.md`
  - [ ] `integrated_vision_complete.md`
  - [ ] `onlinejournalism_platform_rethink.md`
  - [ ] `newsroom_agentic_stack_toolkit.md`
- [ ] Skim `~/Data Protection/discover-dashboard/CLAUDE.md` and `CONTEXT.md`
- [ ] Capture notes in `.scratch/wk0-reading-notes.md`

### Tue Jun 2 — Asset ledger
- [ ] Walk each existing project; per file or dir, tag REUSE / REWRITE / REFERENCE / RETIRE
- [ ] Flag risky deps (heavy ML, niche libs, deprecated APIs)
- [ ] Fill `docs/WK0-LEDGER.md`

### Wed Jun 3 — Repo + license + IP
- [ ] Push `onlinejourno/platform` to GitHub (private)
- [ ] Confirm `LICENSE.md` and `IP-PROVENANCE.md` stub
- [ ] Decide module open-source plan (deferred; private Y1, modules MIT Y2+)
- [ ] Domain DNS pointed (`onlinejourno.com` → placeholder page or Vercel)

### Thu Jun 4 — Schema + MVP scope
- [ ] Refine `infra/schema.sql` after reading news-intel + EIP schemas
- [ ] Lock tenancy model (row-level `tenant_id`)
- [ ] Fill `docs/MVP-SCOPE.md` — markets/regulatory beat, source list, success criteria

### Fri Jun 5 — Design partner + reconcile
- [ ] List 3 warm-network publishers for markets/regulatory pilot
- [ ] Draft personalized outreach for each (1 paragraph)
- [ ] Cross-check Wk 0 docs against premortem; fill `docs/PREMORTEM-RECONCILIATION.md`
- [ ] End-of-week review; capture any slipped items into Wk 1 backlog

### Sat–Sun — Buffer (review only)

## Wk 0 deliverables checklist

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | `docs/WK0-LEDGER.md` filled | pending |
| 2 | `docs/PREMORTEM-RECONCILIATION.md` filled | pending |
| 3 | `docs/BRAND-DECISION.md` filled | DONE |
| 4 | `infra/schema.sql` draft | pending |
| 5 | `docs/MVP-SCOPE.md` filled | pending |
| 6 | `docs/DESIGN-PARTNER-SHORTLIST.md` filled | pending |
| A | Empty repo created, named, licensed | DONE (local) |
| B | Repo pushed to GitHub | pending |
| C | Domain `onlinejourno.com` reserved | DONE |

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
