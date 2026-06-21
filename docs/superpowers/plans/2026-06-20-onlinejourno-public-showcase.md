# Public /showcase Implementation Plan (Slice 2b)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let an anonymous visitor browse the real surfaces rendering the `demo` tenant, read-only, via a public `/showcase` entry — internet-safe (every mutation hard-refused).

**Architecture:** A seeded demo-viewer account (`users.demo=true`) in the `demo` tenant; `/showcase` (OPEN in middleware) starts its session; Slice 1's `currentTenantId` renders the demo data; an `assertWritable()` guard on every mutating server action refuses demo sessions.

**Tech Stack:** Next.js 15 server components/actions, TypeScript, `pg`, Postgres. Verified by a unit test on the guard + type-check + build + an anon-access smoke.

**Spec:** `docs/superpowers/specs/2026-06-20-onlinejourno-public-showcase-design.md`.

---

## Task 1: Migration + auth (`demo` flag + guard)

**Files:** create `infra/migrations/0024_users_demo.sql`; modify `apps/web/lib/auth.ts`.

- [ ] **Step 1: Migration.** Create `infra/migrations/0024_users_demo.sql`:
```sql
-- 2b: mark read-only demo (public showcase) accounts. Default false; real users unaffected.
alter table users add column if not exists demo boolean not null default false;
```
- [ ] **Step 2: Apply locally + add `demo` to `Account` + `getAccount`.**
```bash
psql "postgres://localhost:5432/onlinejourno_dev" -f infra/migrations/0024_users_demo.sql
```
In `apps/web/lib/auth.ts`: add `demo: boolean;` to the `Account` type (after `tenant_id`), and add `u.demo` to the shared `SELECT` first line:
```ts
const SELECT = `
  select u.id, u.tenant_id, u.demo, u.email, u.display_name, u.role, u.status, u.bureau,
```
- [ ] **Step 3: Add the guard + a starter for the showcase session.** Append to `auth.ts`:
```ts
/** Thrown when a read-only demo session attempts a write. */
export class ReadOnlyDemoError extends Error {
  constructor() {
    super("This is a read-only demo. Request full access to make changes.");
    this.name = "ReadOnlyDemoError";
  }
}

/** Guard for mutating server actions: throws on a demo or absent session.
 *  Narrows `account` to a writable Account on success. */
export function assertWritable(account: Account | null): asserts account is Account {
  if (!account || account.demo) throw new ReadOnlyDemoError();
}

/** Start a session as the demo-viewer account for the given tenant slug (public
 *  showcase). Returns the locale-room to land on, or null if no demo viewer exists. */
export async function startDemoSession(tenantSlug = "demo"): Promise<string | null> {
  const { rows } = await pool().query<{ id: string; role: string; profile_slug: string | null }>(
    `select u.id, u.role, j.slug as profile_slug
       from users u
       join tenants t on t.id = u.tenant_id
       left join journalist_profiles j on j.id = u.profile_id
      where t.slug = $1 and u.demo = true and u.status = 'approved'
      order by u.created_at limit 1`,
    [tenantSlug],
  );
  const v = rows[0];
  if (!v) return null;
  await startSession(v.id);
  return roomForRole(v.role, v.profile_slug);
}
```
- [ ] **Step 4: Type-check + commit.**
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check
git add apps/web/lib/auth.ts infra/migrations/0024_users_demo.sql
git commit -m "feat(showcase): users.demo flag + assertWritable guard + startDemoSession"
```

---

## Task 2: middleware OPEN + `/showcase` entry

**Files:** modify `apps/web/middleware.ts`; create `apps/web/app/[locale]/showcase/page.tsx`.

- [ ] **Step 1: Open the route.** In `middleware.ts`, change the OPEN list:
```ts
const OPEN = ["login", "register", "accept", "pending", "showcase"];
```
- [ ] **Step 2: The entry page.** Create `apps/web/app/[locale]/showcase/page.tsx`:
```tsx
import type { Route } from "next";
import { redirect } from "next/navigation";
import { startDemoSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ShowcasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const room = await startDemoSession("demo");
  if (!room) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <p className="ds-deck">The demo isn’t available right now.</p>
      </main>
    );
  }
  redirect(`/${locale}/${room}` as Route);
}
```
- [ ] **Step 3: Type-check + build + commit.**
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build
git add apps/web/middleware.ts "apps/web/app/[locale]/showcase/page.tsx"
git commit -m "feat(showcase): public /showcase entry starts a read-only demo session"
```

---

## Task 3: Guard every mutating server action

**Files:** the mutating actions — `calendar/page.tsx`, `signal/[id]/page.tsx`, `newslist/page.tsx`, `account/page.tsx`, `potential/page.tsx`, `feed/[journalist]/page.tsx`, `page.tsx` (home), `admin/users/page.tsx`, `admin/connectors/actions.ts`, `admin/sources/actions.ts`, `admin/surfaces/actions.ts`.

- [ ] **Step 1: Pattern A — actions that already fetch the account.** In each `"use server"` action that has `const me = await getAccount();` (calendar commission, signal/[id] commission, newslist actions, account password, admin/users, home), add `assertWritable(me);` immediately after the fetch (import `assertWritable` from `@/lib/auth`). Example (calendar `commissionEvent`):
```ts
    "use server";
    const me = await getAccount();
    assertWritable(me);
    // …existing body unchanged…
