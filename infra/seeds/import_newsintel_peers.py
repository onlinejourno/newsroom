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
                enrichment = {"analyse": {"entities": [topic]}, "framing": framing}
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
                      (tenant_id, cms_ref, headline, status, published_at, enrichment)
                    values (%s, %s, %s, 'published', %s, %s)
                    """,
                    (tenant_id, f"demo:{topic}:{i}",
                     f"Our coverage of {topic} ({i + 1})", published,
                     Json({"framing": framing})),
                )
                own += 1

        print(f"demo tenant {tenant_id}: {len(peers)} peers, {inserted} coded signals, {own} own stories")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/projects/news-intel/data/news_intel.db"))
