import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

// Postgres connection pool, singleton across Next.js dev hot-reloads.
//
// Tenant isolation TODAY is the explicit `where tenant_id = $1` in every query —
// that filter is the SOLE boundary. RLS (ADR 0005) is the *intended* defence-in-
// depth backstop: withTenant()/tquery() below pin app.current_tenant for the
// policies. But RLS is NOT currently active — migration 0025 is unapplied (it
// sits in optional/), 0026 disables RLS, and no query path yet routes through
// withTenant()/tquery(). To enable the backstop: apply 0025 and route reads
// through tquery(). Until then, a single forgotten tenant_id filter crosses
// tenants silently. (Security audit 2026-06-30.)

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

/**
 * Run `fn` with the tenant pinned for row-level security. Opens a transaction
 * and sets `app.current_tenant` LOCAL — transaction-scoped, so it CANNOT leak
 * to the next request that reuses this pooled connection. The RLS policies in
 * migration 0025 filter every tenant-scoped table by
 * current_setting('app.current_tenant'); the explicit `where tenant_id = $1`
 * in each query stays as belt-and-suspenders (and keeps queries correct while
 * RLS is still off).
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    // Parameterised — SET LOCAL itself takes no params, set_config() does.
    await client.query("select set_config('app.current_tenant', $1, true)", [tenantId]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Single tenant-scoped query (the common case). Wraps withTenant. */
export async function tquery<T extends QueryResultRow>(
  tenantId: string,
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return withTenant(tenantId, (c) => c.query<T>(text, params));
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

export async function tenantSlugForId(tenantId: string): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ slug: string }>(
    "select slug from tenants where id = $1",
    [tenantId],
  );
  return rows[0]?.slug ?? null;
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

/** Admin-configured surfaces — keys of enabled optimization_surfaces rows (ADR 0043). */
export async function enabledSurfaceKeys(tenantId: string): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ key: string }>(
    "select key from optimization_surfaces where tenant_id = $1 and enabled = true order by sort",
    [tenantId],
  );
  return rows.map((r) => r.key);
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
       and ($4::bool is false or coalesce(src.family,'') not in ('msm_test','competitor','own_site'))
     order by coalesce(s.published_at, s.fetched_at) desc
     limit $2
    `,
    [tenantId, limit, beat ?? null, primaryOnly],
  );
  return rows;
}

// Predictive Editorial Calendar events (ADR 0057). target_date/date_claimed
// come back from pg as Date (local midnight); lib/calendar.ts normalises them.
export type CalendarEventRow = {
  id: string;
  who: string | null;
  what: string;
  deadline_text: string | null;
  date_claimed: Date | string | null;
  target_date: Date | string | null;
  precision: string;
  source_link: string | null;
  original_claim_text: string | null;
  confidence: number | null;
  topic: string | null;
  signal_id: string | null;
  lead_id: string | null;
  outcome: string | null;
  pitch_weight: number | null;
  pitch_why: string | null;
};

export async function fetchCalendarEvents(
  tenantId: string,
  limit = 500,
): Promise<CalendarEventRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<CalendarEventRow>(
    `select ce.id, ce.who, ce.what, ce.deadline_text, ce.date_claimed, ce.target_date,
            ce.precision, ce.source_link, ce.original_claim_text, ce.confidence,
            ce.topic, ce.signal_id, ce.lead_id, ce.outcome,
            sl.pitch_weight, sl.pitch_why
       from calendar_event ce
       left join story_leads sl on sl.id = ce.lead_id and sl.tenant_id = ce.tenant_id
      where ce.tenant_id = $1
      order by (ce.target_date is null), ce.target_date asc
      limit $2`,
    [tenantId, limit],
  );
  return rows;
}

export async function calendarEventById(
  tenantId: string,
  id: string,
): Promise<CalendarEventRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<CalendarEventRow>(
    `select id, who, what, deadline_text, date_claimed, target_date, precision,
            source_link, original_claim_text, confidence, topic, signal_id,
            lead_id, outcome
       from calendar_event
      where tenant_id = $1 and id = $2`,
    [tenantId, id],
  );
  return rows[0] ?? null;
}

export async function linkCalendarEventLead(
  tenantId: string,
  eventId: string,
  leadId: string,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    "update calendar_event set lead_id = $3 where tenant_id = $1 and id = $2",
    [tenantId, eventId, leadId],
  );
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
  beatSlug?: string | null,
): Promise<BriefRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<BriefRow>(
    `
    select b.id, b.beat_id, b.edition_date, b.composed_at, b.content
      from briefs b
      left join beats bt on bt.id = b.beat_id
     where b.tenant_id = $1
       and ($2::text is null or bt.slug = $2)
     order by b.composed_at desc
     limit 1
    `,
    [tenantId, beatSlug ?? null],
  );
  return rows[0] ?? null;
}

export async function listBeats(
  tenantId: string,
): Promise<{ slug: string; name: string }[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    "select slug, name from beats where tenant_id = $1 order by name",
    [tenantId],
  );
  return rows;
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
  placement: {
    homepage?: boolean;
    listed_in?: string[];
    only_in_subsection?: boolean;
    checked_at?: string;
  } | null;
  scores: Record<
    string,
    {
      score: number;
      grade: string;
      top_fix: string | null;
      signals?: { name: string; value: number; max: number; note: string }[];
    }
  >;
};

export async function storiesWithScores(
  tenantId: string,
  limit = 200,
  sinceHours?: number | null,
): Promise<ScoredStoryRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ScoredStoryRow>(
    `
    select st.id, st.headline, st.url, st.section, st.beat, st.published_at,
           st.enrichment->'placement' as placement,
           jsonb_object_agg(
             d.surface,
             jsonb_build_object('score', d.score, 'grade', d.grade,
                                'top_fix', d.top_fix, 'signals', d.signals)
           ) as scores
      from stories st
      join distribution_fit_scores d
        on d.tenant_id = st.tenant_id and d.story_id = st.id
     where st.tenant_id = $1
       and ($3::int is null or
            coalesce(st.published_at, st.created_at)
              >= now() - make_interval(hours => $3))
     group by st.id
     order by max(d.scored_at) desc
     limit $2
    `,
    [tenantId, limit, sinceHours ?? null],
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

// Single signal with its source row (the provenance trail on /signal/[id]).
export async function signalById(
  tenantId: string,
  id: string,
): Promise<
  | (SignalRow & {
      trend_score: number | null;
      source_family: string | null;
      source_kind: string | null;
      source_url: string | null;
    })
  | null
> {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    select s.id, s.tenant_id, s.source_id, src.name as source_name,
           s.url, s.headline, s.body_text, s.published_at, s.fetched_at,
           s.language, s.beat, s.region, s.district, s.enrichment,
           s.trend_score,
           src.family as source_family, src.kind as source_kind,
           src.url as source_url
      from signals s
      join sources src on src.id = s.source_id
     where s.tenant_id = $1 and s.id = $2
    `,
    [tenantId, id],
  );
  return rows[0] ?? null;
}

