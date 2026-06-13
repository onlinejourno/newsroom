-- 0016 — Calendar events: the Predictive Editorial Calendar store (ADR 0057).
-- One row per time-bound promise the Claim Extractor (LLM) pulls from the
-- inflow. The deadline phrase is resolved to `target_date` + `precision` by the
-- (pure) Date Normaliser at write time; status/lead-time band are computed at
-- read time by the Calendar Engine relative to "today", so they never go stale.
create table if not exists calendar_event (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references tenants(id) on delete cascade,
  -- the PRD event shape: who · what · deadline · date_claimed · source · claim · confidence · topic
  who                 text,                 -- the actor who made the promise
  what                text not null,        -- what was promised
  deadline_text       text,                 -- the original deadline phrase ("by June")
  date_claimed        date,                 -- when the claim was made (normalisation reference)
  target_date         date,                 -- Date Normaliser output; null if unresolved
  precision           text not null default 'none'
                        check (precision in ('day','month','quarter','year','fiscal_year','none')),
  source_link         text,
  original_claim_text text,                 -- the sentence the claim came from
  confidence          real,                 -- 0..1 from the extractor
  topic               text,                 -- beat / topic
  signal_id           uuid references signals(id) on delete set null,
  lead_id             uuid references story_leads(id) on delete set null,  -- fusion (ADR 0057): commission / accountability lead
  outcome             text check (outcome in ('delivered','broken','dropped')),  -- human accountability close; null = open
  claim_key           text not null,        -- stable dedup key (who|what|deadline|source), set by the extractor
  extractor_version   text,
  created_at          timestamptz not null default now(),
  unique (tenant_id, claim_key)             -- idempotent re-runs: upsert on the same claim
);
-- Forward calendar + past-due queue both sort/filter on the resolved date.
create index if not exists idx_calevent_tenant_target on calendar_event (tenant_id, target_date);
-- The accountability queue scans open (un-closed) events.
create index if not exists idx_calevent_open on calendar_event (tenant_id, outcome) where outcome is null;
