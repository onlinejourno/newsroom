"""Postgres access for the ingest library.

Connection lifecycle, collector run records, and signal upserts. All queries
include `tenant_id` (ADR 0005 row-level multi-tenancy). Row-level security
policies are added in a later migration; meanwhile every helper here is
explicit about its tenant.

Connection semantics
--------------------

`connect()` is a context manager wrapping `psycopg.connect(...)`. psycopg3
commits the in-flight transaction on a clean `__exit__` and rolls back on
an exception. Callers should *not* call `conn.commit()` explicitly inside
the `with` block — let the contextmanager do it. Use multiple `with
connect()` blocks if you need each to be its own transaction.
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

from onlinejourno_ingest.protocols import Signal


@lru_cache(maxsize=1)
def _load_env_once() -> None:
    """Load `.env` from the repo root if present. Called at most once per process."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / ".env"
        if candidate.exists():
            load_dotenv(candidate)
            return
        # stop walking at the repo root marker
        if (parent / "pnpm-workspace.yaml").exists():
            return


def database_url() -> str:
    """Return the configured DATABASE_URL or raise."""
    _load_env_once()
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.local.example to .env and fill it in."
        )
    return url


@contextmanager
def connect(tenant_id: UUID | str | None = None) -> Iterator[psycopg.Connection]:
    """Yield a psycopg connection that commits on clean exit, rolls back on error.

    Do not call `conn.commit()` inside the `with` block; psycopg3 commits on
    `__exit__`. Use a new `with connect()` block when you need a fresh
    transaction.

    Pass `tenant_id` when it is already known so the connection is pinned for
    row-level security (migration 0029) before any scoped query runs.
    Connections that resolve the tenant by slug are pinned inside
    tenant_id_for_slug instead.
    """
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        if tenant_id is not None:
            pin_tenant(conn, tenant_id)
        yield conn


def pin_tenant(conn: psycopg.Connection, tenant_id: UUID | str) -> None:
    """Pin app.current_tenant for the connection so RLS policies see the tenant.

    Session-scoped (is_local=false): survives psycopg3's per-block commits for
    the connection's lifetime. Connections here are short-lived and never
    pooled across tenants, so a session-level pin cannot leak.
    """
    with conn.cursor() as cur:
        cur.execute(
            "select set_config('app.current_tenant', %s, false)", (str(tenant_id),)
        )


def now_utc() -> datetime:
    return datetime.now(UTC)


# ----------------------------------------------------------------------
# Tenant + source lookups
# ----------------------------------------------------------------------


def tenant_id_for_slug(conn: psycopg.Connection, slug: str) -> UUID:
    """Resolve a tenant slug ('self', 'midsize-daily-x') to its UUID.

    Also pins the connection to that tenant for RLS — every run resolves its
    tenant through here before touching scoped tables.
    """
    with conn.cursor() as cur:
        cur.execute("select id from tenants where slug = %s", (slug,))
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(f"Tenant with slug '{slug}' not found")
    pin_tenant(conn, row["id"])
    return row["id"]


def enabled_sources(
    conn: psycopg.Connection,
    tenant_id: UUID,
    *,
    kind: str | None = None,
    beat_tag: str | None = None,
) -> list[dict[str, Any]]:
    """Return enabled sources for the tenant, optionally filtered."""
    sql = ["select * from sources where tenant_id = %s and enabled is true"]
    params: list[Any] = [tenant_id]
    if kind is not None:
        sql.append("and kind = %s")
        params.append(kind)
    if beat_tag is not None:
        sql.append("and %s = any(beat_tags)")
        params.append(beat_tag)
    sql.append("order by name")
    with conn.cursor() as cur:
        cur.execute(" ".join(sql), params)
        return list(cur.fetchall())


# ----------------------------------------------------------------------
# Collector run lifecycle
# ----------------------------------------------------------------------


