# Integration Spec — How Xtnd talks to Platform

This document describes the technical contract between `onlinejourno/xtnd` and `onlinejourno/platform`. It is binding for any Xtnd module that touches platform-owned data.

## Scope

Wk 0 — Y1 H2: this spec is forward-looking. No Xtnd code exists. The spec captures the locked contract so platform Y1 schema decisions do not paint Xtnd into a corner.

## Layers of integration

```
┌────────────────────────────────────────────────────────────────────────────┐
│  Customer's newsroom CMS                                                   │
│  (WordPress / Ghost / Méthode / Cue / custom — outside our codebase)       │
└────────────────────────────────────────────────────────────────────────────┘
                          │
                          │  REST/GraphQL/scrape (read-only Y1-3)
                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Xtnd CMS read adapter modules                                             │
│  (m-cms-read-adapter-wp, m-cms-read-adapter-ghost, ...)                    │
└────────────────────────────────────────────────────────────────────────────┘
                          │
                          │  emits ingest events to platform's signals/briefs pipeline
                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Platform spine (signals, briefs, agent runtime, eval, traces)             │
│  Owned by onlinejourno/platform                                            │
└────────────────────────────────────────────────────────────────────────────┘
                          │
                          │  read access via SDK; write to Xtnd-owned tables
                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Xtnd modules (m-distribution-fit, m-placement-support, m-commission-router)│
│  Read platform tables; write own xtnd_* tables; emit role-surface payloads │
└────────────────────────────────────────────────────────────────────────────┘
                          │
                          │  same-app rendering
                          ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  apps/web (platform) — Xtnd extends with /desk, /m/, /diagnose routes      │
│  apps/desk-web (Xtnd, Y2) — optional separate app for desk surface         │
└────────────────────────────────────────────────────────────────────────────┘
```

## Code-level integration

### Workspace link (Y2 build start)

`/projects/onlinejourno-xtnd/pnpm-workspace.yaml`:

```yaml
packages:
  - "apps/*"
  - "packages/*"
  - "../platform/packages/spine"            # read-only consumption
  - "../platform/packages/modules/*"        # for module-registration types
```

Local development requires both repos cloned side-by-side: `/projects/platform` and `/projects/onlinejourno-xtnd`.

### Published-package mode (Y3+ when contract stable)

Platform publishes the following to GitHub Packages (or npm):

- `@onlinejourno/spine` — agent runtime, tenancy middleware, eval harness types.
- `@onlinejourno/spine-types` — Zod schemas for `Tenant`, `User`, `Beat`, `Source`, `Signal`, `ShortlistItem`, `Brief`, `Thread`.
- `@onlinejourno/modules-types` — module-contract types (per platform ADR 0006).

Xtnd pins versions; updates on platform's quarterly release cadence.

## Schema-level integration

### Read access — platform tables

Xtnd modules read from these platform tables. Read access is enforced by row-level multi-tenancy (platform ADR 0005); Xtnd queries always include `tenant_id` filter via the same middleware.

| Platform table | Xtnd usage |
|----------------|------------|
| `tenants` | Read tenant config; opt-in Xtnd modules read `config -> 'xtnd'` JSON path |
| `users` | Read user role + locale; new roles (`digital_desk`, `section_editor`, ...) ship via platform-side migration (PR upstream first) |
| `beats`, `beat_assignments` | Read beat structure for role-surface filtering |
| `sources` | Read source metadata for provenance display |
| `signals` | Read raw signal text + URL for distribution-fit scoring |
| `shortlist_items` | Read shortlist decisions for post-publish diagnostic correlation |
| `briefs` | Read `briefs.content` JSONB as canonical story object; Xtnd extensions live in adjacent tables, never inside the JSONB |
| `threads`, `thread_links` | Read thread continuity for placement support |
| `agent_traces` | Read trace cost telemetry; Xtnd contributes new traces with `path = 'xtnd_*'` distinct from platform paths |

### Write access — Xtnd-owned tables only

Xtnd never writes to platform-owned tables. New columns / enum values requested go upstream as PR to `onlinejourno/platform`.

Xtnd-owned tables (migrations under `infra/migrations/` in Xtnd repo, run after platform migrations):

