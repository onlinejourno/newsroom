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

    # PROVISIONED, no adapter yet (ADR 0054-C adjacency): AI-Mode query
    # fan-out. When Search Console exposes the sub-queries Gemini fans a
    # query out into, this returns them per URL/entity so the AI-surface
    # audit can score whether a story answers the fan-out, not just the
    # head query. Adapters raise NotImplementedError until the API exists.
    def query_fanout(
        self, *, url: str | None = None, entity: str | None = None, range: str
    ) -> dict[str, Any]: ...


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


@runtime_checkable
class NlpClient(Protocol):
    # The Analyse NLP-first layer (ADR 0048): entities + geo, before the LLM.
    def analyse(self, text: str) -> dict[str, Any]: ...


CONTRACTS: dict[str, type] = {
    "cms": CMSClient,
    "nlp": NlpClient,
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


class DrupalClient:
    """CMSClient over the Drupal JSON:API (public articles). Field names vary by
    site; handles the common case: node/article, title, body, created, path."""

    def __init__(self, cfg: ConnectorConfig) -> None:
        self._base = str(cfg.config.get("base_url", "")).rstrip("/")
        self._node_type = str(cfg.config.get("node_type", "article"))

    def stories(self, *, since: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        import requests
        from bs4 import BeautifulSoup

        resp = requests.get(
            f"{self._base}/jsonapi/node/{self._node_type}",
            params={"page[limit]": min(limit, 50), "sort": "-created"},
            headers={
                "User-Agent": "OnlineJourno-CMS/0.1",
                "Accept": "application/vnd.api+json",
            },
            timeout=20,
        )
        resp.raise_for_status()
        out: list[dict[str, Any]] = []
        for n in resp.json().get("data", []):
            a = n.get("attributes") or {}
            body = a.get("body") or {}
            html = body.get("processed") or body.get("value") or ""
            text = BeautifulSoup(html, "html.parser").get_text(" ", strip=True)
            path = (a.get("path") or {}).get("alias")
            self_link = ((n.get("links") or {}).get("self") or {}).get("href")
            out.append(
                {
                    "cms_ref": n.get("id"),
                    "url": f"{self._base}{path}" if path else self_link,
                    "headline": a.get("title"),
                    "body_text": text,
                    "section": None,
                    "published_at": a.get("created"),
                }
            )
        return out


class GhostClient:
    """CMSClient over the Ghost Content API. Needs the site's content API key
    (public-ish, in secret_ref env or config.content_key)."""

    def __init__(self, cfg: ConnectorConfig) -> None:
        self._base = str(cfg.config.get("base_url", "")).rstrip("/")
        self._key = cfg.config.get("content_key")
        if not self._key and cfg.secret_ref:
            self._key = os.environ.get(cfg.secret_ref)

    def stories(self, *, since: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        import requests
        from bs4 import BeautifulSoup

        resp = requests.get(
            f"{self._base}/ghost/api/content/posts/",
            params={
                "key": self._key, "limit": min(limit, 100),
                "include": "tags", "formats": "html",
            },
            headers={"User-Agent": "OnlineJourno-CMS/0.1"},
            timeout=20,
        )
        resp.raise_for_status()
        out: list[dict[str, Any]] = []
        for p in resp.json().get("posts", []):
            text = BeautifulSoup(
                p.get("html") or "", "html.parser"
            ).get_text(" ", strip=True)
            out.append(
                {
                    "cms_ref": p.get("id"),
                    "url": p.get("url"),
                    "headline": p.get("title"),
                    "body_text": text,
                    "section": (p.get("primary_tag") or {}).get("name"),
                    "published_at": p.get("published_at"),
                }
            )
        return out


class SpacyNlpClient:
    """NlpClient over spaCy NER (OSS, local). Lazy-loads the model; entities from
    PERSON/ORG/GPE/LOC/FAC/NORP/EVENT/LAW/PRODUCT, geo from GPE/LOC. Free, offline,
    runs before the LLM (ADR 0048)."""

    _ENTITY_LABELS = {"PERSON", "ORG", "GPE", "LOC", "FAC", "NORP", "EVENT", "LAW", "PRODUCT"}
    _GEO_LABELS = {"GPE", "LOC"}

    def __init__(self, cfg: ConnectorConfig) -> None:
        self._model = str((cfg.config or {}).get("model") or "en_core_web_sm")
        self._nlp: Any = None

    def _pipeline(self) -> Any:
        if self._nlp is None:
            try:
                import spacy
            except ImportError as exc:
                raise RuntimeError(
                    "spaCy not installed. Install the nlp extra: "
                    "uv pip install 'onlinejourno-agents[nlp]'"
                ) from exc
            try:
                self._nlp = spacy.load(self._model, disable=["lemmatizer", "textcat"])
            except OSError as exc:
                raise RuntimeError(
                    f"spaCy model {self._model!r} not installed. Run: "
                    f"python -m spacy download {self._model}"
                ) from exc
        return self._nlp

    def analyse(self, text: str) -> dict[str, Any]:
        doc = self._pipeline()(text[:20000])
        entities: list[str] = []
        geo: list[str] = []
        seen: set[str] = set()
        for ent in doc.ents:
            if ent.label_ not in self._ENTITY_LABELS:
                continue
            name = ent.text.strip()
            if not name:
                continue
            if name.lower() not in seen:
                seen.add(name.lower())
                entities.append(name)
            if ent.label_ in self._GEO_LABELS and name not in geo:
                geo.append(name)
        return {
            "entities": entities[:20],
            "geo": {"region": geo[0] if geo else None, "all": geo[:8]},
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

    if cfg.category == "nlp" and cfg.provider == "spacy":
        return SpacyNlpClient(cfg)

    if cfg.category == "cms" and cfg.provider == "wordpress" and cfg.mode == "api":
        return WordPressClient(cfg)

    if cfg.category == "cms" and cfg.provider == "drupal" and cfg.mode == "api":
        return DrupalClient(cfg)

    if cfg.category == "cms" and cfg.provider == "ghost" and cfg.mode == "api":
        return GhostClient(cfg)

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
