"""
AI-style query generator — 100% free, no API keys.

Uses Google Suggest with question-word prefixes to surface what people
are actively typing into search (and by extension, asking AI assistants).
These are real queries, not generated ones — more reliable editorially.

Question prefixes map to AI assistant intent types:
  what / why / how  → explanatory (Claude/ChatGPT style)
  who / when        → factual (Perplexity style)
  should / will     → predictive / opinion (ChatGPT style)

Public API (all return dict with `available` key; never raise):
  reader_questions(keyword) -> {available, questions:[...], search_angles:[...]}
  content_gap(keyword, headline) -> {available, ...gap analysis fields...}
"""
from __future__ import annotations

import re
import json
import time
import requests

SUGGEST_URL = "https://suggestqueries.google.com/complete/search"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; DiscoverDashbot/1.0)"}

QUESTION_PREFIXES = {
    "reader_questions": ["what is", "why is", "why did", "what does", "how does"],
    "chatgpt_style":    ["explain", "what happened", "how will", "should india", "is it true"],
    "perplexity_style": ["who is", "when is", "what are the", "how many", "which"],
    "story_angles":     ["what about", "why not", "impact of", "effect of", "problem with"],
}


def reader_questions(keyword: str, context: str = "India", max_queries: int = 6) -> dict:
    """
    Return question-style queries real users type about `keyword`.
    Groups them by AI-assistant intent type.

    Returns: {available, questions:[flat list], search_angles:[...], by_intent:{...}}
    """
    try:
        results = {k: [] for k in QUESTION_PREFIXES}
        seen: set = set()

        for category, prefixes in QUESTION_PREFIXES.items():
            for prefix in prefixes:
                suggestions = _suggest(f"{prefix} {keyword}")
                for s in suggestions:
                    if s not in seen and keyword.lower()[:6] in s.lower():
                        seen.add(s)
                        results[category].append(s)
                        if len(results[category]) >= max_queries:
                            break
                if len(results[category]) >= max_queries:
                    break
                time.sleep(0.3)

        flat_questions = [q for qs in results.values() for q in qs]
        angles = results.get("story_angles", [])
        return {
            "available": True,
            "questions": flat_questions,
            "search_angles": angles,
            "by_intent": results,
        }
    except Exception as exc:
        return {"available": False, "reason": str(exc), "questions": [], "search_angles": []}


def content_gap(keyword: str, headline: str, context: str = "India") -> dict:
    """
    Derive what the headline misses by checking what question-queries exist
    that the headline's keywords don't cover.

    Returns: {available, likely_followup_questions, missing_angles,
              recommended_additions, headline_optimisation}
    """
    try:
        if not headline:
            return {"available": False, "reason": "no headline provided"}

        headline_words = set(headline.lower().split())
        raw = reader_questions(keyword, context=context, max_queries=8)
        if not raw.get("available"):
            return {**raw, "likely_followup_questions": [], "missing_angles": [],
                    "recommended_additions": [], "headline_optimisation": headline}

        flat_queries = raw["questions"]

        gaps = []
        for q in flat_queries:
            q_words = set(q.lower().split()) - {"is", "are", "the", "a", "an", "of", "in"}
            if not q_words.intersection(headline_words) and len(gaps) < 5:
                gaps.append(q)

        recs = [f"Address: \"{g}\"" for g in gaps[:3]]

        optimised = headline
        if flat_queries:
            top_q = flat_queries[0]
            suffix_words = [
                w for w in top_q.split()
                if w.lower() not in {"what", "why", "how", "is", "are", "the", "a", "an"}
            ]
            if suffix_words:
                angle = " ".join(suffix_words[-3:]).title()
                optimised = f"{headline}: {angle} Explained"

        return {
            "available": True,
            "likely_followup_questions": gaps,
            "missing_angles": [f"Readers search: '{g}'" for g in gaps[:3]],
            "recommended_additions": recs,
            "headline_optimisation": optimised,
        }
    except Exception as exc:
        return {
            "available": False, "reason": str(exc),
            "likely_followup_questions": [], "missing_angles": [],
            "recommended_additions": [], "headline_optimisation": headline,
        }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _suggest(query: str, region: str = "IN") -> list:
    """Call Google Suggest and return a flat list of suggestion strings."""
    try:
        r = requests.get(
            SUGGEST_URL,
            params={"client": "firefox", "q": query, "hl": "en", "gl": region},
            headers=HEADERS,
            timeout=8,
        )
        match = re.search(r'\[.*\]', r.text, re.DOTALL)
        if not match:
            return []
        data = json.loads(match.group(0))
        raw = data[1] if len(data) > 1 else []
        return [s for s in raw if isinstance(s, str)]
    except Exception:
        return []
