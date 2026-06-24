# Design spec — Session tenancy (de-hardcode `self`)

**Status:** Drafted 2026-06-19. **Slice 1** of the self-host critical path. Makes every surface
render the **signed-in user's tenant** instead of the hardcoded `tenantIdForSlug("self")`. The
prerequisite for one-newsroom-per-install self-hosting *and* the invite-based demo
(separate slices). No migration.

## Why

The platform is multi-tenant in the database (every row has `tenant_id`, ADR 0005) but the **UI
is wired to a single hardcoded tenant**: 27 surfaces resolve their tenant via
`tenantIdForSlug("self")`, and the `Account` type doesn't even carry `tenant_id`. So a
self-hosting newsroom — or an invited demo user — can't see *their own* data. This slice flips
the resolution to the session user's tenant.

**Model (decided):** **one newsroom per install** — each newsroom downloads + runs its own
instance, one tenant per deploy. The DB stays multi-tenant-capable; the founder's own deploy
runs `self` + an optional `demo` tenant, distinguished by the logged-in user's tenant.

## Decisions

1. **Tenant resolves from the session user.** `Account` gains `tenant_id`; `getAccount()`
   returns it; surfaces use it.
2. **Login resolves the user by email globally** (`userByEmail(email)` → `{id, tenant_id,
   password_hash}`), not via a hardcoded tenant. Handles one-tenant installs *and* the founder's
   `self`+`demo` deploy (emails differ across tenants). Assumes globally-unique login emails —
   true for single-install and the founder's case.
3. **`currentTenantId()` precedence:** `OJ_TENANT_SLUG` env override → session user's `tenant_id`
   → `defaultTenantId()` (oldest non-archived tenant; the install's newsroom).
4. **`self` unaffected on the founder's deploy:** `subhash@onlinejourno.com` → `self`;
   `defaultTenantId()` → `self` (oldest); `OJ_TENANT_SLUG` retained for ops/demo viewing.
5. **No migration** — `users.tenant_id` already exists; this only reads it.

## Architecture & data flow

```
login(email, password)
  userByEmail(email) → {id, tenant_id, password_hash}   (NEW: global, replaces accountByEmail("self",…))
  verifyPassword → startSession(id)

any surface (server)
  currentTenantId()                                      (NEW: lib/tenant.ts)
     = OJ_TENANT_SLUG ? tenantIdForSlug(env)
       : (await getAccount())?.tenant_id
       ?? defaultTenantId()
  → all existing queries run against that tenantId (unchanged)

getAccount() → Account { …, tenant_id }                  (NEW column in SELECT + type)
```

## Components & files

| File | Change |
|---|---|
| `apps/web/lib/auth.ts` | `Account` gains `tenant_id`; `getAccount()` SELECT returns `u.tenant_id`; add `userByEmail(email)` (global) for login |
| `apps/web/lib/tenant.ts` | **NEW** — `currentTenantId()` + `defaultTenantId()` |
| login server action (`app/[locale]/login/…`) | resolve via `userByEmail` (global), not hardcoded `"self"` |
| **27 surface pages** (`app/[locale]/{calendar,brief,trends,scores,potential,gems,signals,signal,shortlist,newslist,journalists,coverage,local-pulse,topic-domains,story-analyser,gaps,account,feed,eip-signals,admin/*}/…` + home) | replace `const TENANT_SLUG = …` / `tenantIdForSlug("self")` with `await currentTenantId()` |

**Boundaries:** `lib/tenant.ts` is the single resolution point; pages call it; `auth.ts` owns the
session→tenant link. Existing per-tenant queries are unchanged (they already take a `tenantId`).

## Testing & success criteria

- **type-check + build** green.
- **Live smoke (prod or local):** `subhash@onlinejourno.com` logs in → every surface still renders
  `self` exactly as before (no regression). `OJ_TENANT_SLUG=demo` → renders demo. A user whose
  account is in another tenant → sees that tenant.
- Grep: zero remaining `tenantIdForSlug("self")` / `TENANT_SLUG = "self"` in `app/[locale]`.
- Vendor-neutral: no hardcoded outlet; tenant identity flows from the account.

## Out of scope (separate slices)

- **Demo slice (next):** admin **invites** a user → time-bound account (**3-day `expires_at`**,
  auth refuses expired, daily prune) → they explore a richly-seeded (news-intel) demo tenant,
  `self` untouched. Open sub-decisions: shared demo tenant vs ephemeral-per-invite; clock from
  invite vs first login; invite delivery (link/email). Needs an `expires_at` column (migration)
  + an invite flow + the demo seed on prod.
- **First-run onboarding:** empty-DB setup wizard (create newsroom + first admin) — its own slice.
- No subdomain routing (one-newsroom-per-install).

## References

- `apps/web/lib/auth.ts` (`Account`, `getAccount`, `accountByEmail`, `startSession`).
- Prod inspection 2026-06-19: 1 tenant (`self`); `subhash@onlinejourno.com` admin/approved/has-pw;
  27 surfaces hardcode `self`.
- ADR 0005 (multi-tenant row-level), ADR 0055 (auth). Memory: [[onlinejourno-oss-mission]].
