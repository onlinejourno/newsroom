-- 0014 — Real accounts: auth + approval + RBAC (ADR 0055).
-- The demo cookie session retires; `users` becomes the login account, linked
-- to a journalist_profile (newsroom identity).

-- Widen the RBAC tier vocabulary (admin/editor/desk/reporter/viewer).
alter table users drop constraint if exists users_role_check;
alter table users
  add column if not exists password_hash text,
  add column if not exists status text not null default 'pending',
  add column if not exists bureau text,
  add column if not exists profile_id uuid references journalist_profiles(id) on delete set null,
  add column if not exists invited_by uuid references users(id) on delete set null,
  add column if not exists approved_at timestamptz,
  add column if not exists last_login_at timestamptz;

alter table users
  add constraint users_role_check
  check (role in ('admin','editor','desk','reporter','viewer'));
alter table users
  add constraint users_status_check
  check (status in ('invited','pending','approved','rejected','suspended'));

-- Invitations: admin issues a token; accepting it creates an APPROVED account.
create table if not exists invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  email       text not null,
  role        text not null default 'reporter',
  bureau      text,
  token       text not null unique,
  invited_by  uuid references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  unique (tenant_id, email)
);

-- Single-org instance: the email domain self-registration is allowed from.
-- Stored on the tenant config; surfaced here as a comment for operators.
-- e.g. update tenants set config = config || '{"email_domain":"thehindu.co.in"}';
