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
from onlinejourno_agents.cluster_threads import run_cluster
from onlinejourno_agents.frame_eval import run_frame_eval
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
        since_hours=args.since_hours,
        rank_by=args.rank_by,
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


def cmd_cluster(args: argparse.Namespace) -> int:
    completer = make_completer(_resolve_provider())
    result = run_cluster(
        tenant_slug=args.tenant, beat_slug=args.beat,
        completer=completer, since_hours=args.since_hours,
    )
    if result.status == "empty":
        print("No recent signals to cluster.", file=sys.stderr)
        return 1
    if result.status != "success":
        print(f"cluster failed (status={result.status})", file=sys.stderr)
        return 1
    print(
        f"{result.threads} threads · {result.linked} links · "
        f"spent ${result.spent_usd:.4f}"
    )
    return 0


def cmd_frame_eval(args: argparse.Namespace) -> int:
    """m-framing-pej eval — replay the PEJ frame scorer against the India-2026 goldset."""
    completer = make_completer(_resolve_provider())
    res = run_frame_eval(completer=completer, sample=args.sample)
    if res.n == 0:
        print("No goldset rows evaluated.", file=sys.stderr)
        return 1
    print(f"m-framing-pej eval — {res.n} stories (India-2026 goldset)")
    print(f"  frame accuracy: {res.frame_accuracy:.0%}  ({res.frame_correct}/{res.n})")
    print(f"  topic accuracy: {res.topic_accuracy:.0%}  ({res.topic_correct}/{res.n})")
    print(f"  spent ${res.spent_usd:.4f}")
    if res.confusions:
        print("  top frame confusions (human -> AI):")
        for (t, p), n in res.confusions.most_common(5):
            print(f"    {n}x  {t} -> {p}")
    return 0


def cmd_analyze_url(args: argparse.Namespace) -> int:
    """Channel Audit for a published URL — the real fair-chance scorer.

    Fetches + parses the article (own published content), scores it for each
    surface, prints composite + per-surface grade + the top fix. This is the
    correct target (a real article), unlike scoring headline stubs.
    """
    import requests as _rq

    from onlinejourno_agents.distribution_fit import analyze_url

    db._load_env_once()
    try:
        res = analyze_url(args.url)
    except _rq.RequestException as exc:
        print(f"fetch failed: {exc}", file=sys.stderr)
        return 1
    story = res["story"]
    print(args.url)
    print(
        f"  {story.title[:70] or '(no title)'}  ·  "
        f"{story.word_count or 0} words · composite {res['composite']}/100"
    )
    for surface, v in res["channels"].items():
        label = surface.split("_")[-1].title()
        print(f"  {label:9} {v['grade']} ({v['score']:>3})   fix: {v['top_fix'] or '—'}")
    return 0


def cmd_distribution_fit(args: argparse.Namespace) -> int:
    """Score recent signals for distribution fit (m-distribution-fit Phase 1).

    Content-based, no API keys — prints per-surface grades + the top fix, i.e.
    the reporter's pre-publish fair-chance cue.
    """
    from onlinejourno_agents.distribution_fit import Story, channel_score

    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        surfaces = db.enabled_surface_keys(conn, tenant_id) or None
        rows = db.recent_signals(conn, tenant_id, limit=args.top)
        if not rows:
            print("No signals.", file=sys.stderr)
            return 1
        stored = 0
        for r in rows:
            body = r.get("body_text") or ""
            story = Story(
                title=r.get("headline") or "",
                published=r.get("published_at"),
                word_count=len(body.split()) or None,
                url=r.get("url"),
                trend_alignment=int((r.get("trend_score") or 0) / 5),
            )
            res = channel_score(story, surfaces=surfaces)
            if not res:
                continue
            if args.store:
                for surface, v in res.items():
                    db.upsert_distribution_fit(
                        conn, tenant_id=tenant_id, signal_id=r["id"], surface=surface,
                        score=v["score"], grade=v["grade"], top_fix=v["top_fix"],
                        signals=v["signals"],
                    )
                    stored += 1
            else:
                grades = "  ".join(
                    f"{k.split('_')[-1][:4].title()} {v['grade']}({v['score']:>2})"
                    for k, v in res.items()
                )
                head = (r.get("headline") or r.get("url") or "")[:64]
                print(f"{grades}   {head}")
                weakest = min(res.values(), key=lambda v: v["score"])
                if weakest["top_fix"]:
                    print(f"        fix: {weakest['top_fix']}")
        if args.store:
            conn.commit()
            print(f"stored {stored} scores across {len(rows)} signals")
    return 0


