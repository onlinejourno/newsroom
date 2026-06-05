# Source Roadmap — India

Editorial source landscape for OnlineJourno tenants covering Indian
publications. Combines two reference documents (national-tier roadmap +
PIB / state-government deep dive) and overlays the actual reachability
verified during Wk 1 ingest tests.

## Reachability classes

The honest reality of Indian source ingestion. Every source belongs to
one of these classes, which determines the collector kind and
implementation effort.

| Class | What it means | Collector kind | Effort |
|-------|----------------|----------------|--------|
| **A. Open RSS** | Public, well-formed RSS, no auth, no bot detection. `curl` returns 200 and valid XML. | `rss` | Low — already shipped Wk 1 |
| **B. Cloudflare RSS** | RSS endpoint exists but Cloudflare or equivalent challenge blocks plain HTTP. 403 to curl, 200 in real browser. | `scrape` (Playwright tier) | Medium — needs two-tier fetch (Wk 2+) |
| **C. JS-rendered portal** | ASP.NET WebForms, viewstate, Akamai, JS-required navigation. PIB, NSE, BSE, MCA, most state portals. | `scrape` (headless browser) | High — viewstate handling + session cookies (Wk 2+) |
| **D. PDF-only / gazette** | Releases as PDFs, gazette navigation, manual indexing. CAG, certain ministries, e-Gazette. | `scrape` + OCR | Higher — PDF extraction (Wk 3+) |
| **E. Social-only** | No website RSS; releases on Twitter/X, Facebook, WhatsApp first. Most state CMs, opposition figures, North-East state PRBs. | `social` adapter | Higher — Twitter API v2 ($100+/mo) (Y2) |
| **F. Wire / paid** | Licensed wire service. PTI, ANI, UNI, Reuters India, Bloomberg India. | `api` adapter | Higher — contract + ingestion (Y2) |

Wk 1 ingest tested 6 sources; results below reflect actual measurement
on 2026-06-04, not the upstream documentation's "RSS live" claims.

## Tier 1A — Verified open RSS (ship now)

These return HTTP 200 with valid XML to a plain Mozilla User-Agent.
Currently seeded in `infra/seeds/dev.sql` for the `self` tenant.

| Name | Beat | RSS URL | Status |
|------|------|---------|--------|
| Mint — Markets | markets-regulatory | `https://www.livemint.com/rss/markets` | Working |
| Economic Times — Markets | markets-regulatory | `https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms` | Working |

That's it. The other four sources currently in the seed (Hindu, Moneycontrol,
Business Standard, PIB) belong to tiers 1B/1C and are kept disabled
until the scraper collector lands.

## Tier 1B — Cloudflare-protected RSS (Wk 2+)

RSS endpoints exist and serve valid XML, but Cloudflare returns 403 to
plain `curl` and other non-browser HTTP clients. A real Chromium with
session cookies fetches them cleanly.

| Name | Beat | RSS URL | Note |
|------|------|---------|------|
| The Hindu — Business | markets-regulatory | `https://www.thehindu.com/business/feeder/default.rss` | Cloudflare 403 to curl. Browser works. |
| Moneycontrol — Business | markets-regulatory | `https://www.moneycontrol.com/rss/business.xml` | Cloudflare 403 to curl. |
| Business Standard — Markets | markets-regulatory | `https://www.business-standard.com/rss/markets-106.rss` | Cloudflare 403 to curl. |

Wk 2+ work: port the two-tier fetch pattern from the EIP handover's
`lib/cloudflare-fetch.ts` (header-based fetch with desktop UA + accept
headers; falls back to Playwright when the first tier fails). Same
collector kind (`rss`) but routed through a Cloudflare-aware HTTP layer.

## Tier 1C — JS-rendered government portals (Wk 2+)

Built on ASP.NET WebForms with viewstate, Akamai edge protection, and
JS-required navigation. Plain HTTP returns generic HTML, not XML.

### PIB (Press Information Bureau)

The single biggest source for central-government coverage in India.
Provides press releases from every union ministry plus the Cabinet.

