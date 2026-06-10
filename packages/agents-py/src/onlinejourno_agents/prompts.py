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

# PEJ framing codebook (m-framing-pej) — see docs/reports/framing-india-2026.
PEJ_FRAMES = (
    "Straight News", "Conflict", "Wrongdoing Exposed", "Horse Race", "Process",
    "Trend", "Conjecture", "Reality Check", "Policy Explored", "Personality Profile",
    "Historical Outlook", "Reaction", "Institutional Critique", "Consensus",
)
PEJ_TOPICS = (
    "Politics/Elections", "Economy/Business", "Foreign Affairs/Diplomacy",
    "Media/Press Freedom", "Defence/National Security", "Education",
    "Crime/Law & Order", "Judiciary/Legal", "Culture/Entertainment",
    "Science/Technology", "Sports", "Governance/Bureaucracy",
    "Religion/Communalism", "Health/Medicine", "Environment", "Social Issues/Welfare",
)


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


def build_batch_score_prompt(
    signals: list[dict[str, Any]],
    *,
    editorial_dna: str,
    body_char_limit: int = 1500,
) -> ScorePromptParts:
    """Build one prompt that scores a batch of signals in a single call. Pure.

    Each signal is presented with a 1-based index; the model returns one entry
    per item keyed by that index. Batching amortises the editorial-DNA system
    prompt across N items instead of resending it per signal.
    """
    system = (
        editorial_dna + "\n\n"
        "Score EVERY item below independently on the same one question: would a "
        "working markets reporter act on it TODAY? Be decisive — most raw signals "
        "are not worth a reporter's time, so it is correct for most scores to be "
        "low. Reserve high scores for genuine must-not-miss items.\n\n"
        "Respond with ONLY a JSON object, no prose, no markdown fences, in exactly "
        "this shape:\n"
        '{"scores": [{"index": <the item number>, '
        '"score": <float 0.0-1.0>, '
        '"reasons": "<one or two sentences: why this score>", '
        f'"beat_tag": <one of {list(BEAT_TAGS)}>}}, ...]}}\n'
        "Include exactly one object per item, using the item's number as `index`."
    )

    lines = [f"ITEMS ({len(signals)}) to score, each numbered:", ""]
    for idx, signal in enumerate(signals, start=1):
        source_name = signal.get("source_name") or signal.get("source") or "unknown source"
        published = signal.get("published_at")
        if hasattr(published, "isoformat"):
            published_str = published.isoformat()
        else:
            published_str = str(published or "unknown")
        headline = signal.get("headline") or "(no headline)"
        body = _truncate(signal.get("body_text"), body_char_limit)
        lines.append(f"[{idx}] {headline}")
        lines.append(f"     source: {source_name}  published: {published_str}")
        lines.append(f"     body: {body or '(no body text)'}")
        lines.append("")
    return ScorePromptParts(system=system, user="\n".join(lines))


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
        "For each section also propose 2–3 `search_keywords`: BROAD, EVERGREEN head "
        "terms a reader would actually type into Google — the general topic, not "
        'dated or hyper-specific phrases. Good: "repo rate", "rupee dollar", '
        '"sensex today", "gold price". Bad: "rbi mpc june 2026", "sebi rajesh '
        'exports interim order". These are checked against real monthly search '
        "volume to tell the reporter whether the story is a Search play, so favour "
        "terms with genuine, recurring search demand.\n\n"
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


def build_cluster_prompt(
    signals: list[dict[str, Any]], *, editorial_dna: str
) -> ScorePromptParts:
    """Build the prompt that groups signals into story threads. Pure.

    Each signal is numbered; the model returns threads of item indices, which
    the caller maps back to signal ids. A 'thread' is a set of items about the
    same developing story (same event / company / regulatory action). Velocity
    = thread size.
    """
    system = (
        editorial_dna + "\n\n"
        "Group the numbered news items below into STORY THREADS — a thread is a "
        "set of items covering the same developing story (same event, company, "
        "deal, or regulatory action), even across outlets. An item that stands "
        "alone is its own single-item thread. Give each thread a concise title "
        "and a short url-safe slug (lowercase, hyphens).\n\n"
        "Respond with ONLY a JSON object, no prose, no markdown fences:\n"
        '{"threads": [{"title": "<concise thread title>", '
        '"slug": "<lowercase-hyphen-slug>", '
        '"items": [<item numbers in this thread>]}]}'
    )
    lines = [f"ITEMS ({len(signals)}) to group:", ""]
    for idx, sig in enumerate(signals, start=1):
        headline = sig.get("headline") or "(no headline)"
        source = sig.get("source_name") or "?"
        lines.append(f"[{idx}] {headline}  ({source})")
    return ScorePromptParts(system=system, user="\n".join(lines))