def start_run(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    collector: str,
    source_id: UUID | None = None,
) -> UUID:
    """Insert a `collector_runs` row in 'running' state, return its UUID."""
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into collector_runs (tenant_id, collector, source_id, started_at, status)
            values (%s, %s, %s, %s, 'running')
            returning id
            """,
            (tenant_id, collector, source_id, now_utc()),
        )
        row = cur.fetchone()
        assert row is not None
        return row["id"]


def finish_run(
    conn: psycopg.Connection,
    *,
    run_id: UUID,
    tenant_id: UUID,
    status: str,
    items_count: int,
    notes: str | None = None,
) -> None:
    """Mark a run finished with status, count, and optional notes."""
    with conn.cursor() as cur:
        cur.execute(
            """
            update collector_runs
               set finished_at = %s,
                   status      = %s,
                   items_count = %s,
                   notes       = %s
             where id = %s and tenant_id = %s
            """,
            (now_utc(), status, items_count, notes, run_id, tenant_id),
        )


# ----------------------------------------------------------------------
# Signal upsert + source health
# ----------------------------------------------------------------------


def upsert_signal(
    conn: psycopg.Connection,
    *,
    signal: Signal,
    run_id: UUID | None,
) -> bool:
    """Insert a signal. Returns True if inserted, False if it was a duplicate."""
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into signals (
                tenant_id, source_id, run_id, external_id,
                url, url_hash, headline, body_text,
                published_at, fetched_at, language, raw_payload
            )
            values (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            on conflict (tenant_id, url_hash) do nothing
            returning id
            """,
            (
                signal.tenant_id,
                signal.source_id,
                run_id,
                signal.external_id,
                signal.url,
                signal.url_hash,
                signal.headline,
                signal.body_text,
                signal.published_at,
                signal.fetched_at or now_utc(),
                signal.language,
                Json(signal.raw_payload),
            ),
        )
        return cur.fetchone() is not None


def mark_source_seen(
    conn: psycopg.Connection, *, source_id: UUID, tenant_id: UUID
) -> None:
    """Record a successful ingest for portal-health tracking (ADR 0014)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            update sources
               set last_seen_at = %s,
                   consecutive_failures = 0
             where id = %s and tenant_id = %s
            """,
            (now_utc(), source_id, tenant_id),
        )


def mark_source_failed(
    conn: psycopg.Connection, *, source_id: UUID, tenant_id: UUID
) -> None:
    """Increment the failure counter for portal-health alerting."""
    with conn.cursor() as cur:
        cur.execute(
            """
            update sources
               set consecutive_failures = consecutive_failures + 1
             where id = %s and tenant_id = %s
            """,
            (source_id, tenant_id),
        )


def signals_needing_hydration(
    conn: psycopg.Connection, tenant_id: UUID, domain: str, *, limit: int = 200
) -> list[dict[str, Any]]:
    """Signals from a url domain still missing body_text or published_at."""
    with conn.cursor() as cur:
        cur.execute(
            """
            select id, url
              from signals
             where tenant_id = %s
               and url like %s
               and (body_text is null or body_text = '' or published_at is null)
             order by fetched_at desc
             limit %s
            """,
            (tenant_id, f"%{domain}%", limit),
        )
        return list(cur.fetchall())


def set_signal_body_published(
    conn: psycopg.Connection,
    *,
    tenant_id: UUID,
    signal_id: UUID,
    body_text: str | None,
    published_at: datetime | None,
) -> None:
    """Update only the fields that were successfully parsed (non-None)."""
    sets: list[str] = []
    params: list[Any] = []
    if body_text is not None:
        sets.append("body_text = %s")
        params.append(body_text)
    if published_at is not None:
        sets.append("published_at = %s")
        params.append(published_at)
    if not sets:
        return
    params.extend([tenant_id, signal_id])
    with conn.cursor() as cur:
        cur.execute(
            f"update signals set {', '.join(sets)} where tenant_id = %s and id = %s",
            params,
        )
