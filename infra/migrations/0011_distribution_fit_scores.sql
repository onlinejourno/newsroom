-- 0011 — Distribution-fit scores (m-distribution-fit Phase 1, slice 2). Stores
-- the per-signal, per-surface fair-chance score + top fix from the channel
-- scorer (distribution_fit.py). Tenant-scoped; surfaced on /shortlist + brief.

create table if not exists distribution_fit_scores (
  tenant_id  uuid not null references tenants(id) on delete cascade,
  signal_id  uuid not null references signals(id) on delete cascade,
  surface    text not null,                 -- optimization_surfaces.key
  score      int  not null,
  grade      text not null,                 -- A..F
  top_fix    text,
  signals    jsonb,                         -- the per-signal breakdown
  scored_at  timestamptz not null default now(),
  primary key (tenant_id, signal_id, surface)
);

create index if not exists idx_dfit_tenant_signal on distribution_fit_scores (tenant_id, signal_id);
