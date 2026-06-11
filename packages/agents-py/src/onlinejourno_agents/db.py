"""Postgres access for the agents.

Mirrors the connection + tenant-explicit-query conventions of
`onlinejourno_ingest.db` (ADR 0005). Kept self-contained rather than sharing
a package, matching the existing two-package split; the duplicated ~30 lines
of env+connect are the cost of not introducing a shared-db package yet.

Every write is its own short transaction (see callers). Reads may batch.
"""

from __future__ import annotations

import os
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any
from uuid import UUID

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row
from psycopg.types.json import Json

from onlinejourno_agents.client import Completion


@lru_cache(maxsize=1)
def _load_env_once() -> None:
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / ".env"
        if candidate.exists():
            load_dotenv(candidate)
            return
        if (parent / "pnpm-workspace.yaml").exists():
            return


def database_url() -> str:
    _load_env_once()
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.local.example to .env and fill it in."
        )
    return url


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    """psycopg connection; commits on clean exit, rolls back on error."""
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        yield conn


def now_utc() -> datetime:
    return datetime.now(UTC)


# ----------------------------------------------------------------------
# Tenant / beat / user lookups
# ----------------------------------------------------------------------


def tenant_id_for_slug(conn: psycopg.Connection, slug: str) -> UUID:
    with conn.cursor() as cur:
        cur.execute("select id from tenants where slug = %s", (slug,))
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(f"Tenant with slug '{slug}' not found")
        return row["id"]


def beat_id_for_slug(
    conn: psycopg.Connection, tenant_id: UUID, slug: str
) -> UUID | None:
    with conn.cursor() as cur:
        cur.execute(
            "select id from beats where tenant_id = %s and slug = %s",
            (tenant_id, slug),
        )
        row = cur.fetchone()
        return row["id"] if row else None


def default_brief_user(conn: psycopg.Connection, tenant_id: UUID) -> UUID:
    """Pick a user to attribute a desk brief to (briefs.for_user is NOT NULL).

    Prefers an editor, then a journalist, then any non-archived user.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            select id from users
             where tenant_id = %s and archived_at is null
             order by case role when 'editor' then 0 when 'journalist' then 1
                                 when 'admin' then 2 else 3 end,
                      created_at
             limit 1
            """,
            (tenant_id,),
        )
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(
                f"tenant {tenant_id} has no users to attribute a brief to"
            )
        return row["id"]


# ----------------------------------------------------------------------
# Schema feature detection (graceful before PR #2 trust primitives land)
# ----------------------------------------------------------------------


@lru_cache(maxsize=2)
def _column_exists(table: str, column: str) -> bool:
    with connect() as conn, conn.cursor() as cur:
        cur.execute(
            """
            select 1 from information_schema.columns
             where table_name = %s and column_name = %s
            """,
            (table, column),
        )
        return cur.fetchone() is not None


# ----------------------------------------------------------------------
# Candidate signals for scoring
# ----------------------------------------------------------------------


def candidate_signals(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    beat_tag: str | None = None,
    since_hours: int | None = None,
    limit: int = 500,
) -> list[dict[str, Any]]:
    """Signals not yet scored into the shortlist, newest first.

    Filters off-record signals when the column exists (ADR 0029). Optionally
    scopes to a beat (via source.beat_tags) and a recency window.
    """
    where = [
        "s.tenant_id = %s",
        "not exists (select 1 from shortlist_items si where si.signal_id = s.id)",
    ]
    params: list[Any] = [tenant_id]

    if _column_exists("signals", "off_record"):
        where.append("coalesce(s.off_record, false) = false")
    if beat_tag is not None:
        where.append("%s = any(src.beat_tags)")
        params.append(beat_tag)
    if since_hours is not None:
        where.append(
            "coalesce(s.published_at, s.fetched_at) >= now() - make_interval(hours => %s)"
        )
        params.append(since_hours)

    sql = f"""
        select s.id, s.headline, s.body_text, s.url, s.published_at,
               s.language, src.name as source_name, src.beat_tags
          from signals s
          join sources src on src.id = s.source_id
         where {' and '.join(where)}
         order by coalesce(s.published_at, s.fetched_at) desc
         limit %s
    """
    params.append(limit)
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return list(cur.fetchall())


