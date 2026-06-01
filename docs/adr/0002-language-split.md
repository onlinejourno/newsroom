# ADR 0002 — Language split: TypeScript + Python

**Status:** Accepted (2026-06-01).

## Context

Existing reusable code is split:
- News-intel collectors, framing coder, validation: Python.
- Discover-dashboard scorers and data fetchers: Python.
- Editorial-intelligence-demo UI: TypeScript / Next.js.

Rewriting all Python to TypeScript wastes proven, validated work. Rewriting the demo UI to Python is worse (Streamlit is a wrong fit for B2B SaaS).

## Decision

Two languages, single repo, clear boundary:

| Surface | Language | Reason |
|---------|----------|--------|
| Web app (UX + admin) | TypeScript / Next.js | Modern UI, agent SDK affinity, journalist UX requires polish |
| Spine (auth, tenancy, agent runtime) | TypeScript | Co-located with web; Claude Agent SDK best support |
| Modules — UI/agent surfaces | TypeScript | Same |
| Workers (collectors, scorers, jobs) | Python | Existing code, scraping + ML lib ecosystem |
| Shared scoring lib | Python | Existing | 
| Shared ingestion lib | Python | Existing |

Cross-language IPC: **HTTP + Postgres only.** No shared in-process state. Workers and web both talk to Postgres; web invokes worker jobs over an internal HTTP API or via a `jobs` table polled by the worker.

## Consequences

- Solo founder maintains both languages. Mitigated by Claude Code assistance and the clear boundary.
- One CI must run both Node and Python test suites.
- No tRPC across the boundary — boundary is REST/HTTP.
- Future contributors must be at least bilingual or restrict to one app surface.