```sql
-- Story lifecycle extension (orthogonal to shortlist_items.decision)
create table cap_story_lifecycle (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  brief_id        uuid references briefs(id) on delete cascade,
  signal_id       uuid references signals(id) on delete cascade,  -- for stories that pre-date a brief
  stage           text not null check (stage in ('idea','stub','draft','ready','placed','published','diagnosed')),
  entered_stage_at timestamptz not null default now(),
  entered_by      uuid references users(id),
  notes           text
);
create index on cap_story_lifecycle (tenant_id, stage);
create index on cap_story_lifecycle (tenant_id, brief_id);

-- Distribution-fit scores (one row per story per surface)
create table cap_distribution_fit_scores (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  brief_id        uuid not null references briefs(id) on delete cascade,
  surface         text not null check (surface in ('discover','search','subscription','direct','social','ai_answer','rss','push')),
  score           real not null,                       -- 0..1
  signals         jsonb not null,                       -- structured reasons: missing_image, weak_kicker, ...
  computed_at     timestamptz not null default now(),
  model_version   text not null,
  agent_trace_id  uuid references agent_traces(id) on delete set null
);
create index on cap_distribution_fit_scores (tenant_id, brief_id, surface);

-- Commissions (cross-team work triggered by brief or draft)
create table cap_commissions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  brief_id        uuid references briefs(id) on delete set null,
  target_team     text not null check (target_team in ('data_viz','video','audio','photo','social','explainer','copy_edit')),
  requested_by    uuid references users(id),
  requested_at    timestamptz not null default now(),
  status          text not null default 'pending' check (status in ('pending','accepted','declined','delivered','expired')),
  decided_at      timestamptz,
  decided_by      uuid references users(id),
  brief_text      text not null,
  source_links    text[] not null default '{}',
  due_at          timestamptz,
  delivery_url    text
);
create index on cap_commissions (tenant_id, target_team, status);

-- Placement decision-support records (decision logged; system surfaced signals)
create table cap_placement_states (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  brief_id        uuid not null references briefs(id) on delete cascade,
  slot_target     text not null,                        -- 'homepage_slot_2', 'section_markets_slot_1', ...
  decision        text not null check (decision in ('placed','removed','rotated','rejected')),
  decided_at      timestamptz not null default now(),
  decided_by      uuid references users(id),
  predicted_ctr   real,                                 -- system suggestion at decision time
  predicted_fit_score real,
  decision_notes  text
);

-- Post-publish diagnoses
create table cap_post_publish_diagnoses (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  brief_id        uuid not null references briefs(id) on delete cascade,
  published_url   text not null,
  diagnosed_at    timestamptz not null default now(),
  surfaces_analysed text[] not null default '{}',       -- ['discover','search','direct',...]
  diagnosis       jsonb not null,                       -- structured: { surface: { metric, threshold, verdict, why, fix } }
  agent_trace_id  uuid references agent_traces(id) on delete set null
);

-- Social schedule entries
create table cap_social_schedules (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  brief_id        uuid not null references briefs(id) on delete cascade,
  channel         text not null check (channel in ('x','linkedin','facebook','instagram','threads','bluesky','mastodon','whatsapp','telegram','rss','push')),
  scheduled_at    timestamptz not null,
  status          text not null default 'scheduled' check (status in ('scheduled','sent','cancelled','failed')),
  body            text not null,
  media_url       text,
  scheduled_by    uuid references users(id)
);

-- Fair-chance audit snapshots
create table cap_fair_chance_audits (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenants(id) on delete cascade,
  audit_window_start timestamptz not null,
  audit_window_end timestamptz not null,
  audit_level     text not null check (audit_level in ('shift','week','month','quarter')),
  findings        jsonb not null,                       -- structured patterns; no per-individual attribution
  generated_at    timestamptz not null default now()
);
```

Module-owned tables (per platform ADR 0006) use the `x_<module>_` prefix and live under each module's `storage/` directory:

```
packages/modules/m-distribution-fit/storage/
  001_x_distribution_fit_eval_runs.sql        -- module-specific eval runs
  002_x_distribution_fit_model_versions.sql   -- model deployment log

packages/modules/m-cms-read-adapter-wp/storage/
  001_x_cms_wp_credentials.sql                 -- per-tenant WP REST API credentials (encrypted)
  002_x_cms_wp_draft_cache.sql                 -- cached draft state (TTL'd)
```

### Tenant config — Xtnd namespace

Xtnd config sits under `tenants.config -> 'xtnd'`:

```jsonc
{
  "xtnd": {
    "enabled_modules": [
      "m-distribution-fit",
      "m-cms-read-adapter-wp",
      "m-commission-router"
    ],
    "cms_read_adapter": {
      "kind": "wordpress",
      "rest_endpoint": "https://example-newsroom.com/wp-json/wp/v2",
      "credentials_secret_ref": "kms:xtnd-wp-cred-<tenant_slug>"
    },
    "commission_router": {
      "channels": {
        "data_viz": "slack:#data-viz-newsroom",
        "video": "slack:#video-desk",
        "audio": "email:podcast@example-newsroom.com"
      },
      "per_team_weekly_budget": 8,
      "auto_suggest_threshold": 0.7
    },
    "distribution_fit": {
      "surfaces_enabled": ["discover", "search", "subscription", "direct", "social"],
      "min_eval_f1": 0.65
    },
    "fair_chance_audit": {
      "aggregation_level": "week",
      "share_with_hierarchy": true,
      "share_with_reporters": true
    },
    "role_visibility": {
      "rejection_reasons_visible_to_desk": false,
      "post_publish_diagnostic_visible_to_reporter": true
    }
  }
}
```

Validated by Zod schema in `packages/spine-xtnd/config-schema.ts` at load time.

## Agent-runtime integration

Xtnd agents register through platform's Claude Agent SDK runtime (platform ADR 0004).