// Reverse routing: which journalists this signal reaches (beat or place match
// — the same predicate as signalsForJournalist, inverted).
export async function journalistsForSignal(
  tenantId: string,
  signalId: string,
): Promise<{ slug: string; name: string }[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    select j.slug, j.name
      from journalist_profiles j, signals s
     where j.tenant_id = $1 and s.tenant_id = $1 and s.id = $2
       and (
            (s.beat is not null and j.beats ? s.beat)
         or (s.region is not null and j.region is not null
             and lower(s.region) = lower(j.region))
         or (s.district is not null and j.region is not null
             and lower(s.district) = lower(j.region))
       )
     order by j.name
    `,
    [tenantId, signalId],
  );
  return rows;
}

// Regional Gaps (EIP editor view): where signals flow vs where reporters are.
export type RegionCoverageRow = {
  region: string;
  signals7d: number;
  reporters: number;
  reporter_names: string | null;
};

export async function regionCoverage(
  tenantId: string,
): Promise<RegionCoverageRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<RegionCoverageRow>(
    `
    with sig as (
      select region, count(*)::int as n
        from signals
       where tenant_id = $1 and region is not null
         and coalesce(published_at, fetched_at) >= now() - interval '7 days'
       group by 1
    ),
    rep as (
      select region, count(*)::int as r,
             string_agg(name, ', ' order by name) as names
        from journalist_profiles
       where tenant_id = $1 and region is not null
       group by 1
    )
    select coalesce(s.region, p.region) as region,
           coalesce(s.n, 0) as signals7d,
           coalesce(p.r, 0) as reporters,
           p.names as reporter_names
      from sig s
      full outer join rep p on lower(s.region) = lower(p.region)
     order by coalesce(s.n, 0) desc, region
    `,
    [tenantId],
  );
  return rows;
}

// Coverage Gap Matrix (ADR 0054-A): per beat — enabled sources (and how many
// are primary, i.e. not msm_test), and 7-day signal flow.
export type CoverageRow = {
  beat: string;
  src_enabled: number;
  src_primary: number;
  src_names: string | null;
  signals7d: number;
};

export async function coverageMatrix(tenantId: string): Promise<CoverageRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<CoverageRow>(
    `
    with feeds as (
      select unnest(sections_fed) as beat,
             count(*) filter (where enabled)::int as src_enabled,
             count(*) filter (
               where enabled and coalesce(family,'') <> 'msm_test'
             )::int as src_primary,
             string_agg(name, ', ' order by name)
               filter (where enabled) as src_names
        from sources
       where tenant_id = $1
       group by 1
    ),
    flow as (
      select beat, count(*)::int as n
        from signals
       where tenant_id = $1 and beat is not null
         and coalesce(published_at, fetched_at) >= now() - interval '7 days'
       group by 1
    )
    select coalesce(f.beat, fl.beat) as beat,
           coalesce(f.src_enabled, 0) as src_enabled,
           coalesce(f.src_primary, 0) as src_primary,
           f.src_names,
           coalesce(fl.n, 0) as signals7d
      from feeds f
      full outer join flow fl on f.beat = fl.beat
     order by 1
    `,
    [tenantId],
  );
  return rows;
}

// Own stories' classification for the Differentiation Ratio (ADR 0054-B).
export async function storyClassifications(
  tenantId: string,
): Promise<{ frame: string | null; user_need: string | null }[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `
    select enrichment->'framing'->>'frame' as frame,
           enrichment->'classify'->>'user_need' as user_need
      from stories
     where tenant_id = $1
       and (enrichment->'framing' is not null
            or enrichment->'classify' is not null)
    `,
    [tenantId],
  );
  return rows;
}

export async function storyCount(tenantId: string): Promise<number> {
  const pool = getPool();
  const { rows } = await pool.query<{ n: number }>(
    "select count(*)::int as n from stories where tenant_id = $1",
    [tenantId],
  );
  return rows[0]?.n ?? 0;
}

// EIP onboarding (3 questions, under 2 minutes): create the journalist whose
// district/beats drive routing from the next collect run.
export async function createJournalist(
  tenantId: string,
  input: {
    slug: string;
    name: string;
    region: string;
    beats: string[];
    role: string;
    language: string;
  },
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into journalist_profiles
       (tenant_id, slug, name, region, beats, role, language)
     values ($1,$2,$3,$4,$5,$6,$7)
     on conflict (tenant_id, slug) do update
       set region = excluded.region, beats = excluded.beats,
           role = excluded.role, language = excluded.language`,
    [
      tenantId,
      input.slug,
      input.name,
      input.region,
      JSON.stringify(input.beats),
      input.role,
      input.language,
    ],
  );
}

