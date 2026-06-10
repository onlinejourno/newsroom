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
  beat: string | null;
  region: string | null;
  district: string | null;
  enrichment: {
    analyse?: { entities?: string[] | null; summary?: string | null };
    classify?: {
      beat?: string | null;
      topic?: string | null;
      user_need?: string | null;
    };
    framing?: {
      frame?: string | null;
      frame_group?: string | null;
      rationale?: string | null;
    };
  } | null;
};

// Reader-need mix over classified signals (ADR 0049 need-mix view).
export type NeedMixRow = { user_need: string; n: number };

export async function needMixCounts(
  tenantId: string,
  windowHours = 168,
): Promise<NeedMixRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<NeedMixRow>(
    `
    select enrichment->'classify'->>'user_need' as user_need, count(*)::int as n
      from signals
     where tenant_id = $1
       and enrichment->'classify'->>'user_need' is not null
       and coalesce(published_at, fetched_at) >= now() - make_interval(hours => $2)
     group by 1
     order by 2 desc
    `,
    [tenantId, windowHours],
  );
  return rows;
}

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

// ── Connectors (sub-project C) ─────────────────────────────────────────────

export type ConnectorRow = {
  id: string;
  category: string;
  provider: string;
  mode: string;
  config: Record<string, unknown> | null;
  auth: { method?: string; secret_ref?: string } | null;
  enabled: boolean;
};

export type ConnectorInput = {
  category: string;
  provider: string;
  mode: string;
  config?: Record<string, unknown> | null;
  auth?: Record<string, unknown> | null;
  enabled?: boolean;
};

export async function listConnectors(tenantId: string): Promise<ConnectorRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ConnectorRow>(
    `select id, category, provider, mode, config, auth, enabled
       from connectors
      where tenant_id = $1
      order by category, provider`,
    [tenantId],
  );
  return rows;
}

export async function upsertConnector(
  tenantId: string,
  input: ConnectorInput,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into connectors (tenant_id, category, provider, mode, config, auth, enabled)
     values ($1,$2,$3,$4,$5,$6,coalesce($7,true))
     on conflict (tenant_id, category, provider) do update
       set mode = excluded.mode, config = excluded.config,
           auth = excluded.auth, enabled = excluded.enabled`,
    [
      tenantId,
      input.category,
      input.provider,
      input.mode,
      input.config ? JSON.stringify(input.config) : null,
      input.auth ? JSON.stringify(input.auth) : null,
      input.enabled ?? true,
    ],
  );
}

export async function setConnectorEnabled(
  tenantId: string,
  id: string,
  enabled: boolean,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "update connectors set enabled = $3 where tenant_id = $1 and id = $2",
    [tenantId, id, enabled],
  );
}

export async function deleteConnector(
  tenantId: string,
  id: string,
): Promise<void> {
  const pool = getPool();
  await pool.query("delete from connectors where tenant_id = $1 and id = $2", [
    tenantId,
    id,
  ]);
}

// ── Optimization surfaces (ADR 0043) ───────────────────────────────────────

export type SurfaceRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  enabled: boolean;
  built_in: boolean;
  sort: number;
};

export async function listSurfaces(tenantId: string): Promise<SurfaceRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<SurfaceRow>(
    `select id, key, name, category, enabled, built_in, sort
       from optimization_surfaces
      where tenant_id = $1
      order by sort, name`,
    [tenantId],
  );
  return rows;
}

export async function createSurface(
  tenantId: string,
  input: { key: string; name: string; category: string; signals?: Record<string, unknown> | null },
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into optimization_surfaces (tenant_id, key, name, category, signals, built_in)
     values ($1,$2,$3,$4,$5,false)
     on conflict (tenant_id, key) do update
       set name = excluded.name, category = excluded.category, signals = excluded.signals`,
    [
      tenantId,
      input.key,
      input.name,
      input.category,
      input.signals ? JSON.stringify(input.signals) : null,
    ],
  );
}

