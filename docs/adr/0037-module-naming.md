# ADR 0037 — Module naming: `m-*` only; capability tier is metadata, not prefix

**Status:** Accepted (2026-06-05). Supersedes the Wk-0-of-Xtnd `x-*` prefix proposal that was abandoned in the merge (ADR 0030).

## Context

Platform modules use the `m-*` naming convention (per `docs/MVP-SCOPE.md`):

```
packages/modules/
  m-source-intel/
  m-portal-health/
  m-framing-pej/
  m-discover-seo/
  m-platform-dep/
  m-ai-visibility/
  m-recirculation/
```

When the converged-newsroom-orchestration product was tentatively a separate repo (`onlinejourno/xtnd`), an `x-*` prefix was proposed to distinguish those modules from platform-native modules. The merge (ADR 0030) eliminated the repo split and folded all modules into `onlinejourno/platform`. The naming distinction loses its purpose; what remains is the **capability tier** distinction (MVP-tier vs Xtnd-tier), which is a marketing + roadmap concept, not a filesystem concept.

A new policy is needed: keep `m-*` for every module; encode tier via metadata (module `README.md` front-matter + `ROADMAP.md` listing), not via directory prefix. Avoid mixing prefixes inside the same `packages/modules/` directory.

## Decision

**All modules use the `m-*` prefix. No second prefix.** Tier is metadata, not naming.

### Naming rules

1. **Directory name:** `packages/modules/m-<module-name>/`. Examples (existing + planned):

   MVP-tier (enabled at MVP launch per `docs/MVP-SCOPE.md`):
   - `packages/modules/m-source-intel/`
   - `packages/modules/m-portal-health/`

   MVP-tier (defined; disabled by default at MVP launch; per-tenant opt-in):
   - `packages/modules/m-framing-pej/`
   - `packages/modules/m-discover-seo/`
   - `packages/modules/m-platform-dep/`
   - `packages/modules/m-ai-visibility/`
   - `packages/modules/m-recirculation/`

   Xtnd-tier (planned for Y2 capability-tier release; disabled by default at MVP):
   - `packages/modules/m-distribution-fit/`
   - `packages/modules/m-cms-read-adapter-wp/`
   - `packages/modules/m-cms-read-adapter-ghost/`
   - `packages/modules/m-narrative-spine/`
   - `packages/modules/m-post-publish-diagnostic/`
   - `packages/modules/m-placement-support/`
   - `packages/modules/m-commission-router/`
   - `packages/modules/m-social-scheduler/`
   - `packages/modules/m-fair-chance-audit/`

   Y3+ (planned; defined when work starts):
   - `packages/modules/m-narrative-coherence/`

2. **TypeScript package name:** `@onlinejourno/<module-name>` when published; `@platform/<module-name>` shorthand for local workspace import.

3. **Schema prefix conventions:**
   - **Module-owned tables** use the prefix `m_<module>_` (already enforced by ADR 0006). Example: `m_distribution_fit_eval_runs`, `m_cms_wp_credentials`, `m_commission_router_team_quotas`.
   - **Cross-module capability-tier tables** (not owned by a single module — e.g., story lifecycle, commissions, placement state, distribution-fit scores, post-publish diagnoses, social schedules, fair-chance audits) use the `cap_*` prefix (capability-tier). Example: `cap_story_lifecycle`, `cap_commissions`, `cap_placement_states`.

4. **No name collision ever.** A module name is reserved at file-system level. If a future module idea naturally maps to an existing module's scope, the resolution is to extend the existing module via PR, not to create a parallel module with a near-identical name.

5. **Tier metadata in module README:**

   Every module's `README.md` carries a front-matter block:

   ```yaml
   ---
   module: m-distribution-fit
   tier: xtnd                       # 'mvp' or 'xtnd'
   status: planned                  # 'enabled-mvp' | 'disabled-mvp-opt-in' | 'planned' | 'experimental' | 'deprecated'
   first-shipped: v0.1              # release tag when first available; 'pending' if planned
   maintainer: founder              # or contributor handle for community-maintained modules
   ---
   ```

   Tier listing is mirrored in `ROADMAP.md` (per-tier section). The filesystem stays prefix-uniform; the tier signal lives in metadata.

### UI slot naming

UI slot identifiers use the prefix that reflects who introduced the slot, not the tier:

- **Platform-introduced slots** (cross-cutting; available to any module): `brief.section`, `signal.detail`, `admin.module-config`.
- **Capability-tier-introduced slots** (added when Xtnd-tier modules ship): `desk.queue.item`, `diagnose.surface`, `commission.queue`, `audit.panel`.
- **Module-specific slots** (only relevant to one module's UI): `<module-name>.<slot>` — namespaced under the module's own name.

No `xtnd.` prefix on slot names; the slot belongs to the platform's UI surface, regardless of which tier's module introduced it.

### Tenant config namespace

Per-tenant module config sits under `tenants.config -> 'modules' -> '<module-name>'`. Examples:

```jsonc
{
  "modules": {
    "m-source-intel": { "enabled": true, "sources_max": 30 },
    "m-distribution-fit": { "enabled": true, "surfaces_enabled": ["discover", "search"] },
    "m-cms-read-adapter-wp": { "enabled": true, "rest_endpoint": "...", "credentials_secret_ref": "..." }
  }
}
```

Modules are namespaced by full name. No tier-level grouping in config (avoids a future tier rename forcing config migration).

## Consequences

- **One prefix forever.** Filesystem stays predictable; contributors don't ask "which prefix for my module?"
- **Tier metadata is queryable.** A simple script can scan `packages/modules/*/README.md` front-matter and produce the per-tier list shipped in `ROADMAP.md`. No drift between filesystem and roadmap.
- **Schema separation by intent, not by tier.** Module-owned tables stay `m_<module>_`; cross-tier capability tables stay `cap_*`. Easy to grep.
- **Third-party plugin marketplace future-fit.** When third-party plugins ship (Y2+ per platform ADR 0024), they use publisher-scoped TypeScript package names (`@acme/m-foo`); the directory prefix remains `m-`. Distinguishing first-party from third-party is via the package `org` field, not directory naming.
- **Old `x-*` proposal is dead.** Pre-merge Xtnd ADR 0005 (`x-*` prefix) is superseded by this ADR. Any reference to `x-*` in docs is a migration leftover and should be replaced.

## Anti-patterns refused

- Tier-encoded prefixes (`mvp-*` and `xtnd-*`, or `core-*` and `ext-*`, etc.). Tier is metadata; naming is uniform.
- Mixing `m-` and `x-` modules in the same repository. Single prefix.
- Per-tier directory grouping (`packages/modules/mvp/`, `packages/modules/xtnd/`). Filesystem stays flat; grouping is via the README front-matter `tier` field.
- Module name with publisher embedded in directory name (`@acme-m-foo/`). Publisher lives in TypeScript package scope, not filesystem.
- Renaming an existing module to a different prefix because tier changed. Modules keep their original name; tier transitions are recorded in the README front-matter `status` field (`disabled-mvp-opt-in` → `enabled-mvp`).

## Revisit

When third-party plugin marketplace (Y2+) introduces a publisher-scope naming question this ADR doesn't cover. A marketplace-naming ADR can then supersede the package-scope rule above without disturbing the directory prefix.

## References

- ADR 0006 (module plugin architecture — defines what a module is)
- ADR 0030 (merge — eliminated the `x-*` proposal)
- `docs/MVP-SCOPE.md` (module list at MVP launch)
- `ROADMAP.md` (tier listings, generated from module README front-matter)
- `docs/INTEGRATION-SPEC.md` (schema + slots + config namespaces)
