#!/usr/bin/env python3
"""Seed a `demo` tenant from the news-intel SQLite: entities -> config.peers,
coded_articles -> signals.enrichment.framing. Idempotent; demo-tenant-only.

Usage: DATABASE_URL=... python infra/seeds/import_newsintel_peers.py \
         ~/projects/news-intel/data/news_intel.db
"""
from __future__ import annotations

import os
import sqlite3
import sys
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


def domain_of(url: str) -> str:
    return (urlparse(url).hostname or "").removeprefix("www.")


def main(sqlite_path: str) -> None:
    sdb = sqlite3.connect(sqlite_path)
    sdb.row_factory = sqlite3.Row
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
        # Select-first so re-runs don't add duplicate source rows (idempotent
        # regardless of the sources unique constraint).
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

        # 4. coded_articles -> signals (entities axis = the PEJ topic; demo-coherent)
        rows = sdb.execute(
            """
            select a.url, a.headline, a.published_at, e.url as entity_url,
                   c.topic, c.frame, c.frame_group, c.confidence
              from coded_articles c
              join articles a on a.id = c.article_id
              join entities e on e.id = a.entity_id
            """
        ).fetchall()
        inserted = 0
        for r in rows:
            domain = domain_of(r["entity_url"])
            topic = (r["topic"] or "").strip()
            if not domain or not topic:
                continue
            framing = {
                "frame": FRAME_MAP.get(r["frame"], r["frame"]),
                "frame_group": r["frame_group"],
                "topic": topic,
                "confidence": r["confidence"],
                "coder_version": "newsintel-import",
            }
            enrichment = {"analyse": {"entities": [topic]}, "framing": framing}
            url_hash = f"newsintel:{r['url']}"
            cur.execute(
                """
                insert into signals
                  (tenant_id, source_id, url, url_hash, headline, published_at,
                   raw_payload, enrichment)
                values (%s, %s, %s, %s, %s, %s, %s, %s)
                on conflict (tenant_id, url_hash) do update set enrichment = excluded.enrichment
                """,
                (
                    tenant_id, source_id, r["url"], url_hash, r["headline"],
                    r["published_at"], Json({"domain": domain}), Json(enrichment),
                ),
            )
            inserted += 1
        print(f"demo tenant {tenant_id}: {len(peers)} peers, {inserted} coded signals")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/projects/news-intel/data/news_intel.db"))
