# Diagnosis for `slice/seo-eeat-audit` owner: `analyze-url` 403s on Cloudflare sites

- **Date:** 2026-06-15
- **For:** whoever owns the SEO/E-E-A-T audit port (`slice/seo-eeat-audit`).
- **From:** the Source-Roadmap Phase-2 work (Cloudflare-aware fetch). Diagnosis only — not fixed here, per ownership.

## Symptom

In the web app → **Story Analyser → "Analyze a URL on demand"**, auditing a live
The Hindu article fails with:

```
analysis failed: Command failed: uv run --package onlinejourno-agents \
  onlinejourno-agents analyze-url https://www.thehindu.com/.../article….ece
```

Reproduced on the CLI:

```
$ uv run --package onlinejourno-agents onlinejourno-agents analyze-url \
    "https://www.thehindu.com/news/national/kerala/alert-issued-against-nipah-…/article70772258.ece"
fetch failed: 403 Client Error: Forbidden for url: https://www.thehindu.com/…/article70772258.ece
```

## Root cause

`analyze_url` fetches the article with a plain, header-only client and raises on
the 403:

`packages/agents-py/src/onlinejourno_agents/distribution_fit.py:333`
```python
resp = requests.get(url, headers={"User-Agent": _UA, "Accept": "text/html"}, timeout=timeout)
resp.raise_for_status()          # ← 403 raises here
```

The Hindu / Moneycontrol / Business Standard sit behind Cloudflare's
"Just a moment…" **JS challenge**. A realistic browser User-Agent alone does
**not** pass it (verified: even a browser-UA `curl`/`requests` GET returns 403).
`cmd_analyze_url` catches the `RequestException` and prints `fetch failed: 403`.

Note the audit has two fetch paths and they've diverged:
- `packages/scoring-py/.../fetch.py:fetch_page` (newer) degrades gracefully —
  sets `cf_blocked`, falls back to GNews *metadata*. It never raises, but it
  also never retrieves the real **article body** for a Cloudflare site.
- `distribution_fit.analyze_url` still uses the **old plain path above**, which
  raises. That's what the on-demand `analyze-url` hits.

## Recommended fix

Route `analyze_url`'s fetch through a **Cloudflare-aware fetcher with a Playwright
fallback** (header tier → headless-Chromium tier that clears the JS challenge and
returns the real HTML). This both stops the 403 and gives the audit the actual
article body (not just GNews metadata), so the E-E-A-T/SEO scores are real.

This already exists and is **proven against The Hindu**: Source-Roadmap Phase 2
shipped `onlinejourno_ingest.fetch.cloudflare.CloudflareFetcher` (two-tier
headers→Playwright). Its live smoke test fetches a The Hindu `.ece` feed
end-to-end and passes (`packages/ingest-py/tests/test_cloudflare_browser.py`,
`PLAYWRIGHT_E2E=1`).

Options, in order of preference:
1. **Extract the Cloudflare fetch into a shared place** both ingest and the audit
   import (cleanest; avoids an agents→ingest or scoring→ingest dependency).
2. **Mirror the Playwright tier into `scoring-py/fetch.py`** (which already owns
   `cf_blocked` detection + GNews fallback) and point `analyze_url` at
   `fetch_page` instead of its own plain GET — unifies the two fetch paths.
3. Short-term: reuse `CloudflareFetcher` directly in `analyze_url` (accepts a
   cross-package dependency).

References:
- Design: `docs/superpowers/specs/2026-06-15-cloudflare-aware-fetch-design.md`
- Plan: `docs/superpowers/plans/2026-06-15-cloudflare-aware-fetch.md`
- Proven impl: `packages/ingest-py/src/onlinejourno_ingest/fetch/cloudflare.py`
