"""Claim Extractor — the pure seam (ADR 0057): validate one LLM-extracted
time-bound promise, then turn it into a calendar_event record by resolving its
deadline phrase through the (pure) Date Normaliser. The live batched LLM call
(`run_claim_extraction`) wraps this seam and mirrors `run_framing`.
"""

from __future__ import annotations

from datetime import date

from onlinejourno_agents.claim_extract import coerce_claim, has_temporal_cue, to_event

REF = date(2026, 1, 15)


def test_gate_passes_text_with_a_temporal_cue():
    # The Gate (PRD): a cheap pre-filter so the LLM only sees plausibly-datey text.
    assert has_temporal_cue("The bridge will be ready by June 2026.")
    assert has_temporal_cue("Rollout within 90 days, the minister promised.")
    assert has_temporal_cue("Report to be tabled next year.")


def test_gate_rejects_text_with_no_temporal_cue():
    assert not has_temporal_cue("Heavy rain lashed the city overnight.")
    assert not has_temporal_cue("")


def test_coerce_requires_a_what():
    assert coerce_claim({"who": "Minister"}) is None  # promise of what?
    assert coerce_claim({}) is None
    assert coerce_claim("not a dict") is None


def test_coerce_keeps_fields_and_clamps_confidence():
    c = coerce_claim(
        {
            "who": "PWD Minister",
            "what": "open the flyover",
            "deadline_text": "by June",
            "original_claim_text": "The flyover will open by June, the minister said.",
            "topic": "Infrastructure",
            "confidence": 1.7,
        }
    )
    assert c["what"] == "open the flyover"
    assert c["who"] == "PWD Minister"
    assert c["confidence"] == 1.0  # clamped into 0..1


def test_coerce_unparseable_confidence_becomes_none():
    assert coerce_claim({"what": "x", "confidence": "soon"})["confidence"] is None


def test_to_event_resolves_the_deadline_through_the_normaliser():
    c = coerce_claim(
        {"who": "CM", "what": "table the report", "deadline_text": "by June", "confidence": 0.8}
    )
    ev = to_event(c, reference=REF, source_link="https://ex/1", signal_id="sig-1")
    assert ev["target_date"] == date(2026, 6, 30)
    assert ev["precision"] == "month"
    assert ev["date_claimed"] == REF
    assert ev["source_link"] == "https://ex/1"
    assert ev["signal_id"] == "sig-1"
    assert ev["what"] == "table the report"


def test_to_event_keeps_unresolved_deadlines_with_a_null_target():
    c = coerce_claim({"what": "fix the road", "deadline_text": "someday", "confidence": 0.5})
    ev = to_event(c, reference=REF, source_link="u", signal_id=None)
    assert ev["target_date"] is None
    assert ev["precision"] == "none"  # still stored — surfaces as an unresolved promise


def test_claim_key_is_stable_and_distinguishes_distinct_promises():
    c1 = coerce_claim({"who": "A", "what": "do X", "deadline_text": "by June"})
    c2 = coerce_claim({"who": "A", "what": "do Y", "deadline_text": "by June"})
    k1 = to_event(c1, reference=REF, source_link="s", signal_id=None)["claim_key"]
    k1_again = to_event(c1, reference=date(2027, 1, 1), source_link="s", signal_id=None)["claim_key"]
    k2 = to_event(c2, reference=REF, source_link="s", signal_id=None)["claim_key"]
    assert k1 == k1_again  # stable across runs (independent of reference date)
    assert k1 != k2  # a different promise is a different row
