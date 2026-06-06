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


def cmd_why(args: argparse.Namespace) -> int:
    """Reasoning trace: why each story made the shortlist (MVP success criterion).

    Surfaces the per-signal score + the model's one-line rationale, in editorial
    English, ranked — the 'why did the AI pick this' view an editor checks.
    """
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        beat_id = db.beat_id_for_slug(conn, tenant_id, args.beat) if args.beat else None
        items = db.top_shortlist(conn, tenant_id, beat_id=beat_id, limit=args.top)
    if not items:
        print("No shortlist yet. Run `shortlist` first.", file=sys.stderr)
        return 1
    print(f"Why these {len(items)} made the shortlist — reasoning trace\n")
    for it in items:
        rank = it.get("rank")
        score = it.get("score") or 0.0
        head = it.get("headline") or it.get("url")
        print(f"#{rank if rank is not None else '-':<3} score {score:.2f}  {head}")
        rationale = (it.get("rationale") or "").strip()
        if rationale:
            print(f"        why: {rationale}")
        print(f"        [{it.get('source_name') or '?'}]  {it.get('url')}\n")
    return 0


def cmd_off_record(args: argparse.Namespace) -> int:
    """Mark/unmark signals off-record (ADR 0029) — excluded from briefs, reversible."""
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        if args.list:
            rows = db.list_off_record(conn, tenant_id)
            if not rows:
                print("No off-record signals.")
                return 0
            print(f"{len(rows)} off-record signal(s):")
            for r in rows:
                print(f"  {r['headline'] or r['url']}")
            return 0
        if not args.match:
            print("Provide --match <headline text> (or --list).", file=sys.stderr)
            return 2
        actor = db.resolve_user_id(conn, tenant_id, args.by)
        matches = db.find_signals_by_headline(conn, tenant_id, args.match)
        if not matches:
            print(f"No signals matching {args.match!r}.", file=sys.stderr)
            return 1
        on = not args.unmark
        for m in matches:
            db.set_off_record(
                conn, tenant_id=tenant_id, signal_id=m["id"],
                on=on, actor_user_id=actor, reason=args.reason,
            )
    verb = "Marked off-record" if on else "Un-marked"
    print(f"{verb} {len(matches)} signal(s):")
    for m in matches:
        print(f"  {m['headline'] or m['url']}")
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

    p_why = sub.add_parser("why", help="reasoning trace — why each story made the shortlist")
    p_why.add_argument("--tenant", required=True)
    p_why.add_argument("--beat", default=None)
    p_why.add_argument("--top", type=int, default=15)
    p_why.set_defaults(func=cmd_why)

    p_off = sub.add_parser("off-record", help="mark/unmark a signal off-record")
    p_off.add_argument("--tenant", required=True)
    p_off.add_argument("--match", default=None, help="headline substring to match")
    p_off.add_argument("--reason", default=None, help="why (private to marker + editor)")
    p_off.add_argument("--by", default=None, help="actor email")
    p_off.add_argument("--unmark", action="store_true", help="clear the flag instead")
    p_off.add_argument("--list", action="store_true", help="list current off-record signals")
    p_off.set_defaults(func=cmd_off_record)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
