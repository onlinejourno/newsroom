# ADR 0005 — Multi-tenancy: row-level

**Status:** Accepted (2026-06-01).

## Context

Multiple newsrooms (tenants) share one platform. Per-tenant isolation can be: schema-per-tenant, database-per-tenant, or row-level with `tenant_id`.

## Decision

**Row-level multi-tenancy.** Every domain table has a non-null `tenant_id` column. Application-layer middleware injects `tenant_id` filters on every query.

Layered safety:

1. Application middleware adds `tenant_id` to every WHERE clause.
2. Postgres row-level security (RLS) policies enforce isolation at the database layer.
3. Audit log (`tenant_audit`) records every cross-tenant attempt.

## Consequences

- Single migration, single schema, easy refactors.
- Cross-tenant aggregation (admin views) is one query, not a fan-out.
- Per-tenant rollback (e.g., a customer requesting a snapshot) requires a per-tenant export job, not just dropping a schema.
- Forgetting `tenant_id` in a new query is the highest-severity bug class — RLS is the safety net.

## Revisit

If a single customer exceeds 30% of total platform load, consider giving them a dedicated database for performance isolation. Y2+ concern.
