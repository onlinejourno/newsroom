#!/usr/bin/env python3
"""Build the `demo` tenant as a LIVE FIXTURE from the news-intel SQLite corpus.

- entities      -> tenants.config.peers (the ~30-outlet peer set)
- coded_articles -> signals.enrichment.framing (the peer framing corpus)

Because the news-intel corpus is historical (months old) and has no "own"
published work, a faithful import would render nothing in the /trends window
and would tag every topic NO ANGLE. So this builds a DEMO FIXTURE: it re-dates
the imported peer signals into the recent window (with a per-topic skew that
shapes trajectory) and seeds a handful of demo OWN stories so the position
ladder (NO ANGLE / BEHIND / ON IT / PEAK) is exercised. Demo-tenant-only;
idempotent. Real tenants never run this — they use their own inflow.

Usage: DATABASE_URL=... uv run --with psycopg infra/seeds/import_newsintel_peers.py \
         ~/projects/news-intel/data/news_intel.db
"""
from __future__ import annotations

import os
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

import psycopg
from psycopg.types.json import Json

# news-intel snake_case frame -> platform PEJ Title-Case (framing.py FRAME_GROUPS keys).
NEED_BY_TOPIC = {
    "economics_business": "Understand", "politics": "Understand", "defense_foreign": "Context",
    "crime": "Stay safe", "health_medicine": "Stay safe", "environment": "Context",
    "sports": "Be entertained", "consumer": "Make a decision", "civic_action": "Take action",
    "human_interest": "Connect",
}

FRAME_MAP = {
    "conflict": "Conflict",
    "horse_race": "Horse Race",
    "wrongdoing": "Wrongdoing Exposed",
    "process": "Process",
    "trend": "Trend",
    "straight_news": "Straight News",
    "policy_explored": "Policy Explored",
    "conjecture": "Conjecture",
    "reaction": "Reaction",
    "reality_check": "Reality Check",
    "personality_profile": "Personality Profile",
}

# Per-topic demo policy: (own_story_count, skew). The window split is 24h
# (page default): "recent" dates signals 0-24h ago (rising -> ON IT/BEHIND),
# "prior" dates most signals 24-48h ago with one fresh (falling -> PEAK).
# own_story_count vs the topic's peer median decides BEHIND (below) vs ON IT.
TOPIC_POLICY = {
    "economics_business": (6, "recent"),  # own >= peer median, rising  -> ON IT
    "politics": (1, "recent"),            # own < peer median, rising    -> BEHIND
    "defense_foreign": (1, "prior"),      # own > 0, falling             -> PEAK
    "crime": (0, "recent"),               # own = 0, peers cover         -> NO ANGLE
}
DEFAULT_POLICY = (0, "recent")  # other topics: NO ANGLE

# Curate to <= the page's TOP (12) topics so the peaked topic (low momentum by
# design) is never cut from the card grid. The 4 policy topics + 6 fillers.
ALLOWED_TOPICS = {
    "economics_business", "politics", "defense_foreign", "crime",
    "sports", "health_medicine", "environment", "consumer",
    "civic_action", "human_interest",
}


def domain_of(url: str) -> str:
    return (urlparse(url).hostname or "").removeprefix("www.")


def signal_offset_hours(skew: str, idx: int) -> float:
    """Hours-ago for the idx-th signal of a topic, given its trajectory skew."""
    if skew == "prior":
        # one fresh signal so the topic appears in the recent map, the rest in
        # the prior window -> recent << prior -> falling -> PEAKED trajectory.
        return 3.0 if idx == 0 else 26.0 + (idx % 18)
    # recent: spread across the last ~22h -> recent >> prior -> rising.
    return 1.0 + 2.0 * (idx % 11)


