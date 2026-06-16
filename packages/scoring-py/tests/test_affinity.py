from onlinejourno_scoring.affinity import affinity_stats


def _row(entity_type, channel, section="Home"):
    return {"entity_type": entity_type, "channel": channel, "section": section}


def test_affinity_stats_aggregates_by_type_and_channel():
    rows = [
        _row("Location", "discover", "International"),
        _row("Location", "google_news", "International"),
        _row("Location", "discover", "Home"),
        _row("Person", "discover"),
        _row("Topic", "search"),
    ]
    stats = affinity_stats(rows)
    # by_entity_type: Location busiest (3), sorted desc
    bet = stats["by_entity_type"]
    assert bet[0]["entity_type"] == "Location" and bet[0]["appearances"] == 3
    assert "discover" in bet[0]["top_channels"]
    assert "International" in bet[0]["top_sections"]
    # per-channel totals
    assert stats["channel_totals"]["discover"] == 3
    assert stats["channel_totals"]["google_news"] == 1
    assert stats["channel_totals"]["search"] == 1


def test_affinity_stats_empty():
    s = affinity_stats([])
    assert s["by_entity_type"] == [] and isinstance(s["channel_totals"], dict)
