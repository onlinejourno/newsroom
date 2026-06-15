"""Command-line entry point for the ingest library.

    onlinejourno-ingest collect --tenant self [--beat markets-regulatory]
                                [--source-name "The Hindu — Business"]

Runs the appropriate collector for each enabled source under the tenant,
writes signals to Postgres, and updates portal-health timestamps.

Run lifecycle is exception-safe: every started `collector_runs` row is
finished with either 'success' or 'failed' status, even when the collector
raises an unexpected exception. No orphan 'running' rows.
"""

from __future__ import annotations

import argparse
import sys
import time
from typing import Any
from uuid import UUID

from onlinejourno_ingest.collectors.api import ApiCollector
from onlinejourno_ingest.collectors.base import http_session
from onlinejourno_ingest.collectors.gdelt import GDELTCollector
from onlinejourno_ingest.collectors.rss import RSSCollector
from onlinejourno_ingest.collectors.scrape import ScrapeCollector
from onlinejourno_ingest.db import (
    connect,
    enabled_sources,
    finish_run,
    mark_source_failed,
    mark_source_seen,
    pib_signals_needing_hydration,
    set_signal_body_published,
    start_run,
    tenant_id_for_slug,
    upsert_signal,
)
from onlinejourno_ingest.fetch.cloudflare import CloudflareFetcher
from onlinejourno_ingest.hydrate.pib import PibHydrator
from onlinejourno_ingest.protocols import FetchError

# Map of source kind to a collector factory. Instances are created once per
# CLI invocation (see `cmd_collect`) so HTTP sessions and any per-collector
# state are reused across sources.
COLLECTORS = {
    "rss": RSSCollector,
    "gdelt": GDELTCollector,
    "api": ApiCollector,
    "scrape": ScrapeCollector,
}


def _build_collectors(kinds: set[str]) -> dict[str, Any]:
    """Instantiate one collector per kind that the run will use."""
    instances: dict[str, Any] = {}
    for kind in kinds:
        if kind in COLLECTORS:
            instances[kind] = COLLECTORS[kind]()
    return instances


def _run_one_source(
    source: dict[str, Any],
    collector: Any,
) -> tuple[int, int, str | None]:
    """Run a single source. Returns (new, parsed, error_note).

    The run row is started, the collector fetches, signals are upserted, and
    the run row is finished — all in well-scoped transactions. Any exception
    is caught here so the caller's loop can keep going.

    `error_note` is None on success, otherwise a short string describing the
    failure.
    """
    source_id: UUID = source["id"]
    tenant_id: UUID = source["tenant_id"]
    kind: str = source["kind"]

    with connect() as conn:
        run_id = start_run(
            conn,
            tenant_id=tenant_id,
            collector=kind,
            source_id=source_id,
        )

    try:
        signals = collector.fetch(source)
    except FetchError as exc:
        with connect() as conn:
            mark_source_failed(conn, source_id=source_id, tenant_id=tenant_id)
            finish_run(
                conn,
                run_id=run_id,
                tenant_id=tenant_id,
                status="failed",
                items_count=0,
                notes=str(exc),
            )
        return 0, 0, str(exc)
    except Exception as exc:
        # Any unexpected exception still finishes the run row so it does
        # not stay in 'running' state forever.
        with connect() as conn:
            mark_source_failed(conn, source_id=source_id, tenant_id=tenant_id)
            finish_run(
                conn,
                run_id=run_id,
                tenant_id=tenant_id,
                status="failed",
                items_count=0,
                notes=f"unexpected error: {exc!r}",
            )
        return 0, 0, f"unexpected: {exc!r}"

    new_for_source = 0
    try:
        with connect() as conn:
            for signal in signals:
                if upsert_signal(conn, signal=signal, run_id=run_id):
                    new_for_source += 1
            mark_source_seen(conn, source_id=source_id, tenant_id=tenant_id)
            finish_run(
                conn,
                run_id=run_id,
                tenant_id=tenant_id,
                status="success",
                items_count=len(signals),
                notes=f"+{new_for_source} new of {len(signals)} parsed",
            )
    except Exception as exc:
        # Upsert failed for some reason (e.g., Postgres outage mid-loop).
        # Finish the run row as failed in a fresh connection.
        with connect() as conn:
            finish_run(
                conn,
                run_id=run_id,
                tenant_id=tenant_id,
                status="failed",
                items_count=new_for_source,
                notes=f"upsert error: {exc!r}",
            )
        return new_for_source, len(signals), f"upsert: {exc!r}"

    return new_for_source, len(signals), None


