"""top_fix must be an actionable gap, not the largest *unmeasured* signal."""
from onlinejourno_scoring.channels import need_weighted_composite


def test_top_fix_skips_unmeasured_signal():
    # The trend signal has the biggest gap (0/20) but it's a data-absence note,
    # not a fix. The image gap (10/25) is the biggest ACTIONABLE one.
    scored = {
        "discover": {
            "score": 50,
            "signals": [
                {"name": "Trend", "value": 0, "max": 20,
                 "note": "No trend alignment data provided"},
                {"name": "Image", "value": 10, "max": 25,
                 "note": "No image detected — add a >=1200px image"},
            ],
        }
    }
    assert need_weighted_composite(scored, None)["top_fix"] == \
        "No image detected — add a >=1200px image"


def test_top_fix_falls_back_when_all_unmeasured():
    scored = {
        "discover": {
            "score": 0,
            "signals": [
                {"name": "Trend", "value": 0, "max": 20,
                 "note": "No trend alignment data provided"},
            ],
        }
    }
    # Nothing actionable — don't return None, fall back to the biggest gap.
    assert need_weighted_composite(scored, None)["top_fix"] is not None
