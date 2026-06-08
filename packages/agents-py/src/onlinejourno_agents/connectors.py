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


CONTRACTS: dict[str, type] = {
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