// m-archive v1 (ADR 0042): the newsroom's prior coverage of a signal's
// entities — top matches by shared-entity count from own stories. The OSS
// stand-in for a digitised archive (Sarvajna-class systems plug in via the
// connector seam later); v1 is deterministic entity overlap, no embeddings.
export async function archiveMatches(
  tenantId: string,
  entities: string[],
  limit = 3,
): Promise<
  { id: string; headline: string | null; url: string | null; overlap: number }[]
> {
  if (entities.length === 0) return [];
  const pool = getPool();
  const { rows } = await pool.query(
    `
    select id, headline, url,
           (select count(*) from jsonb_array_elements_text(
              enrichment->'analyse'->'entities') e
             where e = any($2::text[]))::int as overlap
      from stories
     where tenant_id = $1
       and enrichment->'analyse'->'entities' is not null
     order by overlap desc, coalesce(published_at, created_at) desc
     limit $3
    `,
    [tenantId, entities, limit],
  );
  return rows.filter((r: { overlap: number }) => r.overlap > 0);
}

// ── Potential scoring helpers (Slice-2 Task 2) ────────────────────────────────

// The outlet's ISO region code (e.g. "IN") for market-relevance scoring.
export async function tenantRegion(tenantId: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ region: string | null }>(
    "select region from tenants where id = $1",
    [tenantId],
  );
  return rows[0]?.region ?? "IN";
}

/** The outlet's primary domain from tenant config (vendor-neutral — no hardcoded
 *  masthead; the demo tenant's value is seeded via demo_sources.sql).
 *  Empty string when unset, so callers degrade gracefully. */
export async function tenantOutletDomain(tenantId: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ domain: string | null }>(
    "select config->>'domain' as domain from tenants where id = $1",
    [tenantId],
  );
  return rows[0]?.domain ?? "";
}

/** The newsroom's city from tenant config (vendor-neutral; empty when unset). */
export async function tenantCity(tenantId: string): Promise<string> {
  const pool = getPool();
  const { rows } = await pool.query<{ city: string | null }>(
    "select config->>'city' as city from tenants where id = $1",
    [tenantId],
  );
  return rows[0]?.city ?? "";
}

// A story row pre-shaped for scorePotential (published stories only).
export type ScorableStoryRow = {
  id: string;
  url: string | null;
  headline: string | null;
  published_at: Date | null;
  section: string | null;
  /** enrichment->'classify'->>'region' — mirrors how storyClassifications reads classify. */
  region: string | null;
  entities: string[];
};

// Published stories in the last `hours` window, with the fields scorePotential
// needs. The region comes from enrichment->'classify'->>'region' (the same
// classify sub-object that storyClassifications reads for beat/topic/user_need).
// Entities are extracted from enrichment->'analyse'->'entities' (the same path
// archiveMatches and entityWindows use).
export async function publishedStoriesForScoring(
  tenantId: string,
  hours = 168,
): Promise<ScorableStoryRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<
    Omit<ScorableStoryRow, "entities"> & { entities: unknown }
  >(
    `
    select id, url, headline, published_at, section,
           enrichment->'classify'->>'region' as region,
           coalesce(enrichment->'analyse'->'entities', '[]'::jsonb) as entities
      from stories
     where tenant_id = $1
       and status = 'published'
       and coalesce(published_at, created_at) >= now() - make_interval(hours => $2)
     order by coalesce(published_at, created_at) desc
    `,
    [tenantId, hours],
  );
  return rows.map((r) => ({
    ...r,
    entities: Array.isArray(r.entities)
      ? (r.entities as string[])
      : typeof r.entities === "string"
        ? (JSON.parse(r.entities) as string[])
        : [],
  }));
}