# ----------------------------------------------------------------------
# Shortlist writes
# ----------------------------------------------------------------------


def insert_shortlist_item(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    signal_id: UUID,
    beat_id: UUID | None,
    score: float,
    rank: int,
    rationale: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into shortlist_items
                (tenant_id, signal_id, for_user, beat_id, score, rank, rationale)
            values (%s, %s, null, %s, %s, %s, %s)
            """,
            (tenant_id, signal_id, beat_id, score, rank, rationale),
        )


# ----------------------------------------------------------------------
# Distribution-fit (m-distribution-fit Phase 1)
# ----------------------------------------------------------------------


def enabled_surface_keys(conn: psycopg.Connection, tenant_id: UUID) -> list[str]:
    """Enabled optimization-surface keys for the tenant (ADR 0043)."""
    with conn.cursor() as cur:
        cur.execute(
            "select key from optimization_surfaces "
            "where tenant_id = %s and enabled order by sort",
            (tenant_id,),
        )
        return [r["key"] for r in cur.fetchall()]


def recent_stories(
    conn: psycopg.Connection, tenant_id: UUID, *, limit: int = 50
) -> list[dict[str, Any]]:
    """Recent own stories (ADR 0046) — the distribution-fit / Channel Audit target."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, body_text, url, section, published_at
              from stories
             where tenant_id = %s
             order by coalesce(published_at, created_at) desc
             limit %s
            """,
            (tenant_id, limit),
        )
        return list(cur.fetchall())


def upsert_distribution_fit(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    story_id: UUID,
    surface: str,
    score: int,
    grade: str,
    top_fix: str | None,
    signals: list[dict[str, Any]],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into distribution_fit_scores
                (tenant_id, story_id, surface, score, grade, top_fix, signals, scored_at)
            values (%s, %s, %s, %s, %s, %s, %s, now())
            on conflict (tenant_id, story_id, surface) do update
               set score = excluded.score, grade = excluded.grade,
                   top_fix = excluded.top_fix, signals = excluded.signals,
                   scored_at = now()
            """,
            (tenant_id, story_id, surface, score, grade, top_fix, Json(signals)),
        )


def upsert_story(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    cms_ref: str,
    url: str | None,
    headline: str | None,
    body_text: str | None,
    section: str | None,
    published_at: str | None,
    status: str = "published",
    source_id: UUID | None = None,
) -> bool:
    """Upsert an own story by (tenant, cms_ref) — the inside end (ADR 0046).

    Returns True if the row was newly inserted (vs updated on re-pull).
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into stories
                (tenant_id, source_id, cms_ref, url, headline, body_text,
                 section, status, published_at)
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (tenant_id, cms_ref) do update
               set url = excluded.url, headline = excluded.headline,
                   body_text = excluded.body_text, section = excluded.section,
                   published_at = excluded.published_at
            returning (xmax = 0) as inserted
            """,
            (
                tenant_id, source_id, cms_ref, url, headline, body_text,
                section, status, published_at,
            ),
        )
        row = cur.fetchone()
        return bool(row["inserted"]) if row else False


# ----------------------------------------------------------------------
# Enrichment (Analyse pillar — L2)
# ----------------------------------------------------------------------


def signals_needing_enrichment(
    conn: psycopg.Connection, tenant_id: UUID, *, since_hours: int = 48, limit: int = 60
) -> list[dict[str, Any]]:
    """Signals not yet enriched, newest first."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, body_text
              from signals
             where tenant_id = %s and enrichment is null
               and coalesce(published_at, fetched_at) >= now() - make_interval(hours => %s)
             order by coalesce(published_at, fetched_at) desc
             limit %s
            """,
            (tenant_id, since_hours, limit),
        )
        return list(cur.fetchall())