| Component | Reality |
|-----------|---------|
| Main URL | `https://pib.gov.in` |
| Claimed RSS endpoints | `pib.gov.in/rss_feeds.aspx?type=<sector>` — **404 / ErrorPage** as of 2026-06-04 |
| Alternate | `pib.gov.in/RssMain.aspx` — ASP.NET WebForm, requires viewstate POST, Akamai-protected |
| Real ingest path | Headless browser → PRID URLs: `/PressReleasePage.aspx?PRID=XXXXXXX` |
| URL params | `PRID` = unique release id; `reg` = regional division code (3 = central); `lang` = language code |
| Languages | English, Hindi, Urdu, Marathi, Bengali, Assamese, Punjabi, Gujarati, Tamil, Telugu, Kannada, Malayalam |
| Frequency | 10–20 releases/day on weekdays |
| Twitter (fallback) | `@PIB_India` — sometimes faster than the portal |

Wk 2 implementation: a Playwright-based collector that walks
`AllRelease.aspx`, extracts PRID, fetches each release page, and stores
the canonical English version under `signals` with the other-language
versions indexed under `raw_payload.translations`.

### PIB Regional divisions (17)

Each PIB regional division covers one or two states. All run the same
ASP.NET stack and require the same scraper approach.

| Region | State(s) covered | Twitter (fallback) |
|--------|-------------------|---------------------|
| PIB Delhi | Delhi + central | `@PIB_Delhi` |
| PIB Mumbai | Maharashtra | `@PIB_Mumbai` |
| PIB Kolkata | West Bengal | `@PIB_Kolkata` |
| PIB Bengaluru | Karnataka | `@PIB_Bangalore` |
| PIB Hyderabad | AP + Telangana (shared) | `@PIB_Hyderabad` |
| PIB Lucknow | Uttar Pradesh | `@PIB_Lucknow` |
| PIB Chandigarh | Punjab + Haryana + HP (shared) | `@PIB_Chandigarh` |
| PIB Patna | Bihar | `@PIB_Patna` |
| PIB Ranchi | Jharkhand | `@PIB_Ranchi` |
| PIB Bhopal | Madhya Pradesh | `@PIB_Bhopal` |
| PIB Jaipur | Rajasthan | `@PIB_Jaipur` |
| PIB Dehradun | Uttarakhand | `@PIB_Dehradun` |
| PIB Bhubaneswar | Odisha | `@PIB_Bhubaneswar` |
| PIB Chennai | Tamil Nadu | `@PIB_Chennai` |
| PIB Kochi | Kerala + Lakshadweep | `@PIB_Kochi` |
| PIB Guwahati | Assam + NE | `@PIB_Guwahati` |
| PIB Raipur / Shillong / Imphal / Aizawl / Kohima / Agartala / Gangtok / Port Blair / Pondicherry | Regional NE + UTs | Various |

### State government press portals

19 of 28 states + 5 of 8 UTs have a public press bureau / DIPR portal.
None publishes a standardised RSS. Most require scraper development;
several rely on social media first.

| State | Portal | Press bureau | Social handle | Class |
|-------|--------|--------------|---------------|-------|
| Andhra Pradesh | `apinfo.gov.in` | AP SIB | State-specific | C |
| Arunachal Pradesh | `arunachalpradesh.gov.in` | SIB | `@PemaKhanduBJP` (CM) | E (social-first) |
| Assam | `assam.gov.in`, `dipr.assam.gov.in` | DIPR Assam | `@PressInfoAssam` | C / E |
| Bihar | `ibihar.gov.in` | Bihar SIB | `@NitishKumar` (CM) | C |
| Chhattisgarh | `chhattisgarh.gov.in` | GPB | State-specific | C |
| Delhi | `delhi.gov.in` | Delhi IB | `@DelhiInfoBureau` | C / E |
| Goa | `goa.gov.in` | GIC | State-specific | C |
| Gujarat | `gujaratindia.com` | GSIB | `@GujInfoBureau` | C |
| Haryana | `haryana.gov.in` | HIB | `@HaryanaGovt` | C |
| Himachal Pradesh | `himachalpradesh.gov.in` | HPIB | State-specific | C |
| Jharkhand | `jharkhand.gov.in` | JIB | State-specific | C |
| Karnataka | `karnataka.gov.in` | KSIB | `@KarnatakaInfoBu` | C |
| Kerala | `kerala.gov.in` | KGPB | `@KeralaGovtPress` | C |
| Madhya Pradesh | `madhyapradesh.gov.in` | MPIB | State-specific | C |
| Maharashtra | `maharashtra.gov.in` | GPB | `@MH_PressOffice` | C |
| Manipur | `manipur.gov.in` | SIB | `@N_Biren` (CM) | E |
| Meghalaya | `meghalaya.gov.in` | GIPRD | `@ConradKSangma` (CM) | C / E |
| Mizoram | `mizoram.gov.in` | SIB | State-specific | E |
| Nagaland | `nagaland.gov.in` | SIB | `@NeiphiuRio` (CM) | E |
| Odisha | `odisha.gov.in` | OGPB | `@OdishaGovtPress` | C |
| Punjab | `punjab.gov.in` | IB Punjab | `@AAPPunjab` | C |
| Rajasthan | `rajasthan.gov.in` | RGPB | `@RajGovtPress` | C |
| Sikkim | `sikkim.gov.in` | SIB | State-specific | E |
| Tamil Nadu | `tamil.gov.in` | TNPB | `@TNGovtPress` | C |
| Telangana | `telangana.gov.in` | TPB | `@TelanganaPress` | C |
| Tripura | `tripura.gov.in` | GPB | State-specific | E |
| Uttar Pradesh | `up.gov.in` | UPIB | `@UPInfoBureau` | C |
| Uttarakhand | `uttarakhand.gov.in` | UGPB | State-specific | C |
| West Bengal | `wb.gov.in` | GPB | `@WBGovtPress` | C |