// ── SEO / E-E-A-T audit cache (Story Analyser, Task 13) ──────────────────────
// Keyed by (tenant_id, url) so arbitrary URLs can be audited independently of
// whether they correspond to a stored story. story_id is set when the URL IS a
// known story (allows joining back to distribution_fit_scores etc.).

export type SeoAuditRow = { url: string; audit: unknown; computed_at: Date };

export async function seoAuditForUrl(
  tenantId: string,
  url: string,
): Promise<SeoAuditRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<SeoAuditRow>(
    "select url, audit, computed_at from seo_audit where tenant_id = $1 and url = $2",
    [tenantId, url],
  );
  return rows[0] ?? null;
}

export async function upsertSeoAudit(
  tenantId: string,
  url: string,
  audit: unknown,
  storyId: string | null = null,
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into seo_audit (tenant_id, url, story_id, audit, computed_at)
     values ($1, $2, $3, $4, now())
     on conflict (tenant_id, url)
       do update set audit = excluded.audit, story_id = excluded.story_id, computed_at = now()`,
    [tenantId, url, storyId, JSON.stringify(audit)],
  );
}

// ── Local Pulse (IA realignment) ────────────────────────────────────────────

// Regional trending from the platform's own geo-tagged signals (NOT Google
// Trends). Groups signals by region, counts entity occurrences within each
// region, and returns the top topics sorted by signal volume descending.

export type RegionalPulse = {
  region: string;
  signalCount: number;
  topics: { topic: string; count: number }[];
}[];

export async function regionalPulse(
  tenantId: string,
  hours = 48,
  topPerRegion = 8,
): Promise<RegionalPulse> {
  const pool = getPool();
  const { rows } = await pool.query<{
    region: string;
    entities: unknown;
  }>(
    `
    select region,
           coalesce(enrichment->'analyse'->'entities', '[]'::jsonb) as entities
      from signals
     where tenant_id = $1
       and region is not null
       and region <> ''
       and coalesce(published_at, fetched_at) >= now() - make_interval(hours => $2)
    `,
    [tenantId, hours],
  );

  // Group by region: accumulate entity counts and signal count.
  const byRegion = new Map<string, { signalCount: number; counts: Map<string, number> }>();

  for (const row of rows) {
    const r = row.region;
    let entry = byRegion.get(r);
    if (!entry) {
      entry = { signalCount: 0, counts: new Map() };
      byRegion.set(r, entry);
    }
    entry.signalCount += 1;

    // Coerce entities: pg driver may return a parsed array or a JSON string.
    const entities: string[] = Array.isArray(row.entities)
      ? (row.entities as string[])
      : typeof row.entities === "string"
        ? (JSON.parse(row.entities) as string[])
        : [];

    for (const raw of entities) {
      const topic = raw.trim().toLowerCase();
      if (!topic) continue;
      entry.counts.set(topic, (entry.counts.get(topic) ?? 0) + 1);
    }
  }

  // Build output: top `topPerRegion` topics per region, sorted by signalCount desc.
  return Array.from(byRegion.entries())
    .map(([region, { signalCount, counts }]) => ({
      region,
      signalCount,
      topics: Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, topPerRegion)
        .map(([topic, count]) => ({ topic, count })),
    }))
    .sort((a, b) => b.signalCount - a.signalCount);
}

// ── Topic→Domains cache (Story Scores competitor authority) ──────────────────
// Backed by the topic_domains table (migration 0021). TTL checked in-process;
// upsert normalises topic to lowercase so lookups are case-insensitive.

export type TopicDomainRow = { domain: string; count: number };

/** Cached top-domains for a topic; null when missing or staler than ttlHours. */
export async function cachedTopicDomains(
  tenantId: string,
  topic: string,
  ttlHours = 12,
): Promise<{ source: string | null; domains: TopicDomainRow[] } | null> {
  const pool = getPool();
  const { rows } = await pool.query<{
    source: string | null;
    domains: unknown;
    computed_at: Date;
  }>(
    "select source, domains, computed_at from topic_domains where tenant_id = $1 and topic = $2",
    [tenantId, topic.toLowerCase().trim()],
  );
  const row = rows[0];
  if (!row) return null;
  const ageH = (Date.now() - new Date(row.computed_at).getTime()) / 3_600_000;
  if (ageH > ttlHours) return null;
  const domains = Array.isArray(row.domains)
    ? (row.domains as TopicDomainRow[])
    : typeof row.domains === "string"
      ? (JSON.parse(row.domains) as TopicDomainRow[])
      : [];
  return { source: row.source, domains };
}

export async function upsertTopicDomains(
  tenantId: string,
  topic: string,
  source: string | null,
  domains: TopicDomainRow[],
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into topic_domains (tenant_id, topic, source, domains, computed_at)
     values ($1, $2, $3, $4, now())
     on conflict (tenant_id, topic)
       do update set source = excluded.source, domains = excluded.domains, computed_at = now()`,
    [tenantId, topic.toLowerCase().trim(), source, JSON.stringify(domains)],
  );
}

