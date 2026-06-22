# Self-hosting OnlineJourno

Run your own OnlineJourno — web + Postgres, plus an optional enrichment worker — with Docker
Compose. A platform by journalists, for journalists; your data stays on your infrastructure.

## Prerequisites

- Docker + the Docker Compose plugin (Docker Desktop, or Docker Engine + `docker compose`).

## Quick start

```bash
cp .env.example .env
# set a session secret in .env:
#   AUTH_SECRET=<paste `openssl rand -hex 32`>
docker compose up --build
```

The web app comes up at **http://localhost:3000**. Postgres (with the `pgvector` + `pgcrypto`
extensions) runs alongside, and database migrations apply automatically — the `migrate` service runs
before `web` starts.

## Create your newsroom + first admin

A fresh database is empty, so create your newsroom and an admin login:

```bash
docker compose run --rm \
  -e ADMIN_EMAIL="you@yournewsroom.org" \
  -e ADMIN_PASSWORD="choose-a-strong-password" \
  -e OUTLET_NAME="Your Newsroom" \
  web node apps/web/scripts/bootstrap.mjs
```

Then log in at **http://localhost:3000/en/login**. Nothing is hardcoded to any outlet — your
newsroom name, sources and signals are all yours to configure in the app. (A first-run onboarding
screen will replace this manual step in a later release.)

## Enrichment worker (optional)

The worker collects your sources and runs the enrichment pipeline (classification, framing, calendar
extraction, trends). It needs an LLM key — add one to `.env`:

```bash
ANTHROPIC_API_KEY=sk-ant-...     # or an OpenAI-compatible provider — see .env.example
```

Run one pipeline cycle:

```bash
docker compose --profile worker run --rm worker
```

Schedule it from your host's cron (e.g. hourly) for continuous enrichment. The web app works fine
without the worker — you simply won't get fresh signals.

## Data, config, upgrades

- Postgres data persists in the `pgdata` Docker volume. `docker compose down` keeps it;
  `docker compose down -v` deletes it.
- Add and toggle sources/signals per newsroom from the admin surfaces in the app.
- Upgrade with `git pull && docker compose up --build` — migrations re-apply automatically.

## Ports & configuration

- `WEB_PORT` (default 3000), `DB_PORT` (default 5432), `POSTGRES_PASSWORD` — override in `.env`.
- `.env.example` documents every option: the LLM provider (Anthropic, any OpenAI-compatible
  endpoint, or self-hosted Ollama/vLLM), Keywords Everywhere, cookieless analytics, and storage.

## Bring your own LLM

OnlineJourno is provider-neutral. Point it at Anthropic, an OpenAI-compatible endpoint
(OpenRouter → Gemini/Mistral/Llama…), or a self-hosted Ollama/vLLM for a no-Big-Tech deployment —
see the LLM section of `.env.example`.