UTs and small states (Andaman, Lakshadweep, Dadra & Nagar Haveli,
Daman & Diu, Ladakh, Puducherry) generally publish via central or
neighbouring-state administrations.

## Tier 2 — National regulatory and ministry feeds (verify before adopt)

These are claimed in the upstream roadmap to publish RSS or APIs. Each
needs an independent reachability test before being moved into the seed.
For now: **classification pending**.

| Source | Beat | URL | Doc claim | Verification status |
|--------|------|-----|-----------|---------------------|
| RBI | markets-regulatory | `rbi.org.in` | RSS live | Pending — RSS endpoint reportedly removed since ~2023 |
| SEBI | markets-regulatory | `sebi.gov.in` | RSS live | Pending — SEBI never had a documented public RSS |
| MEA | international | `mea.gov.in` | RSS live | Pending |
| IMD | national, states | `mausam.imd.gov.in` | JSON API | Pending — IMD does expose endpoints |
| MCA / GeM | business-industry | `mca.gov.in`, `gem.gov.in` | RSS / API | Pending — known JS-rendered + anti-bot |
| CPPP | business-industry | `cppp.gov.in` | RSS | Pending |
| MoHFW + ICMR + NCDC | health, national | `mohfw.gov.in` | Medium-effort scrape | Pending |
| MoEFCC + NGT | environment | `moef.gov.in`, `greentribunal.gov.in` | Medium-effort scrape | Pending |
| ISRO + DST | science | `isro.gov.in`, `dst.gov.in` | Low-effort | Pending |
| CSIR | science | `csir.res.in` | Medium-effort | Pending |
| CBFC | entertainment | `cbfc.gov.in` | Medium-effort | Pending |
| ECI | national | `eci.gov.in` | Medium-effort | Pending |
| CAG | national, states | `cag.gov.in` | PDF-heavy | Pending — Class D |
| Indian Railways | industry, states | `indianrailways.gov.in` | Medium-effort | Pending |
| DGCA | industry | `civilaviation.gov.in` | Medium-effort | Pending |
| UPSC + State PSCs | education, governance | Various | Medium-effort | Pending |
| State RERA registries (36) | real-estate | Various state portals | High-effort | Pending — wide scrape |

Wk 2+ workflow: write a one-off verification script that hits each URL,
records status / content-type / reachability, and moves verified ones
into the seed under the correct class.

## Tier 3 — Sector-specific (on demand)

Activated per tenant when a beat needs them.

| Sector | Source | Note |
|--------|--------|------|
| Agri / commodities | eNAM, APEDA, FCI, NCDEX | API / dashboard |
| Sports | BCCI, ICC, AFC, SAI, IOA | Mix of API + scrape + social |
| Technology | MeitY, NASSCOM, IIT council | Mix |
| Education | UGC, NTA, NCERT, MoE, DIKSHA | Notification scrape |
| Policy | NITI Aayog | Press release + paper publish |
| Rights | NHRC, state HRCs | PDF-heavy |
| Anti-corruption | Lokpal, state Lokayuktas | Order PDFs |

