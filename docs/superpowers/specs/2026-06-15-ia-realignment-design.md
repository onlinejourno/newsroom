# IA Realignment — flatten the platform to the original's spirit

**Status:** Design (direction confirmed 2026-06-15: "flatten to the original"). **Supersedes ADR 0058** (four-job IA) — a new ADR records this.

## Goal

The platform nav drifted into a "four-job" IA (`Plan · Produce · Check · Newsroom`, ADR 0058) with a confused `Plan` submenu (Signals/Potential/Trends/Calendar/Hidden gems). Realign it to the **original `discover-dashboard`** (the founder's north-star): the **Calendar as the spine** + the original's **7 intelligence tabs**. The Hindu is the default test case; each newsroom configures its own IA/content/connectors in Admin.

## Target navigation (flatten)

Top nav becomes the Calendar spine + the original's tabs + the raw inflow. Drop the four-job rooms.

| Nav item | What it shows | Current platform source | Status |
|---|---|---|---|
| **Calendar** (spine / home) | Promises ahead — the real planning tool (Gantt + feed + accountability) | `/calendar` (exists) | reframe as the home/spine |
| **Trending Topics** | Moving topics now (momentum) | `/trends` (exists) | rename "Trends"→"Trending Topics" |
| **Story Scores** | Published stories ranked by Discover potential → digital desk optimises to catch trends | `/potential` (exists) | reframe: "take up first" → "optimise published for trends" |
| **Story Analyser** | Per-URL SEO + E-E-A-T audit (full elaborate audit) | `scoring-py` engine (T1-T10 built) + `/scores` | new tab; absorbs the in-flight audit |
| **Topic → Domains** | How topics perform across domains (GDELT) | — | new |
| **Local Pulse** | State/city/regional trending (Indian context, configurable) | — | new |
| **Hidden Gems** | Already-published but buried stories with potential → optimise | `/gems` (exists) | reframe: buried *published*, not new inflow |
| **EIP Signals** | Subscription / editorial-intelligence signals | — (ADR 0042/0050/0053) | new |
| **Signals** | Raw public-record inflow (ingestion) | `/signals` (exists) | keep |

(`Produce`/`Newslist`, `Check`/`Probity`/`Compliance`, `Newsroom`/`Journalists` either fold into these or remain reachable — to be settled in the plan; the masthead's top level becomes the flat intelligence suite, not the four rooms.)

## Folded-in fixes (from founder feedback 2026-06-15)

1. **User Needs Model = the smartocto SIX** (founder, 2026-06-15) — adopt the original BBC/smartocto six needs as the **canonical** taxonomy, replacing the condensed four (Know/Understand/Feel/Do): **Update me · Keep me on trend · Give me perspective · Educate me · Divert me · Inspire me** (the 2.0 model's two extra needs — Help me, Connect me — are out). Ripples to handle in the plan: ADR 0049 (model definition), `NEED_SURFACE_WEIGHTS` 4→6 keys (weights **derived** from each sub-need's condensed parent per ADR 0049's table — Update me/Keep me on trend←Know, Give me perspective/Educate me←Understand, Divert me/Inspire me←Feel; keep the 4 as a back-compat rollup so existing classifications still weight), the Classify layer (assign one of the 6), the `--need` selector + audit, the need-mix audit (flag under-served growth needs Educate me / Inspire me), and the homepage gloss (✅ updated to the 6). Descriptive glosses for non-digital journalists throughout.
2. **Editorial attribution** ([[editorial-attribution-journalist]]) — "Commission → Newslist" and "Take it up / I'll write this" must attribute to the **journalist who takes the story**, never the admin. Fix `createLead`/commission actor + the UI (pick/show the reporter; answer "commission to whom?").
3. **PEJ framing prominence** — surface PEJ frame more prominently (homepage + per-story tags + Story Scores/Analyser), not buried.
4. **Calendar right-column prominence** — the "Promise & lead-time" right column needs more visual weight; the middle Gantt area reads sparse.
5. **Context for non-digital journalists** — every surface explains what / why / how (ground-up principle).
6. **The Hindu test case** — seed/verify content + IA against The Hindu; per-outlet IA/content/connectors configurable in Admin (don't hardcode The Hindu).

## How the in-flight audit fits

The `scoring-py` engine (T1-T10 done: models, seo_checks, channels+AIO+need-weighting, sqeg, recirculation, potential, cwv, radar, fetch) becomes the backend for **Story Analyser**. The remaining audit tasks (external fetchers, orchestrator, persistence, web render, wiring) are re-homed under the Story Analyser tab in the realigned IA.

## Decisions to settle in the plan

- Routing: Calendar at `/` (home) or `/calendar` with a redirect; per-tab role gating (who sees EIP Signals, Admin).
- Which existing pages (Newslist, Probity, Compliance, Journalists, Brief, Shortlist, Gaps) remain and where they live once the four rooms are gone.
- The new ADR number (≥0060) superseding ADR 0058; update the homepage "front door" (it currently mirrors the four-job IA) to the flat suite.
- Branch: continue on `slice/seo-eeat-audit` (holds the engine) or cut a fresh `slice/ia-realignment` that builds on it.

## Testing

`pnpm --filter @onlinejourno/web type-check` + the running app. Auth-gated routes (`/en/*`) can't be visually verified without credentials — flag those. Use the original (:8501) as the visual/structural reference for each tab.
