# DEPLOY — go-live runbook (Fly.io, `app.onlinejourno.com`)

- **Date:** 2026-06-16
- **Status:** **Not yet release-ready.** Fly scaffolding exists; the branch is build-green; several production gaps remain (below). Roadmap target for the design-partner editor pilot is **Wk 8** (WK0-PLAN). Today ≈ Wk 2.
- **App:** `onlinejourno-platform` (Fly, primary region `sin`; switch to `bom`/Mumbai when capacity returns — `fly.toml`).

## Readiness verdict

The committed branch **builds green** (`next build` ✅, after `dd4a7df`) and all Python suites pass (ingest 27 / agents 99 / scoring 49). `main` → branch is a clean fast-forward (0 divergence). But it is **not** production-ready until the gaps below close.

## Blocking gaps (close before pilot)

| # | Gap | Fix |
|---|-----|-----|
| 1 | **Image is Node-only**; web shells `uv run` for `analyze-url` + audit (`apps/web/lib/analyze.ts`, `seoAudit.ts`) | Either (a) add `uv`+Python+the packages to `Dockerfile` (fat image), (b) split the audit into its own Fly machine the web calls over HTTP, or (c) disable Analyze/audit for v1. **Decision needed.** |
| 2 | **No DB migration on deploy** — 20 SQL migrations applied manually | Add a `[deploy] release_command` to `fly.toml` that runs the migrations against the prod DB, or a documented one-shot migrate step. |
| 3 | **Python pipeline not deployed** (collect / enrich / score / hydrate / trends / alerts) | Add a Fly **scheduled-machines / cron** process (or a worker process group) that runs the CLIs. Without it the UI has no live data (seeds only). |
| 4 | **Auth is demo** — `DEMO_SIGNIN` person-picker + a pre-filled `admin12345` | In prod: **leave `DEMO_SIGNIN` unset**, set a strong `AUTH_SECRET`, create the real design-partner account. |
| 5 | **Branch unconsolidated** — work lives on `slice/ia-realignment`, `main` is behind; a concurrent actor's IA realignment is mid-flight | Once the actor finishes + commits, FF `main` to the green tip; deploy from `main`. |
| 6 | **Secrets/DB not provisioned on Fly** | Provision Fly Postgres (or external) + `fly secrets set` (table below). |

## Secrets (`fly secrets set`)

Never in `fly.toml`. From `.env.example`, grouped by need:

**Web app (boot):** `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL=https://app.onlinejourno.com`, `NEXT_PUBLIC_APP_URL=https://app.onlinejourno.com`, `NEXT_PUBLIC_PRODUCT_NAME`. Do **not** set `DEMO_SIGNIN`.

**Audit features (if uv/Python in image):** `LLM_PROVIDER`/`LLM_MODEL`/`LLM_API_KEY` or `ANTHROPIC_API_KEY` (+ model vars), optionally `KEYWORDS_EVERYWHERE_API_KEY`, PageSpeed key.

**Pipeline (when deployed):** `ANTHROPIC_API_KEY` (enrich/claim-extract), `DATA_GOV_IN_KEY`, `NTFY_TOPIC` (alerts), `S3_ENDPOINT`/`S3_BUCKET`/`S3_ACCESS_KEY`/`S3_SECRET_KEY`/`S3_REGION` (archive).

## Deploy runbook (once gaps close)

1. **Consolidate:** actor finishes IA → FF `main` to the green tip → deploy from `main`. Re-verify `pnpm --filter @onlinejourno/web build` is green.
2. **Provision DB:** `fly postgres create` (region `sin`/`bom`) → attach → capture `DATABASE_URL`.
3. **Migrate + seed:** apply `infra/migrations/*.sql` in order to the prod DB; seed only what the pilot needs (`infra/seeds/primary_sources.sql`; **not** the demo/test seeds).
4. **Secrets:** `fly secrets set` per the table.
5. **Audit decision (gap 1):** ship the chosen option (fat image / HTTP split / disabled).
6. **Deploy:** `fly deploy` (builds `Dockerfile`).
7. **Smoke:** `GET /api/health` 200; real login works (demo OFF); a DB-backed page renders; if audit shipped, run one `analyze-url` (it degrades gracefully on a Cloudflare block — `cmd_analyze_url`).
8. **Pipeline (gap 3):** deploy the scheduled CLIs; confirm a `collect` populates signals.
9. **Cost guard:** confirm the Fly **hard ₹2,000 spend cap** (WK0) + `auto_stop_machines=suspend`, `min_machines_running=0` (scale-to-zero, already in `fly.toml`).

## Open decisions (resolve before pilot)

- **Audit execution model** (gap 1) — fat image vs HTTP-split vs disabled-for-v1.
- **Pipeline scheduling** (gap 3) — Fly scheduled machines vs a worker process vs external cron.
- **Migration automation** (gap 2) — `release_command` vs manual.
- **Backups + observability** — Postgres backup cadence; where logs/metrics go.

## Sequence to Wk-8 pilot

Consolidate `main` → resolve gaps 1–3 (the architectural ones) → provision + secrets + migrate → first deploy (smoke) → wire pipeline → real auth + partner account → backups/observability → invite the design-partner editor.
