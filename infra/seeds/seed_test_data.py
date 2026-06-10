"""Seed synthetic, anonymised test data for local development / demos.

Everything here is invented — no real journalist, name, or id. Safe to ship.
Idempotent: deletes its own prior rows (by marker) then re-inserts, so re-running
resets the test data without touching real ingested signals.

  uv run --package onlinejourno-agents python infra/seeds/seed_test_data.py

Markers: source name "TEST · Sample public-record wire"; journalist slug "td-*";
signal external_id "testdata:*".
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import psycopg
from dotenv import load_dotenv

TENANT_SLUG = "self"
SOURCE_NAME = "TEST · Sample public-record wire"

# 15 invented journalists — globally varied, to show the product is not India-only.
# Beats use the ENRICH_BEATS vocabulary (prompts.py) so enriched signals
# actually route to these journalists.
JOURNALISTS = [
    ("Asha Verma", "National", ["Governance", "Courts"], "Capital", "reporter"),
    ("Diego Mensah", "World", ["World", "Economy"], "West Coast", "reporter"),
    ("Lena Park", "Markets", ["Business", "Economy"], "India", "reporter"),
    ("Tunde Okafor", "Investigations", ["Investigations", "Governance"], "Northern", "reporter"),
    ("Mariana Silva", "Business", ["Business", "Economy"], "Delta", "reporter"),
    ("Ravi Nair", "Science & Tech", ["Climate", "Science & Tech"], "Coastal", "reporter"),
    ("Sofia Haddad", "Culture", ["Culture"], "Old City", "reporter"),
    ("Wei Chen", "Markets", ["Markets", "Business"], "Financial", "reporter"),
    ("Nadia Petrova", "World", ["World"], "Capital", "editor"),
    ("Kofi Addo", "Sport", ["Sport"], "Stadium", "reporter"),
    ("Ines Costa", "Education", ["Education"], "Inland", "reporter"),
    ("Yuki Tanaka", "Science & Tech", ["Science & Tech"], "Tech Park", "reporter"),
    ("Omar Khalid", "National", ["Courts", "National"], "Capital", "editor"),
    ("Grace Mwangi", "Business", ["Agriculture", "Business"], "Rift", "reporter"),
    ("Pablo Ruiz", "National", ["Governance", "National"], "Riverside", "chief"),
]

# 12 invented signals with the front-engine enrichment (geo / beat / entities).
SIGNALS = [
    ("Central bank holds policy rate, flags inflation watch", "Markets", "Capital",
     "Capital", 82, "covered by 5 outlets in 6h", ["Central Bank", "Inflation"]),
    ("Apex court orders review of land-acquisition notifications", "National", "Northern",
     "Northern", 74, "rising search interest", ["Apex Court", "Land Acquisition"]),
    ("Gazette notification revises mining-lease rules", "National", "Delta",
     "Delta", 61, "single-source, early", ["Gazette", "Mining"]),
    ("Securities regulator tightens disclosure norms for IPOs", "Markets", "Financial",
     "Financial", 70, "3 outlets, 4h", ["Securities Regulator", "IPO"]),
    ("Tender floated for coastal climate-resilience project", "Science & Tech", "Coastal",
     "Coastal", 55, "niche but rising", ["Climate", "Tender"]),
    ("Education board defers board-exam schedule", "Education", "Inland",
     "Inland", 64, "high local interest", ["Education Board", "Exams"]),
    ("Parliament committee summons telecom regulator", "National", "Capital",
     "Capital", 77, "wire + 2 outlets", ["Parliament", "Telecom Regulator"]),
    ("Space agency announces earth-observation launch window", "Science & Tech", "Tech Park",
     "Tech Park", 68, "rising on social", ["Space Agency", "Satellite"]),
    ("Commodity board caps export of staple grain", "Business", "Rift",
     "Rift", 59, "sector-specific", ["Commodity Board", "Exports"]),
    ("City civic body approves transit-fare revision", "National", "Riverside",
     "Riverside", 52, "local, single-source", ["Civic Body", "Transit"]),
    ("Anti-graft agency files charges in procurement case", "Investigations", "Northern",
     "Northern", 80, "breaking, 4 outlets", ["Anti-Graft Agency", "Procurement"]),
    ("Energy ministry releases renewable-capacity targets", "Business", "Delta",
     "Delta", 66, "policy follow-up", ["Energy Ministry", "Renewables"]),
]


def slugify(s: str) -> str:
    return "td-" + "".join(c if c.isalnum() else "-" for c in s.lower()).strip("-")


def load_env() -> str:
    for parent in [Path(__file__).resolve(), *Path(__file__).resolve().parents]:
        env = parent / ".env"
        if env.exists():
            load_dotenv(env)
            break
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise SystemExit("DATABASE_URL not set")
    return url


def main() -> None:
    with psycopg.connect(load_env()) as conn, conn.cursor() as cur:
        cur.execute("select id from tenants where slug = %s", (TENANT_SLUG,))
        row = cur.fetchone()
        if not row:
            raise SystemExit(f"tenant {TENANT_SLUG!r} not found")
        tenant_id = row[0]

        # idempotent reset of our own test rows
        cur.execute("delete from signals where tenant_id=%s and external_id like 'testdata:%%'", (tenant_id,))
        cur.execute("delete from journalist_profiles where tenant_id=%s and slug like 'td-%%'", (tenant_id,))

        # a single shared test source
        cur.execute(
            """insert into sources (tenant_id, kind, name, url, family, tier, enabled)
               values (%s,'rss',%s,'https://example.org/wire', 'wire', 1, true)
               on conflict (tenant_id, name) do update set enabled=true
               returning id""",
            (tenant_id, SOURCE_NAME),
        )
        source_id = cur.fetchone()[0]

        for name, bureau, beats, region, role in JOURNALISTS:
            cur.execute(
                """insert into journalist_profiles
                     (tenant_id, slug, name, bureau, region, beats, role, language)
                   values (%s,%s,%s,%s,%s,%s,%s,'en')
                   on conflict (tenant_id, slug) do nothing""",
                (tenant_id, slugify(name), name, bureau, region, json.dumps(beats), role),
            )

        for i, (head, beat, region, district, score, reason, entities) in enumerate(SIGNALS):
            enrichment = {"analyse": {"entities": entities}, "classify": {"beat": beat}}
            cur.execute(
                """insert into signals
                     (tenant_id, source_id, external_id, url, url_hash, headline,
                      body_text, published_at, language, district, region, beat,
                      trend_score, trend_reason, enrichment)
                   values (%s,%s,%s,%s,%s,%s,%s, now() - (%s || ' hours')::interval,
                           'en',%s,%s,%s,%s,%s,%s)""",
                (
                    tenant_id, source_id, f"testdata:{i}",
                    f"https://example.org/td/{i}", f"tdhash{i}", head,
                    f"{head}. Synthetic test signal for local development.",
                    i * 2 + 1, district, region, beat, score, reason,
                    json.dumps(enrichment),
                ),
            )
        conn.commit()

        cur.execute("select count(*) from journalist_profiles where tenant_id=%s and slug like 'td-%%'", (tenant_id,))
        nj = cur.fetchone()[0]
        cur.execute("select count(*) from signals where tenant_id=%s and external_id like 'testdata:%%'", (tenant_id,))
        ns = cur.fetchone()[0]
        print(f"seeded {nj} journalists + {ns} enriched signals (tenant {TENANT_SLUG})")


if __name__ == "__main__":
    main()
