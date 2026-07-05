import pytest

from onlinejourno_scoring.advisory import premium_distribution_advice
from onlinejourno_scoring import ai_queries, youtube, gdelt, keywords_everywhere


def test_advisory_high_urgency_when_paywalled_and_trending():
    adv = premium_distribution_advice(paywalled=True, hard_paywall=True, discover_score=70,
                                      is_trending=True, matched_trend="Iran", word_count=120)
    assert adv["urgency"] == "HIGH" and len(adv["options"]) >= 1


def test_advisory_low_when_not_paywalled():
    adv = premium_distribution_advice(paywalled=False, hard_paywall=False, discover_score=70,
                                      is_trending=True, matched_trend="Iran", word_count=900)
    assert adv["urgency"] == "LOW" or adv["options"] == []


def test_ke_degrades_without_key(monkeypatch):
    monkeypatch.setenv("KEYWORDS_EVERYWHERE", "")
    assert keywords_everywhere.ranking_keywords("https://x.com/a")["available"] is False


@pytest.mark.integration
def test_network_fetchers_never_raise():
    assert isinstance(ai_queries.reader_questions("zzqqxx"), dict)
    assert isinstance(youtube.search_queries("zzqqxx"), dict)
    assert isinstance(gdelt.domain_authority("zzqqxx"), dict)


def test_network_fetchers_never_raise_offline(monkeypatch):
    def boom(*a, **k):
        raise ConnectionError("network down")

    monkeypatch.setattr(ai_queries.time, "sleep", lambda *_: None)
    monkeypatch.setattr(ai_queries.requests, "get", boom)
    monkeypatch.setattr(youtube.requests, "get", boom)
    monkeypatch.setattr(gdelt.requests, "get", boom)
    assert isinstance(ai_queries.reader_questions("zzqqxx"), dict)
    assert isinstance(youtube.search_queries("zzqqxx"), dict)
    assert isinstance(gdelt.domain_authority("zzqqxx"), dict)
