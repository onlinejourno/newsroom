"""Keywords Everywhere REST client — real Search-volume data for the
distribution-fit Search cue.

This is the reproducible path the automated brief uses (no MCP / no Claude in
the loop): a direct HTTPS call to the Keywords Everywhere API with the
newsroom's own key. If `KEYWORDS_EVERYWHERE_API_KEY` is absent, callers skip
enrichment gracefully — the brief still composes, just without Search cues.

API: POST https://api.keywordseverywhere.com/v1/get_keyword_data
  Authorization: Bearer <key>
  form: dataSource=gkp, country=in, currency=inr, kw[]=term ...
Response: { data: [ { keyword, vol, cpc, competition, trend:[{month,year,value}] } ], credits, ... }
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Any

import requests

KE_ENDPOINT = "https://api.keywordseverywhere.com/v1/get_keyword_data"
DEFAULT_TIMEOUT = 20
MAX_KEYWORDS_PER_BRIEF = 24  # bound credit spend per brief


@dataclass(frozen=True, slots=True)
class KeywordVolume:
    keyword: str
    volume: int
    competition: float
    trend: list[dict[str, Any]]

    @property
    def trend_direction(self) -> str:
        """'rising' / 'falling' / 'flat' from the last 3 months vs the prior 3."""
        vals = [t.get("value", 0) for t in self.trend if isinstance(t, dict)]
        if len(vals) < 4:
            return "flat"
        recent = sum(vals[-3:]) / 3
        prior = sum(vals[-6:-3]) / max(1, len(vals[-6:-3]))
        if prior == 0:
            return "rising" if recent > 0 else "flat"
        change = (recent - prior) / prior
        if change > 0.2:
            return "rising"
        if change < -0.2:
            return "falling"
        return "flat"


def api_key() -> str | None:
    return os.environ.get("KEYWORDS_EVERYWHERE_API_KEY")


def parse_response(payload: dict[str, Any]) -> dict[str, KeywordVolume]:
    """Parse the KE API response into {lowercased keyword -> KeywordVolume}. Pure."""
    out: dict[str, KeywordVolume] = {}
    for row in payload.get("data") or []:
        kw = str(row.get("keyword", "")).strip()
        if not kw:
            continue
        out[kw.lower()] = KeywordVolume(
            keyword=kw,
            volume=int(row.get("vol") or 0),
            competition=float(row.get("competition") or 0.0),
            trend=row.get("trend") or [],
        )
    return out


def fetch_volumes(
    keywords: list[str],
    *,
    country: str = "in",
    currency: str = "inr",
    key: str | None = None,
    session: requests.Session | None = None,
) -> dict[str, KeywordVolume]:
    """Fetch search volumes for keywords. Returns {} when no key or no keywords.

    Deduplicates and caps at MAX_KEYWORDS_PER_BRIEF to bound credit spend.
    Network/API failure returns {} (enrichment is best-effort, never fatal).
    """
    key = key or api_key()
    uniq = list(dict.fromkeys(k.strip() for k in keywords if k and k.strip()))
    if not key or not uniq:
        return {}
    uniq = uniq[:MAX_KEYWORDS_PER_BRIEF]

    sess = session or requests.Session()
    try:
        resp = sess.post(
            KE_ENDPOINT,
            headers={"Authorization": f"Bearer {key}", "Accept": "application/json"},
            data={"dataSource": "gkp", "country": country, "currency": currency, "kw[]": uniq},
            timeout=DEFAULT_TIMEOUT,
        )
        resp.raise_for_status()
        return parse_response(resp.json())
    except (requests.RequestException, ValueError):
        return {}


def best_for(
    candidates: list[str], volumes: dict[str, KeywordVolume]
) -> KeywordVolume | None:
    """Pick the highest-volume keyword among a section's candidates."""
    hits = [volumes[c.lower()] for c in candidates if c.lower() in volumes]
    if not hits:
        return None
    return max(hits, key=lambda kv: kv.volume)