def build_frame_prompt(
    signal: dict[str, Any], *, body_char_limit: int = 800
) -> ScorePromptParts:
    """Build the prompt to code one story's PEJ frame + topic (m-framing-pej). Pure."""
    system = (
        "You code a news story's FRAME and TOPIC using the Project for Excellence "
        "in Journalism (PEJ) content-analysis method, adapted for Indian "
        "journalism.\n\n"
        "FRAME = the dominant interpretive lens; choose exactly one of: "
        + ", ".join(PEJ_FRAMES) + ".\n"
        "Guide: Straight News=just the facts; Conflict=built around opposing "
        "sides; Wrongdoing Exposed=a specific actor's misconduct/allegation "
        "surfaced; Horse Race=who's winning/losing; Process=how a system works; "
        "Trend=pattern over time; Conjecture=speculation about what may happen; "
        "Reality Check=a claim tested against evidence; Policy Explored=substance "
        "of a policy examined; Personality Profile=focus on an individual; "
        "Historical Outlook=past-context lens; Reaction=response to a prior "
        "event; Institutional Critique=scrutiny of how an institution or system "
        "functions (not one actor's wrongdoing); Consensus=agreement/common "
        "ground.\n\n"
        "DECISION RULE — 'Straight News' is the EXCEPTION, not the default. Use "
        "it ONLY for a pure wire-style factual report with no interpretive angle. "
        "Before choosing it, rule out every other frame: is there opposition "
        "(Conflict), surfaced misconduct (Wrongdoing Exposed), win/lose framing "
        "(Horse Race), a claim tested vs evidence (Reality Check), policy "
        "substance (Policy Explored), speculation (Conjecture), a pattern over "
        "time (Trend), or institutional scrutiny (Institutional Critique)? If any "
        "interpretive lens is present, pick that specific frame. When two fit, "
        "choose the more specific, more interpretive one.\n"
        "WRONGDOING vs INSTITUTIONAL CRITIQUE: prefer 'Wrongdoing Exposed' "
        "whenever a specific actor's misconduct, fraud, scam, irregularity, or "
        "allegation is surfaced. Use 'Institutional Critique' only when NO "
        "specific wrongdoing is alleged and the story examines how an institution "
        "is structured or functions.\n\n"
        "TOPIC = choose exactly one of: " + ", ".join(PEJ_TOPICS) + ".\n\n"
        'Respond with ONLY a JSON object, no prose: {"frame": "<one frame>", '
        '"topic": "<one topic>"}'
    )
    headline = signal.get("headline") or "(no headline)"
    body = _truncate(signal.get("body_text"), body_char_limit)
    user = f"HEADLINE: {headline}\nBODY: {body or '(headline only)'}\n"
    return ScorePromptParts(system=system, user=user)


ENRICH_BEATS = (
    "National", "Politics", "Courts", "Business", "Economy", "Science & Tech",
    "Climate", "Health", "Education", "Sport", "Culture", "Investigations", "Other",
)

# User Needs Model drivers (ADR 0049) — what reader need a story serves.
USER_NEEDS = ("know", "understand", "feel", "do")


def build_enrich_prompt(
    signals: list[dict[str, Any]], *, include_extraction: bool = True
) -> ScorePromptParts:
    """Batch enrichment prompt (Analyse pillar): per signal extract entities, geo,
    beat, topic, summary. Pure. The model returns one entry per 1-based index.

    With ``include_extraction=False`` (NLP-first, ADR 0048) entities + geo come
    from the local NLP pass, so the LLM is asked only for the classification
    fields — fewer output tokens, same Classify quality."""
    extraction = (
        '"entities": [<named people/orgs/places/schemes>], '
        '"geo": {"country": <string|null>, "region": <string|null>, '
        '"district": <string|null>}, '
        if include_extraction
        else ""
    )
    geo_note = (
        "Infer geo from the text; use null when not identifiable."
        if include_extraction
        else ""
    )
    system = (
        "You are an editorial analyst. For EACH item below, extract structured "
        "metadata. Respond with ONLY a JSON object, no prose, no markdown, exactly:\n"
        '{"results": [{"index": <item number>, '
        f"{extraction}"
        f'"beat": <one of {list(ENRICH_BEATS)}>, '
        f'"user_need": <one of {list(USER_NEEDS)} — the reader need it serves>, '
        '"topic": <short topic>, "summary": <one sentence>}, ...]}\n'
        f"One object per item, using the item's number as `index`. {geo_note}"
    )
    lines = [f"ITEMS ({len(signals)}):", ""]
    for idx, signal in enumerate(signals, start=1):
        headline = signal.get("headline") or "(no headline)"
        body = _truncate(signal.get("body_text"), 700)
        lines.append(f"[{idx}] {headline}")
        if body:
            lines.append(f"    {body}")
        lines.append("")
    return ScorePromptParts(system=system, user="\n".join(lines))
