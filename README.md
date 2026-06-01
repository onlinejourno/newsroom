# OnlineJourno — Platform

Editorial intelligence platform for newsrooms. Source monitoring, framing analysis, story-thread tracking, and AI-assisted editorial brief delivery — built journalist-first, configurable per newsroom.

**Status:** Pre-build. Wk 0 (audit + decisions) in progress.

**Owner:** Subhash Rai (sole proprietor, OnlineJourno).
**Web:** https://onlinejourno.com (product) · https://onlinejournalism.in (publication, first case study)

---

## Repo layout

```
apps/
  web/        # Next.js — journalist UX + admin (TypeScript)
  worker/     # Python workers — collectors + scorers + scheduled jobs

packages/
  spine/      # Auth, tenancy, config loader, agent runtime (TS)
  modules/    # Plug-in modules per editorial capability (TS + Py mix)
  scoring-py/ # Shared Python scoring library
  ingest-py/  # Shared Python ingestion library

infra/        # Postgres schema, migrations, Docker, deploy configs
docs/         # ADRs, plans, ledgers, decisions
.scratch/     # Working notes (gitignored)
```

## Documentation map

- `CONTEXT.md` — domain language and product intent
- `CLAUDE.md` — instructions for Claude Code working in this repo
- `AGENTS.md` — instructions for any AI agent
- `docs/WK0-PLAN.md` — current week's plan
- `docs/adr/` — architecture decision records
- `docs/IP-PROVENANCE.md` — every dep and reused code source, with license
- `docs/CAP-TABLE.md` — ownership snapshot

## Wk 0 deliverables (Mon Jun 1 → Fri Jun 5 EOD)

| # | Doc | Status |
|---|-----|--------|
| 1 | `docs/WK0-LEDGER.md` | template |
| 2 | `docs/PREMORTEM-RECONCILIATION.md` | stub |
| 3 | `docs/BRAND-DECISION.md` | filled |
| 4 | `infra/schema.sql` | draft |
| 5 | `docs/MVP-SCOPE.md` | stub |
| 6 | `docs/DESIGN-PARTNER-SHORTLIST.md` | stub |

No production code commits until Wk 1.

## License

Proprietary. All rights reserved. See `LICENSE.md`.