def main(sqlite_path: str) -> None:
    sdb = sqlite3.connect(sqlite_path)
    sdb.row_factory = sqlite3.Row
    now = datetime.now(timezone.utc)
    pg = psycopg.connect(os.environ["DATABASE_URL"])

    with pg, pg.cursor() as cur:
        # 1. demo tenant (idempotent)
        cur.execute(
            """
            insert into tenants (slug, name, tier)
            values ('demo', 'Demo Newsroom', 'tier_3')
            on conflict (slug) do update set name = excluded.name
            returning id
            """
        )
        tenant_id = cur.fetchone()[0]

        # 2. peers from entities
        entities = sdb.execute("select id, name, url, tier from entities").fetchall()
        peers = [
            {"domain": domain_of(e["url"]), "name": e["name"], "tier": e["tier"]}
            for e in entities
            if domain_of(e["url"])
        ]
        cur.execute(
            "update tenants set config = coalesce(config,'{}'::jsonb) || jsonb_build_object('peers', %s::jsonb) where id = %s",
            (Json(peers), tenant_id),
        )

        # 3. a synthetic source for the imported signals (signals.source_id is NOT NULL).
        # Select-first so re-runs don't add duplicate source rows.
        cur.execute(
            "select id from sources where tenant_id = %s and url = 'urn:newsintel'",
            (tenant_id,),
        )
        row = cur.fetchone()
        if row:
            source_id = row[0]
        else:
            cur.execute(
                "insert into sources (tenant_id, kind, name, url) "
                "values (%s, 'manual', 'news-intel import', 'urn:newsintel') returning id",
                (tenant_id,),
            )
            source_id = cur.fetchone()[0]

        # 4. coded_articles -> signals, grouped by topic so we can re-date per policy.
        rows = sdb.execute(
            """
            select a.url, a.headline, e.url as entity_url,
                   c.topic, c.frame, c.frame_group, c.confidence
              from coded_articles c
              join articles a on a.id = c.article_id
              join entities e on e.id = a.entity_id
             where c.topic is not null and trim(c.topic) <> ''
            """
        ).fetchall()
        by_topic: dict[str, list[sqlite3.Row]] = {}
        for r in rows:
            by_topic.setdefault(r["topic"].strip(), []).append(r)

        # Clear prior import so excluded topics / re-dates don't linger (demo-only).
        cur.execute("delete from signals where tenant_id = %s and source_id = %s", (tenant_id, source_id))

        inserted = 0
        for topic, trows in by_topic.items():
            if topic not in ALLOWED_TOPICS:
                continue
            _, skew = TOPIC_POLICY.get(topic, DEFAULT_POLICY)
            for idx, r in enumerate(trows):
                domain = domain_of(r["entity_url"])
                if not domain:
                    continue
                published = now - timedelta(hours=signal_offset_hours(skew, idx))
                framing = {
                    "frame": FRAME_MAP.get(r["frame"], r["frame"]),
                    "frame_group": r["frame_group"],
                    "topic": topic,
                    "confidence": r["confidence"],
                    "coder_version": "newsintel-import",
                }
                enrichment = {
                    "analyse": {"entities": [topic]},
                    "classify": {"user_need": NEED_BY_TOPIC.get(topic, "Understand"), "region": "IN"},
                    "framing": framing,
                }
                cur.execute(
                    """
                    insert into signals
                      (tenant_id, source_id, url, url_hash, headline, published_at,
                       raw_payload, enrichment)
                    values (%s, %s, %s, %s, %s, %s, %s, %s)
                    on conflict (tenant_id, url_hash) do update
                      set enrichment = excluded.enrichment, published_at = excluded.published_at
                    """,
                    (
                        tenant_id, source_id, r["url"], f"newsintel:{r['url']}",
                        r["headline"], published, Json({"domain": domain}), Json(enrichment),
                    ),
                )
                inserted += 1

        # 5. demo OWN stories spanning the ladder. Fresh each run (demo-only).
        cur.execute("delete from stories where tenant_id = %s and cms_ref like 'demo:%%'", (tenant_id,))
        own = 0
        for topic, (count, _) in TOPIC_POLICY.items():
            for i in range(count):
                published = now - timedelta(hours=1 + i)
                framing = {"frame": "Conflict", "frame_group": "combative",
                           "topic": topic, "coder_version": "demo-fixture"}
                cur.execute(
                    """
                    insert into stories
                      (tenant_id, cms_ref, url, section, headline, status, published_at, enrichment)
                    values (%s, %s, %s, %s, %s, 'published', %s, %s)
                    """,
                    (tenant_id, f"demo:{topic}:{i}",
                     f"https://demo.onlinejourno.com/{topic}/{i + 1}",
                     topic.replace("_", "-"),
                     f"Our coverage of {topic} ({i + 1})", published,
                     Json({"framing": framing})),
                )
                own += 1

        # 6. demo calendar promises (PLAN·Calendar). Demo tenant owns only demo data.
        cur.execute("delete from calendar_event where tenant_id = %s", (tenant_id,))
        PROMISES = [
            ("Finance Ministry", "table the quarterly fiscal review", -2, "day", "economics_business"),
            ("Election Commission", "announce the bypoll schedule", 1, "day", "politics"),
            ("Reserve Bank", "publish the monetary policy minutes", 3, "day", "economics_business"),
            ("Health Ministry", "release the vaccine coverage report", 6, "day", "health_medicine"),
            ("Supreme Court", "hear the data-protection petition", 9, "day", "civic_action"),
            ("Defence Ministry", "commission the new frigate", 20, "month", "defense_foreign"),
            ("Environment Ministry", "notify the coastal zone rules", 45, "month", "environment"),
            ("Sports Authority", "name the squad for the championship", 0, "day", "sports"),
            ("Consumer Affairs", "roll out the new labelling norms", -5, "day", "consumer"),
            ("City Corporation", "open the flyover to traffic", 70, "quarter", "civic_action"),
        ]
        for i, (who, what, days, prec, topic) in enumerate(PROMISES):
            target = (now + timedelta(days=days)).date()
            cur.execute(
                "insert into calendar_event (tenant_id, who, what, target_date, precision, topic, claim_key, extractor_version) "
                "values (%s,%s,%s,%s,%s,%s,%s,'demo-fixture')",
                (tenant_id, who, what, target, prec, topic, f"demo:cal:{i}"),
            )

        # 7. demo open leads (BRIEF·Today). Varied importance/trend_score → the ladder.
        cur.execute("delete from story_leads where tenant_id = %s", (tenant_id,))
        LEADS = [
            ("SEBI tightens disclosure norms — first-mover window", "markets", "urgent", "idea", 82, "economics_business", "HC stay lifted this morning; peers not yet on it"),
            ("Bypoll schedule expected within 48h", "politics", "high", "pitched", 71, "politics", "EC briefing flagged; prep the explainer"),
            ("Vaccine coverage gaps across three states", "health", "high", "assigned", 64, "health_medicine", "Ministry data drop due; localise it"),
            ("New frigate commissioning — backgrounder", "defence", "normal", "idea", 48, "defense_foreign", None),
            ("Coastal zone rules — who is affected", "environment", "normal", "pitched", 41, "environment", None),
            ("Labelling norms — consumer impact", "consumer", "low", "idea", 28, "consumer", None),
            ("Championship squad — reactions", "sports", "normal", "assigned", 52, "sports", None),
            ("Data-protection petition — what is at stake", "legal", "high", "idea", 67, "civic_action", "SC hearing in 9 days; own the framing"),
        ]
        for title, beat, imp, status, ts, topic, note in LEADS:
            cur.execute(
                "insert into story_leads (tenant_id, title, beat, importance, status, trend_score, topic, note) "
                "values (%s,%s,%s,%s,%s,%s,%s,%s)",
                (tenant_id, title, beat, imp, status, ts, topic, note),
            )

        # 8. demo reporters.
        cur.execute("delete from journalist_profiles where tenant_id = %s", (tenant_id,))
        REPORTERS = [
            ("asha-menon", "Asha Menon", "markets", "Mumbai", "MH", "reporter"),
            ("ravi-iyer", "Ravi Iyer", "politics", "Delhi", "DL", "reporter"),
            ("neha-banerjee", "Neha Banerjee", "health", "Kolkata", "WB", "reporter"),
            ("sameer-khan", "Sameer Khan", "defence", "Delhi", "DL", "desk"),
            ("priya-nair", "Priya Nair", "environment", "Bengaluru", "KA", "reporter"),
        ]
        for slug, name, beat, city, region, role in REPORTERS:
            cur.execute(
                "insert into journalist_profiles (tenant_id, slug, name, email, bureau, city, region, beats, role) "
                "values (%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (tenant_id, slug, name, f"{slug}@demo.onlinejourno.com", city, city, region, Json([beat]), role),
            )

        # 9. demo-viewer: the read-only identity the public /showcase logs in as.
        cur.execute("delete from users where tenant_id = %s and demo = true", (tenant_id,))
        cur.execute(
            "insert into users (tenant_id, email, display_name, role, status, demo) "
            "values (%s, 'demo-viewer@demo.onlinejourno.com', 'Demo Visitor', 'viewer', 'approved', true)",
            (tenant_id,),
        )

        # 10. score demo own-stories so Score·Audit / Potential / Gems render.
        # Schema: distribution_fit_scores has story_id NOT NULL (no signal_id column).
        cur.execute("select id from stories where tenant_id = %s and cms_ref like 'demo:%%'", (tenant_id,))
        story_ids = [r[0] for r in cur.fetchall()]
        cur.execute("delete from distribution_fit_scores where tenant_id = %s", (tenant_id,))
        SURFACES = [("discover", 78, "B"), ("news", 64, "C"), ("search", 86, "A")]
        for sid in story_ids:
            for surface, score, grade in SURFACES:
                cur.execute(
                    "insert into distribution_fit_scores (tenant_id, story_id, surface, score, grade, top_fix, signals) "
                    "values (%s,%s,%s,%s,%s,%s,%s)",
                    (tenant_id, sid, surface, score, grade, "Sharpen the headline for this surface", Json({})),
                )

        print(f"demo tenant {tenant_id}: {len(peers)} peers, {inserted} signals, {own} own stories, "
              f"{len(PROMISES)} promises, {len(LEADS)} leads, {len(REPORTERS)} reporters, {len(story_ids)*3} scores")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/projects/news-intel/data/news_intel.db"))