// ── Outlet Keywords cache (Trends-enrichment Task 1) ─────────────────────────
// Backed by the outlet_keywords table (migration 0022). TTL checked in-process.
// keywords jsonb stores OutletKeyword[]; coerced safely (never `any`).

export type OutletKeyword = {
  keyword: string;
  vol?: number;
  cpc?: number;
  competition?: number;
  position?: number;
};

/** Cached ranking keywords for an outlet domain; null when missing or stale. */
export async function cachedOutletKeywords(
  tenantId: string,
  domain: string,
  ttlHours = 72,
): Promise<OutletKeyword[] | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ keywords: unknown; computed_at: Date }>(
    "select keywords, computed_at from outlet_keywords where tenant_id = $1 and domain = $2",
    [tenantId, domain],
  );
  const row = rows[0];
  if (!row) return null;
  const ageH = (Date.now() - new Date(row.computed_at).getTime()) / 3_600_000;
  if (ageH > ttlHours) return null;
  const keywords = Array.isArray(row.keywords)
    ? (row.keywords as OutletKeyword[])
    : typeof row.keywords === "string"
      ? (JSON.parse(row.keywords) as OutletKeyword[])
      : [];
  return keywords;
}

export async function upsertOutletKeywords(
  tenantId: string,
  domain: string,
  keywords: OutletKeyword[],
): Promise<void> {
  const pool = getPool();
  await pool.query(
    `insert into outlet_keywords (tenant_id, domain, keywords, computed_at)
     values ($1, $2, $3, now())
     on conflict (tenant_id, domain)
       do update set keywords = excluded.keywords, computed_at = now()`,
    [tenantId, domain, JSON.stringify(keywords)],
  );
}

// ── Channel Affinity (migration 0023) ───────────────────────────────────────
// Aggregates channel_affinity_log in TS, mirroring the Python affinity_stats()
// in packages/scoring-py/src/onlinejourno_scoring/affinity.py.
// Window filtering happens in SQL; all aggregation is pure TS (no any).

export type ChannelAffinityEntityRow = {
  entity_type: string;
  appearances: number;
  top_channels: string[];
  top_sections: string[];
};

export type ChannelAffinity = {
  by_entity_type: ChannelAffinityEntityRow[];
  channel_totals: Record<string, number>;
  total: number;
};

export async function channelAffinity(
  tenantId: string,
  days = 90,
): Promise<ChannelAffinity> {
  const empty: ChannelAffinity = { by_entity_type: [], channel_totals: {}, total: 0 };
  const pool = getPool();
  const { rows } = await pool.query<{
    entity_type: string;
    channel: string;
    section: string | null;
  }>(
    `
    select entity_type, channel, section
      from channel_affinity_log
     where tenant_id = $1
       and logged_at >= now() - make_interval(days => $2)
    `,
    [tenantId, days],
  );

  if (rows.length === 0) return empty;

  // Accumulators keyed by entity_type (mirrors Python Counter / defaultdict).
  const appearances = new Map<string, number>();
  const channelCounts = new Map<string, Map<string, number>>();
  const sectionCounts = new Map<string, Map<string, number>>();
  const channelTotals = new Map<string, number>();

  for (const row of rows) {
    const et = row.entity_type || "Unknown";
    const ch = row.channel || "unknown";
    const sec = row.section ?? "";

    appearances.set(et, (appearances.get(et) ?? 0) + 1);

    // per entity_type channel counter
    let cMap = channelCounts.get(et);
    if (!cMap) { cMap = new Map(); channelCounts.set(et, cMap); }
    cMap.set(ch, (cMap.get(ch) ?? 0) + 1);

    // per entity_type section counter (exclude empty)
    if (sec) {
      let sMap = sectionCounts.get(et);
      if (!sMap) { sMap = new Map(); sectionCounts.set(et, sMap); }
      sMap.set(sec, (sMap.get(sec) ?? 0) + 1);
    }

    channelTotals.set(ch, (channelTotals.get(ch) ?? 0) + 1);
  }

  // Sort helper: descending by count, return keys.
  function topKeys(m: Map<string, number>): string[] {
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);
  }

  const by_entity_type: ChannelAffinityEntityRow[] = Array.from(appearances.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([entity_type, count]) => ({
      entity_type,
      appearances: count,
      top_channels: topKeys(channelCounts.get(entity_type) ?? new Map()),
      top_sections: topKeys(sectionCounts.get(entity_type) ?? new Map()),
    }));

  const channel_totals: Record<string, number> = Object.fromEntries(channelTotals);

  return { by_entity_type, channel_totals, total: rows.length };
}

