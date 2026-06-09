# OnlineJourno — Product North Star

**Status:** Adopted 2026-06-07, expanded 2026-06-07 after the EIP + the distribution engine consolidation. This is the binding product definition. It supersedes `MVP-SCOPE.md` (suspended) and the earlier markets-brief framing, and folds the former "Xtnd" tier into one product. See ADR 0041 + ADR 0042.

> **OnlineJourno** is editorial-intelligence **by a journalist, for journalists** — one integrated, vendor-neutral platform that finds the story for the reporter at the base of the newsroom, hands it to her with her own archive's depth behind it, and then gives every story she files a fair chance — pre-publish and after. It plugs into the newsroom's existing CMS; it never replaces it.

**In one line: it connects the newsroom's CMS to the outside world, and makes the two ends talk.** Inside: the reporter, the story, the editorial chain. Outside: the public record, the distribution surfaces, the audience. The platform is the bridge — discovery flows *in* (what to cover), stories flow *out* (a fair chance), and the truth of how they landed flows *back*.

It is not a CMS, not a dashboard bolted on the side, not branded to any one newsroom. It is the intelligence layer the newsroom never had, built to **invert the pyramid** — to give the reporter at the bottom the intelligence that today pools only at the top.

## The problem

A correspondent — in a district, a region, a beat that governance touches but scrutiny does not — files into a fog. Every day the public record (parliament, courts, gazettes, tenders, RTI, filings) publishes more than any newsroom monitors on her behalf. She has no systematic feed of what is happening on her patch, no thread to her own newsroom's archive, and after she files, no idea what happened to the story. She is not — and should not have to be — an authority on SEO, Discover, schema, or paywall conversion.

**Why shouldn't the platform give every reporter at the base what only the top can see today?** That is the product.

## The whole loop (what it does)

1. **Watches the public record** — courts, gazettes, parliament, tenders, RTI, filings, ministries, newswires — for what is happening today, on her patch.
2. **Connects each new signal to the newsroom's archive** — *plugged in* if the archive is digitised; otherwise **looked up from online sources** (the newsroom's own published web, the open record) — so she sees not just the gazette notification but the prior stories *her* newsroom ran on the same dispute, place, or person.
3. **Delivers a short editorial brief in the working language.** English first; **localizable per newsroom** so the platform serves the non-Anglo-Saxon world, not only English-language newsrooms.
4. **Sends a few ranked signals to her phone,** scoped to her beat and geography, with the archival context already attached — so she finds the story before anyone else.
5. **As she writes, gives the story a fair-chance cue** — is it built for each surface the newsroom optimizes for — Discover, Search, News, **AI Overviews + generative-AI search**, Subscription, Direct (a configurable, extensible registry, not a fixed set; ADR 0043) — and what to fix.
6. **After she files, closes the loop** — real performance (who read it, where it surfaced, what worked), surfaced to *her*, plain-English — the loop she has never had.

That is the system. The front (1–4) finds and contextualises; the back (5–6) gives it a fair chance and learns. Both halves already exist as working code (below).

## The inversion — irrigation by role

The old pyramid: content and data flow *up*; intelligence pools at the top (digital desk, SEO team, leadership). OnlineJourno feeds **each level the intelligence it works with**, and finally waters the base — the reporter is both **a source** (she got the court order) **and** irrigated (the system hands her the surrounding data + the fair-chance cue) at the moment of reporting.

| Role | Fed (the inversion) | Still feeds |
|------|---------------------|-------------|
| **Reporter** (base) | ranked signals on her beat/patch + archival context + the fair-chance cue, on her phone, as she works | files the story (it enters the system) |
| **Bureau chief** | the bureau's coverage + gaps | curates the bureau |
| **Editor / desk** | news-space foresight — trending, what's coming into play today, hidden gems to promote, channel performance | decides placement / promotion |
| **Leadership** | fair-chance audit, framing balance, subscription health, probity | sets direction |

The success test: *did the person at the bottom of the pyramid get what the top has?*

## Two engines already built — the two halves

OnlineJourno is the **consolidation** of work already done, generalised from the newsroom to any newsroom.

**Front engine — EIP** (`editorial-intelligence-demo`): the five pillars.
| Pillar | What it does |
|--------|--------------|
| **Collect** | 189 source adapters across 8 families (courts, gazettes, RTI, tenders, RERA, ministries, embassies, newswires); Cloudflare-aware fetch; config- + catalogue-driven |
| **Analyse** | Claude enrichment — entities, geo (district/region on every signal), IPTC taxonomy, editorial brief |
| **Classify** | beat taxonomy + IPTC + geography on every signal |
| **Score** | trend_score (convergence × recency × source-weight) |
| **Alert** | ranked signals pushed to the reporter's phone (PWA), beat + geo scoped |
| **Archive** | pluggable: digitised-archive connector, or online-source archival lookup |