export async function setSurfaceEnabled(
  tenantId: string,
  id: string,
  enabled: boolean,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "update optimization_surfaces set enabled = $3 where tenant_id = $1 and id = $2",
    [tenantId, id, enabled],
  );
}

export async function deleteSurface(tenantId: string, id: string): Promise<void> {
  const pool = getPool();
  await pool.query(
    "delete from optimization_surfaces where tenant_id = $1 and id = $2",
    [tenantId, id],
  );
}

// ── Journalist directory ───────────────────────────────────────────────────

export type JournalistRow = {
  id: string;
  slug: string;
  name: string;
  bureau: string | null;
  region: string | null;
  beats: string[] | null;
  role: string | null;
  language: string | null;
};

export async function listJournalists(tenantId: string): Promise<JournalistRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<JournalistRow>(
    `select id, slug, name, bureau, region, beats, role, language
       from journalist_profiles
      where tenant_id = $1
      order by name`,
    [tenantId],
  );
  return rows;
}

export async function journalistBySlug(
  tenantId: string,
  slug: string,
): Promise<JournalistRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<JournalistRow>(
    `select id, slug, name, bureau, region, beats, role, language
       from journalist_profiles
      where tenant_id = $1 and slug = $2`,
    [tenantId, slug],
  );
  return rows[0] ?? null;
}

// The reporter's inflow (mirrors agents-py signals_for_journalist): an enriched
// signal reaches her when its beat is one of her beats, or its geography
// (region/district) is her region.
export async function signalsForJournalist(
  tenantId: string,
  journalistId: string,
  sinceHours = 72,
  limit = 30,
): Promise<SignalRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<SignalRow>(
    `
    select s.id, s.tenant_id, s.source_id,
           src.name as source_name,
           s.url, s.headline, s.body_text,
           s.published_at, s.fetched_at, s.language,
           s.beat, s.region, s.district, s.enrichment
      from signals s
      join sources src on src.id = s.source_id,
           journalist_profiles j
     where s.tenant_id = $1 and j.tenant_id = $1 and j.id = $2
       and s.enrichment is not null
       and (
            (s.beat is not null and j.beats ? s.beat)
         or (s.region is not null and j.region is not null
             and lower(s.region) = lower(j.region))
         or (s.district is not null and j.region is not null
             and lower(s.district) = lower(j.region))
       )
       and coalesce(s.published_at, s.fetched_at)
           >= now() - make_interval(hours => $3)
     order by coalesce(s.published_at, s.fetched_at) desc
     limit $4
    `,
    [tenantId, journalistId, sinceHours, limit],
  );
  return rows;
}

export async function fetchLatestSignals(
  tenantId: string,
  limit = 20,
  beat?: string | null,
  primaryOnly = false,
): Promise<SignalRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<SignalRow>(
    `
    select s.id, s.tenant_id, s.source_id,
           src.name as source_name,
           s.url, s.headline, s.body_text,
           s.published_at, s.fetched_at, s.language,
           s.beat, s.region, s.district, s.enrichment
      from signals s
      join sources src on src.id = s.source_id
     where s.tenant_id = $1
       and ($3::text is null or s.beat = $3)
       and ($4::bool is false or src.family is distinct from 'msm_test')
     order by coalesce(s.published_at, s.fetched_at) desc
     limit $2
    `,
    [tenantId, limit, beat ?? null, primaryOnly],
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

export type FitScore = {
  surface: string;
  grade: string;
  score: number;
  top_fix: string | null;
};

// Distribution-fit scores for a set of own stories (ADR 0046 — story-keyed).
export async function fetchDistributionFit(
  tenantId: string,
  storyIds: string[],
): Promise<Map<string, FitScore[]>> {
  const map = new Map<string, FitScore[]>();
  if (storyIds.length === 0) return map;
  const pool = getPool();
  const { rows } = await pool.query<FitScore & { story_id: string }>(
    `select story_id, surface, grade, score, top_fix
       from distribution_fit_scores
      where tenant_id = $1 and story_id = any($2::uuid[])
      order by surface`,
    [tenantId, storyIds],
  );
  for (const r of rows) {
    const arr = map.get(r.story_id) ?? [];
    arr.push({ surface: r.surface, grade: r.grade, score: r.score, top_fix: r.top_fix });
    map.set(r.story_id, arr);
  }
  return map;
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

// ── Story Scores (m-distribution-fit dashboard) ─────────────────────────────

export type ScoredStoryRow = {
  id: string;
  headline: string | null;
  url: string | null;
  section: string | null;
  beat: string | null;
  published_at: Date | null;
  scores: Record<
    string,
    { score: number; grade: string; top_fix: string | null }
  >;
};

export async function storiesWithScores(
  tenantId: string,
  limit = 200,
): Promise<ScoredStoryRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ScoredStoryRow>(
    `
    select st.id, st.headline, st.url, st.section, st.beat, st.published_at,
           jsonb_object_agg(
             d.surface,
             jsonb_build_object('score', d.score, 'grade', d.grade,
                                'top_fix', d.top_fix)
           ) as scores
      from stories st
      join distribution_fit_scores d
        on d.tenant_id = st.tenant_id and d.story_id = st.id
     where st.tenant_id = $1
     group by st.id
     order by max(d.scored_at) desc
     limit $2
    `,
    [tenantId, limit],
  );
  return rows;
}

export async function distinctSignalBeats(tenantId: string): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ beat: string }>(
    `select distinct beat from signals
      where tenant_id = $1 and beat is not null order by beat`,
    [tenantId],
  );
  return rows.map((r) => r.beat);
}