def update_signal_enrichment(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    signal_id: UUID,
    district: str | None,
    region: str | None,
    beat: str | None,
    enrichment: dict[str, Any],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update signals
               set district = %s, region = %s, beat = %s, enrichment = %s
             where tenant_id = %s and id = %s
            """,
            (district, region, beat, Json(enrichment), tenant_id, signal_id),
        )


# ----------------------------------------------------------------------
# Signal -> reporter routing (the inflow to the right reporter)
# ----------------------------------------------------------------------


def journalist_id_for_slug(
    conn: psycopg.Connection, tenant_id: UUID, slug: str
) -> UUID | None:
    with conn.cursor() as cur:
        cur.execute(
            "select id from journalist_profiles where tenant_id = %s and slug = %s",
            (tenant_id, slug),
        )
        row = cur.fetchone()
        return row["id"] if row else None


def signals_for_journalist(
    conn: psycopg.Connection,
    tenant_id: UUID,
    journalist_id: UUID,
    *,
    since_hours: int = 72,
    limit: int = 30,
) -> list[dict[str, Any]]:
    """Enriched signals routed to a journalist — matched on her beats or region.

    The reporter's inflow: a signal reaches her when its enriched `beat` is one
    of her beats, or its geography (region/district) is her region.
    """
    with conn.cursor() as cur:
        cur.execute(
            """
            select s.id, s.headline, s.url, s.beat, s.region, s.district,
                   s.enrichment->'analyse'->'entities' as entities,
                   coalesce(s.published_at, s.fetched_at) as at
              from signals s, journalist_profiles j
             where s.tenant_id = %s and j.tenant_id = %s and j.id = %s
               and s.enrichment is not null
               and (
                    (s.beat is not null and j.beats ? s.beat)
                 or (s.region is not null and j.region is not null
                     and lower(s.region) = lower(j.region))
                 or (s.district is not null and j.region is not null
                     and lower(s.district) = lower(j.region))
               )
               and coalesce(s.published_at, s.fetched_at)
                   >= now() - make_interval(hours => %s)
             order by coalesce(s.published_at, s.fetched_at) desc
             limit %s
            """,
            (tenant_id, tenant_id, journalist_id, since_hours, limit),
        )
        return list(cur.fetchall())


# ----------------------------------------------------------------------
# Trend scoring (convergence over the enriched signal corpus)
# ----------------------------------------------------------------------


def enriched_signals_with_entities(
    conn: psycopg.Connection, tenant_id: UUID, *, since_hours: int = 48, limit: int = 600
) -> list[dict[str, Any]]:
    """Enriched signals with their entities + age in hours, for trend scoring."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id,
                   coalesce(enrichment->'analyse'->'entities', '[]'::jsonb) as entities,
                   extract(epoch from (now() - coalesce(published_at, fetched_at)))
                       / 3600.0 as age_h
              from signals
             where tenant_id = %s and enrichment ? 'analyse'
               and coalesce(published_at, fetched_at) >= now() - make_interval(hours => %s)
             order by coalesce(published_at, fetched_at) desc
             limit %s
            """,
            (tenant_id, since_hours, limit),
        )
        return list(cur.fetchall())


def update_signal_trend(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    signal_id: UUID,
    trend_score: float,
    trend_reason: str,
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            "update signals set trend_score = %s, trend_reason = %s "
            "where tenant_id = %s and id = %s",
            (trend_score, trend_reason, tenant_id, signal_id),
        )


# ----------------------------------------------------------------------
# Brief reads + writes
# ----------------------------------------------------------------------


def top_shortlist(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    beat_id: UUID | None,
    limit: int,
    since_hours: int | None = None,
    rank_by: str = "score",
) -> list[dict[str, Any]]:
    """Top shortlist items with their signal text, for composing.

    `since_hours` scopes to recent *news* (kept null for manual runs).
    `rank_by` chooses the editor's lens: 'score' (importance), 'recency'
    (newest first), or 'velocity' (most-covered topic first, approximated by
    how many shortlisted items share the headline's lead word in the window).
    """
    where = ["si.tenant_id = %s", "si.decision is null or si.decision <> 'rejected'"]
    params: list[Any] = [tenant_id]
    if beat_id is not None:
        where.append("si.beat_id = %s")
        params.append(beat_id)
    if since_hours is not None:
        # Scope by the *news* recency (when the story happened), not when it was
        # shortlisted — so yesterday's high-scoring items drop out of today's
        # brief even though they linger near the top of the accumulating shortlist.
        where.append("coalesce(s.published_at, s.fetched_at) >= now() - make_interval(hours => %s)")
        params.append(since_hours)
    order_by = {
        "recency": "coalesce(s.published_at, s.fetched_at) desc nulls last, si.score desc",
        "velocity": "velocity desc, si.score desc",
        "score": "si.score desc nulls last, si.rank asc nulls last",
    }.get(rank_by, "si.score desc nulls last, si.rank asc nulls last")
    sql = f"""
        select si.id as shortlist_id, si.signal_id, si.score, si.rank, si.rationale,
               s.headline, s.body_text, s.url, s.published_at, src.name as source_name,
               count(*) over (partition by coalesce(tl.thread_id, si.id)) as velocity
          from shortlist_items si
          join signals s on s.id = si.signal_id
          join sources src on src.id = s.source_id
          left join lateral (
              select thread_id from thread_links where signal_id = si.signal_id limit 1
          ) tl on true
         where {' and '.join(where)}
         order by {order_by}
         limit %s
    """
    params.append(limit)
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return list(cur.fetchall())


def insert_brief(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    for_user: UUID,
    beat_id: UUID | None,
    edition_date: Any,
    content: dict[str, Any],
    ai_disclosure: dict[str, Any] | None,
) -> UUID:
    """Insert a brief. Writes ai_disclosure when the column exists (ADR 0029)."""
    has_disclosure = _column_exists("briefs", "ai_disclosure") and ai_disclosure is not None
    cols = [
        "tenant_id", "for_user", "beat_id", "edition_date",
        "delivery_status", "delivery_channel", "content",
    ]
    vals: list[Any] = [
        tenant_id, for_user, beat_id, edition_date,
        "pending", "web", Json(content),
    ]
    if has_disclosure:
        cols.append("ai_disclosure")
        vals.append(Json(ai_disclosure))
    placeholders = ", ".join(["%s"] * len(vals))
    with conn.cursor() as cur:
        cur.execute(
            f"insert into briefs ({', '.join(cols)}) values ({placeholders}) "
            f"on conflict (tenant_id, for_user, edition_date) do update "
            f"set content = excluded.content, composed_at = now() returning id",
            vals,
        )
        row = cur.fetchone()
        assert row is not None
        return row["id"]


# ----------------------------------------------------------------------
# Agent traces + cost guard
# ----------------------------------------------------------------------


def record_trace(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    agent_name: str,
    path: str,
    completion: Completion | None,
    status: str,
    reasoning: dict[str, Any] | None = None,
    related_signal_id: UUID | None = None,
    related_brief_id: UUID | None = None,
    started_at: datetime | None = None,
) -> None:
    """Write one agent_traces row. Every LLM call lands here (CLAUDE.md rule 10)."""
    model = completion.model if completion else os.environ.get("ANTHROPIC_DEFAULT_MODEL", "unknown")
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into agent_traces
                (tenant_id, agent_name, path, started_at, finished_at, model,
                 tool_calls, prompt_tokens, output_tokens, cost_usd, status,
                 reasoning, related_signal_id, related_brief_id)
            values (%s, %s, %s, %s, %s, %s, 0, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                tenant_id, agent_name, path,
                started_at or now_utc(), now_utc(), model,
                completion.input_tokens if completion else None,
                completion.output_tokens if completion else None,
                completion.cost_usd if completion else None,
                status,
                Json(reasoning) if reasoning is not None else None,
                related_signal_id, related_brief_id,
            ),
        )


def today_cost_usd(conn: psycopg.Connection, tenant_id: UUID) -> float:
    """Sum of today's agent cost for the tenant (the daily-cap denominator)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select coalesce(sum(cost_usd), 0) as spent
              from agent_traces
             where tenant_id = %s
               and started_at >= date_trunc('day', now())
            """,
            (tenant_id,),
        )
        row = cur.fetchone()
        return float(row["spent"]) if row else 0.0


def daily_cap_usd(conn: psycopg.Connection, tenant_id: UUID, default: float = 8.0) -> float:
    with conn.cursor() as cur:
        cur.execute(
            "select daily_cap_usd from cost_budgets where tenant_id = %s",
            (tenant_id,),
        )
        row = cur.fetchone()
        return float(row["daily_cap_usd"]) if row else default


# ----------------------------------------------------------------------
# Brief read-back (for rendering the plain-text artifact)
# ----------------------------------------------------------------------


def latest_brief(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    beat_id: UUID | None = None,
) -> dict[str, Any] | None:
    """Most recent brief for a tenant (optionally scoped to a beat)."""
    where = ["tenant_id = %s"]
    params: list[Any] = [tenant_id]
    if beat_id is not None:
        where.append("beat_id = %s")
        params.append(beat_id)
    disclosure_col = (
        "ai_disclosure"
        if _column_exists("briefs", "ai_disclosure")
        else "null as ai_disclosure"
    )
    with conn.cursor() as cur:
        cur.execute(
            f"""
            select id, beat_id, edition_date, content, composed_at,
                   {disclosure_col}
              from briefs
             where {' and '.join(where)}
             order by composed_at desc
             limit 1
            """,
            params,
        )
        return cur.fetchone()


def signal_urls_for(conn: psycopg.Connection, signal_ids: list[str]) -> dict[str, str]:
    """Map signal-id -> url for the given ids (source attribution in render)."""
    if not signal_ids:
        return {}
    with conn.cursor() as cur:
        cur.execute(
            "select id, url from signals where id = any(%s)",
            ([UUID(s) if not isinstance(s, UUID) else s for s in signal_ids],),
        )
        return {str(r["id"]): r["url"] for r in cur.fetchall()}


# ----------------------------------------------------------------------
# Off-record flag (ADR 0029) — mark/unmark + audit log
# ----------------------------------------------------------------------


def find_signals_by_headline(
    conn: psycopg.Connection, tenant_id: UUID, text: str, *, limit: int = 25
) -> list[dict[str, Any]]:
    """Signals whose headline contains `text` (case-insensitive), newest first."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, url, coalesce(off_record, false) as off_record
              from signals
             where tenant_id = %s and headline ilike %s
             order by fetched_at desc
             limit %s
            """,
            (tenant_id, f"%{text}%", limit),
        )
        return list(cur.fetchall())


def resolve_user_id(
    conn: psycopg.Connection, tenant_id: UUID, email: str | None
) -> UUID | None:
    if not email:
        return None
    with conn.cursor() as cur:
        cur.execute(
            "select id from users where tenant_id = %s and email = %s",
            (tenant_id, email),
        )
        row = cur.fetchone()
        return row["id"] if row else None


def set_off_record(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    signal_id: UUID,
    on: bool,
    actor_user_id: UUID | None = None,
    reason: str | None = None,
) -> None:
    """Set/clear a signal's off-record flag and append to the audit log (ADR 0029).

    Off-record signals are excluded from shortlist + brief composition
    (candidate_signals filters them). The flag is reversible; every change is
    logged for accountability.
    """
    with conn.cursor() as cur:
        cur.execute(
            "update signals set off_record = %s where id = %s and tenant_id = %s",
            (on, signal_id, tenant_id),
        )
        cur.execute(
            """
            insert into signal_off_record_log
                (tenant_id, signal_id, action, actor_user_id, reason)
            values (%s, %s, %s, %s, %s)
            """,
            (tenant_id, signal_id, "marked" if on else "unmarked", actor_user_id, reason),
        )


def list_off_record(
    conn: psycopg.Connection, tenant_id: UUID, *, limit: int = 50
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, url from signals
             where tenant_id = %s and off_record = true
             order by fetched_at desc limit %s
            """,
            (tenant_id, limit),
        )
        return list(cur.fetchall())


# ----------------------------------------------------------------------
# Story-thread clustering (precise velocity)
# ----------------------------------------------------------------------


def signals_for_clustering(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    since_hours: int = 24,
    limit: int = 120,
) -> list[dict[str, Any]]:
    """Recent, non-off-record signals to group into threads (newest first)."""
    where = ["s.tenant_id = %s"]
    params: list[Any] = [tenant_id]
    if _column_exists("signals", "off_record"):
        where.append("coalesce(s.off_record, false) = false")
    where.append("coalesce(s.published_at, s.fetched_at) >= now() - make_interval(hours => %s)")
    params.append(since_hours)
    params.append(limit)
    with conn.cursor() as cur:
        cur.execute(
            f"""
            select s.id, s.headline, src.name as source_name
              from signals s join sources src on src.id = s.source_id
             where {' and '.join(where)}
             order by coalesce(s.published_at, s.fetched_at) desc
             limit %s
            """,
            params,
        )
        return list(cur.fetchall())


def upsert_thread(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    slug: str,
    title: str,
    beat_id: UUID | None,
) -> UUID:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into threads (tenant_id, slug, title, beat_id)
            values (%s, %s, %s, %s)
            on conflict (tenant_id, slug) do update set title = excluded.title
            returning id
            """,
            (tenant_id, slug, title, beat_id),
        )
        row = cur.fetchone()
        assert row is not None
        return row["id"]


def link_signal_to_thread(
    conn: psycopg.Connection, *, thread_id: UUID, signal_id: UUID, reason: str | None = None
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into thread_links (thread_id, signal_id, link_reason)
            values (%s, %s, %s)
            on conflict (thread_id, signal_id) do nothing
            """,
            (thread_id, signal_id, reason),
        )