**Back engine — the distribution engine** (`discover-dashboard`): distribution intelligence.
- Channel audit across a **configurable surface registry** — Discover / News / Search, **AI Overviews + generative-AI search**, + custom (add/delete per newsroom; ADR 0043) — with E-E-A-T, schema, image, freshness, citation-worthiness signals + fixes.
- GSC channel performance (per-site → per-tenant), post-publish "how it landed."
- Hidden Gems — under-promoted stories + desk action-chips.
- Subscription conversion (per-desk SCI, funnel, cancellations).
- **Probity** — "handle with care" on sensitive stories (accuracy over promotion); first-party, reader-rights stance.

**Spine** — `platform`: multi-tenant Postgres, provider-agnostic agent runtime, module plugin system, `apps/web`, the design system, m-framing-pej (PEJ framing + goldset eval). The spine generalises both engines from one newsroom to any newsroom.

## Sources — a first-class layer

The product lives on two source layers, and the reporter sits inside both:
- **Content sources** — the public record (the 8 EIP families) **and the reporters themselves** (the primary source — they create the content).
- **Data sources** — Search (GSC), trends, keywords, analytics, subscription/conversion, social.

The loop: take the **data sources** (distribution truth, trapped at the top) and feed them **down** to the **content sources** (the reporters), so the base is empowered and the content gets a fair chance.

## Principles

1. **By a journalist, for journalists.** Newsroom-native; the reporter is the expert, the platform is the tool.
2. **Vendor-neutral.** The product is **OnlineJourno** — never branded to a tenant ("the distribution engine", a masthead). Any newsroom, any country.
3. **English-first, localizable.** Built and operated in English; output language configurable per newsroom to serve the non-Anglo-Saxon world.
4. **Pluggable archive.** Connect a digitised archive where it exists; otherwise derive archival value from online sources. No newsroom is excluded for lacking a digitised archive.
5. **Companion to the CMS, never a replacement.** Reads draft + published state; the CMS stays the publish surface.
6. **Invert the pyramid / reporter-first / information symmetry.** Every capability passes the test: does the reporter at the base benefit? The reporter sees the same intelligence as the desk.
7. **Decision-support, not decision-making.** Surfaces signals; the human decides. No autopilot.
8. **Privacy + probity.** First-party analytics, no third-party trackers by design, consent honesty, AI-use disclosure, "handle with care" on sensitive stories. The platform measures newsrooms against reader rights (web-bloat-checker) and holds itself to the same bar.
9. **Editorial judgement stays human. AI never invents a source. Source attribution always.**
10. **Give every story a fair chance.** The watch-word and the success test.

## Consolidation map — the founder's codebases are the product

| Codebase / project | Becomes | Role |
|--------------------|---------|------|
| **EIP** (editorial-intelligence-demo) | the **front engine** — Collect→Analyse→Classify→Score→Alert + archive + reporter PWA | trunk (proposed) |
| **the distribution engine** (discover-dashboard) | the **back engine** — distribution-fit, GSC, gems, subscription, probity | folds in |
| **platform** (this session) | the **spine** — multi-tenant, agent runtime, modules, web, m-framing-pej eval | folds in |
| **news-intel** | collectors + framing coder | feeds Collect / m-framing-pej |
| **framing-india-2026** | m-framing-pej + goldset | strategic framing (built) |
| **web-bloat-checker** | m-probity + Discover-speed signal | the conscience layer |
| **subscriptions** | subscription-fit + conversion | back engine |
| **Predictive Editorial Calendar** | editorial calendar + design system | strategic planning + visual identity |
| **a digitised archive backend** | `m-archive` (connector) | one archive backend among many |

## Build sequence (redrawn)

1. **Decide the trunk** — EIP proposed as the base (most complete; carries reporter-at-base + archive + the PWA + the 189-adapter Collect). the distribution engine folds in as the distribution half; the platform spine contributes multi-tenant + agent runtime + framing eval where stronger.
2. **Generalise off the newsroom** — `m-archive` (connector | online lookup), localization (English-first + per-tenant locale), vendor-neutral branding, per-tenant source catalogues.
3. **Wire the loop end to end for one design partner** — Collect→Alert (front) into the reporter's hands, then distribution-fit + post-publish (back) on what she files.
4. **Validate with a real correspondent** — the success test: does the person at the base get, on her phone, a useful signal with archive context and a fair-chance cue?

## Success test

A working correspondent, on her own patch, gets on her phone a signal from today's public record — with her newsroom's prior coverage attached (plugged or looked up), in her language — finds the story first, writes it seeing whether it's built for Discover / Search / Subscription / Direct, files early, and the next morning sees how it landed. When that is true and she'd rather not work without it, OnlineJourno is real.
