# Session Tenancy Implementation Plan (Slice 1 — de-hardcode `self`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every surface renders the signed-in user's tenant (not the hardcoded `tenantIdForSlug("self")`); login resolves the user by email globally. No migration.

**Architecture:** `Account` gains `tenant_id`; `getAccount()` returns it; `lib/tenant.ts` `currentTenantId()` resolves `OJ_TENANT_SLUG` → session tenant → `defaultTenantId()`; the 24 surface pages call it; login uses a new global `userByEmail()`.

**Tech Stack:** Next.js 15 server components, TypeScript, `pg`. Verified by type-check + build + grep + a login smoke (no DB unit harness for auth).

**Spec:** `docs/superpowers/specs/2026-06-19-onlinejourno-session-tenancy-design.md`.

---

## File Structure
| File | Responsibility |
|---|---|
| `apps/web/lib/auth.ts` | `Account.tenant_id`; `getAccount()` returns it; `userByEmail(email)` (global login lookup). |
| `apps/web/lib/db.ts` | `defaultTenantId()` (oldest non-archived tenant). |
| `apps/web/lib/tenant.ts` | **NEW** — `currentTenantId()` resolution. |
| `apps/web/app/[locale]/login/page.tsx` | login via `userByEmail` (global). |
| 24 surface pages under `apps/web/app/[locale]/` | `tenantIdForSlug(TENANT_SLUG)` → `currentTenantId()`. |

---

## Task 1: `auth.ts` — tenant_id on Account + global userByEmail

**File:** `apps/web/lib/auth.ts`

- [ ] **Step 1:** Add `tenant_id` to the `Account` type — insert after the `id: string;` line:
```ts
  id: string;
  tenant_id: string;
```
- [ ] **Step 2:** Add `u.tenant_id` to the shared `SELECT` constant. Change its first line:
```ts
const SELECT = `
  select u.id, u.tenant_id, u.email, u.display_name, u.role, u.status, u.bureau,
```
(Leave the rest of `SELECT` unchanged. `accountByEmail` reuses it — gaining `tenant_id` is harmless.)
- [ ] **Step 3:** Add a global login lookup. Append after `accountByEmail`:
```ts
/** Resolve a login by email across all tenants (one-newsroom-per-install: emails
 *  are globally unique in practice). Returns the credential + the user's tenant. */
export async function userByEmail(
  email: string,
): Promise<{ id: string; tenant_id: string; status: string; password_hash: string | null } | null> {
  const { rows } = await pool().query<{ id: string; tenant_id: string; status: string; password_hash: string | null }>(
    "select id, tenant_id, status, password_hash from users where lower(email) = lower($1) order by created_at limit 1",
    [email],
  );
  return rows[0] ?? null;
}
```
- [ ] **Step 4:** Type-check. `cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check` → expect errors ONLY where `Account` is constructed without `tenant_id` (the SELECT now provides it, so none expected) — if a non-DB `Account` literal exists, fix it. Otherwise clean.
- [ ] **Step 5:** Commit. `git add apps/web/lib/auth.ts && git commit -m "feat(auth): tenant_id on Account + global userByEmail"`

---

## Task 2: `db.ts` defaultTenantId + `lib/tenant.ts` resolver

**Files:** modify `apps/web/lib/db.ts`; create `apps/web/lib/tenant.ts`.

- [ ] **Step 1:** Append to `apps/web/lib/db.ts`:
```ts
/** The install's newsroom — the oldest non-archived tenant. Fallback when there's
 *  no session (one-newsroom-per-install). Null on a fresh, unseeded DB. */
export async function defaultTenantId(): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    "select id from tenants where archived_at is null order by created_at asc limit 1",
  );
  return rows[0]?.id ?? null;
}
```
- [ ] **Step 2:** Create `apps/web/lib/tenant.ts`:
```ts
// Single source of tenant resolution for surfaces (ADR 0005 multi-tenant).
// Precedence: OJ_TENANT_SLUG override → signed-in user's tenant → install default.
import { getAccount } from "@/lib/auth";
import { defaultTenantId, tenantIdForSlug } from "@/lib/db";

