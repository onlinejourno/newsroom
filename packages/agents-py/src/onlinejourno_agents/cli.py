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
import json
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


def cmd_nlp_extract(args: argparse.Namespace) -> int:
    """Test the NLP connector — entities + geo from text (ADR 0048, spaCy)."""
    from onlinejourno_agents.connectors import ConnectorConfig, make_connector

    cfg_kw = {"model": args.model} if args.model else {}
    client = make_connector(
        ConnectorConfig(category="nlp", provider=args.provider, mode="api", config=cfg_kw)
    )
    try:
        res = client.analyse(args.text)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    print("entities: " + (", ".join(res.get("entities") or []) or "(none)"))
    geo = res.get("geo") or {}
    print(f"geo: {geo.get('region') or '-'}  ·  {', '.join(geo.get('all') or [])}")
    return 0


def cmd_stories_from_signals(args: argparse.Namespace) -> int:
    """Demo corpus: promote one publication's ingested signals into stories."""
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        n = db.stories_from_signals(
            conn, tenant_id, host_like=args.host, limit=args.limit
        )
        conn.commit()
    print(f"promoted {n} signals from {args.host} into stories")
    return 0


def cmd_site_crawl(args: argparse.Namespace) -> int:
    """Placement crawl: where is each own story actually listed (Hidden Gems)."""
    from onlinejourno_agents.site_crawl import run_site_crawl

    res = run_site_crawl(tenant_slug=args.tenant, host=args.host)
    print(
        f"site-crawl: {res['fronts']} fronts crawled · "
        f"{res['updated']} of {res['stories']} stories placement-checked"
    )
    return 0


def cmd_alert(args: argparse.Namespace) -> int:
    """m-alerts — push high-trend signals to the newsroom over ntfy."""
    from onlinejourno_agents.alerts import run_alerts

    res = run_alerts(
        tenant_slug=args.tenant,
        topic=args.topic,
        threshold=args.threshold,
        since_hours=args.since_hours,
        limit=args.limit,
        detail_base=args.detail_base,
        dry_run=args.dry_run,
    )
    print(f"alerts: {res.sent} sent · {res.skipped} skipped · {res.status}")
    return 0 if res.status in ("success", "empty") else 1


def cmd_frame(args: argparse.Namespace) -> int:
    """m-framing-pej — code signals against the PEJ 14-frame codebook."""
    from onlinejourno_agents.framing import run_framing

    completer = make_completer(_resolve_provider())
    res = run_framing(
        tenant_slug=args.tenant,
        completer=completer,
        since_hours=args.since_hours,
        limit=args.limit,
        target="stories" if args.stories else "signals",
    )
    if res.status == "empty":
        print("No signals need framing.", file=sys.stderr)
        return 1
    print(
        f"coded {res.coded} signals · {res.failed} failed · "
        f"spent ${res.spent_usd:.4f} of ${res.cap_usd:.2f} cap"
    )
    return 0


def cmd_claim_extract(args: argparse.Namespace) -> int:
    """m-calendar — extract time-bound promises into the Predictive Editorial Calendar (ADR 0057)."""
    from onlinejourno_agents.claim_extract import run_claim_extraction

    completer = make_completer(_resolve_provider())
    res = run_claim_extraction(
        tenant_slug=args.tenant,
        completer=completer,
        since_hours=args.since_hours,
        limit=args.limit,
    )
    if res.status == "empty":
        print("No signals need calendar extraction.", file=sys.stderr)
        return 1
    print(
        f"scanned {res.scanned} signals · {res.events} calendar events · "
        f"{res.failed} failed · spent ${res.spent_usd:.4f} of ${res.cap_usd:.2f} cap"
    )
    return 0


def cmd_calendar_fuse(args: argparse.Namespace) -> int:
    """Turn due/past-due calendar events into Newslist leads (ADR 0057 §2)."""
    from onlinejourno_agents.calendar_fuse import run_calendar_fusion

    res = run_calendar_fusion(tenant_slug=args.tenant)
    print(
        f"scanned {res.scanned} events · {res.commissioned} commissioned · "
        f"{res.accountability} accountability · {res.skipped} skipped"
    )
    return 0


def cmd_need_mix(args: argparse.Namespace) -> int:
    """Need-mix view (ADR 0049) — reader-need distribution overall + per beat."""
    from onlinejourno_agents.need_mix import build_mix, render_mix

    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        rows = db.need_mix_counts(conn, tenant_id, window_hours=args.window_hours)
    if not rows:
        print("No classified signals in the window.", file=sys.stderr)
        return 1
    print(render_mix(build_mix(rows)))
    return 0


