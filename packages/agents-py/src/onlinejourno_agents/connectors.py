"""Connector seam (ADR 0044) — pluggable newsroom data tools behind per-category
capability contracts. Mirrors the provider-agnostic LLM seam in ``client.py``.

C1 defines the contracts + the ``make_connector`` factory. Concrete provider
adapters (API or MCP) land per category in follow-on slices (e.g. keywords via
Keywords Everywhere + SEO Panel OSS). Callers depend on the contract, never the
provider.
"""

from __future__ import annotations

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


def make_connector(cfg: ConnectorConfig) -> Any:
    """Build a capability client for a connector configuration.

    C1 is the seam only: it validates the category + mode and raises until a
    per-category adapter (API or MCP) is implemented. This keeps the rest of the
    platform calling the contract while adapters arrive incrementally (ADR 0044).
    """
    if cfg.category not in CONTRACTS:
        raise ValueError(f"unknown connector category: {cfg.category!r}")
    if cfg.mode not in ("api", "mcp"):
        raise ValueError(f"connector mode must be 'api' or 'mcp', got {cfg.mode!r}")
    raise NotImplementedError(
        f"connector adapter not yet implemented: "
        f"{cfg.category}/{cfg.provider} ({cfg.mode}). C1 defines the seam; "
        f"per-category adapters land in follow-on slices (ADR 0044)."
    )