| Xtnd agent | Path | Model | Tool-calls cap |
|------------|------|-------|----------------|
| `xtnd-distribution-fit` | `cap_distribution_fit` | Sonnet | 3 |
| `xtnd-post-publish-diagnose` | `cap_post_publish_diagnose` | Sonnet | 4 |
| `xtnd-commission-suggest` | `cap_commission_suggest` | Sonnet | 2 |
| `xtnd-placement-signal` | `cap_placement_signal` | Sonnet | 3 |
| `xtnd-fair-chance-audit` | `cap_fair_chance_audit` | Sonnet | 5 |

Cost ceilings (platform ADR 0004 + `cost_budgets` table) extend to Xtnd agents. Per-tenant daily cap covers platform + Xtnd cumulatively, not per-product.

`agent_traces.path` enum (platform side) needs extension to include the Xtnd values above. Filed as PR upstream when Y2 build starts.

## UI integration

Y2: Xtnd extends `apps/web` (platform Next.js app) with new routes:

```
apps/web/app/
  brief/[id]/                          ← platform brief view; Xtnd adds distribution-fit panel
  desk/                                ← Xtnd: digital desk queue
  desk/place/[brief_id]/               ← Xtnd: placement support
  m/                                   ← Xtnd: mobile PWA reporter surface
  diagnose/[brief_id]/                 ← Xtnd: post-publish diagnostic
  audit/                               ← Xtnd: fair-chance audit
  commission/                          ← Xtnd: commission queue (per team)
```

Per platform ADR 0006, Xtnd UI registers via well-defined slots:

| Slot | Platform / Xtnd | Purpose |
|------|------------------|---------|
| `brief.section` | Platform-defined | Xtnd's distribution-fit cue mounts here |
| `signal.detail` | Platform-defined | Xtnd's commission-trigger button mounts here |
| `admin.module-config` | Platform-defined | Xtnd modules' admin UI |
| `xtnd.desk.queue.item` | Xtnd-defined | Per-story signals injected by Xtnd modules |
| `xtnd.diagnose.surface` | Xtnd-defined | Per-surface diagnostic panels |

Slot contracts live in `packages/spine/ui/slots.ts` (platform); Xtnd consumes via the registry.

Y2-3: optional separate `apps/desk-web` if desk UX diverges from journalist UX enough to warrant. Decision at end of Y2.

## Worker / job integration

Xtnd worker jobs register with platform's `apps/worker` (Python):

```python
# packages/modules/m-cms-read-adapter-wp/jobs/sync_drafts.py
from platform.worker.registry import register_job

@register_job(schedule="*/30 * * * *", tenant_scoped=True)
def sync_wp_drafts(tenant_id: str) -> None:
    # Read draft state from tenant's WP install; emit signals for brief pipeline.
    ...
```

Cost telemetry (Anthropic API calls inside worker jobs) records through platform's `agent_traces` infra.

## Eval / replay integration

Xtnd modules ship eval goldsets per platform's pattern (`packages/spine/eval/goldset/<design-partner-slug>.csv`):

```
packages/modules/m-distribution-fit/eval/goldset/<design-partner-slug>.csv
  signal_id,surface,expected_score,expected_top_reasons
```

Replay harness extends platform's harness; same F1 / precision / recall metrics. Cost-regression alerts shared.

Per-module eval gate (platform ADR 0020 pattern, locale-style applied to surface): no Xtnd surface predictions ship to a tenant until that tenant's goldset F1 ≥ 0.65 (initial) → 0.75 (steady-state).

## Auth / RBAC integration

Xtnd inherits platform's user identity. No second user table. No second auth flow.

Per-role surface visibility enforced by:

1. Platform `users.role` enum (extended via upstream PR for new Xtnd roles).
2. Xtnd middleware on `apps/web` routes — `requireRole(['digital_desk','editor','admin'])` style.
3. Xtnd-owned tables include their own `tenant_id` (same RLS pattern as platform).
4. Row-visibility rules for cross-role surfaces (e.g., reporter rejection reasons private to reporter + editor; not desk) enforced in Xtnd query helpers.

## Deployment integration

Y2: Xtnd ships as additional packages + routes in the same Fly.io app as platform. No separate deployment surface. Single `flyctl deploy` covers both.

Y3+: Optional split if traffic / RBAC isolation warrants. Decision at end of Y2.

## Versioning

- Platform releases: quarterly major + as-needed patch (platform ADR 0026).
- Xtnd releases: quarterly major, aligned with platform's quarterly window.
- Schema-changing releases: announced 30 days ahead in `CHANGELOG.md`; migration tested against design-partner data first.
- Adapter version pinning: every CMS read adapter records `adapter_version` in `cap_distribution_fit_scores.model_version` and in `cap_post_publish_diagnoses.diagnosis -> 'adapter_version'`.

## Out of scope for integration (Y1-3)

- Cross-tenant data flow (consistent with platform ADR 0025).
- CMS write adapter (head mode — Y4+).
- Federated fair-chance benchmarks (Y5+).
- Standalone Xtnd tenancy (Xtnd lives on platform tenancy through Y3).
- Plugin marketplace separate from platform's (platform's plugin SDK covers both).
