# Architecture (Stub)

This stub captures the locked-in shape. Full detail is built up across `docs/adr/`.

## High-level shape

```
                                     ┌──────────────────────────┐
                                     │   apps/web (Next.js)     │
                                     │   - journalist UX        │
                                     │   - admin UI             │
                                     │   - agent runtime (SDK)  │
                                     └────────────┬─────────────┘
                                                  │
                                                  │  HTTP + Postgres
                                                  │
                          ┌───────────────────────┴────────────────────────┐
                          │                                                │
                ┌─────────▼─────────┐                          ┌───────────▼───────────┐
                │   Postgres        │                          │  apps/worker (Python) │
                │   - tenants       │  ←——— LISTEN/NOTIFY ———→ │  - collectors         │
                │   - sources       │                          │  - scorers            │
                │   - signals       │                          │  - scheduled jobs     │
                │   - briefs        │                          └───────────┬───────────┘
                │   - traces        │                                      │
                │   - pgvector      │                                      │
                └───────────────────┘                                      │
                                                                            │
                                                              ┌─────────────▼─────────────┐
                                                              │  External:                │
                                                              │  RSS, sitemaps, APIs,     │
                                                              │  PageSpeed, search probes │
                                                              └───────────────────────────┘
```

## Locked decisions (see ADRs)

- **0001** Monorepo (`apps/`, `packages/`)
- **0002** TypeScript for web + agents; Python for collectors + scorers
- **0003** Single Postgres store (pgvector inside)
- **0004** Claude Agent SDK for agent runtime
- **0005** Multi-tenant row-level (`tenant_id` everywhere)
- **0006** Module plugin architecture (config-driven on/off per newsroom)

## Open architecture questions (resolve before Wk 2)

- Worker job runner: plain cron + Postgres jobs table, or `apscheduler`, or external (Inngest / Modal / Trigger.dev)?
- Web framework for admin UI: same Next.js app as journalist UX, or separate sub-route with stricter RBAC?
- Vector store: pgvector from Day 1, or defer and use simple keyword index in MVP?
- Hosting: Fly.io vs Render vs DigitalOcean App Platform for India region (Mumbai / Bangalore)?