// Per-signal entity lists in a window (for topic momentum). Two calls give
// the recent/prior windows.
export async function entityWindows(
  tenantId: string,
  fromHoursAgo: number,
  toHoursAgo: number,
  region?: string | null,
): Promise<string[][]> {
  const pool = getPool();
  const { rows } = await pool.query<{ entities: string[] | null }>(
    `
    select coalesce(
             (select array_agg(e) from jsonb_array_elements_text(
                enrichment->'analyse'->'entities') as e), '{}'
           ) as entities
      from signals
     where tenant_id = $1
       and enrichment->'analyse'->'entities' is not null
       and ($4::text is null or lower(region) = lower($4))
       and coalesce(published_at, fetched_at)
           between now() - make_interval(hours => $2)
               and now() - make_interval(hours => $3)
    `,
    [tenantId, fromHoursAgo, toHoursAgo, region ?? null],
  );
  return rows.map((r) => r.entities ?? []);
}

// Recent signals mentioning an entity (topic drill-down on /trends).
export async function signalsMentioning(
  tenantId: string,
  entity: string,
  sinceHours: number,
  limit = 5,
): Promise<{ id: string; headline: string | null; url: string }[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    select id, headline, url
      from signals
     where tenant_id = $1
       and enrichment->'analyse'->'entities' @> to_jsonb(array[$2::text])
       and coalesce(published_at, fetched_at) >= now() - make_interval(hours => $3)
     order by coalesce(published_at, fetched_at) desc
     limit $4
    `,
    [tenantId, entity, sinceHours, limit],
  );
  return rows;
}

// Which domains own coverage of a topic in our corpus (Topic -> Domains).
export async function topicDomains(
  tenantId: string,
  entity: string,
  sinceHours: number,
  limit = 6,
): Promise<{ host: string; n: number }[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ host: string; n: number }>(
    `
    select regexp_replace(substring(url from 'https?://([^/]+)'), '^www\\.', '')
             as host,
           count(*)::int as n
      from signals
     where tenant_id = $1
       and enrichment->'analyse'->'entities' @> to_jsonb(array[$2::text])
       and coalesce(published_at, fetched_at) >= now() - make_interval(hours => $3)
     group by 1
     order by 2 desc
     limit $4
    `,
    [tenantId, entity, sinceHours, limit],
  );
  return rows;
}

export async function distinctSignalRegions(
  tenantId: string,
): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ region: string }>(
    `select distinct region from signals
      where tenant_id = $1 and region is not null order by region`,
    [tenantId],
  );
  return rows.map((r) => r.region);
}
