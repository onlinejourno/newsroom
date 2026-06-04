# OnlineJourno — Platform

Editorial intelligence platform for newsrooms. Source monitoring, framing analysis, story-thread tracking, and AI-assisted editorial brief delivery — built journalist-first, configurable per newsroom.

**Status:** Wk 0 (audit + decisions) complete Thu Jun 4. Wk 1 build starts Mon Jun 8.

**Owner:** Subhash Rai (sole proprietor, OnlineJourno).

**Surfaces (Y1):**
- `https://onlinejourno.com` — marketing site (WordPress on Bluehost), live since Wed Jun 3.
- `https://app.onlinejourno.com` — product UI for the design partner editor (Fly.io BOM), Wk 8 onwards.
- `https://try.onlinejourno.com` — static community playground demo, Wk 12–16 onwards (see `docs/PLAYGROUND-PLAN.md`).
- `https://github.com/onlinejourno/platform` — currently private; flips public Wk 10–12 per `docs/COMMUNITY-LAUNCH-PLAN.md`.
- `https://onlinejournalism.in` — sibling publication (separate brand, same founder, first case study).

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

## Wk 0 status (Mon Jun 1 → Thu Jun 4, complete)

All audit and decision deliverables shipped ahead of the Fri Jun 5 hard cap. See `docs/WK0-PLAN.md` for the day-by-day record. Founder's one remaining Wk 0 task: fill three candidate names in `docs/DESIGN-PARTNER-SHORTLIST.md` and send outreach Mon Jun 8.

Wk 1 vertical slice (pulled forward, complete): one RSS source → ingest → Postgres → minimal Next.js view. Confirmed running locally.

## Local development setup

See `docs/SETUP.md` for the full developer onboarding flow (Postgres 17,
pgvector, uv, Anaconda warning, environment variables, common gotchas).

Quick recap:

```bash
brew install postgresql@17 pgvector uv
brew services start postgresql@17
echo 'export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"' >> ~/.zshrc
exec zsh

git clone https://github.com/onlinejourno/platform.git
cd platform
cp .env.local.example .env
ln -s ../../.env apps/web/.env   # Next.js reads from apps/web/.env

createdb onlinejourno_dev
DATABASE_URL=onlinejourno_dev pnpm db:migrate
DATABASE_URL=onlinejourno_dev pnpm db:seed:dev

pnpm install
pnpm ingest:install
pnpm ingest collect --tenant self --beat markets-regulatory
pnpm dev
# open http://localhost:3000/en/signals
```

## License

Apache License 2.0. See `LICENSE.md` and `NOTICE`.
