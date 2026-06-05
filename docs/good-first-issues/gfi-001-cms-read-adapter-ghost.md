# GFI 001 — Ghost CMS read adapter

> Template drafted Wk 0 of Xtnd; published as live GitHub Issue at Wk 100 public flip.

## What

Build `m-cms-read-adapter-ghost` module. Read draft + published post state from a customer's self-hosted or Ghost(Pro) Ghost CMS instance via the Ghost Admin API. Emit ingest events into the platform's signal/brief pipeline so the design partner editor can see Ghost-authored stories surfacing in their brief alongside other signal sources.

This is the second CMS adapter (the first, `m-cms-read-adapter-wp`, ships in the v0.1 capability-tier release as the exemplar). The Ghost adapter follows the same Module Contract; this issue is the template for adding any new CMS adapter.

## Why

Ghost is the most-deployed digital-native CMS for journalist-coded outlets globally. A Ghost adapter unlocks Xtnd companion-mode for any newsroom on Ghost; companion mode means Xtnd informs alongside the existing CMS without replacing the publish surface (per ADR 0036 read-only Y1-3).

Without a Ghost adapter, Ghost-based newsrooms cannot try Xtnd against their real draft state. This adapter is therefore foundational for design-partner expansion in Y2-Y3.

## Module / location

`packages/modules/m-cms-read-adapter-ghost/`

## Module Contract scaffold

Copy `docs/templates/module-scaffold/` to `packages/modules/m-cms-read-adapter-ghost/`. Module Contract files: `module.config.ts`, `module.lifecycle.ts`, `storage/`, `agents/` (none for this module — it does not call agents), `ui/` (admin config only), `jobs/` (one scheduled sync job), `README.md`, `tests/`, `eval/`.

## Inputs / outputs

**Inputs:**

- Ghost Admin API endpoint URL.
- Ghost Admin API key (encrypted at rest; reference passed via `tenants.config -> 'xtnd' -> 'm-cms-read-adapter-ghost' -> 'admin_api_key_secret_ref'`).
- Sync cadence (default: every 30 minutes).
- Locale filter (default: all locales).

**Outputs:**

- New rows in platform `signals` table per new Ghost post (draft or published).
- Updated rows in `signals` for posts whose status changed since last sync.
- Optional: `x_cms_ghost_draft_cache` table for storing draft body snapshots with TTL.

**Data shape mapping:**

| Ghost Admin API field | Platform `signals` column |
|---|---|
| `id` | `external_id` |
| `url` | `url` |
| `title` | `headline` |
| `html` or `mobiledoc` (stripped) | `body_text` |
| `published_at` | `published_at` |
| `language` | `language` |
| Full JSON | `raw_payload` |

Map: `signals.source_id` = the Ghost adapter source row created at module enable time (`sources.kind = 'api'`, `sources.url = <ghost-instance-url>`).

## Acceptance criteria

- [ ] Module Contract complete (Module Contract files listed above present and validated).
- [ ] Ghost Admin API client wrapped in a typed adapter (per platform ADR 0007); swap-able if Ghost API changes.
- [ ] `module.config.ts` validates: endpoint URL format, API key secret reference shape, sync cadence interval, locale filter.
- [ ] `module.lifecycle.ts onEnable(tenantId, config)`:
  - Creates a `sources` row of kind `api` with the Ghost endpoint URL.
  - Schedules the sync job.
  - Persists encrypted API key reference.
- [ ] `module.lifecycle.ts onDisable(tenantId)`:
  - Stops the sync job.
  - Marks the `sources` row inactive (does not delete it; signals retain `source_id` reference).
- [ ] Sync job (`jobs/sync_ghost.py` or `.ts`):
  - Reads draft + published posts since last sync timestamp.
  - Emits `signals` inserts (or upserts on `(tenant_id, url_hash)`) for new posts.
  - Emits `signals` updates for posts whose `status` or `published_at` changed.
  - Stores sync run in `collector_runs` (platform table).
  - Reports failures via `portal_health_alerts` after 3 consecutive failures (per platform ADR 0014 pattern).
- [ ] RLS-aware: every query includes `tenant_id` filter.
- [ ] Cost telemetry: any Anthropic agent calls (none expected for this module) register through `agent_traces`.
- [ ] Unit tests cover: API client mock; happy-path sync; rate-limit handling; auth failure; partial response.
- [ ] Eval fixtures: `eval/goldset/demo.csv` has 20 example Ghost API responses mapped to expected `signals` rows.
- [ ] No new top-level dependencies. Use existing HTTP client.
- [ ] README documents: supported Ghost versions, tested Ghost(Pro) and self-hosted, configuration steps, troubleshooting.
- [ ] Demo tenant seed data extended: add 1 fictional Ghost-sourced signal to demonstrate the adapter without requiring a live Ghost instance for the demo.
- [ ] Decision-support compliant: this module is purely an ingest; no editorial decisions made by it. ✓

## Estimated effort

12-16 founder-equivalent hours for an experienced contributor. Includes: API client + mapping + scheduled job + tests + eval fixtures + README.

## Skill level

`experienced-contributor`

## Review SLA

Reviewed in the next Friday review window (per platform ADR 0026). Expect ~30 min initial review; one round of iteration likely.

## Out of scope

- Ghost Content API (read-only) is not the target; the Admin API is. The Content API does not surface drafts; we need drafts.
- Ghost theme parsing or content rendering. Xtnd reads source state, doesn't render.
- Ghost write operations. Per ADR 0036, no CMS write in Y1-3.
- Multi-tenant Ghost (one Ghost instance hosting multiple newsrooms in subdirectories). If a customer requires this, file a separate ADR PR.

## References

- ADR 0036 (CMS adapter read-only Y1-3)
- ADR 0039 of platform (adapter contracts; pending)
- Xtnd `docs/INTEGRATION-SPEC.md` Schema section
- Xtnd `docs/good-first-issues/INDEX.md` Category 1
- Platform ADR 0006 (Module plugin architecture)
- Platform ADR 0014 (m-portal-health alert pattern)
- Ghost Admin API documentation: https://ghost.org/docs/admin-api/