// Stories published per day over the last N days (oldest→newest) — the home
// snapshot sparkline.
export async function publishedPerDay(
  tenantId: string,
  days = 7,
): Promise<number[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ d: string; n: number }>(
    `
    with span as (
      select generate_series(
        (now() at time zone 'utc')::date - ($2::int - 1),
        (now() at time zone 'utc')::date, interval '1 day')::date as d
    )
    select to_char(span.d,'YYYY-MM-DD') as d,
           count(st.id)::int as n
      from span
      left join stories st
        on st.tenant_id = $1
       and coalesce(st.published_at, st.created_at)::date = span.d
     group by span.d order by span.d
    `,
    [tenantId, days],
  );
  return rows.map((r) => r.n);
}

// Per-topic signal-interest over time (Interest Trajectory, #107). The platform
// uses its own enriched-signal corpus, not Google Trends (ADR/trend_score.py),
// so "interest" = daily count of signals mentioning the topic. One row per
// (topic, day); the caller pivots into per-topic series.
export type TopicSeriesPoint = { topic: string; d: string; n: number };
export async function topicInterestSeries(
  tenantId: string,
  topics: string[],
  days = 7,
): Promise<TopicSeriesPoint[]> {
  if (topics.length === 0) return [];
  const pool = getPool();
  const { rows } = await pool.query<TopicSeriesPoint>(
    `
    with span as (
      select generate_series(
        (now() at time zone 'utc')::date - ($3::int - 1),
        (now() at time zone 'utc')::date, interval '1 day')::date as d
    ),
    topics as (select unnest($2::text[]) as topic)
    select t.topic, to_char(span.d,'YYYY-MM-DD') as d, count(s.id)::int as n
      from topics t
      cross join span
      left join signals s
        on s.tenant_id = $1
       and s.enrichment->'analyse'->'entities' @> to_jsonb(array[t.topic])
       and coalesce(s.published_at, s.fetched_at)::date = span.d
     group by t.topic, span.d
     order by t.topic, span.d
    `,
    [tenantId, topics, days],
  );
  return rows;
}

// Outlet appearances in Google News / Discover over time, from the
// channel-affinity log (markers on the trajectory). Per-tenant, channel-based —
// no hardcoded masthead. One row per (channel, day).
export type OutletChannelMarker = { channel: string; d: string; n: number };
export async function outletChannelMarkers(
  tenantId: string,
  days = 7,
): Promise<OutletChannelMarker[]> {
  const pool = getPool();
  const { rows } = await pool.query<OutletChannelMarker>(
    `
    select channel,
           to_char(logged_at at time zone 'utc','YYYY-MM-DD') as d,
           count(*)::int as n
      from channel_affinity_log
     where tenant_id = $1
       and channel in ('google_news','discover')
       and logged_at >= now() - make_interval(days => $2)
     group by channel, to_char(logged_at at time zone 'utc','YYYY-MM-DD')
     order by d
    `,
    [tenantId, days],
  );
  return rows;
}

// Google-News-style narrative clusters: threads (from the `cluster` agent's one
// LLM pass) with their member signals. Recent, multi-signal threads only — i.e.
// real developing stories, not singletons.
export type StoryClusterItem = { headline: string | null; url: string; source: string | null };
export type StoryCluster = {
  id: string;
  title: string;
  members: number;
  items: StoryClusterItem[];
};

export async function storyClusters(
  tenantId: string,
  sinceHours = 168,
  limit = 12,
): Promise<StoryCluster[]> {
  const pool = getPool();
  const { rows } = await pool.query<StoryCluster>(
    `
    select t.id::text as id, t.title,
           count(tl.signal_id)::int as members,
           coalesce(
             jsonb_agg(
               jsonb_build_object('headline', s.headline, 'url', s.url, 'source', src.name)
               order by coalesce(s.published_at, s.fetched_at) desc
             ),
             '[]'::jsonb
           ) as items
      from threads t
      join thread_links tl on tl.thread_id = t.id
      join signals s on s.id = tl.signal_id
      left join sources src on src.id = s.source_id
     where t.tenant_id = $1
       and t.opened_at >= now() - make_interval(hours => $2)
     group by t.id, t.title
    having count(tl.signal_id) >= 2
     order by members desc, t.opened_at desc
     limit $3
    `,
    [tenantId, sinceHours, limit],
  );
  return rows;
}

// ── Phase B: competitive standings ───────────────────────────────────────────

export type Peer = { domain: string; name: string; tier: string };

/** The tenant's peer set from config (vendor-neutral — never hardcoded).
 *  config.peers = [{domain, name, tier}]. Empty array when unset. */
export async function tenantPeers(tenantId: string): Promise<Peer[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ peers: Peer[] | null }>(
    "select config->'peers' as peers from tenants where id = $1",
    [tenantId],
  );
  const raw = rows[0]?.peers;
  return Array.isArray(raw) ? raw.filter((p) => p && typeof p.domain === "string") : [];
}

export type OwnStanding = {
  topic: string;
  ownRecent: number;
  ownCombative: number;
  ownExplanatory: number;
  nOwn: number;
};

/** Per-topic own-coverage from the tenant's published stories in the window.
 *  Topic match is headline ILIKE — stories may not carry the analyse-entity
 *  array that signals do. Framing group from stories.enrichment->'framing'. */