```
- [ ] **Step 2: Pattern B — standalone action modules without a fetch** (`admin/{connectors,sources,surfaces}/actions.ts`, and any `"use server"` action lacking a getAccount, e.g. `potential`/`feed` mutations). Add at the top of each exported action:
```ts
  const me = await getAccount();
  assertWritable(me);
```
importing `getAccount, assertWritable` from `@/lib/auth`. (This also gives the admin actions an auth check they lacked — defense in depth.)
- [ ] **Step 3: Skip the auth flows.** Do NOT guard `login/page.tsx`'s `login()`/`demoLogin()` or `register/page.tsx`'s submit — those create/authenticate sessions (a demo viewer never uses them; register stays an open access-request). The showcase session is started by `startDemoSession`, not `login`.
- [ ] **Step 4: Type-check + build.** `pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build` → clean.
- [ ] **Step 5: Commit.** `git add "apps/web/app/[locale]" && git commit -m "feat(showcase): assertWritable guard on all mutating actions"`

---

## Task 4: Demo-viewer account + the read-only banner

**Files:** modify `infra/seeds/import_newsintel_peers.py`; modify the masthead/shell component.

- [ ] **Step 1: Seed the demo-viewer.** In `import_newsintel_peers.py`, after the reporters step, add (idempotent — demo tenant only):
```python
        # demo-viewer: the read-only identity the public /showcase logs in as.
        cur.execute("delete from users where tenant_id = %s and demo = true", (tenant_id,))
        cur.execute(
            "insert into users (tenant_id, email, display_name, role, status, demo) "
            "values (%s, 'demo-viewer@demo.onlinejourno.com', 'Demo Visitor', 'viewer', 'approved', true)",
            (tenant_id,),
        )
```
- [ ] **Step 2: Run locally + confirm.**
```bash
DATABASE_URL="postgres://localhost:5432/onlinejourno_dev" uv run --with psycopg infra/seeds/import_newsintel_peers.py ~/projects/news-intel/data/news_intel.db
psql "postgres://localhost:5432/onlinejourno_dev" -c "select email, role, demo from users where tenant_id=(select id from tenants where slug='demo') and demo;"
```
Expected: one `demo-viewer@…`, role viewer, demo=t.
- [ ] **Step 3: Read-only banner.** Find the masthead/shell server component (it already calls `getAccount()` for the signed-in user — locate via `grep -rn "getAccount" apps/web/components apps/web/app/[locale]/layout.tsx`). When `account?.demo`, render a thin banner above the masthead:
```tsx
{account?.demo && (
  <div className="ds-meta" style={{ background: "var(--color-frame)", color: "var(--color-paper)", textAlign: "center", padding: "4px" }}>
    DEMO · read-only — <a href={`/${locale}/register`} style={{ textDecoration: "underline" }}>Request full access</a>
  </div>
)}
```
(Match the actual masthead file + how it gets `account`/`locale`.)
- [ ] **Step 4: Type-check + build + commit.**
```bash
cd /Users/subhashrai/projects/platform && pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build
git add infra/seeds/import_newsintel_peers.py apps/web
git commit -m "feat(showcase): demo-viewer account + read-only banner"
```

---

## Task 5: Verification

- [ ] **Step 1: Guard unit test.** Create `apps/web/lib/auth-guard.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { assertWritable, ReadOnlyDemoError } from "./auth";

const base = { id: "1", tenant_id: "t", email: "a@b.c", display_name: null, role: "editor" as const, status: "approved", bureau: null, profile_slug: null, beats: [], region: null };

test("assertWritable passes for a normal account", () => {
  assert.doesNotThrow(() => assertWritable({ ...base, demo: false }));
});
test("assertWritable throws for a demo account", () => {
  assert.throws(() => assertWritable({ ...base, demo: true }), ReadOnlyDemoError);
});
test("assertWritable throws for no account", () => {
  assert.throws(() => assertWritable(null), ReadOnlyDemoError);
});
```
Run: `cd apps/web && pnpm test` → pass. (NOTE: if importing `./auth` pulls `next/headers` and fails under node:test, move `assertWritable` + `ReadOnlyDemoError` to a tiny `lib/writable.ts` with no Next imports and re-export from auth; test that module.)
- [ ] **Step 2: Gates.** `pnpm --filter @onlinejourno/web test && pnpm --filter @onlinejourno/web type-check && pnpm --filter @onlinejourno/web build`.
- [ ] **Step 3: Anon-access smoke** (local, `pnpm dev`): `GET /en/showcase` (no cookie) → 200 then a surface renders the demo tenant (not 307→login). From that session, a surface loads; an admin path is refused (viewer role); submitting a mutating form (e.g. commission) is refused (ReadOnlyDemoError, no DB write).
- [ ] **Step 4: No-regression.** A real logged-in non-demo user commissions/writes normally (guard is a no-op). `self` untouched.

## Notes for the executor
- The guard must be the FIRST effect in each mutating action (before any DB write). Preserve each action's existing logic after it.
- `assertWritable` is an assertion function — after it, TS narrows `me` to non-null, which may let you simplify later `if (!me)` checks (optional; don't change behavior).
- Do not seed the demo-viewer with a password — `startDemoSession` logs in by id, never authenticates a password.
- Prod rollout (apply 0024 + re-run the fixture for the demo-viewer + link `/showcase`) is an ops step after local verify.