def clear_recent_thread_links(
    conn: psycopg.Connection, tenant_id: UUID, *, since_hours: int = 24
) -> None:
    """Drop thread links for signals in the window so a re-cluster is fresh."""
    with conn.cursor() as cur:
        cur.execute(
            """
            delete from thread_links tl using signals s
             where tl.signal_id = s.id and s.tenant_id = %s
               and coalesce(s.published_at, s.fetched_at) >= now() - make_interval(hours => %s)
            """,
            (tenant_id, since_hours),
        )


def need_mix_counts(
    conn: psycopg.Connection, tenant_id: UUID, *, window_hours: int = 168
) -> list[dict[str, Any]]:
    """Per-beat counts of classified reader needs (ADR 0049 need-mix view)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select coalesce(beat, '(none)') as beat,
                   enrichment->'classify'->>'user_need' as user_need,
                   count(*)::int as n
              from signals
             where tenant_id = %s
               and enrichment->'classify'->>'user_need' is not null
               and coalesce(published_at, fetched_at) >= now() - make_interval(hours => %s)
             group by 1, 2
             order by 1, 3 desc
            """,
            (tenant_id, window_hours),
        )
        return list(cur.fetchall())


def signals_needing_framing(
    conn: psycopg.Connection, tenant_id: UUID, *, since_hours: int = 168, limit: int = 60
) -> list[dict[str, Any]]:
    """Enriched signals without a framing coding, newest first (m-framing-pej)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, body_text
              from signals
             where tenant_id = %s
               and enrichment is not null
               and enrichment->'framing' is null
               and coalesce(published_at, fetched_at) >= now() - make_interval(hours => %s)
             order by coalesce(published_at, fetched_at) desc
             limit %s
            """,
            (tenant_id, since_hours, limit),
        )
        return list(cur.fetchall())