def cmd_collect(args: argparse.Namespace) -> int:
    """Run all enabled collectors for a tenant + optional beat filter."""
    with connect() as conn:
        tenant_id = tenant_id_for_slug(conn, args.tenant)
        sources = enabled_sources(
            conn,
            tenant_id,
            beat_tag=args.beat,
        )

    if args.source_name:
        sources = [s for s in sources if s["name"] == args.source_name]

    if not sources:
        print(
            f"No enabled sources for tenant '{args.tenant}'"
            + (f", beat '{args.beat}'" if args.beat else "")
            + ".",
            file=sys.stderr,
        )
        return 1

    # Instantiate one collector per kind, reused for the whole run.
    collectors = _build_collectors({source["kind"] for source in sources})

    total_new = 0
    total_parsed = 0
    failed_sources = 0

    for source in sources:
        kind = source["kind"]
        collector = collectors.get(kind)
        if collector is None:
            print(f"  {source['name']:<32} skipped: kind '{kind}' has no collector yet")
            continue

        new, parsed, error = _run_one_source(source, collector)
        total_new += new
        total_parsed += parsed
        if error is not None:
            failed_sources += 1
            print(f"  {source['name']:<32} FAILED: {error}")
        else:
            print(f"  {source['name']:<32} +{new:<4} ({parsed} parsed)")

    successful = len(sources) - failed_sources
    print(
        f"\nDone. {total_new} new signals from {successful} of {len(sources)}"
        f" sources ({total_parsed} parsed total)."
    )
    return 0 if failed_sources == 0 else 2


def cmd_hydrate_pib(args: argparse.Namespace) -> int:
    """Fetch PIB release pages to fill body_text + published_at on signals."""
    hydrator = PibHydrator(CloudflareFetcher(http_session()))
    with connect() as conn:
        tenant_id = tenant_id_for_slug(conn, args.tenant)
        rows = pib_signals_needing_hydration(conn, tenant_id, limit=args.limit)

    if not rows:
        print("No PIB signals need hydration.")
        return 0

    hydrated = 0
    skipped = 0
    last = 0.0
    for row in rows:
        wait = args.min_interval - (time.monotonic() - last)
        if wait > 0:
            time.sleep(wait)
        last = time.monotonic()
        try:
            content = hydrator.hydrate(row["url"])
            if content.body_text is None and content.published_at is None:
                skipped += 1
                continue
            with connect() as conn:
                set_signal_body_published(
                    conn,
                    tenant_id=tenant_id,
                    signal_id=row["id"],
                    body_text=content.body_text,
                    published_at=content.published_at,
                )
            hydrated += 1
        except Exception as exc:  # robust: one bad page never aborts the batch
            skipped += 1
            print(f"  skip {row['url']}: {exc}", file=sys.stderr)

    print(f"hydrated {hydrated}, skipped {skipped} of {len(rows)}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="onlinejourno-ingest")
    subparsers = parser.add_subparsers(dest="command", required=True)

    collect = subparsers.add_parser("collect", help="Run enabled collectors for a tenant")
    collect.add_argument("--tenant", required=True, help="Tenant slug, e.g. 'self'")
    collect.add_argument("--beat", help="Filter by beat tag, e.g. 'markets-regulatory'")
    collect.add_argument("--source-name", help="Run a single source by its exact name")
    collect.set_defaults(func=cmd_collect)

    hydrate = subparsers.add_parser(
        "hydrate-pib",
        help="Fetch PIB release pages to fill body_text + published_at",
    )
    hydrate.add_argument("--tenant", required=True, help="Tenant slug, e.g. 'self'")
    hydrate.add_argument("--limit", type=int, default=200, help="Max signals per run")
    hydrate.add_argument(
        "--min-interval", type=float, default=2.0, help="Seconds between page fetches"
    )
    hydrate.set_defaults(func=cmd_hydrate_pib)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
