"""Postgres access for the ingest library.

Connection lifecycle, collector run records, and signal upserts. All queries
include `tenant_id` (ADR 0005 row-level multi-tenancy). Row-level security
policies are added in a later migration; meanwhile every helper here is
explicit about its tenant.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

import psycopg
from dotenv import load_dotenv
from psycopg.rows import dict_row

from onlinejourno_ingest.protocols import Signal


def _load_env() -> None:
    """Load `.env` from the repo root if present."""
    here = Path(__file__).resolve()
    for parent in here.parents:
        candidate = parent / ".env"
        if candidate.exists():
            load_dotenv(candidate)
            return
        # stop at the repo root marker
        if (parent / "pnpm-workspace.yaml").exists():
            return


def database_url() -> str:
    """Return the configured DATABASE_URL or raise."""
    _load_env()
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Copy .env.local.example to .env and fill it in."
        )
    return url


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    """Yield a psycopg connection using DATABASE_URL. Caller manages txn."""
    with psycopg.connect(database_url(), row_factory=dict_row) as conn:
        yield conn


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# ----------------------------------------------------------------------
# Tenant + source lookups
# ----------------------------------------------------------------------


def tenant_id_for_slug(conn: psycopg.Connection, slug: str) -> str:
    """Resolve a tenant slug ('self', 'midsize-daily-x') to its uuid."""
    with conn.cursor() as cur:
        cur.execute("select id from tenants where slug = %s", (slug,))
        row = cur.fetchone()
        if row is None:
            raise RuntimeError(f"Tenant with slug '{slug}' not found")
        return row["id"]


def enabled_sources(
    conn: psycopg.Connection,
    tenant_id: str,
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
    tenant_id: str,
    collector: str,
    source_id: str | None = None,
) -> str:
    """Insert a `collector_runs` row in 'running' state, return its id."""
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
    run_id: str,
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
             where id = %s
            """,
            (now_utc(), status, items_count, notes, run_id),
        )


# ----------------------------------------------------------------------
# Signal upsert + source health
# ----------------------------------------------------------------------


def upsert_signal(
    conn: psycopg.Connection,
    *,
    signal: Signal,
    run_id: str | None,
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
                psycopg.types.json.Json(signal.raw_payload),
            ),
        )
        return cur.fetchone() is not None


def mark_source_seen(conn: psycopg.Connection, source_id: str) -> None:
    """Record a successful ingest for portal-health tracking (ADR 0014)."""
    with conn.cursor() as cur:
        cur.execute(
            """
            update sources
               set last_seen_at = %s,
                   consecutive_failures = 0
             where id = %s
            """,
            (now_utc(), source_id),
        )


def mark_source_failed(conn: psycopg.Connection, source_id: str) -> None:
    """Increment the failure counter for portal-health alerting."""
    with conn.cursor() as cur:
        cur.execute(
            """
            update sources
               set consecutive_failures = consecutive_failures + 1
             where id = %s
            """,
            (source_id,),
        )