export async function currentTenantId(): Promise<string | null> {
  const slug = process.env.OJ_TENANT_SLUG;
  if (slug) return tenantIdForSlug(slug);
  const account = await getAccount();
  if (account?.tenant_id) return account.tenant_id;
  return defaultTenantId();
}
```
- [ ] **Step 3:** Type-check → clean.
- [ ] **Step 4:** Commit. `git add apps/web/lib/db.ts apps/web/lib/tenant.ts && git commit -m "feat(tenant): currentTenantId resolver + defaultTenantId"`

---

## Task 3: login via global userByEmail

**File:** `apps/web/app/[locale]/login/page.tsx`

- [ ] **Step 1:** Read the file. It currently: imports `accountByEmail`, `tenantIdForSlug`; `const TENANT_SLUG = "self"`; in the login action does `const tenantId = await tenantIdForSlug(TENANT_SLUG); const acct = await accountByEmail(tenantId, email); if (!acct || !verifyPassword(pw, acct.password_hash)) {…}; await startSession(acct.id)`.
- [ ] **Step 2:** Replace the import of `accountByEmail` with `userByEmail` (from `@/lib/auth`); drop `tenantIdForSlug` from the `@/lib/db` import if it becomes unused; remove `const TENANT_SLUG = "self"`.
- [ ] **Step 3:** In the login action, replace the tenant-resolve + account lookup with:
```ts
    const acct = await userByEmail(email);
    if (!acct || acct.status !== "approved" || !verifyPassword(pw, acct.password_hash)) {
      // same invalid-credentials branch as before
    }
    await startSession(acct.id);
```
(Keep the page's other `tenantIdForSlug`/`listJournalists` usage if it's only for a display list; if that needs a tenant, use `currentTenantId()` from `@/lib/tenant`. Preserve all existing error handling + redirects.)
- [ ] **Step 4:** Type-check + build. `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build` → clean.
- [ ] **Step 5:** Commit. `git add "apps/web/app/[locale]/login/page.tsx" && git commit -m "feat(auth): login resolves user by email globally"`

---

## Task 4: de-hardcode the 24 surfaces

**Files:** the 24 pages under `apps/web/app/[locale]/` that contain `tenantIdForSlug(TENANT_SLUG)` or `tenantIdForSlug("self")`.

- [ ] **Step 1:** List them: `grep -rln 'tenantIdForSlug(TENANT_SLUG)\|tenantIdForSlug("self")\|TENANT_SLUG = ' "apps/web/app/[locale]" --include='*.tsx'` (excluding `login/page.tsx`, already done in Task 3).
- [ ] **Step 2:** In EACH file apply this mechanical transform:
  1. Add `import { currentTenantId } from "@/lib/tenant";` (with the other imports).
  2. Replace `const tenantId = await tenantIdForSlug(TENANT_SLUG);` (or `tenantIdForSlug("self")`) with `const tenantId = await currentTenantId();`. **Keep the existing `if (!tenantId) return …` guard** — `currentTenantId()` can return null (no session / fresh DB), which the guard already handles.
  3. Delete the now-dead `const TENANT_SLUG = "self";` (or `= process.env.OJ_TENANT_SLUG ?? "self"`) line.
  4. Remove `tenantIdForSlug` from the `@/lib/db` import **iff** it's no longer used in that file (some pages may still call it for other slugs — keep it then).
- [ ] **Step 3:** Build (this is the real gate — catches unused-import/type errors across all 24). `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build` → clean.
- [ ] **Step 4:** Grep for stragglers: `grep -rn 'TENANT_SLUG\|tenantIdForSlug("self")' "apps/web/app/[locale]"` → expect **no matches** (login excepted if it still lists journalists by tenant — then it uses `currentTenantId`). 
- [ ] **Step 5:** Commit. `git add "apps/web/app/[locale]" && git commit -m "feat(tenant): de-hardcode 24 surfaces to currentTenantId (session tenant)"`

---

## Task 5: verification

- [ ] **Step 1:** Gates: `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build` → clean; `grep -rn 'TENANT_SLUG = "self"\|tenantIdForSlug("self")' apps/web/app` → empty.
- [ ] **Step 2:** Login smoke (local dev DB or prod): sign in as the seeded admin → confirm a surface (e.g. `/en/brief`) renders that user's tenant; confirm `OJ_TENANT_SLUG=demo pnpm dev` renders the demo tenant; confirm logging out → `/en/calendar` still 307s to login (gate intact).
- [ ] **Step 3:** Confirm **no regression for `self`**: the founder's `subhash@onlinejourno.com` login must render `self` exactly as before (defaultTenantId → self when no override; session tenant = self).

## Notes for the executor
- This touches auth — be careful: preserve every existing error branch + redirect in `login/page.tsx`. The only behavioural change is *which tenant* a session resolves to.
- `currentTenantId()` returning null is the hook for first-run onboarding (a later slice); for now the existing `if (!tenantId)` guards handle it (setup notice / null render).
- Do NOT add `expires_at`, invites, or the demo seed here — those are the demo slice.
