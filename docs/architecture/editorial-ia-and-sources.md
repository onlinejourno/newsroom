# Editorial Information Architecture + Source Ecosystem

**Status:** Draft 2026-06-08. Sub-project A of the integrated-product build (PRODUCT.md, ADR 0042). Foundational: defines the **section taxonomy**, the **4-tier source model**, and the **source descriptor schema** that the data-source admin panel (sub-project B) and the connector framework (sub-project C) implement. Everything here is a **template + examples** — every newsroom configures its own; nothing is hard-coded to one country or masthead.

This is the concrete shape of two things already in the north-star: the **Collect** pillar and **sources as a first-class layer**.

---

## Part 1 — Editorial Information Architecture

A newsroom's IA is the set of sections + subsections it publishes into. OnlineJourno maps every signal to a section so the reporter/desk see it where they work. The default taxonomy (newsrooms add/remove/rename per their masthead):

| Section | Subsections (granular) |
|---------|------------------------|
| **News** | National, International, States/Regions, Cities (if city editions) |
| **Opinion** | Editorial, Columns, Op-Ed, Letters |
| **Business** | Markets, Economy, Industry, Personal Finance |
| **Sport** | by federation / league / event |
| **Culture / Entertainment** | Film, Music, Arts, Books, Heritage |
| **Lifestyle** | Food, Travel, Health & Wellness, Fashion |
| **Science & Technology** | Research, Space, Climate/Environment, Tech Policy |
| **Education** | Schools, Higher-Ed, Exams/Boards |
| **Data / Explainers** | Data journalism, Explainers, Fact-checks |
| **Special** | Investigations, Children, Brand/sponsored (labelled) |

**Principle:** be granular. "News" is not a section — "News: National", "News: States", "News: Cities" are. Granularity is what lets a district correspondent get *her* slice.

### Coverage-gap matrix (per newsroom)

The audit each newsroom runs once, then OnlineJourno keeps live:

| Section | Primary sources | Status | Gap |
|---------|-----------------|--------|-----|
| News / National | govt press bureau, parliament, regulators | 🟢 complete | — |
| News / International | foreign ministry, multilaterals, wires | 🟡 partial | regional embassies missing |
| Business / Markets | central bank, securities regulator, exchanges | 🟢 complete | trade-specific feeds absent |
| Science / Tech | research councils, tech ministry, universities | 🟡 partial | corporate R&D absent |

🟢 systematically monitored · 🟡 ad-hoc · 🔴 gap. The matrix is a first-class object in the admin panel (B) — each section shows live coverage vs. gap.

---

## Part 2 — Source ecosystem (families)

Sources group into families, each with a standard descriptor (Part 3). Families are **global** — the *instances* are per-country.

1. **Government** — national press bureau, ministry releases, regulators (central bank, securities, tax, environment, telecom…); sub-national: state/regional govt bureaus, regional regulators.
2. **Political** — executive/leadership accounts, ruling + opposition parties, regional leaders (social-first).
3. **International / diplomatic** — foreign ministry, embassies/high commissions, multilaterals (UN, World Bank, IMF, regional blocs: AU, ASEAN, EU, Mercosur).
4. **Institutional (by section)** — markets (exchanges, banking assns), sci/tech (research councils, space agencies), agriculture (commodity boards, co-ops), sport (federations), culture (film boards, heritage bodies), education (boards, universities).
5. **Newswires / agencies** — international (Reuters, AP, AFP, EFE, dpa, Xinhua, Anadolu) + national/regional wires; specialist wires (markets, sport). Ingestion depends on the newsroom's subscription; otherwise pick up via public agency feeds/social. **Regional wires (e.g. African, Latin American, SE-Asian) are added per newsroom** — not a fixed Anglo set.
6. **Social** — wire + leadership + institutional handles (X, etc.), subscription-gated where applicable.
7. **Own / internal** (Tier 4) — the newsroom's own (gated) RSS, CMS, archive.

---

## Part 3 — Source descriptor schema (feeds the admin panel)

Every source — whatever its family — is described by one record. This **is** the data model the admin panel (B) edits and the collector reads:

| Field | Meaning |
|-------|---------|
| `name` | human label |
| `family` | government / political / international / institutional / wire / social / own |
| `sections_fed` | which IA sections this feeds (list) |
| `tier` | 1–4 (Part 4) |
| `ingest_type` | `rss` · `api` · `mcp` · `scrape` · `social` |
| `endpoint` | feed URL / API base / MCP server / page URL |
| `auth` | none · api_key · oauth · bearer (+ secret ref, never inline) |
| `params` | per-type variables (API query params, rate limit, pagination; scrape selectors; MCP tool name) |
| `geo` | country / region / district scope |
| `frequency` | poll cadence |
| `language` | source language (for the localizable output) |
| `enabled` | per-tenant on/off |