def cmd_trends(args: argparse.Namespace) -> int:
    """Trend scoring — topic momentum from signal convergence; writes trend_score.

    Ports the discover-dashboard momentum/trajectory bands, fed by our enriched
    corpus (entity convergence in a recent window vs a prior one).
    """
    from onlinejourno_agents.trend_score import topic_momentum

    window = args.window_hours
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        rows = db.enriched_signals_with_entities(
            conn, tenant_id, since_hours=2 * window, limit=600
        )
        if not rows:
            print("No enriched signals. Run `enrich` first.", file=sys.stderr)
            return 1
        recent = [r for r in rows if (r.get("age_h") or 0) < window]
        prior = [r for r in rows if (r.get("age_h") or 0) >= window]
        topics = topic_momentum(
            [r["entities"] for r in recent], [r["entities"] for r in prior]
        )
        mom = {t.topic: t for t in topics}
        scored = 0
        for r in recent:
            ents = r.get("entities") or []
            best = max(
                (mom[e] for e in ents if e in mom),
                key=lambda t: t.momentum,
                default=None,
            )
            if best is None:
                continue
            db.update_signal_trend(
                conn, tenant_id=tenant_id, signal_id=r["id"],
                trend_score=best.momentum,
                trend_reason=f"{best.trajectory} · {best.topic}",
            )
            scored += 1
        conn.commit()
    print(f"topic momentum (recent {window}h vs prior {window}h) — top {args.top}:")
    for t in topics[: args.top]:
        print(f"  {t.momentum:>5}  {t.trajectory:<34}  {t.topic}  (×{t.recent})")
    print(f"\nwrote trend_score to {scored} recent signals")
    return 0


def cmd_feed(args: argparse.Namespace) -> int:
    """Signals routed to a journalist — her inflow (beat / region match)."""
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        jid = db.journalist_id_for_slug(conn, tenant_id, args.journalist)
        if not jid:
            print(f"No journalist '{args.journalist}'.", file=sys.stderr)
            return 1
        rows = db.signals_for_journalist(
            conn, tenant_id, jid, since_hours=args.since_hours, limit=args.limit
        )
    if not rows:
        print(
            "No matching signals (need beat/region overlap + enriched signals).",
            file=sys.stderr,
        )
        return 1
    from onlinejourno_agents.feed_view import format_feed_signal

    print(f"{len(rows)} signals routed to {args.journalist}:")
    for r in rows:
        print(format_feed_signal(r))
    return 0


def cmd_enrich(args: argparse.Namespace) -> int:
    """L2 Analyse — enrich raw signals with entities, geo, beat, topic."""
    from onlinejourno_agents.enrich import run_enrich

    if args.stories:
        from onlinejourno_agents.enrich import run_enrich_stories

        completer = make_completer(_resolve_provider())
        res = run_enrich_stories(
            tenant_slug=args.tenant, completer=completer, limit=args.limit
        )
        if res.status == "empty":
            print("No stories need classification.", file=sys.stderr)
            return 1
        print(
            f"classified {res.enriched} stories · {res.failed} failed · "
            f"spent ${res.spent_usd:.4f} of ${res.cap_usd:.2f} cap"
        )
        return 0
    nlp = None
    if args.nlp:
        from onlinejourno_agents.connectors import ConnectorConfig, make_connector

        nlp = make_connector(
            ConnectorConfig(category="nlp", provider=args.nlp, mode="api")
        )
    completer = make_completer(_resolve_provider())
    res = run_enrich(
        tenant_slug=args.tenant,
        completer=completer,
        since_hours=args.since_hours,
        limit=args.limit,
        nlp=nlp,
    )
    if res.status == "empty":
        print("No signals need enrichment.", file=sys.stderr)
        return 1
    print(
        f"enriched {res.enriched} signals · {res.failed} failed · "
        f"spent ${res.spent_usd:.4f} of ${res.cap_usd:.2f} cap"
    )
    return 0


