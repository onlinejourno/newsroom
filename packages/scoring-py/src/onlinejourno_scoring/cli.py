"""CLI for the SEO + E-E-A-T audit (discover-dashboard port; R2: surfaces + need)."""
from __future__ import annotations

import argparse
import json as _json


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="onlinejourno-scoring")
    sub = p.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("audit", help="full SEO + E-E-A-T audit for a URL")
    a.add_argument("url")
    a.add_argument("--trend", default="")
    a.add_argument("--need", default="")
    a.add_argument("--surfaces", default="discover,google_news,google_search",
                   help="comma-separated optimization_surfaces keys to score")
    a.add_argument("--json", action="store_true")
    td = sub.add_parser("topic-domains", help="which domains own a topic (GDELT)")
    td.add_argument("topic")
    td.add_argument("--days", type=int, default=7)
    td.add_argument("--json", action="store_true")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.cmd == "audit":
        from onlinejourno_scoring.audit import run_audit

        surfaces = [s.strip() for s in args.surfaces.split(",") if s.strip()]
        result = run_audit(args.url, trend=args.trend, need=args.need, surfaces=surfaces)
        print(_json.dumps(result) if args.json else result)
        return 0
    if args.cmd == "topic-domains":
        from onlinejourno_scoring.gdelt import top_domains
        res = top_domains(args.topic, days=args.days)
        print(_json.dumps(res) if args.json else res)
        return 0
    return 1
