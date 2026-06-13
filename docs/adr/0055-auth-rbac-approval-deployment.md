# ADR 0055 — Login-gated platform: auth, approval, RBAC, the editorial workflow, and deployment topology

**Status:** Accepted (2026-06-12). Supersedes the demo cookie session (lib/session.ts).

## Context

The platform must become a real multi-user product for one news organisation
(reference tenant: The Hindu). Everyone logs in at the homepage; views are
assigned by role; registration is controlled because an instance belongs to
one masthead. The founder's spec (this ADR's cause) defines the people model,
the approval flow, the role views, the editor↔bureau workflow, and asks the
deployment-topology questions answered below.

## Decision

### 1. Identity model — account + profile
- **`users`** is the **account**: `email`, `password_hash` (nullable — SSO
  accounts have none), `status`, `role` (RBAC tier), `bureau`, link to a
  `journalist_profile` (the newsroom identity: beats, region, slug). One row
  per person; auth lives here.
- **RBAC tiers** (`users.role`): `admin` · `editor` · `desk` (bureau chief /
  news editor / digital desk) · `reporter` · `viewer`. The specific title is
  the profile's role string; the tier gates capability.
- **`status`**: `invited` → `pending` → `approved` → (`rejected` |
  `suspended`). Only `approved` accounts get a session.

### 2. Registration + approval
- **Invitation** (admin → user): admin creates an `invitations` row
  (email, role, bureau, token). User accepts via token → account created
  **approved** (the invite *is* the approval).
- **Self-registration**: user signs up with the masthead email domain
  (tenant config, e.g. `@thehindu.co.in`) → account created **pending** →
  appears in the admin approval queue → admin approves/rejects.
- Domain mismatch on self-register is refused (single-org instance).

### 3. Authentication
- **Email + password** today: scrypt hash (`node:crypto`, no native dep).
- **Session**: HMAC-signed cookie (`<accountId>.<sig>`, SESSION_SECRET),
  validated tamper-resistantly in middleware (Web Crypto). httpOnly.
- **SSO provisioned, not faked**: a "Sign in with Google / corporate SSO"
  affordance wired to the NextAuth seam; lights up when the deploy has
  provider credentials. No fake SSO ships.

### 4. The login gate
Middleware forces a valid session for every locale path **except** `/login`,
`/register`, `/accept`, `/pending`, `/api`, assets. Unauthenticated → `/login`.
Approved → routed to the role's room (roomForRole). Admin routes additionally
require tier `admin`, checked server-side (defence in depth) — see §7.

### 5. Role views (built on the gate; foundation this ADR ships, rest follow)
- **Reporter**: her beat signals + the overall site snapshot; potential
  sources, beat trends/keywords, prior coverage, competitor coverage; "pitch
  to Bureau Chief" → the CoB's approval queue.
- **Editor (global)**: the strategic snapshot — optimisation health, stories
  performing per surface, topic-assignment coverage; **flag** a story idea /
  stub / competitor piece to a bureau / CoB / regional editor / news editor
  (or all reporters of a bureau).
- **Bureau Chief**: an alerts/approval queue (incoming pitches + editor flags);
  approve → the news editor's newslist.
- **News Editor**: the approved-brief newslist.
- **Story-list dashboard** per bureau, with **cross-bureau filtered views**
  (e.g. every weather story filed anywhere; every Supreme Court story).
- **Newsroom tab** (regional gaps, coverage) — all roles.
- **Standards tab** (GDPR / DPDPA / digital-news compliance points + the
  probity audit "is this an ethical destination?") — all roles.
- **Admin tab** — admins only.

### 6. The editor↔bureau workflow (named tables, follow-on slices)
- `story_flags` (editor → bureau/role/all-of-bureau; with rationale +
  trend/coverage evidence the founder's monsoon example needs).
- `story_pitches` (reporter → CoB; status pending/approved/rejected; approved
  pitch → news editor newslist).
- These are the next slices after the auth foundation.

### 7. Deployment topology (the founder's questions, answered)
- **`onlinejourno.com`** — marketing site, stays on Bluehost; not this app.
- **`try.onlinejourno.com`** — the live demo of *this* Next app on Fly,
  invite-only login (the existing suspended app `onlinejourno-platform`).
- **Backend** — the Python agents + cron run as a **Fly worker/scheduled
  machine** (no public HTTP); the Next app's own `/api` serves the app. A
  public API subdomain (`api.onlinejourno.com`) is only added if/when an
  external API is exposed — not now.
- **Probity engine** (web-bloat-checker) — its own Fly app, reached over Fly
  **private networking** (`PROBITY_URL=http://probity.internal:4870`); not
  public.
- **Dev/staging** — a separate Fly app (`oj-staging` →
  `staging.onlinejourno.com`); local dev stays on localhost. Never share a
  DB with prod.
- **Admin security** — role-gate (tier `admin`, server-checked) is the
  mechanism now; a distinct `admin.` host mapping to the same app with
  admin-only middleware is the hardening step at launch.
- **DB** — Neon free-tier Postgres (the parked decision), `DATABASE_URL` a
  Fly secret. Secrets via Fly secrets / env refs, never in the repo.

## Consequences
- The demo cookie session is replaced; `journalist_profiles`-only sign-in
  retires. Existing 15 profiles get backfilled accounts (approved) so the
  demo keeps working.
- Real security posture: hashed passwords, signed sessions, server-side role
  checks, single-org domain gating.
- SSO and the flagging/pitch workflow are seams + named tables now, built next
  — no faking.

## Anti-patterns refused
- Faked SSO; plaintext or unsigned sessions; client-only role checks.
- Self-registration without approval; cross-org accounts on a single-org
  instance.
- Sharing a database between prod and staging.

## References
- ADR 0053 (lifecycle rooms / roomForRole), 0034 (roles & surfaces),
  0029 (trust primitives), 0042 (vendor-neutral), `infra/schema.sql` (users,
  journalist_profiles), `fly.toml`.
