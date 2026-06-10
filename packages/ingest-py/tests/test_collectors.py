

def test_latin_share_script_gate():
    from onlinejourno_ingest.collectors.base import latin_share

    assert latin_share("RBI cuts repo rate by 25 bps") == 1.0
    assert latin_share("राष्ट्रीय सहकारिता नीति-2025") < 0.5
    assert latin_share("1234 — !!") == 1.0  # no letters: pass through
    # Mixed but mostly English survives (names, loanwords)
    assert latin_share("Modi speaks on नीति at summit") > 0.5
