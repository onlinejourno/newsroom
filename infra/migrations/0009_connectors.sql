-- 0009 — Connector registry (sub-project C, ADR 0044). Pluggable newsroom data
-- tools (analytics/keywords/search_console/trends/subscription/social), each via
-- API or MCP, tenant-scoped. Mirrors the source registry (0008).

create table if not exists connectors (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references tenants(id) on delete cascade,
  category    text not null,   -- analytics/keywords/search_console/trends/subscription/social
  provider    text not null,   -- ga4/chartbeat/piano/keywords_everywhere/newzdash/gsc/matomo/seopanel/google_trends/custom
  mode        text not null check (mode in ('api','mcp')),
  config      jsonb,           -- provider config (ids, endpoints, params)
  auth        jsonb,           -- {method, secret_ref} — never the raw key
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (tenant_id, category, provider)
);

create index if not exists idx_connectors_tenant_category on connectors (tenant_id, category);
