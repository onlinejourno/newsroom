# ADR 0003 — Single Postgres store

**Status:** Accepted (2026-06-01).

## Context

Existing projects use SQLite (news-intel) and ad-hoc pickles (discover-dashboard). A real multi-tenant product needs durable, shared storage. Solo founder cannot operate multiple data systems.

## Decision

Single Postgres instance is the only persistent store. Includes:

- Relational data: tenants, users, sources, signals, briefs, traces, costs, events.
- Vector search: via `pgvector` in the same Postgres.
- Job queue: `LISTEN/NOTIFY` and a `jobs` table.
- Cache: Postgres tables; no Redis Y1.

## Consequences

- One backup, one migration system, one connection pool.
- Vector queries co-locate with relational queries (joins on tenant_id work cleanly).
- Performance ceiling exists; revisit when a real workload shows the bottleneck. Do not pre-optimise.
- No separate queue server, search server, or cache server in Y1.