def cmd_keyword_data(args: argparse.Namespace) -> int:
    """Test handle for the Keywords Everywhere connector (C2, ADR 0044).

    Builds the connector via the seam and prints real search volumes — the
    reproducible way to sanity-check the integration during product work.
    """
    from onlinejourno_agents.connectors import ConnectorConfig, make_connector

    db._load_env_once()
    client = make_connector(
        ConnectorConfig(
            category="keywords",
            provider="keywords_everywhere",
            mode="api",
            config={"country": args.country, "currency": args.currency},
            secret_ref="KEYWORDS_EVERYWHERE_API_KEY",
        )
    )
    data = client.keyword_data(args.terms)
    if not data:
        print(
            "No data. Check KEYWORDS_EVERYWHERE_API_KEY in .env (and your terms).",
            file=sys.stderr,
        )
        return 1
    for d in sorted(data.values(), key=lambda x: -x["volume"]):
        print(
            f"{d['volume']:>9,}  {d['trend_direction']:<8}  "
            f"comp {d['competition']:.2f}  {d['keyword']}"
        )
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
    p_brief.add_argument(
        "--since-hours", type=int, default=None,
        help="only compose from items shortlisted in the last N hours (daily freshness)",
    )
    p_brief.add_argument(
        "--rank-by", choices=["score", "recency", "velocity"], default="score",
        help="editor lens: importance (score), recency (newest), or velocity (most-covered)",
    )
    p_brief.set_defaults(func=cmd_brief)

    p_show = sub.add_parser("show-brief", help="render the latest brief as Markdown")
    p_show.add_argument("--tenant", required=True)
    p_show.add_argument("--beat", default=None)
    p_show.set_defaults(func=cmd_show_brief)

    p_cluster = sub.add_parser("cluster", help="group recent signals into story threads (velocity)")
    p_cluster.add_argument("--tenant", required=True)
    p_cluster.add_argument("--beat", default=None)
    p_cluster.add_argument("--since-hours", type=int, default=24)
    p_cluster.set_defaults(func=cmd_cluster)

    p_frame = sub.add_parser("frame-eval", help="eval PEJ frame scorer vs the goldset")
    p_frame.add_argument("--sample", type=int, default=40, help="goldset stories (170 total)")
    p_frame.set_defaults(func=cmd_frame_eval)

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

    p_kw = sub.add_parser(
        "keyword-data", help="test the Keywords Everywhere connector (C2)"
    )
    p_kw.add_argument("terms", nargs="+", help="keywords to look up")
    p_kw.add_argument("--country", default="in")
    p_kw.add_argument("--currency", default="inr")
    p_kw.set_defaults(func=cmd_keyword_data)

    p_df = sub.add_parser(
        "distribution-fit",
        help="score recent signals for distribution fit (m-distribution-fit P1)",
    )
    p_df.add_argument("--tenant", required=True)
    p_df.add_argument("--top", type=int, default=10)
    p_df.add_argument(
        "--store", action="store_true",
        help="persist scores to distribution_fit_scores (for /shortlist + brief)",
    )
    p_df.set_defaults(func=cmd_distribution_fit)

    p_au = sub.add_parser(
        "analyze-url",
        help="Channel Audit for a published URL — the real fair-chance scorer",
    )
    p_au.add_argument("url", help="the article URL to audit")
    p_au.set_defaults(func=cmd_analyze_url)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
