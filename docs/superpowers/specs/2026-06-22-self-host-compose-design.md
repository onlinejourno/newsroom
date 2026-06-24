# Design spec — Self-host readiness, slice 1: runnable via Docker Compose

**Status:** Drafted 2026-06-22. First slice of self-host readiness (OSS mission,
[[onlinejourno-oss-mission]]). Goal: `docker compose up` → a running, *usable* OnlineJourno
against a local Postgres. First-run onboarding UI + public-repo/CI are later slices.

## Decision (founder)

Runnable first. Slice 1 = `docker-compose.yml` + `SELF-HOST.md` + a minimal bootstrap so login
works on a fresh DB. No onboarding UI yet (next slice).

## Architecture

Reuse the existing prod build artifacts:
- **web** = `Dockerfile` (Next standalone, port 3000, `CMD node apps/web/server.js`).
- **worker** = `Dockerfile.worker` (python/uv, `ENTRYPOINT bash infra/cron/pipeline-fly.sh`).
- **db** = `pgvector/pgvector:pg16` (0001_init needs `pgcrypto` + `vector`).
- **migrations** = `node apps/web/scripts/migrate.mjs` (the fly release_command), run as a one-shot
  `migrate` service that web depends on (`service_completed_successfully`).

## Files

| File | What |
|---|---|
| `docker-compose.yml` | **NEW** — `db` (pgvector, healthcheck, `pgdata` volume) → `migrate` (one-shot) → `web` (:3000, depends on db healthy + migrate complete); `worker` behind a `worker` profile (opt-in; needs LLM keys). All `DATABASE_URL` point at `db`. `AUTH_SECRET` required (`:?`). |
| `apps/web/scripts/bootstrap.mjs` | **NEW** — standalone (pg + node:crypto, no Next imports): create the first tenant (`tier='self'`) + an `admin`/`approved` user with a scrypt password hash matching `lib/auth.hashPassword` (`salt:scryptSync(pw,salt,64)`). Idempotent (`on conflict`). Reads `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `OUTLET_NAME`, `OUTLET_SLUG`. |
| `SELF-HOST.md` | **NEW** — prereqs (Docker), quickstart (`cp .env.example .env` → set `AUTH_SECRET` → `docker compose up --build` → http://localhost:3000), the bootstrap command, the worker (opt-in profile + scheduling note), data/volume + upgrade notes. |

## Worker

`Dockerfile.worker`'s entrypoint runs one pipeline cycle (collect→enrich→frame→…) then exits — so
it's an opt-in `profile: worker`, run on demand / host-cron (`docker compose run --rm worker`), not a
long-running web dependency. It needs `DATABASE_URL` + LLM keys (`ANTHROPIC_API_KEY` or
OpenAI-compatible). The web runs + renders without it (just no fresh enrichment).

## Testing & success criteria

- `docker compose config` validates (founder runs; no Docker in this authoring env — careful review +
  YAML lint here).
- On the founder's machine: `docker compose up --build` → db migrates → web serves :3000; bootstrap →
  login works; `--profile worker` runs a pipeline cycle.
- No hardcoded outlet — the bootstrap names the newsroom from `OUTLET_NAME` (vendor-neutral,
  [[vendor-neutral-no-hardcoded-outlet]]).

## Out of scope (next slices)

First-run onboarding **UI** (replace the manual bootstrap), public-repo prep (license/secrets-scrub/
CI), worker scheduling baked in, per-tenant `newsroom.yaml` config import.

## References

`Dockerfile`, `Dockerfile.worker`, `fly.toml` (release_command), `apps/web/scripts/migrate.mjs`,
`infra/cron/pipeline-fly.sh`, `infra/migrations/0001_init.sql` (tenants/users), `.env.example`.
