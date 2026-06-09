"""Connector seam (ADR 0044) — pluggable newsroom data tools behind per-category
capability contracts. Mirrors the provider-agnostic LLM seam in ``client.py``.

C1 defines the contracts + the ``make_connector`` factory. Concrete provider
adapters (API or MCP) land per category in follow-on slices (e.g. keywords via
Keywords Everywhere + SEO Panel OSS). Callers depend on the contract, never the
provider.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Protocol, runtime_checkable


@dataclass(frozen=True)
class ConnectorConfig:
    category: str
    provider: str
    mode: str  # "api" | "mcp"
    config: dict[str, Any] = field(default_factory=dict)
    secret_ref: str | None = None  # env name; the raw secret is read from env, never stored


# ── capability contracts (one per category) ─────────────────────────────────


@runtime_checkable
class AnalyticsClient(Protocol):
    def page_performance(self, url: str, *, range: str) -> dict[str, Any]: ...


@runtime_checkable
class KeywordsClient(Protocol):
    def keyword_data(self, terms: list[str]) -> dict[str, Any]: ...


@runtime_checkable
class SearchConsoleClient(Protocol):
    # Editorial-native primary view (ADR 0045): roll query rows up to the
    # editorial entities / beat the reporter owns, not raw query strings.
    def entity_visibility(
        self,
        *,
        entities: list[str] | None = None,
        beat: str | None = None,
        range: str,
    ) -> dict[str, Any]: ...

    # Per-URL drill-down underneath (not the headline view).
    def performance(self, url: str, *, range: str) -> dict[str, Any]: ...


@runtime_checkable
class TrendsClient(Protocol):
    def momentum(self, terms: list[str], *, geo: str | None = None) -> dict[str, Any]: ...


@runtime_checkable
class SubscriptionClient(Protocol):
    def conversion(self, *, range: str) -> dict[str, Any]: ...


@runtime_checkable
class SocialClient(Protocol):
    def reach(self, url: str) -> dict[str, Any]: ...


@runtime_checkable
class CMSClient(Protocol):
    # The inside end (ADR 0046): read the newsroom's own articles -> stories.
    def stories(self, *, since: str | None = None, limit: int = 50) -> list[dict[str, Any]]: ...


CONTRACTS: dict[str, type] = {
    "cms": CMSClient,
    "analytics": AnalyticsClient,
    "keywords": KeywordsClient,
    "search_console": SearchConsoleClient,
    "trends": TrendsClient,
    "subscription": SubscriptionClient,
    "social": SocialClient,
}


# ── adapters ─────────────────────────────────────────────────────────────
# C2: Keywords Everywhere (API). Wraps the existing reproducible KE client
# (``keywords.fetch_volumes``) behind the KeywordsClient contract. The key is
# read from the env name in ``secret_ref`` (never stored), defaulting to the
# platform's KEYWORDS_EVERYWHERE_API_KEY.


class KeApiClient:
    """KeywordsClient over the Keywords Everywhere REST API."""

    def __init__(self, cfg: ConnectorConfig) -> None:
        self._country = str(cfg.config.get("country", "in"))
        self._currency = str(cfg.config.get("currency", "inr"))
        self._key_env = cfg.secret_ref or "KEYWORDS_EVERYWHERE_API_KEY"

    def keyword_data(self, terms: list[str]) -> dict[str, Any]:
        from onlinejourno_agents.keywords import fetch_volumes

        key = os.environ.get(self._key_env)
        volumes = fetch_volumes(
            terms, country=self._country, currency=self._currency, key=key
        )
        return {
            kw: {
                "keyword": v.keyword,
                "volume": v.volume,
                "competition": v.competition,
                "trend_direction": v.trend_direction,
            }
            for kw, v in volumes.items()
        }


class WordPressClient:
    """CMSClient over the WordPress REST API. Published posts are public; an app
    password in secret_ref would unlock drafts (later). The first inside-end
    adapter — testable against any WordPress site with no credentials."""

    def __init__(self, cfg: ConnectorConfig) -> None:
        self._base = str(cfg.config.get("base_url", "")).rstrip("/")

    def stories(self, *, since: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        import requests
        from bs4 import BeautifulSoup

        params: dict[str, Any] = {"per_page": min(limit, 100), "_embed": "1"}
        if since:
            params["after"] = since
        resp = requests.get(
            f"{self._base}/wp-json/wp/v2/posts",
            params=params,
            headers={"User-Agent": "OnlineJourno-CMS/0.1"},
            timeout=20,
        )
        resp.raise_for_status()

        def text(html: str | None) -> str:
            return BeautifulSoup(html or "", "html.parser").get_text(" ", strip=True)

        out: list[dict[str, Any]] = []
        for p in resp.json():
            section = None
            for group in (p.get("_embedded") or {}).get("wp:term") or []:
                for term in group:
                    if isinstance(term, dict) and term.get("taxonomy") == "category":
                        section = term.get("name")
                        break
                if section:
                    break
            out.append(
                {
                    "cms_ref": str(p.get("id")),
                    "url": p.get("link"),
                    "headline": text((p.get("title") or {}).get("rendered")),
                    "body_text": text((p.get("content") or {}).get("rendered")),
                    "section": section,
                    "published_at": p.get("date_gmt") or p.get("date"),
                }
            )
        return out


def make_connector(cfg: ConnectorConfig) -> Any:
    """Build a capability client for a connector configuration.

    Dispatches to a per-(category, provider, mode) adapter. Categories without
    an adapter yet raise NotImplementedError — the seam is stable while adapters
    arrive incrementally (ADR 0044).
    """
    if cfg.category not in CONTRACTS:
        raise ValueError(f"unknown connector category: {cfg.category!r}")
    if cfg.mode not in ("api", "mcp"):
        raise ValueError(f"connector mode must be 'api' or 'mcp', got {cfg.mode!r}")

    if cfg.category == "cms" and cfg.provider == "wordpress" and cfg.mode == "api":
        return WordPressClient(cfg)

    if (
        cfg.category == "keywords"
        and cfg.provider == "keywords_everywhere"
        and cfg.mode == "api"
    ):
        return KeApiClient(cfg)

    raise NotImplementedError(
        f"connector adapter not yet implemented: "
        f"{cfg.category}/{cfg.provider} ({cfg.mode}). The seam is defined; "
        f"this adapter lands in a follow-on slice (ADR 0044)."
    )