**Per ingest_type, the admin panel asks for exactly what's needed:**
- **rss** → feed URL (+ optional auth for gated feeds).
- **api** → base URL, auth method + secret ref, request params, response path, rate limit.
- **mcp** → MCP server URL/command + tool name + args (lets a newsroom wire a data source as an MCP pipeline instead of a bespoke API client).
- **scrape** → page URL, CSS/XPath selectors, Cloudflare-aware fetch toggle.
- **social** → handle + platform + (subscription) auth.

---

## Part 4 — The 4-tier source model

Classify each of a newsroom's 50–200 primary sources:

- **Tier 1 — high editorial weight, public RSS, low effort.** Central-bank announcements, govt press releases, regulator decisions, court cause-lists with feeds. *Stand these up first.*
- **Tier 2 — high weight, needs scraping or API.** State-govt sites, ministry databases, exchange data, gazette portals behind forms.
- **Tier 3 — sector-specific, niche but important.** Commodity/futures, tech-sector APIs, sport federation schedules, RERA-type registries.
- **Tier 4 — deferred (org/technical readiness).** The newsroom's own gated feeds, internal CMS, custom integrations, archive.

The admin panel sorts + filters sources by tier; the implementation roadmap (sub-project G) sequences by tier (Tier 1 → quick win).

---

## Part 5 — Global examples (capability, not India-only)

Illustrative — each newsroom replaces with its own. One anchor + one per continent, with representative public Tier-1/2 sources. (Section style mirrors Part 1.)

**India (anchor)** — *The Hindu / Indian Express / Mint style.* Sections: News (National/States/Cities), Business/Markets, Sport, Opinion, Science. Tier 1: PIB releases, RBI, SEBI, Supreme Court cause-list (RSS). Tier 2: state govt portals, eGazette, NSE/BSE. Tier 3: APMC/commodity boards, RERA registries.

**Africa (Nigeria / South Africa)** — *Premium Times / Daily Maverick style.* Sections: News (National/Regional), Business, Politics, Investigations. Tier 1: Central Bank of Nigeria / SARB releases, govt gazettes with feeds, AU press. Tier 2: state/provincial portals, JSE/NGX data. Wires: regional African wires added per newsroom.

**Latin America (Brazil / Mexico)** — *Folha / El Universal style.* Sections: Notícias (Nacional/Estados), Economia/Mercados, Política, Cultura. Tier 1: Banco Central do Brasil / Banxico, Diário Oficial, federal press. Tier 2: state portals, B3/BMV data. Wires: EFE + regional.

**Southeast Asia (Indonesia / Philippines)** — *Tempo / Rappler style.* Sections: News (National/Regional), Business, Politics, Investigations. Tier 1: Bank Indonesia / BSP, state gazettes, ministry releases. Tier 2: provincial portals, IDX/PSE data. Wires: Antara/PNA + regional.

**Europe (UK / Germany)** — *Guardian / SZ style.* Sections: News (UK/World), Business, Politics, Culture. Tier 1: Bank of England / Bundesbank, gov.uk feeds, EU/ECB press. Tier 2: regional portals, LSE/Deutsche Börse. Wires: Reuters/dpa.

**North America (US)** — sections: News (National/States/Local), Business/Markets, Politics. Tier 1: Federal Register, Fed, SEC EDGAR, court PACER feeds. Tier 2: state legislatures, exchange APIs.

**East Asia (Japan / Korea)** — Tier 1: BoJ / BoK, ministry releases, gazettes. Tier 2: prefectural portals, TSE/KRX. Wires: Kyodo/Yonhap.

**Middle East (UAE / others)** — Tier 1: central bank, govt media office, gazettes. Tier 2: bourse data (ADX/DFM), ministry portals. Wires: WAM + Anadolu.

---

## How this anchors the build

- **Sub-project B (admin panel)** implements Part 3's descriptor + Part 4's tiers: add a source, pick `ingest_type`, fill exactly the fields that type needs, classify the tier, map sections fed.
- **Sub-project C (connectors)** generalises `ingest_type=api|mcp` into pluggable adapters (newsroom tools + OSS fallbacks).
- **Sub-project G (roadmap)** sequences activation by tier.
- The IA (Part 1) + coverage-gap matrix (Part 1) become live admin objects, not one-off audits.
