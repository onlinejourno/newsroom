# Design spec — Public `/showcase` (Slice 2b)

**Status:** Drafted 2026-06-20. **Sub-slice 2b** of the demo slice. Lets a **casual visitor, no
login**, browse the real surfaces rendering the fleshed-out `demo` tenant (Slice 2a), **read-only**,
at **zero LLM/API cost**. Builds on Slice 1 (session tenancy) + 2a (rich demo fixture).

## Why

The OSS mission needs the platform **showable** to anyone who lands on it — "here's what it does"
— before they download or request access. The demo tenant is already rich (2a); this exposes it
publicly + safely (read-only, internet-facing).

## Decisions

1. **Read-only via an explicit guard** (not role-trust alone — it's public). A **demo session**
   is flagged read-only; every mutating server action refuses it.
2. **Demo-viewer account + session reuse** — no new read-only rendering framework; the real
   surfaces render the demo tenant via Slice 1's `currentTenantId` (= the demo-viewer's tenant).
3. **Surface scope = the capability tour** (main lifecycle surfaces). **Admin stays gated** — the
   internal/admin view is the invited tier (2c).
4. **One-newsroom-per-install note:** `/showcase` is opt-in (a public entry). A self-hoster who
   doesn't want a public demo simply never seeds a demo-viewer / never links `/showcase`.

## Architecture & data flow

```
visitor → GET /{locale}/showcase   (added to middleware OPEN — no session required)
   action: startSession(demoViewerId)   → demo-viewer session cookie → redirect /{locale}/brief
        │
any surface (server): currentTenantId() → getAccount().tenant_id → DEMO tenant → 2a data renders
        │
any MUTATING server action: requireWritable(account) FIRST
   → if account.demo (or no account): refuse (redirect to /showcase?ro=1, no write)
```

- **`users.demo`** (new boolean column, migration 0024) marks the demo-viewer. `getAccount()`
  returns it as `Account.demo`.
- **Demo-viewer account**: seeded in the `demo` tenant by the fixture — role `viewer`, status
  `approved`, `demo=true`, no password (the `/showcase` action starts the session by id; never
  authenticates a password).
- **`requireWritable(account)`**: throws/redirects when `account?.demo` is true or `account` is
  null. Added as the first line of every mutating action.
- A persistent **"DEMO · read-only — Request full access"** banner on demo sessions.

## Components & files

| File | Change |
|---|---|
| `infra/migrations/0024_users_demo.sql` | **NEW** — `alter table users add column demo boolean not null default false;` |
| `infra/seeds/import_newsintel_peers.py` | **EXTEND** — seed the demo-viewer account (role viewer, demo=true, approved) in the demo tenant |
| `apps/web/lib/auth.ts` | `Account.demo`; `getAccount()` SELECT returns `u.demo`; `requireWritable(account)` guard |
| `apps/web/middleware.ts` | `OPEN += "showcase"` |
| `apps/web/app/[locale]/showcase/page.tsx` | **NEW** — public entry: start demo-viewer session → redirect into the tour |
| mutating actions (~10): `calendar`, `signal/[id]`, `newslist`, `admin/{connectors,sources,surfaces}/actions`, `admin/users`, `account`, `register`, home `page.tsx`, `potential`, `feed/[journalist]` | add `requireWritable(...)` as the first statement of each action |
| masthead/shell | render the "DEMO · read-only" banner when `account.demo` |

No change to the 27-surface tenant resolution (Slice 1 already routes to the session tenant).

## Testing & success criteria

- **Read-only:** as the demo session, every mutating action (commission, admin write, password
  change, register) is refused — verify each returns without writing. A unit test on
  `requireWritable` (demo → throws; normal → passes).
- **Anon access:** `/showcase` (no cookie) → 200, starts the demo session, lands on a surface
  rendering the demo tenant (not 307→login). Other surfaces then load for that session.
- **Admin gated:** the demo viewer (role viewer) cannot reach admin surfaces.
- **No regression:** a real logged-in user (non-demo) writes normally; `requireWritable` is a
  no-op for them. `self` untouched.
- **Zero LLM:** no pipeline/enrichment calls in the showcase path (it only reads seeded data).

## Out of scope (2c)

- Invited 3-day authed accounts: `expires_at` migration, invite flow, prune, **admin/internal**
  access. (2b is public read-only of the main surfaces only.)
- Running 0024 + the demo-viewer seed on **prod** (ops step after local verify).

## References

- `apps/web/middleware.ts` (auth gate, `OPEN`), `apps/web/lib/auth.ts` (`getAccount`,
  `startSession`, `Account`), `apps/web/lib/tenant.ts` (`currentTenantId`).
- 2a fixture `infra/seeds/import_newsintel_peers.py` (extend with the demo-viewer).
- Memory: [[onlinejourno-oss-mission]] (showable at zero cost; configure-your-own).