export async function ownTopicStandings(
  tenantId: string,
  topics: string[],
  windowHours: number,
): Promise<Map<string, OwnStanding>> {
  if (topics.length === 0) return new Map();
  const pool = getPool();
  const { rows } = await pool.query<OwnStanding>(
    `
    select t.topic,
           count(st.id)::int as "ownRecent",
           count(*) filter (where st.enrichment->'framing'->>'frame_group' = 'combative')::int   as "ownCombative",
           count(*) filter (where st.enrichment->'framing'->>'frame_group' = 'explanatory')::int as "ownExplanatory",
           count(*) filter (where st.enrichment->'framing' is not null)::int as "nOwn"
      from unnest($2::text[]) as t(topic)
      left join stories st
        on st.tenant_id = $1
       and st.status = 'published'
       and st.headline ilike '%' || t.topic || '%'
       and coalesce(st.published_at, st.created_at)
           >= now() - make_interval(hours => $3)
     group by t.topic
    `,
    [tenantId, topics, windowHours],
  );
  return new Map(rows.map((r) => [r.topic, r]));
}

export type PeerStanding = {
  topic: string;
  peerRecent: number;
  peerCount: number;
  perDomain: number[]; // per-peer mention counts (for the median)
  peerCombative: number;
  peerExplanatory: number;
  nPeer: number;
};

/** Per-topic peer-coverage from signals whose raw_payload.domain is in the
 *  peer set. Topic match uses the analyse-entity array (as topicMomentum does).
 *  perDomain feeds the median computed in the page. */
export async function peerTopicStandings(
  tenantId: string,
  topics: string[],
  windowHours: number,
  peerDomains: string[],
): Promise<Map<string, PeerStanding>> {
  if (topics.length === 0 || peerDomains.length === 0) return new Map();
  const pool = getPool();
  const { rows } = await pool.query<{
    topic: string;
    peerRecent: number;
    peerCount: number;
    perDomain: number[];
    peerCombative: number;
    peerExplanatory: number;
    nPeer: number;
  }>(
    `
    with hits as (
      select t.topic,
             s.raw_payload->>'domain' as domain,
             s.enrichment->'framing'->>'frame_group' as frame_group,
             (s.enrichment->'framing' is not null) as coded
        from unnest($2::text[]) as t(topic)
        join signals s
          on s.tenant_id = $1
         and s.raw_payload->>'domain' = any($4::text[])
         and s.enrichment->'analyse'->'entities' @> to_jsonb(array[t.topic])
         and coalesce(s.published_at, s.fetched_at)
             >= now() - make_interval(hours => $3)
    ),
    per_domain as (
      select topic, domain, count(*)::int as n from hits group by topic, domain
    )
    select h.topic,
           count(*)::int as "peerRecent",
           count(distinct h.domain)::int as "peerCount",
           coalesce((select array_agg(pd.n) from per_domain pd where pd.topic = h.topic), '{}')::int[] as "perDomain",
           count(*) filter (where h.frame_group = 'combative')::int as "peerCombative",
           count(*) filter (where h.frame_group = 'explanatory')::int as "peerExplanatory",
           count(*) filter (where h.coded)::int as "nPeer"
      from hits h
     group by h.topic
    `,
    [tenantId, topics, windowHours, peerDomains],
  );
  return new Map(rows.map((r) => [r.topic, r]));
}

// ── BRIEF·Today ──────────────────────────────────────────────────────────────

export type TodayLead = {
  id: string;
  title: string;
  beat: string | null;
  importance: string;
  status: string;
  trend_score: number | null;
  note: string | null;
  created_at: Date | string;
  trend_reason: string | null;
  user_need: string | null;
  sources: number;
};

/** Open leads (idea/pitched/assigned) ranked by importance then trend_score.
 *  sources = signals whose analyse-entities contain the lead topic (else the
 *  linked signal counts as 1). */
export async function openLeadsRanked(tenantId: string, limit: number): Promise<TodayLead[]> {
  const pool = getPool();
  const { rows } = await pool.query<TodayLead>(
    `
    select l.id, l.title, l.beat, l.importance, l.status, l.trend_score, l.note,
           l.created_at, s.trend_reason,
           s.enrichment->'classify'->>'user_need' as user_need,
           greatest(
             coalesce((select count(*) from signals s2
                        where s2.tenant_id = l.tenant_id and l.topic is not null
                          and s2.enrichment->'analyse'->'entities' @> to_jsonb(array[l.topic]))::int, 0),
             case when l.signal_id is not null then 1 else 0 end
           ) as sources
      from story_leads l
      left join signals s on s.id = l.signal_id
     where l.tenant_id = $1
       and l.status in ('idea','pitched','assigned')
     order by case l.importance
                when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end,
              l.trend_score desc nulls last,
              l.created_at desc
     limit $2
    `,
    [tenantId, limit],
  );
  return rows;
}

export type NowCountsRow = {
  signalsIn: number;
  leadsNeedingDecision: number;
  sourcesLive: number;
  publishedToday: number;
};

