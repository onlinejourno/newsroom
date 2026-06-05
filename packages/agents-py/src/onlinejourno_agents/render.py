"""Render a brief's JSON content as plain-text / Markdown. Pure, testable.

This is the artifact you put in front of a working journalist: no schema, no
JSONB — just the brief as they would read it.
"""

from __future__ import annotations

from typing import Any


def brief_to_markdown(
    content: dict[str, Any],
    *,
    title: str = "Morning Brief",
    disclosure_text: str | None = None,
    signal_urls: dict[str, str] | None = None,
) -> str:
    """Render brief content as Markdown.

    `signal_urls` maps signal-id -> source URL so each section can list its
    sources (source attribution always — CONTEXT.md principle 6).
    """
    meta = content.get("meta") or {}
    lines: list[str] = [f"# {title}"]
    sub = []
    if meta.get("beat"):
        sub.append(f"Beat: {meta['beat']}")
    if meta.get("edition_date"):
        sub.append(meta["edition_date"])
    if meta.get("shortlist_items") is not None:
        sub.append(f"{meta['shortlist_items']} shortlisted")
    if sub:
        lines.append("_" + " · ".join(str(s) for s in sub) + "_")
    lines.append("")

    sections = content.get("sections") or []
    if not sections:
        lines.append("_(No sections — the shortlist was empty.)_")
    for sec in sections:
        heading = (sec.get("heading") or "").strip() or "Untitled"
        lines.append(f"## {heading}")
        lede = (sec.get("lede_one_liner") or "").strip()
        if lede:
            lines.append(f"**{lede}**")
            lines.append("")
        body = (sec.get("body") or "").strip()
        if body:
            lines.append(body)
            lines.append("")
        sids = sec.get("signals") or []
        if sids:
            lines.append("Sources:")
            for sid in sids:
                url = (signal_urls or {}).get(str(sid))
                lines.append(f"- {url}" if url else f"- signal {sid}")
            lines.append("")

    if disclosure_text:
        lines.append("---")
        lines.append(f"_{disclosure_text}_")
    return "\n".join(lines).rstrip() + "\n"
