# OnlineJourno — per-product marketing pages + IA (design)

**Status:** Design agreed 2026-06-28; live-statuses refreshed 2026-06-29. **BUILD GATED** — pages ship
only as each product becomes screenshot-capturable (founder decision: no mockups; real screenshots only).
This doc is the turnkey spec for when the gate lifts. Extends `SHARED-IA.md` (which is stale — see §6).

Canonical names per `onlinejourno-com-marketing/04-product-name-map.md` (2026-06-26).
Voice: **the journalist's project comes through** — share/ideate/community, by-a-journalist-for-journalists,
not a vendor pitch (marketing-register). Build target: **WordPress pages + the OJDS theme**
(`marketing/wordpress/`); founder installs.

## 1. Site nav + IA
Top nav (every property, OJDS): **Home · Products ▾ · Tools · Toolkit · Docs · About**.

**Products mega-menu — grouped by JATO role:**
- **Flagship:** OnlineJourno Newsroom
- **Capabilities:** Daybook · Galley · Frontmatter · Lens
- **Tasks:** The Audit · Pulse
- (**Tools** + **Toolkit** are their own top-level nav items, not inside Products.)

Each product → its own page at `/products/<slug>`. A `/products` index lists all, grouped as above.

## 2. JATO treatment — thread, not banner
JATO is **not** a banner and **not** a top-nav item. It appears as:
- a "how the suite works together" **narrative strip on Home** (reporter's task → decompose → capability
  library → sourced result), and
- a small **role badge** on each product page ("a JATO capability" / "a JATO task" / "the JATO flagship").
The journalist's project leads every page; JATO is the quiet engine underneath.

**JATO page = a folder, NOT a subdomain (decided 2026-06-29).** The JATO project report
(`~/projects/JATO-Project-Report.md`) gets one OJDS narrative page at **`onlinejourno.com/jato`** —
the funder/partner/collaborator front door (problem → idea → what already exists → architecture →
roadmap → ask), linking out to each product page. Folder, not `jato.onlinejourno.com`, because:
(1) it pools link equity on the main domain (SEO governing rule); (2) JATO is the framework *beneath*
the suite, not a 5th property — a subdomain would banner it; (3) it's a narrative for funders, not an
app people use (apps earn subdomains; stories don't). **Reserve a subdomain for later** — when the
orchestrator itself ("assess an outlet", Phase 1) ships as a usable tool, *that app* can get one like
tools/galley. Linked from About/Toolkit, not the top nav. Quiet engine, durable URL.

## 3. Per-product page template (OJDS)
Same skeleton every product, OJDS tokens (cream/ink, Kittel display, IBM Plex meta, vermilion accent):
1. **Hero** — product name (Kittel) · one-line purpose · role badge · primary link.
2. **The problem it answers** — the reporter/newsroom pain, in plain ground-up voice (the *why*).
3. **Screenshot(s)** — real, OJDS-consistent. **Gate item** (no page without this).
4. **How it works / how it fits JATO** — 2–3 steps; the capability's place in the suite.
5. **Status + links** — app URL / GitHub / self-host docs / license.
6. **Soft CTA** — community register ("try it", "read the thinking", "get involved"), never hard-sell.

## 4. Product roster + screenshot-readiness (the gate)
| Product | slug | JATO role | Live/capturable now? | Page-ready? |
|---|---|---|---|---|
| OnlineJourno Newsroom | `newsroom` | Flagship | ✅ app.onlinejourno.com (auth) | needs capture |
| Daybook | `daybook` | Capability | ⚠️ local, Plan 1/5 | blocked |
| Galley | `galley` | Capability | ✅ galley.onlinejourno.com (live) | needs capture |
| Frontmatter | `frontmatter` | Capability | ⚠️ in-Newsroom (gated); marketing page drafted | draft ready (marketing-only) |
| Lens | `lens` | Capability | ⚠️ local (news-intel) | blocked |
| The Audit | `audit` | Task | ⚠️ demo-ready (private) | blocked |
| Pulse | `pulse` | Task | ✅ onlinejourno.com/in (live) | needs capture |
| Web Bloat Checker | `web-bloat-checker` | Tool (MIT) | ✅ tools.onlinejourno.com | needs capture |
| Crawl-Budget Analyser | `crawl-budget` | Tool (MIT) | ✅ tools.onlinejourno.com | needs capture |
| The Toolkit | `toolkit` | Resource | ✅ to publish | needs capture |
| News Ranking | — | Future | ✗ nothing built | not yet |
| Compositor | — | Future | ✗ concept | not yet |

**Per-page ship gate:** (1) product is screenshot-capturable → (2) OJDS-consistent screenshot captured →
(3) copy reviewed in the journalist voice → (4) page + nav/footer entry added. Ship pages individually
as they pass; don't wait for all.

## 5. Build steps (when unblocked)
1. Author each `/products/<slug>` page (content + OJDS layout) as a WordPress page; add the OJDS
   page-template part if richer layout is needed.
2. Wire the **Products mega-menu** (grouped) + the `/products` index.
3. Add the Home **JATO narrative strip** + product role badges.
4. Add each product to footer Product column + header nav fallback
   (`theme/onlinejourno/{header,footer}.php`).

## 6. Prerequisite cleanup (NOT blocked on screenshots — safe to do first)
`SHARED-IA.md` and `wordpress/pages/products.md` use **stale names** ("Platform", "Editorial Optimiser")
and a 4-property model. Update both to the canonical map (Newsroom, Galley=story-optimiser, Lens=news-intel,
+ Daybook/Frontmatter/Pulse/The Audit/Toolkit) and the grouped Products IA above. This is name-correctness,
independent of the screenshot gate — do it whenever.
