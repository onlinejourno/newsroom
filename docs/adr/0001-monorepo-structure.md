# ADR 0001 — Monorepo structure

**Status:** Accepted (2026-06-01).

## Context

OnlineJourno Platform spans two languages (TS web/agents, Python workers/scorers) and several modules. Solo founder. Twelve-month bootstrap horizon.

## Decision

Single monorepo `onlinejourno/platform` with two app surfaces (`apps/web`, `apps/worker`) and shared `packages/` for the spine, modules, and language-specific shared libraries.

```
apps/{web,worker}
packages/{spine,modules,scoring-py,ingest-py}
infra/
docs/
```

## Consequences

- Atomic refactors across modules.
- Single CI, single deploy unit, single issue tracker.
- Workspace tooling required (`pnpm` for Node, `uv` for Python).
- Module split into own repo is deferred and only triggered by a real need (e.g., community open-sourcing).
