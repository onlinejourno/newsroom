# onlinejourno-ingest

Python ingestion library. Collectors pull editorial signals from external
sources (RSS, sitemaps, homepages, regulator portals) and write them to the
shared Postgres database.

This package is workspace-internal; runtime is the OnlineJourno worker
process (see `apps/worker/`). Run it ad-hoc from a developer machine via
the CLI:

```bash
# from repo root, after Postgres is set up and migrations are applied
cd packages/ingest-py
uv pip install -e .
onlinejourno-ingest collect --tenant self --beat markets-regulatory
```

## Conventions

- Multi-tenant: every public function takes `tenant_id` and never reads or
  writes another tenant's data (ADR 0005).
- `FetchError` on unrecoverable failure; never silent `[]` (ADR 0011, ported
  from discover-dashboard AD-005).
- Construction-time config: collectors accept their tuning at `__init__`,
  not on `fetch()` (ADR 0010 / AD-003).
- Domain types past the fetcher seam: `Signal` dataclass, never raw
  `feedparser` entries (ADR 0012 / AD-009).
- No bare hex / px / hardcoded magic numbers; named constants only.

## Layout

```
src/onlinejourno_ingest/
├── __init__.py
├── db.py                       # Postgres connection, run lifecycle, signal upsert
├── protocols.py                # Signal dataclass, FetchError, Collector protocol
├── collectors/
│   ├── __init__.py
│   ├── base.py                 # Shared HTTP session, user agent, helpers
│   └── rss.py                  # RSS / Atom collector
└── cli.py                      # Command-line entry point
```

## Environment

Reads `.env` (via `python-dotenv`) for `DATABASE_URL`. Example:

```
DATABASE_URL=postgres://localhost:5432/onlinejourno_dev
```

## License

Proprietary — All Rights Reserved. See repo-root `LICENSE.md`.
