# CLAUDE.md — onlinejourno/platform

Inherits global `~/.claude/CLAUDE.md`. Project-specific rules below take precedence in conflict.

## Project identity

This is **OnlineJourno's Platform** — a multi-tenant editorial intelligence product for newsrooms. Journalist-first, configurable, modular.

- Owner: Subhash Rai (sole proprietor).
- Stage (2026-06-14): Build underway, well past Wk 0. Multi-tenant spine is live — `apps/web` (Next.js, ~22 `[locale]` surfaces), `apps/worker` + `packages/*-py` (Python ingest/scoring/agents), Postgres with 19 migrations. ADRs through 0059. The `m-*` capabilities (framing-pej, probity) currently live inline in `apps/web` and `packages/agents-py`; `packages/modules/` is still an empty scaffold (module-plugin contract per ADR 0006 not yet exercised).
- Web: https://onlinejourno.com

## Code rules

1. **Minimum code that solves the problem.** No speculative abstractions, no future-proofing modules that don't exist yet.
2. **Touch only what you must.** Don't refactor adjacent code while fixing one thing. Surface concerns separately.
3. **Modular monolith.** All code ships from this repo. No microservices unless a real reason emerges.
4. **Two languages, clear boundary.** TypeScript for `apps/web` and `packages/spine` and `packages/modules/*` runtime. Python for `apps/worker`, `packages/scoring-py`, `packages/ingest-py`. Cross-language IPC is HTTP + Postgres only.
5. **Config-driven, not code-driven, customization.** Every per-newsroom difference must be expressible as YAML or a database row. Never hardcode a customer name in source.
6. **Plug-in module contract.** Each module under `packages/modules/` declares: config schema, lifecycle hooks, storage tables, agents, UI surfaces. See `docs/adr/0006-module-plugin-architecture.md`.
7. **Multi-tenant row-level.** Every domain table has `tenant_id`. No schema-per-tenant.
8. **Eval-first.** No new agent or prompt change ships without a replay test against the goldset.
9. **Cost discipline.** Shortlist path: zero Opus, max 2 tool calls. Brief path: Sonnet, max 5. Opus only in thread-resolution agent and only when explicitly budgeted.
10. **Reasoning trace mandatory.** Every agent action logs reasoning + tokens + cost. No silent agent decisions.

## Stack (locked, see ADRs)

- Web: Next.js (App Router) + Tailwind + shadcn
- Workers: Python, uv-managed
- DB: Postgres (Supabase or self-hosted), pgvector for embeddings
- Queue: Postgres LISTEN/NOTIFY (no Kafka, no Redis Y1)
- Agents: Claude Agent SDK (TypeScript)
- Host: Fly.io or Render, India region
- Observability: structured logs to Postgres + simple admin dashboard

## What Claude Code should not do here

- Don't run `git commit` or `git push` unless explicitly asked.
- Don't add new top-level dependencies without an ADR.
- Don't introduce a new programming language, framework, or queue system.
- Don't write speculative tests for code that doesn't exist.
- Don't generate Markdown documentation beyond what's requested.

## Working notes

- `.scratch/` is gitignored. Use for transient working files.
- `docs/adr/` is the canonical record of architectural choices.
- `docs/agents/` describes agent skills used in this repo.

## Agent skills

### Issue tracker

Issues and PRDs live in GitHub Issues (`onlinejourno/platform`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
