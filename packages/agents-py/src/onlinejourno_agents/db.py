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
# Brief reads + writes
# ----------------------------------------------------------------------


def top_shortlist(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    beat_id: UUID | None,
    limit: int,
    since_hours: int | None = None,
) -> list[dict[str, Any]]:
    """Top shortlist items (highest score) with their signal text, for composing.

    `since_hours` scopes to recently-shortlisted items so a daily brief reads
    today's shortlist rather than the all-time top (kept null for manual runs).
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
    sql = f"""
        select si.id as shortlist_id, si.signal_id, si.score, si.rank, si.rationale,
               s.headline, s.body_text, s.url, s.published_at, src.name as source_name
          from shortlist_items si
          join signals s on s.id = si.signal_id
          join sources src on src.id = s.source_id
         where {' and '.join(where)}
         order by si.score desc nulls last, si.rank asc nulls last
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