def cmd_cms_pull(args: argparse.Namespace) -> int:
    """Pull own stories from a CMS into `stories` — the inside end (ADR 0046).

    Mirrors how sources fill signals: the CMS connector fills the newsroom's own
    content. Testable against any WordPress site (published posts need no creds).
    """
    import requests as _rq

    from onlinejourno_agents.connectors import ConnectorConfig, make_connector

    db._load_env_once()
    client = make_connector(
        ConnectorConfig(
            category="cms", provider=args.provider, mode="api",
            config={"base_url": args.url},
        )
    )
    try:
        stories = client.stories(limit=args.limit)
    except _rq.RequestException as exc:
        print(f"pull failed: {exc}", file=sys.stderr)
        return 1
    if not stories:
        print("No stories returned.", file=sys.stderr)
        return 1
    new = 0
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        for s in stories:
            if db.upsert_story(
                conn, tenant_id=tenant_id, cms_ref=s["cms_ref"], url=s["url"],
                headline=s["headline"], body_text=s["body_text"],
                section=s["section"], published_at=s["published_at"],
            ):
                new += 1
        conn.commit()
    print(
        f"pulled {len(stories)} from {args.provider} · "
        f"{new} new, {len(stories) - new} updated"
    )
    return 0


def cmd_score_stories(args: argparse.Namespace) -> int:
    """Score own stories for distribution fit — closes the loop (ADR 0046/0047).

    For each own story, run the Channel Audit on its URL and store the per-surface
    score (story-keyed). The fair-chance audit reads these.
    """
    import requests as _rq

    from onlinejourno_agents.distribution_fit import analyze_url

    db._load_env_once()
    with db.connect() as conn:
        tenant_id = db.tenant_id_for_slug(conn, args.tenant)
        surfaces = db.enabled_surface_keys(conn, tenant_id) or None
        stories = db.recent_stories(conn, tenant_id, limit=args.top)
        if not stories:
            print("No stories. Run `cms-pull` first.", file=sys.stderr)
            return 1
        scored = 0
        failed = 0
        for st in stories:
            url = st.get("url")
            if not url:
                continue
            try:
                res = analyze_url(url, surfaces=surfaces)
            except _rq.RequestException:
                failed += 1
                continue
            for surface, v in res["channels"].items():
                db.upsert_distribution_fit(
                    conn, tenant_id=tenant_id, story_id=st["id"], surface=surface,
                    score=v["score"], grade=v["grade"], top_fix=v["top_fix"],
                    signals=v["signals"],
                )
            scored += 1
        conn.commit()
    print(f"scored {scored} stories · {failed} fetch-failed")
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
        res = analyze_url(args.url, user_need=args.need)
    except _rq.RequestException as exc:
        if args.json:
            print(json.dumps({"error": f"fetch failed: {exc}"}))
        else:
            print(f"fetch failed: {exc}", file=sys.stderr)
        return 1
    story = res["story"]
    if args.json:
        out = {
            "url": args.url,
            "title": story.title,
            "word_count": story.word_count,
            "composite": res["composite"],
            "channels": res["channels"],
        }
        if args.need:
            out["user_need"] = args.need
            out["priority_surfaces"] = res.get("priority_surfaces") or []
            out["top_fix"] = res.get("top_fix")
        print(json.dumps(out))
        return 0
    print(args.url)
    print(
        f"  {story.title[:70] or '(no title)'}  ·  "
        f"{story.word_count or 0} words · composite {res['composite']}/100"
    )
    priority = set(res.get("priority_surfaces") or [])
    for surface, v in res["channels"].items():
        label = surface.split("_")[-1].title()
        star = "*" if surface in priority else " "
        print(f" {star}{label:9} {v['grade']} ({v['score']:>3})   fix: {v['top_fix'] or '—'}")
    if args.need:
        print(f"  need: {args.need} (* = priority surface) · fix first: {res['top_fix'] or '—'}")
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

    p_au = sub.add_parser(
        "analyze-url",
        help="Channel Audit for a published URL — the real fair-chance scorer",
    )
    p_au.add_argument("url", help="the article URL to audit")
    p_au.add_argument(
        "--need",
        default=None,
        choices=["know", "understand", "feel", "do"],
        help="reader need the story serves — weights the audit (ADR 0049)",
    )
    p_au.add_argument("--json", action="store_true", help="machine-readable output")
    p_au.set_defaults(func=cmd_analyze_url)

    p_cms = sub.add_parser(
        "cms-pull",
        help="pull own stories from a CMS into the platform (the inside end)",
    )
    p_cms.add_argument("--tenant", required=True)
    p_cms.add_argument("--provider", default="wordpress")
    p_cms.add_argument("--url", required=True, help="CMS base URL, e.g. https://onlinejournalism.in")
    p_cms.add_argument("--limit", type=int, default=20)
    p_cms.set_defaults(func=cmd_cms_pull)

    p_ss = sub.add_parser(
        "score-stories",
        help="Channel-Audit own stories + store the scores (close the loop)",
    )
    p_ss.add_argument("--tenant", required=True)
    p_ss.add_argument("--top", type=int, default=20)
    p_ss.set_defaults(func=cmd_score_stories)

    p_en = sub.add_parser("enrich", help="L2 Analyse — enrich signals (entities/geo/beat)")
    p_en.add_argument("--tenant", required=True)
    p_en.add_argument("--since-hours", type=int, default=48)
    p_en.add_argument("--limit", type=int, default=60)
    p_en.add_argument(
        "--stories",
        action="store_true",
        help="classify OWN stories instead of signals (ADR 0054-B)",
    )
    p_en.add_argument(
        "--nlp",
        default=None,
        help="NLP-first entities/geo via this provider (e.g. spacy), ADR 0048",
    )
    p_en.set_defaults(func=cmd_enrich)

    p_fd = sub.add_parser("feed", help="signals routed to a journalist (her inflow)")
    p_fd.add_argument("--tenant", required=True)
    p_fd.add_argument("--journalist", required=True, help="journalist slug, e.g. td-lena-park")
    p_fd.add_argument("--since-hours", type=int, default=72)
    p_fd.add_argument("--limit", type=int, default=30)
    p_fd.set_defaults(func=cmd_feed)

    p_tr = sub.add_parser("trends", help="topic momentum from signal convergence")
    p_tr.add_argument("--tenant", required=True)
    p_tr.add_argument("--window-hours", type=int, default=24)
    p_tr.add_argument("--top", type=int, default=12)
    p_tr.set_defaults(func=cmd_trends)

    p_nm = sub.add_parser("need-mix", help="reader-need mix per beat (ADR 0049)")
    p_nm.add_argument("--tenant", required=True)
    p_nm.add_argument("--window-hours", type=int, default=168)
    p_nm.set_defaults(func=cmd_need_mix)

    p_fr = sub.add_parser("frame", help="PEJ framing coder (m-framing-pej)")
    p_fr.add_argument("--tenant", required=True)
    p_fr.add_argument("--since-hours", type=int, default=168)
    p_fr.add_argument("--limit", type=int, default=60)
    p_fr.add_argument(
        "--stories",
        action="store_true",
        help="frame OWN stories instead of signals (ADR 0054-B)",
    )
    p_fr.set_defaults(func=cmd_frame)

    p_ce = sub.add_parser(
        "claim-extract", help="extract time-bound promises → editorial calendar (m-calendar)"
    )
    p_ce.add_argument("--tenant", required=True)
    p_ce.add_argument("--since-hours", type=int, default=336)
    p_ce.add_argument("--limit", type=int, default=60)
    p_ce.set_defaults(func=cmd_claim_extract)

    p_fuse = sub.add_parser(
        "calendar-fuse",
        help="turn due/past-due calendar events into Newslist leads (ADR 0057 §2)",
    )
    p_fuse.add_argument("--tenant", required=True)
    p_fuse.set_defaults(func=cmd_calendar_fuse)

    p_sf = sub.add_parser(
        "stories-from-signals",
        help="promote a publication's signals into the own-stories demo corpus",
    )
    p_sf.add_argument("--tenant", required=True)
    p_sf.add_argument("--host", required=True, help="e.g. thehindu.com")
    p_sf.add_argument("--limit", type=int, default=30)
    p_sf.set_defaults(func=cmd_stories_from_signals)

    p_sc = sub.add_parser(
        "site-crawl", help="placement crawl - homepage/section listing per story"
    )
    p_sc.add_argument("--tenant", required=True)
    p_sc.add_argument("--host", required=True)
    p_sc.set_defaults(func=cmd_site_crawl)

    p_al = sub.add_parser("alert", help="push high-trend signals over ntfy (m-alerts)")
    p_al.add_argument("--tenant", required=True)
    p_al.add_argument("--topic", default=None, help="ntfy topic (or NTFY_TOPIC env)")
    p_al.add_argument("--threshold", type=int, default=70)
    p_al.add_argument("--since-hours", type=int, default=24)
    p_al.add_argument("--limit", type=int, default=10)
    p_al.add_argument(
        "--detail-base",
        default="http://localhost:3001/en",
        help="base URL for the signal-detail click-through",
    )
    p_al.add_argument("--dry-run", action="store_true")
    p_al.set_defaults(func=cmd_alert)

    p_nlp = sub.add_parser("nlp-extract", help="NLP entity/geo extraction from text (spaCy)")
    p_nlp.add_argument("text")
    p_nlp.add_argument("--provider", default="spacy")
    p_nlp.add_argument("--model", default=None)
    p_nlp.set_defaults(func=cmd_nlp_extract)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
