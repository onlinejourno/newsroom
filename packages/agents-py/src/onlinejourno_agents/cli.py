"""Command-line entry point for the agents.

    onlinejourno-agents shortlist --tenant self --beat markets-regulatory [--all] [--top 20]
    onlinejourno-agents brief     --tenant self --beat markets-regulatory [--top 20]
    onlinejourno-agents show-brief --tenant self [--beat markets-regulatory]

`shortlist` and `brief` call the configured LLM provider (default Anthropic;
set LLM_PROVIDER=openai for OpenAI-compatible or self-hosted endpoints).
`show-brief` is read-only — it renders the latest stored brief as Markdown,
which is the artifact you put in front of a journalist.
"""

from __future__ import annotations

import argparse
import sys

from onlinejourno_agents import db
from onlinejourno_agents.brief_compose import run_brief
from onlinejourno_agents.client import (
    ProviderConfig,
    make_completer,
    provider_config_from_env,
)
from onlinejourno_agents.ingest_score import run_shortlist
from onlinejourno_agents.render import brief_to_markdown


def _is_local(base_url: str | None) -> bool:
    return bool(base_url) and ("localhost" in base_url or "127.0.0.1" in base_url)


def _resolve_provider() -> ProviderConfig:
    """Build + validate the provider config, print what's in use, or exit."""
    db._load_env_once()
    try:
        cfg = provider_config_from_env()
    except ValueError as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(2) from exc
    needs_key = not (cfg.provider == "openai" and _is_local(cfg.base_url))
    if needs_key and not cfg.api_key:
        key_hint = (
            "ANTHROPIC_API_KEY"
            if cfg.provider == "anthropic"
            else "OPENAI_API_KEY / LLM_API_KEY"
        )
        print(
            f"No API key for provider '{cfg.provider}'. Set {key_hint} (or LLM_API_KEY) "
            f"in .env, or use a local OpenAI-compatible endpoint via LLM_BASE_URL.",
            file=sys.stderr,
        )
        raise SystemExit(2)
    where = f" via {cfg.base_url}" if cfg.base_url else ""
    print(f"LLM: {cfg.provider} · {cfg.model}{where}", file=sys.stderr)
    return cfg


def cmd_shortlist(args: argparse.Namespace) -> int:
    completer = make_completer(_resolve_provider())
    result = run_shortlist(
        tenant_slug=args.tenant,
        beat_slug=args.beat,
        completer=completer,
        since_hours=None if args.all else args.since_hours,
        top_n=args.top,
    )
    print(
        f"scored {result.scored} · shortlisted {result.shortlisted} · "
        f"failed {result.failed} · skipped(budget) {result.skipped_budget} · "
        f"spent ${result.spent_usd:.4f} of ${result.cap_usd:.2f} cap"
    )
    return 0


def cmd_brief(args: argparse.Namespace) -> int:
    completer = make_completer(_resolve_provider())
    result = run_brief(
        tenant_slug=args.tenant,
        beat_slug=args.beat,
        completer=completer,
        top_n=args.top,
    )
    if result.status == "empty":
        print("No shortlist items — run `shortlist` first.", file=sys.stderr)
        return 1
    if result.status != "success":
        print(f"brief failed (status={result.status})", file=sys.stderr)
        return 1
    print(
        f"brief {result.brief_id} · {result.sections} sections from "
        f"{result.items_used} items · spent ${result.spent_usd:.4f}"
    )
    return 0


def cmd_show_brief(args: argparse.Namespace) -> int:
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        beat_id = db.beat_id_for_slug(conn, tenant_id, args.beat) if args.beat else None
        brief = db.latest_brief(conn, tenant_id, beat_id=beat_id)
        if brief is None:
            print("No brief found. Run `shortlist` then `brief` first.", file=sys.stderr)
            return 1
        content = brief["content"]
        sids = [s for sec in content.get("sections", []) for s in sec.get("signals", [])]
        urls = db.signal_urls_for(conn, sids)
    disclosure = (brief.get("ai_disclosure") or {}).get("disclosure_text")
    title = f"Morning Brief — {args.beat}" if args.beat else "Morning Brief"
    print(brief_to_markdown(content, title=title, disclosure_text=disclosure, signal_urls=urls))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="onlinejourno-agents")
    sub = parser.add_subparsers(dest="command", required=True)

    p_short = sub.add_parser("shortlist", help="score signals into the shortlist")
    p_short.add_argument("--tenant", required=True)
    p_short.add_argument("--beat", default=None)
    p_short.add_argument("--since-hours", type=int, default=48)
    p_short.add_argument("--all", action="store_true", help="score all unscored regardless of age")
    p_short.add_argument("--top", type=int, default=20)
    p_short.set_defaults(func=cmd_shortlist)

    p_brief = sub.add_parser("brief", help="compose the daily brief from the shortlist")
    p_brief.add_argument("--tenant", required=True)
    p_brief.add_argument("--beat", default=None)
    p_brief.add_argument("--top", type=int, default=20)
    p_brief.set_defaults(func=cmd_brief)

    p_show = sub.add_parser("show-brief", help="render the latest brief as Markdown")
    p_show.add_argument("--tenant", required=True)
    p_show.add_argument("--beat", default=None)
    p_show.set_defaults(func=cmd_show_brief)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
