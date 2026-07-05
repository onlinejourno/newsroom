-- 0012 — L0 backbone migration #1 (ADR 0046): the `stories` object (own content)
-- + repoint distribution_fit_scores from signal -> story. Distribution-fit / the
-- Channel Audit / the fair-chance audit target the newsroom's OWN article, not
-- external discovery signals (the signal-vs-story fix).

create table if not exists stories (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references tenants(id) on delete cascade,
  author_id    uuid references journalist_profiles(id) on delete set null,
  source_id    uuid references sources(id) on delete set null,   -- the 'own' source (CMS/sitemap)
  cms_ref      text,                                             -- the CMS id for this article
  url          text,
  headline     text,
  body_text    text,
  section      text,                                             -- IA placement (fair-chance: blackhole?)
  beat         text,
  status       text not null default 'draft' check (status in ('draft','published')),
  published_at timestamptz,
  enrichment   jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_stories_tenant_status on stories (tenant_id, status, published_at desc);

-- Repoint distribution_fit_scores to the own story. The prior signal-keyed rows
-- were the wrong target — drop them.
truncate distribution_fit_scores;
drop index if exists idx_dfit_tenant_signal;
alter table distribution_fit_scores drop column signal_id cascade;     -- drops the old PK
alter table distribution_fit_scores
  add column story_id uuid not null references stories(id) on delete cascade;
alter table distribution_fit_scores add primary key (tenant_id, story_id, surface);
create index if not exists idx_dfit_tenant_story on distribution_fit_scores (tenant_id, story_id);
