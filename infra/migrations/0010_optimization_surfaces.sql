-- 0010 — Optimization-surface registry (ADR 0043). The surfaces the back engine
-- scores stories for: built-in (Discover/Search/News/AIO/generative-AI/
-- Subscription/Direct) + custom; add/delete/disable per newsroom. Tenant-scoped;
-- mirrors the source (0008) + connector (0009) registries.

create table if not exists optimization_surfaces (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  key         text not null,   -- stable slug (discover, ai_overviews, …)
  name        text not null,
  category    text not null,   -- discover/search/news/ai/subscription/direct/social/custom
  signals     jsonb,           -- readiness-signal definition the scorer applies (per-surface)
  built_in    boolean not null default false,
  enabled     boolean not null default true,
  sort        int not null default 100,
  created_at  timestamptz not null default now(),
  unique (tenant_id, key)
);

create index if not exists idx_surfaces_tenant_enabled on optimization_surfaces (tenant_id, enabled);

-- Seed the built-in surfaces for every existing tenant (incl. AI surfaces).
insert into optimization_surfaces (tenant_id, key, name, category, built_in, sort)
select t.id, s.key, s.name, s.category, true, s.sort
from tenants t
cross join (values
  ('discover',       'Google Discover', 'discover',     10),
  ('google_search',  'Google Search',   'search',       20),
  ('google_news',    'Google News',     'news',         30),
  ('ai_overviews',   'AI Overviews',    'ai',           40),
  ('chatgpt_search', 'ChatGPT Search',  'ai',           50),
  ('perplexity',     'Perplexity',      'ai',           60),
  ('gemini',         'Gemini',          'ai',           70),
  ('copilot',        'Copilot',         'ai',           80),
  ('subscription',   'Subscription',    'subscription', 90),
  ('direct',         'Direct',          'direct',      100)
) as s(key, name, category, sort)
on conflict (tenant_id, key) do nothing;
