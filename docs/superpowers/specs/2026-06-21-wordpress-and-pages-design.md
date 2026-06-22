# Design spec — WordPress site + standard pages + masthead link + mobile

**Status:** Drafted 2026-06-21. Public-face slice for **onlinejourno.com** (self-hosted WordPress,
Apache, WP 7.0, currently Twenty Twenty-Five) + two app-side changes.

## Context

onlinejourno.com is **self-hosted WordPress** — I can't touch the live site without WP credentials
(which I won't handle). So WordPress deliverables are **prepared in-repo for the founder to install/
publish**. The OJDS bundle already ships a complete classic PHP theme (`wordpress-theme/onlinejourno/`).
The Fly app (app.onlinejourno.com) I change directly.

## Decisions (founder)

- Site content licence: **CC BY 4.0** (attribution).
- Standard pages (Core 4): **About Us, Privacy Policy, Contact Us, License & Attribution**
  (the CC BY 4.0 grant + a fair-use/fair-dealing policy in one page).
- Masthead + logo link → **onlinejourno.com** (the homepage).
- Site + app must be **mobile-friendly**.

## A. WordPress deliverables (repo `marketing/wordpress/`, founder installs)

| Path | What |
|---|---|
| `marketing/wordpress/theme/onlinejourno/` | Vendored OJDS theme (from the bundle). Refine: `footer.php` gets a standard-page nav + `© OnlineJourno · CC BY 4.0` notice; confirm `header.php` logo → `home_url('/')`; verify the `@media` rules cover phones (single-column, tappable nav). Keep GPL header + bundled Kittel. |
| `marketing/wordpress/pages/about.md` | About Us — product mission, "by journalists, for journalists", the ethic ("machine surfaces, journalist decides, never publishes"), OSS/self-host, links to GitHub + app. Vendor-neutral. |
| `marketing/wordpress/pages/privacy.md` | Privacy Policy — cookieless analytics (Umami, no PII, DNT), no tracking of personal data, self-host data ownership, contact for data requests. |
| `marketing/wordpress/pages/contact.md` | Contact Us — email + GitHub issues; demo-access request. |
| `marketing/wordpress/pages/license-attribution.md` | **CC BY 4.0** grant for site content + how to attribute; **fair-use/fair-dealing** stance for excerpts the platform quotes; code licence pointer (repo `LICENSE.md`); font/asset provenance (OFL Kittel etc.). |
| `marketing/wordpress/README.md` | Install guide: zip `theme/onlinejourno/` → Appearance ▸ Themes ▸ Add New ▸ Upload; create the 4 Pages (paste content); build the primary menu + footer menu; set the site logo + homepage. |

Content voice: OnlineJourno product, plain/precise/desk-ready (per OJDS readme). Vendor-neutral
(no hardcoded outlet). Convert relative dates to absolute.

## B. App changes (Fly, I deploy)

| File | Change |
|---|---|
| `apps/web/components/Masthead.tsx` | Logo `<a href>` (line 37) → `https://onlinejourno.com` (external; always — the product homepage). |
| `apps/web/components/Masthead.tsx` + `app/globals.css` | **Mobile pass**: masthead wraps cleanly + nav scrolls/wraps on ≤640px; `.ds-page`/`.ds-page-narrow` reduce side padding on phones; `.today-grid` already collapses (≤880px) — verify; wrap wide tables/Plotly charts in horizontal-scroll containers; ensure tap targets ≥40px. |

The Next viewport meta is present by default (`width=device-width`).

## Testing & success criteria

- App `type-check` + `build` green.
- Mobile: render at **375px** (preview_resize, or prod check if the local tree is contended) — masthead
  usable, no horizontal overflow, surfaces single-column, charts scroll not clip. Screenshot.
- Logo navigates to onlinejourno.com.
- WP theme: PHP files lint clean (`php -l` where available); README is followable; pages are paste-ready.
- Vendor-neutral grep on the WP content (no hardcoded demo outlet).

## Out of scope

- Publishing to the live WordPress (founder installs the theme + pages).
- Slice 2 per-surface component application (Brief/Signals/Calendar/Trends/Scores/Newslist) — still
  pending, paused for this slice.
- The canonical-wordmark image decision; marketing UI-kit landing page (separate).

## References

- OJDS bundle `wordpress-theme/onlinejourno/` (the theme), `ui_kits/marketing/` (landing reference).
- ADR 0063 (OJDS). `apps/web/components/Masthead.tsx`. Repo `LICENSE.md`, `docs/IP-PROVENANCE.md`.