## Tier 4 — Y2 social monitoring (gated on Twitter API cost)

The most-up-to-date sources for political and ministerial signals are
Twitter / X feeds. Implementation gated on the Twitter API v2 pricing
decision (basic tier $100/month, restricts read volume).

| Group | Examples |
|-------|----------|
| Cabinet ministers | `@DefenceMinIndia`, `@meaIndia`, `@FinMinIndia`, `@MoHFWIndia`, `@HMOIndia`, `@RailMinIndia`, `@MORoadIndia`, `@DGCAIndia`, `@moef_india`, `@MeitY_India`, `@PIB_Commerce` |
| PMO + national leadership | `@narendramodi`, `@PMOIndia`, `@PIB_India` |
| Opposition leadership | `@RahulGandhi`, `@priyankagandhi`, `@SitaramYechury`, `@MamataBanerjee`, `@ArvindKejriwal`, `@sharadpawar` |
| State CMs (28) | `@CMOTamilnadu`, `@himantabiswa`, `@CMOMaharashtra`, `@myogiadityanath`, `@siddaramaiah`, `@pinarayivijayan`, `@NavinPatnaik`, `@hemantjharkhad`, `@NitishKumar`, `@N_Biren`, `@ConradKSangma`, `@NeiphiuRio`, `@PS_Golay`, `@pushkardhami`, `@DrMohanYadav`, `@OfficeofUT`, etc. |
| Political parties | `@BJP4India`, `@INCIndia`, `@AITCofficial`, `@DMKOfficial`, `@AIADMK_Official`, `@ShivSena`, `@NCPspeaks`, `@AamAadmiParty`, `@cpimspeak`, `@BJD_Odisha` |

Indian politician handles change more frequently than party handles
(reshuffles, defections, account migrations). Verify each handle
against the relevant party's most recent official press release before
seeding.

## Tier 5 — Wire services (Y2, paid)

| Service | Format | Cost class |
|---------|--------|------------|
| PTI (Press Trust of India) | Wire API + RSS | Subscription |
| ANI (Asian News International) | Wire API + RSS | Subscription |
| UNI (United News of India) | Wire API + RSS | Subscription |
| Reuters India | Wire API | Subscription |
| AP / AFP redistribution | Via Indian wire partners | Subscription |

## Tier 6 — Embassies, multilaterals, think tanks (Y2)

Tenant-driven — most newsrooms don't need all of these, but international
desks subscribe to specific ones.

### Bilateral diplomatic

US, UK, EU member states, China, Russia, Japan, Canada, Australia, plus
SAARC neighbours. Most maintain English Twitter accounts and irregular
press release pages.

### Multilateral

UN India, WHO India, UNESCO India, IMF, World Bank, UNHCR, ICRC,
INTERPOL, GAVI, Global Fund.

### Indian think tanks + research

ORF, Brookings India, ICRIER, Takshashila, Vidhi Centre for Legal
Policy, IIC.

## Implementation roadmap

Phase mapping that respects ADR 0026 (one protected deep-work day /
week, quarterly major releases) and ADR 0007 (adapter contracts on every
external dep).

### Phase 1 — Tier 1A (shipped Wk 1)

Done. Two working RSS sources, both class A. Pipeline validated.

### Phase 2 — Cloudflare-aware fetch (Wk 2)

Goal: unlock Tier 1B sources without breaking the existing collector.

- Port `lib/cloudflare-fetch.ts` two-tier pattern from `eip-handover`
  into `packages/ingest-py/onlinejourno_ingest/fetch/cloudflare.py`.
- Tier 1: enhanced headers (desktop Chrome UA, Accept, Accept-Language,
  Accept-Encoding, sec-* headers) via `requests`. ~80 % success on the
  identified Cloudflare endpoints.
- Tier 2: Playwright headless Chromium with session cookies, only when
  Tier 1 returns 403/503. ~95 % success.
- Wire into `RSSCollector` so existing seed entries automatically
  benefit.
- Add the four currently-disabled sources (Hindu Business, Moneycontrol,
  Business Standard, PIB) back into the seed with `enabled = true`.