def update_signal_framing(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    signal_id: UUID,
    framing: dict[str, Any],
) -> None:
    """Merge a PEJ framing coding into the signal's enrichment."""
    with conn.cursor() as cur:
        cur.execute(
            """
            update signals
               set enrichment = coalesce(enrichment, '{}'::jsonb)
                   || jsonb_build_object('framing', %s::jsonb)
             where tenant_id = %s and id = %s
            """,
            (Json(framing), tenant_id, signal_id),
        )


def tenant_output_language(conn: psycopg.Connection, tenant_id: UUID) -> str:
    """ISO 639-1 output language from the tenant's primary_locale (ADR 0051).

    'hi-IN' -> 'hi'; missing/odd values fall back to 'en'.
    """
    with conn.cursor() as cur:
        cur.execute("select primary_locale from tenants where id = %s", (tenant_id,))
        row = cur.fetchone()
    locale = (row or {}).get("primary_locale") or "en"
    lang = str(locale).split("-")[0].strip().lower()
    return lang if len(lang) in (2, 3) and lang.isalpha() else "en"


def signals_for_alert(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    threshold: int = 70,
    since_hours: int = 24,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """High-trend signals not yet alerted (the EIP Alert stage)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, url, beat, region, trend_score
              from signals
             where tenant_id = %s
               and trend_score >= %s
               and enrichment->'alert' is null
               and coalesce(published_at, fetched_at) >= now() - make_interval(hours => %s)
             order by trend_score desc
             limit %s
            """,
            (tenant_id, threshold, since_hours, limit),
        )
        return list(cur.fetchall())


