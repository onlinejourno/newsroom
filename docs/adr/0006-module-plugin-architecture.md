# ADR 0006 — Module plugin architecture

**Status:** Accepted (2026-06-01).

## Context

The product must be **plug-and-play per newsroom**. Different newsrooms want different capabilities (some want SEO scoring, some want framing analysis, none want all). Customisation must be config-driven, never code-branching per customer.

## Decision

Each editorial capability lives in `packages/modules/<name>/` and declares a **Module Contract**:

1. **`module.config.ts`** — Zod (or similar) schema for the module's configuration. Validated at newsroom config load time.
2. **`module.lifecycle.ts`** — exported hooks: `onEnable(tenantId, config)`, `onDisable(tenantId)`, `onConfigChange(tenantId, oldConfig, newConfig)`.
3. **`storage/`** — migration files for any tables this module owns. Tables are prefixed with the module name (e.g. `framing_pej_codings`). All tables include `tenant_id`.
4. **`agents/`** — agent definitions the module contributes to the runtime. Each agent declares its model tier, max tool calls, and cost cap.
5. **`ui/`** — React components exposed at well-defined slots (`brief.section`, `signal.detail`, `admin.module-config`). The host app does not import module code directly; it discovers slots through a registry.
6. **`jobs/`** — Python or TS scheduled jobs registered with the worker.
7. **`README.md`** — what the module does, what it depends on, what configuration it needs, what newsroom tier it makes sense for.

A newsroom's `newsroom.yaml` (or DB row) names which modules are enabled and supplies each module's config. The spine reads this at boot, mounts the enabled modules, runs their `onEnable` hooks, and registers their agents and UI slots.

## Consequences

- The host app never branches on customer identity. Per-customer differences are module enable/disable + config.
- New modules ship without touching the spine.
- A module can be deprecated or removed without rewriting customer configurations (it simply unmounts).
- The contract is enforced by TypeScript types and module loading runtime; violation fails at boot, not in production.
- Modules have a non-trivial learning curve compared to plain Next.js routes. Acceptable: the per-customer code-branching alternative is worse.
