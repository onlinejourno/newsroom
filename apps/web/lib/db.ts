import { Pool, type PoolClient } from "pg";

// Postgres connection pool, singleton across Next.js dev hot-reloads.
//
// All queries here include tenant_id explicitly (ADR 0005). Row-level
// security policies are added in a later migration; until then, every
// callsite must remain explicit about which tenant it is reading.

const globalForPool = globalThis as unknown as { __ojPool?: Pool };

function getPool(): Pool {
  if (!globalForPool.__ojPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Copy .env.local.example to .env and fill it in " +
          "(see infra/migrations/README.md for the local Postgres setup).",
      );
    }
    globalForPool.__ojPool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForPool.__ojPool;
}

export type SignalRow = {
  id: string;
  tenant_id: string;
  source_id: string;
  source_name: string | null;
  url: string;
  headline: string | null;
  body_text: string | null;
  published_at: Date | null;
  fetched_at: Date;
  language: string;
};

export async function tenantIdForSlug(slug: string): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    "select id from tenants where slug = $1",
    [slug],
  );
  return rows[0]?.id ?? null;
}

// ── Data-source admin (sub-project B) ──────────────────────────────────────

export type SourceRow = {
  id: string;
  name: string;
  kind: string;
  family: string | null;
  tier: number | null;
  sections_fed: string[];
  url: string;
  rss_url: string | null;
  geo: string | null;
  frequency: string | null;
  enabled: boolean;
  auth: { method?: string; secret_ref?: string } | null;
  params: Record<string, unknown> | null;
  last_seen_at: Date | null;
  consecutive_failures: number;
};

export type SourceInput = {
  name: string;
  kind: string;
  family?: string | null;
  tier?: number | null;
  sections_fed?: string[];
  url: string;
  rss_url?: string | null;
  geo?: string | null;
  frequency?: string | null;
  auth?: Record<string, unknown> | null;
  params?: Record<string, unknown> | null;
  enabled?: boolean;
};

export async function listSources(tenantId: string): Promise<SourceRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<SourceRow>(
    `select id, name, kind, family, tier, sections_fed, url, rss_url, geo,
            frequency, enabled, auth, params, last_seen_at, consecutive_failures
       from sources
      where tenant_id = $1
      order by coalesce(tier, 9), family nulls last, name`,
    [tenantId],
  );
  return rows;
}

export async function createSource(
  tenantId: string,
  input: SourceInput,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into sources
       (tenant_id, name, kind, family, tier, sections_fed, url, rss_url, geo,
        frequency, auth, params, enabled)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,coalesce($13,true))`,
    [
      tenantId,
      input.name,
      input.kind,
      input.family ?? null,
      input.tier ?? null,
      input.sections_fed ?? [],
      input.url,
      input.rss_url ?? null,
      input.geo ?? null,
      input.frequency ?? null,
      input.auth ? JSON.stringify(input.auth) : null,
      input.params ? JSON.stringify(input.params) : null,
      input.enabled ?? true,
    ],
  );
}

export async function setSourceEnabled(
  tenantId: string,
  id: string,
  enabled: boolean,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "update sources set enabled = $3 where tenant_id = $1 and id = $2",
    [tenantId, id, enabled],
  );
}

export async function deleteSource(tenantId: string, id: string): Promise<void> {
  const pool = getPool();
  await pool.query("delete from sources where tenant_id = $1 and id = $2", [
    tenantId,
    id,
  ]);
}

export async function fetchLatestSignals(
  tenantId: string,
  limit = 20,
): Promise<SignalRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<SignalRow>(
    `
    select s.id, s.tenant_id, s.source_id,
           src.name as source_name,
           s.url, s.headline, s.body_text,
           s.published_at, s.fetched_at, s.language
      from signals s
      join sources src on src.id = s.source_id
     where s.tenant_id = $1
     order by coalesce(s.published_at, s.fetched_at) desc
     limit $2
    `,
    [tenantId, limit],
  );
  return rows;
}

export type BriefSection = {
  heading: string;
  lede_one_liner?: string;
  body?: string;
  signals?: string[];
  search_fit?: { keyword: string; volume: number; trend: string } | null;
};

export type BriefRow = {
  id: string;
  beat_id: string | null;
  edition_date: string;
  composed_at: Date;
  content: {
    sections?: BriefSection[];
    meta?: Record<string, unknown>;
  };
};

export async function fetchLatestBrief(
  tenantId: string,
): Promise<BriefRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<BriefRow>(
    `
    select id, beat_id, edition_date, composed_at, content
      from briefs
     where tenant_id = $1
     order by composed_at desc
     limit 1
    `,
    [tenantId],
  );
  return rows[0] ?? null;
}

export async function fetchSignalUrls(
  tenantId: string,
  signalIds: string[],
): Promise<Map<string, string>> {
  if (signalIds.length === 0) return new Map();
  const pool = getPool();
  const { rows } = await pool.query<{ id: string; url: string }>(
    "select id, url from signals where tenant_id = $1 and id = any($2::uuid[])",
    [tenantId, signalIds],
  );
  return new Map(rows.map((r) => [r.id, r.url]));
}

export type ShortlistRow = {
  signal_id: string;
  score: number;
  rank: number | null;
  rationale: string | null;
  headline: string | null;
  url: string;
  published_at: Date | null;
  source_name: string | null;
  velocity: number;
};

export type ShortlistSort = "importance" | "recency" | "velocity";

const SHORTLIST_ORDER: Record<ShortlistSort, string> = {
  recency: "coalesce(s.published_at, s.fetched_at) desc nulls last, si.score desc",
  velocity: "velocity desc, si.score desc",
  importance: "si.score desc nulls last, si.rank asc nulls last",
};

export async function fetchShortlistRanked(
  tenantId: string,
  { sort = "importance", sinceHours = 24, limit = 25 }:
    { sort?: ShortlistSort; sinceHours?: number; limit?: number } = {},
): Promise<ShortlistRow[]> {
  const pool = getPool();
  // `order` is from a fixed map, never raw user input — safe to interpolate.
  const order = SHORTLIST_ORDER[sort] ?? SHORTLIST_ORDER.importance;
  const { rows } = await pool.query<ShortlistRow>(
    `
    select si.signal_id, si.score, si.rank, si.rationale,
           s.headline, s.url, s.published_at, src.name as source_name,
           count(*) over (partition by coalesce(tl.thread_id, si.id))::int as velocity
      from shortlist_items si
      join signals s on s.id = si.signal_id
      join sources src on src.id = s.source_id
      left join lateral (
          select thread_id from thread_links where signal_id = si.signal_id limit 1
      ) tl on true
     where si.tenant_id = $1
       and (si.decision is null or si.decision <> 'rejected')
       and coalesce(s.published_at, s.fetched_at) >= now() - make_interval(hours => $2)
     order by ${order}
     limit $3
    `,
    [tenantId, sinceHours, limit],
  );
  return rows;
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
