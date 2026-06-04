"""Command-line entry point for the ingest library.

    onlinejourno-ingest collect --tenant self [--beat markets-regulatory] [--source-name "The Hindu — Business"]

Runs the appropriate collector for each enabled source under the tenant,
writes signals to Postgres, and updates portal-health timestamps.
"""

from __future__ import annotations

import argparse
import sys

from onlinejourno_ingest.collectors.rss import RSSCollector
from onlinejourno_ingest.db import (
    connect,
    enabled_sources,
    finish_run,
    mark_source_failed,
    mark_source_seen,
    start_run,
    tenant_id_for_slug,
    upsert_signal,
)
from onlinejourno_ingest.protocols import FetchError


COLLECTORS = {
    "rss": RSSCollector,
}


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

    total_new = 0
    total_seen = 0
    failed_sources = 0

    for source in sources:
        kind = source["kind"]
        if kind not in COLLECTORS:
            print(f"  {source['name']:<32} skipped: kind '{kind}' has no collector yet")
            continue

        collector = COLLECTORS[kind]()

        # Each source gets its own short transaction. Failure of one source
        # does not roll back signals from another.
        try:
            with connect() as conn:
                run_id = start_run(
                    conn,
                    tenant_id=source["tenant_id"],
                    collector=kind,
                    source_id=source["id"],
                )
                conn.commit()

            try:
                signals = collector.fetch(source)
            except FetchError as exc:
                with connect() as conn:
                    mark_source_failed(conn, source["id"])
                    finish_run(
                        conn,
                        run_id=run_id,
                        status="failed",
                        items_count=0,
                        notes=str(exc),
                    )
                    conn.commit()
                print(f"  {source['name']:<32} FAILED: {exc}")
                failed_sources += 1
                continue

            new_for_source = 0
            with connect() as conn:
                for signal in signals:
                    if upsert_signal(conn, signal=signal, run_id=run_id):
                        new_for_source += 1
                mark_source_seen(conn, source["id"])
                finish_run(
                    conn,
                    run_id=run_id,
                    status="success",
                    items_count=len(signals),
                    notes=f"+{new_for_source} new of {len(signals)} parsed",
                )
                conn.commit()

            total_new += new_for_source
            total_seen += len(signals)
            print(
                f"  {source['name']:<32} +{new_for_source:<4} "
                f"({len(signals)} parsed)"
            )
        except Exception as exc:
            print(f"  {source['name']:<32} ERROR: {exc}")
            failed_sources += 1

    print(
        f"\nDone. {total_new} new signals from {len(sources) - failed_sources}"
        f" of {len(sources)} sources ({total_seen} parsed total)."
    )
    return 0 if failed_sources == 0 else 2


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="onlinejourno-ingest")
    subparsers = parser.add_subparsers(dest="command", required=True)

    collect = subparsers.add_parser("collect", help="Run enabled collectors for a tenant")
    collect.add_argument("--tenant", required=True, help="Tenant slug, e.g. 'self'")
    collect.add_argument("--beat", help="Filter by beat tag, e.g. 'markets-regulatory'")
    collect.add_argument("--source-name", help="Run a single source by its exact name")
    collect.set_defaults(func=cmd_collect)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