### Phase 3 — Scraper collector + PIB (Wk 3–4)

Goal: a `scrape` collector kind that handles JS-rendered portals.

- `packages/ingest-py/.../collectors/scrape.py` based on Playwright.
- PIB-specific module that:
  - walks `AllRelease.aspx`,
  - extracts PRID list,
  - fetches each release page,
  - parses canonical English content + records other-language paths
    in `raw_payload.translations`,
  - respects the 30-minute lag-from-PRID-allocation observed in PIB's
    publishing workflow.
- One state portal as a second test case (Karnataka or Tamil Nadu
  recommended — both have structured release pages).

### Phase 4 — Verification + Tier 2 expansion (Wk 5–6)

Goal: move pending Tier 2 sources into the seed once verified.

- Reachability script that classifies each URL into A / B / C / D / E.
- Update `infra/seeds/dev.sql` with the verified ones.
- Document the unverifiable ones in `docs/notes/source-verification-<date>.md`.

### Phase 5 — Coverage signal (Wk 7–8)

Goal: surface scraper-rot and coverage gaps as editorial signal, not
silent engineering log.

- Wire `portal_health_alerts` table into the editor's brief surface
  (planned in ADR 0014 / `m-portal-health`).
- Cross-source deduplication at the canonical-release level: fingerprint
  on `(headline_normalized, published_date_utc, source_class)`.
- Coverage-gap report per tenant: what their newsroom covered yesterday
  vs. what the underlying release stream actually carried.

### Phase 6 — Tier 4 social (Y2, gated on Twitter API decision)

Defer until either the Twitter API basic tier becomes affordable or an
alternative (RSSHub, Nitter mirrors with the values caveat) reaches
stability.

## Engineering notes

These are tenant-neutral implementation observations that hold across
any newsroom that uses the platform.

- **PIB PRID URL structure**:
  `pib.gov.in/PressReleasePage.aspx?PRID=XXXXXXX&reg=X&lang=Y`. PRID is
  the unique release id, `reg` codes the regional division (3 = central,
  48 = English-only central), `lang` codes the translation (1 = English,
  2 = Hindi, etc.). Build the scraper around the canonical English
  version (lang=1) and store the rest as translation references.
- **State portal fragmentation**: no standardised press release API
  across 28 states + 8 UTs. About 14 have partial RSS or web scrape
  capability; the remainder require DOM parsing or social-only
  monitoring.
- **CM social asymmetry**: state CM announcements often appear on
  Twitter before the official press bureau site, especially in coalition
  states. Editorial briefs that depend solely on press-bureau-RSS will
  trail by 30–60 minutes.
- **Gazette deduplication**: e-Gazette notifications overlap
  significantly with ministry PIB releases. Implement secondary citation
  linking (gazette ref id → PIB PRID) to avoid double-shortlisting.
- **PIB language fanout**: PIB maintains up to 12 language versions of
  the same release. Build dedup on the English canonical PRID, store
  other language references as pointers; never duplicate the body.
- **Cloudflare rotation**: the same domain may serve plain HTTP on some
  paths and Cloudflare-protected JSON / RSS on others. Per-URL
  classification, not per-domain.
- **State CMs use personal Twitter accounts more than office accounts**
  in several states. Maintain a per-state mapping that the tenant can
  override (their political-desk editor knows whether the official
  handle has moved this week).

## What this document does not promise

- That a URL listed here works. The reachability classes reflect the
  best-known state on the date of writing; Indian government portals
  change endpoints without notice.
- That a Twitter handle listed here is current. Indian politician
  handles change frequently; verify against the relevant party's most
  recent press release.
- That PIB or any state portal will respect `robots.txt` or rate-limit
  hints in any documented way. Build the scrapers polite by default
  (one request per 4 seconds, exponential backoff on 429) regardless of
  what the portal says.

## See also

- `infra/seeds/dev.sql` — the actually-seeded subset
- `docs/MVP-SCOPE.md` — Wk 1–8 narrative
- `docs/adr/0007-adapter-contracts.md` — wraps each external dependency
- `docs/adr/0014-portal-health-module.md` — scraper-rot as editorial
  signal
- `docs/adr/0028-values-foss-first.md` — Twitter API stance, vendor
  prefs
