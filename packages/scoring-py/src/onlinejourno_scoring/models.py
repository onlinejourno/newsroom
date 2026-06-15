"""Normalized page model + result types for the SEO + E-E-A-T audit."""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class Page:
    url: str
    title: str = ""
    meta_description: str = ""
    canonical: str = ""
    og_title: str = ""
    og_image: str = ""
    image_url: str = ""              # primary/rss image
    images_total: int = 0
    images_without_alt: int = 0
    h1s: list[str] = field(default_factory=list)
    h2s: list[str] = field(default_factory=list)
    schema_types: list[str] = field(default_factory=list)
    author: str = ""
    has_byline: bool = False
    published: str = ""             # ISO or human; "" if absent
    modified: str = ""
    published_dt: datetime | None = None
    word_count: int = 0
    internal_links: int = 0
    external_links: int = 0
    named_sources: list[str] = field(default_factory=list)
    anon_sources: int = 0
    body_text: str = ""
    section_path: str = ""          # taxonomy "Section > Sub"
    topic: str = ""
    tags: list[str] = field(default_factory=list)
    # flags
    cf_blocked: bool = False
    is_live_blog: bool = False
    js_rendered: bool = False
    paywalled: bool = False
    hard_paywall: bool = False
    is_wire: bool = False
    https: bool = True
    is_homepage: bool = False       # R2: bare publisher homepage URL, not an article
    # recirculation raw
    same_section_links: int = 0
    deeper_taxonomy_links: int = 0
    good_anchors: int = 0
    weak_anchors: int = 0
    has_related_block: bool = False
