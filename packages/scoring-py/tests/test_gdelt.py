from onlinejourno_scoring import gdelt


def test_top_domains_shape_and_degrade():
    r = gdelt.top_domains("zzqqxx-no-such-topic", days=7)
    assert isinstance(r, dict) and "available" in r
    # never raises; on no data / network fail → available False or empty domains
    assert "domains" in r or r["available"] is False


def test_domain_authority_still_works():
    r = gdelt.domain_authority("zzqqxx", domain="thehindu.com", days=7)
    assert isinstance(r, dict) and "available" in r
