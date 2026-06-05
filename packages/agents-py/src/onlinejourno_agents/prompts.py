"""Prompt builders. Pure functions — no I/O, no network. Unit-testable.

The editorial DNA here is a *default* for the markets/regulatory wedge
(MVP-SCOPE). Per-newsroom DNA will come from `tenants.config` once the
onboarding interview ships; until then this default is the shortlisting
voice. Keeping prompt construction pure means a prompt change is a diff a
reviewer can read and an eval can replay (CLAUDE.md: eval-first).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# Beat tags the scorer is allowed to assign. Matches sources.beat_tags vocabulary
# for the MVP wedge.
BEAT_TAGS = ("markets", "regulatory", "corp")


@dataclass(frozen=True, slots=True)
class ScorePromptParts:
    """The two halves of a scoring prompt. `system` carries the editorial DNA;
    `user` carries the single signal under judgement."""

    system: str
    user: str


def default_editorial_dna(beat_slug: str | None) -> str:
    """Return the default shortlisting DNA for a beat.

    For MVP this is the markets/regulatory voice regardless of `beat_slug`;
    the parameter is threaded now so per-beat DNA can diverge without changing
    callers later.
    """
    return (
        "You are the shortlisting editor for the markets & regulatory desk of an "
        "Indian business newsroom. Your job is to decide what a working markets "
        "reporter must not miss in their morning triage.\n\n"
        "SHORTLIST (high score) signals that are:\n"
        "- Regulatory filings and circulars with market impact (SEBI, RBI, NSE, BSE, "
        "MCA, IBBI, CCI, IRDAI).\n"
        "- Enforcement actions, penalties, show-cause notices, adjudication orders.\n"
        "- Material corporate disclosures: results that surprise, M&A, insolvency, "
        "promoter-pledge changes, rating actions, fund-raises.\n"
        "- Policy changes that move a sector or the broader market.\n\n"
        "REJECT (low score) signals that are:\n"
        "- Routine administrative notices with no market consequence.\n"
        "- Non-material public relations or marketing copy.\n"
        "- Duplicate wire copy of something already obvious.\n"
        "- Retail-investor fluff, listicles, or opinion with no new fact.\n"
        "- Items with no India-market relevance.\n\n"
        "Score on one question only: would a working markets reporter act on this "
        "TODAY? Be decisive. Most raw signals are not worth a reporter's time — it is "
        "correct for many scores to be low. Reserve high scores for genuine must-not-miss "
        "items."
    )


def _truncate(text: str | None, limit: int) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0] + "…"


def build_score_prompt(
    signal: dict[str, Any],
    *,
    editorial_dna: str,
    body_char_limit: int = 1500,
) -> ScorePromptParts:
    """Build the system+user prompt for scoring one signal. Pure."""
    system = (
        editorial_dna + "\n\n"
        "Respond with ONLY a JSON object, no prose, no markdown fences, in exactly "
        "this shape:\n"
        '{"score": <float 0.0-1.0>, '
        '"reasons": "<one or two sentences: why this score>", '
        f'"beat_tag": <one of {list(BEAT_TAGS)}>}}'
    )

    source_name = signal.get("source_name") or signal.get("source") or "unknown source"
    published = signal.get("published_at")
    if hasattr(published, "isoformat"):
        published_str = published.isoformat()
    else:
        published_str = str(published or "unknown")
    headline = signal.get("headline") or "(no headline)"
    body = _truncate(signal.get("body_text"), body_char_limit)

    user = (
        f"SOURCE: {source_name}\n"
        f"PUBLISHED: {published_str}\n"
        f"HEADLINE: {headline}\n"
        f"BODY: {body or '(no body text)'}\n"
    )
    return ScorePromptParts(system=system, user=user)


def build_brief_prompt(
    items: list[dict[str, Any]],
    *,
    editorial_dna: str,
    beat_name: str,
    body_char_limit: int = 600,
) -> ScorePromptParts:
    """Build the system+user prompt for composing the daily brief. Pure.

    `items` are the shortlist rows (highest score first). Each is presented
    with a 1-based index; the model cites those indices, and the caller maps
    them back to signal ids — the model never handles UUIDs.
    """
    system = (
        editorial_dna + "\n\n"
        "You are now composing the morning brief for the desk. Group the items "
        "below into a small number of thematic sections (2–5). Within each "
        "section, write tight editorial prose a working reporter can act on — "
        "what happened, why it matters, what to watch. Do not invent facts; use "
        "only what the items state. Every section must cite the item indices it "
        "draws from.\n\n"
        "For each section also propose 1–3 `search_keywords`: the exact phrases a "
        'reader would type into Google to find this story (e.g. "repo rate", '
        '"sebi rajesh exports"). These are checked against real search volume to '
        "tell the reporter whether the story is a Search play.\n\n"
        "Respond with ONLY a JSON object, no prose, no markdown fences, in exactly "
        "this shape:\n"
        '{"sections": [{"heading": "<short section heading>", '
        '"lede_one_liner": "<one-sentence summary of the section>", '
        '"body": "<2-5 sentences of editorial prose>", '
        '"cites": [<item indices this section uses>], '
        '"search_keywords": ["<reader search phrase>", ...]}]}'
    )

    lines = [f"BEAT: {beat_name}", f"ITEMS ({len(items)}), highest priority first:", ""]
    for idx, item in enumerate(items, start=1):
        source_name = item.get("source_name") or "unknown source"
        headline = item.get("headline") or "(no headline)"
        rationale = (item.get("rationale") or "").strip()
        body = _truncate(item.get("body_text"), body_char_limit)
        lines.append(f"[{idx}] {headline}")
        lines.append(f"     source: {source_name}")
        if rationale:
            lines.append(f"     why shortlisted: {rationale}")
        if body:
            lines.append(f"     detail: {body}")
        lines.append("")
    user = "\n".join(lines)
    return ScorePromptParts(system=system, user=user)