export async function newsroomNowCounts(tenantId: string): Promise<NowCountsRow> {
  const pool = getPool();
  const { rows } = await pool.query<NowCountsRow>(
    `
    select
      (select count(*) from signals where tenant_id = $1
         and coalesce(published_at, fetched_at) >= now() - interval '24 hours')::int as "signalsIn",
      (select count(*) from story_leads where tenant_id = $1
         and status in ('idea','pitched','assigned'))::int as "leadsNeedingDecision",
      (select count(*) from sources where tenant_id = $1 and enabled)::int as "sourcesLive",
      (select count(*) from stories where tenant_id = $1 and status = 'published'
         and published_at >= date_trunc('day', now() at time zone 'Asia/Kolkata'))::int as "publishedToday"
    `,
    [tenantId],
  );
  return rows[0] ?? { signalsIn: 0, leadsNeedingDecision: 0, sourcesLive: 0, publishedToday: 0 };
}

export type NavCountsRow = {
  calendar: number;
  brief: number;
  signals: number;
  newslist: number;
  potential: number;
};

/** Live per-stage counts for the living masthead (lib/nav-signals.ts). One
 *  batched round-trip of cheap, tenant-scoped counts. */
export async function navStageCounts(
  tenantId: string,
  beats: string[] | null = null,
): Promise<NavCountsRow> {
  const pool = getPool();
  // When beats is a non-empty array, scope each count to those beats (calendar
  // keys on `topic`). null/empty → newsroom-wide. The `$2::text[] is null or …`
  // guard keeps a single query for both cases.
  const b = beats && beats.length ? beats : null;
  const { rows } = await pool.query<NavCountsRow>(
    `
    select
      (select count(*) from calendar_event where tenant_id = $1
         and outcome is null and target_date is not null
         and target_date <= now() + interval '7 days'
         and ($2::text[] is null or topic = any($2)))::int as "calendar",
      (select count(*) from story_leads where tenant_id = $1
         and status in ('idea','pitched','assigned')
         and ($2::text[] is null or beat = any($2)))::int as "brief",
      (select count(*) from signals where tenant_id = $1
         and coalesce(published_at, fetched_at) >= now() - interval '24 hours'
         and ($2::text[] is null or beat = any($2)))::int as "signals",
      (select count(*) from story_leads where tenant_id = $1
         and status in ('filed','approved')
         and ($2::text[] is null or beat = any($2)))::int as "newslist",
      (select count(*) from stories where tenant_id = $1
         and status = 'published' and published_at >= now() - interval '7 days'
         and ($2::text[] is null or beat = any($2)))::int as "potential"
    `,
    [tenantId, b],
  );
  return rows[0] ?? { calendar: 0, brief: 0, signals: 0, newslist: 0, potential: 0 };
}

// ── Scored Pitch reads (Task 11) ─────────────────────────────────────────────

export type EntityCoverageRow = {
  entity_name: string;
  appearance_count: number;
  last_seen: Date | null;
};

/**
 * Aggregated coverage for an entity NAME within the tenant, summed across all
 * stored entity_types (the coverage table uses a placeholder type so matching
 * by name is the only reliable join). Returns null when no coverage exists.
 */
export async function entityCoverage(
  tenantId: string,
  entityName: string,
): Promise<EntityCoverageRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<EntityCoverageRow>(
    `
    select ec.entity_name,
           coalesce(sum(ec.appearance_count), 0)::int as appearance_count,
           max(ec.last_seen) as last_seen
      from entity_coverage ec
     where ec.tenant_id = $1 and ec.entity_name = $2
     group by ec.entity_name
    `,
    [tenantId, entityName],
  );
  return rows[0] ?? null;
}

export type PitchedLeadRow = {
  id: string;
  title: string;
  pitch_weight: number | null;
  pitcher: string | null;
};

/**
 * Open pitched leads whose entities jsonb contains ANY entity with one of the
 * given NAMES (matched by name only — LLM-typed pitch entities and the coverage
 * store use different type vocabularies). Returns [] immediately when entityNames
 * is empty. Ordered by pitch_weight desc nulls last.
 */
export async function pitchesForEntities(
  tenantId: string,
  entityNames: string[],
): Promise<PitchedLeadRow[]> {
  if (entityNames.length === 0) return [];
  const pool = getPool();
  const { rows } = await pool.query<PitchedLeadRow>(
    `
    select l.id, l.title, l.pitch_weight, u.display_name as pitcher
      from story_leads l
      left join users u on u.id = l.assignee_id
     where l.tenant_id = $1
       and l.status = 'pitched'
       and exists (
         select 1 from jsonb_array_elements(l.entities) e
          where e->>'name' = any($2::text[])
       )
     order by l.pitch_weight desc nulls last
    `,
    [tenantId, entityNames],
  );
  return rows;
}

/** The install's newsroom — the oldest non-archived tenant. Fallback when there's
 *  no session (one-newsroom-per-install). Null on a fresh, unseeded DB. */
export async function defaultTenantId(): Promise<string | null> {
  const pool = getPool();
  const { rows } = await pool.query<{ id: string }>(
    "select id from tenants where archived_at is null order by created_at asc limit 1",
  );
  return rows[0]?.id ?? null;
}