def mark_alerted(
    conn: psycopg.Connection, *, tenant_id: UUID, signal_id: UUID, channel: str
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update signals
               set enrichment = coalesce(enrichment, '{}'::jsonb)
                   || jsonb_build_object('alert', jsonb_build_object(
                        'sent_at', to_char(now() at time zone 'utc',
                                           'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
                        'channel', %s::text))
             where tenant_id = %s and id = %s
            """,
            (channel, tenant_id, signal_id),
        )


# ── Own-story classification (ADR 0054-B: the Differentiation Ratio needs the
# Classify + Framing passes on stories, not only signals) ────────────────────


def stories_needing_classify(
    conn: psycopg.Connection, tenant_id: UUID, *, limit: int = 60
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, body_text
              from stories
             where tenant_id = %s and enrichment->'classify' is null
             order by coalesce(published_at, created_at) desc
             limit %s
            """,
            (tenant_id, limit),
        )
        return list(cur.fetchall())


def update_story_classify(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    story_id: UUID,
    beat: str,
    enrichment: dict[str, Any],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update stories
               set beat = coalesce(beat, %s),
                   enrichment = coalesce(enrichment, '{}'::jsonb) || %s::jsonb
             where tenant_id = %s and id = %s
            """,
            (beat, Json(enrichment), tenant_id, story_id),
        )


def stories_needing_framing(
    conn: psycopg.Connection, tenant_id: UUID, *, limit: int = 60
) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, headline, body_text
              from stories
             where tenant_id = %s and enrichment->'framing' is null
             order by coalesce(published_at, created_at) desc
             limit %s
            """,
            (tenant_id, limit),
        )
        return list(cur.fetchall())


def update_story_framing(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    story_id: UUID,
    framing: dict[str, Any],
) -> None:
    with conn.cursor() as cur:
        cur.execute(
            """
            update stories
               set enrichment = coalesce(enrichment, '{}'::jsonb)
                   || jsonb_build_object('framing', %s::jsonb)
             where tenant_id = %s and id = %s
            """,
            (Json(framing), tenant_id, story_id),
        )
