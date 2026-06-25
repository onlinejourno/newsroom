/**
 * Positioning evidence — the empirical basis for the "merit pays" thesis behind
 * the OnlineJourno business-positioning dashboard.
 *
 * DATA ONLY (no UI): the dashboard surface owns rendering. Plain copy + public
 * citations, no external CMS — self-host-safe, like landing.ts.
 *
 * The thesis: commodity news is collapsing toward zero capturable value
 * (infinite ML supply + answer-engine disintermediation); the defensible ground
 * is the non-commodity axis — MERIT (properties internal to the text) and
 * SUBJECT (who the story renders visible, incl. the unaddressable). "Merit
 * should travel." This file assembles what is — and is NOT — proven about
 * whether privileging merit is also good business, not only good ethics.
 *
 * Evidence live-searched 2026-06-25. Figures power an argument: verify each
 * against its primary PDF/source before any external publication.
 */

export type EvidenceStatus =
  | "external-support" // real third-party evidence supports this link
  | "needs-build" // testable on our stack only after new collection
  | "needs-partner"; // needs a design partner's private analytics

export type ClaimLink = {
  id: string;
  claim: string;
  status: EvidenceStatus;
  note: string;
};

export type Evidence = {
  area: string;
  stat: string;
  detail: string;
  source: string;
  url: string;
  supports: string; // which claim link id(s) this speaks to
  contested?: string; // honest note where the figure is disputed
};

export const POSITIONING_EVIDENCE = {
  thesis:
    "When the commodity layer goes to zero, the durable asset is the work a machine can't make. Privileging merit is a business choice, not only an ethical one — and the choice is arguable with data, not inevitable.",

  // The claim decomposed. The positioning needs ONE intact sub-path, not all five.
  claimChain: [
    {
      id: "validity",
      claim: "Our measured merit tracks merit a human would recognise.",
      status: "needs-build",
      note: "No human merit label exists yet; news-intel goldset labels frame/topic only. Needs a ~150-story label pass against the SQEG/frontmatter score.",
    },
    {
      id: "durable-reach",
      claim: "Merit stories decay slower than commodity (longer half-life), vs. spike-and-die.",
      status: "needs-build",
      note: "Not testable on current data — no per-story outcome variable was ever recorded. Needs a per-URL visibility collector going forward.",
    },
    {
      id: "loyalty",
      claim: "Depth/quality drives return visits, habit, and lower churn.",
      status: "external-support",
      note: "Chartbeat (engaged time → return frequency) and Medill (habit → retention) support this at adjacent proxies. Our own merit metric not yet joined to loyalty data.",
    },
    {
      id: "revenue",
      claim: "Loyalty converts — subscription, membership, authority.",
      status: "external-support",
      note: "Medill Subscriber Engagement Index ties habit to retention; Reuters DNR ties deep reporting to willingness to pay. Proving it for OUR score needs a partner's subscription data.",
    },
    {
      id: "resilience",
      claim: "When AI Overviews eat the commodity layer, merit/original pages retain value; commodity-heavy ones don't.",
      status: "needs-build",
      note: "The most strategically central link, and the natural experiment is LIVE now (AIO rollout). But measuring it needs the per-URL collector — and the pre/post baseline is perishable.",
    },
  ] as ClaimLink[],

  // Real, current, third-party evidence. The GENERAL thesis has support; the
  // SPECIFIC claim (our score predicts these outcomes) is the unbuilt part.
  externalEvidence: [
    {
      area: "Commodity collapse — answer-engine disintermediation",
      stat: "8% vs 15% click-through (~47% relative drop); 1% click a cited source",
      detail:
        "Pew tracked 900 US adults' real searches (March 2025). With an AI Overview present, users clicked a result 8% of the time vs 15% without; only 1% of visits clicked a link inside the summary; browsing abandonment rose to 26% (vs 16%). AI Overviews appeared in ~18% of searches.",
      source: "Pew Research Center, via Search Engine Land",
      url: "https://searchengineland.com/google-ai-overviews-hurting-clicks-study-459434",
      supports: "resilience",
      contested:
        'Google disputes it: "flawed methodology and skewed queryset … not representative of Search traffic." Carry the dispute — the terrain is contested.',
    },
    {
      area: "Commodity is hit hardest (the nuance that IS the thesis)",
      stat: "Commodity Q&A −49%; news −7% vs non-news −14%",
      detail:
        "Chegg reported −49% non-subscriber traffic (Jan 2024→Jan 2025) as AI Overviews answered the commodity homework queries that used to drive it. Digital Content Next (~40 premium publishers): median Google referral −10%, with news brands −7% vs non-news −14%. The disintermediation concentrates on answer-shaped, fungible content.",
      source: "Chegg / Digital Content Next, via Search Engine Journal",
      url: "https://www.searchenginejournal.com/impact-of-ai-overviews-how-publishers-need-to-adapt/556843/",
      supports: "resilience",
    },
    {
      area: "Zero-click is the new default",
      stat: "Zero-click searches 56% → 69% (May 2024 → May 2025)",
      detail:
        "Similarweb data shows zero-click search rising from 56% to 69% year-on-year — distribution the publisher used to own, now retained by the platform.",
      source: "Similarweb, via The Digital Bloom",
      url: "https://thedigitalbloom.com/learn/2025-organic-traffic-crisis-analysis-report/",
      supports: "resilience",
    },
    {
      area: "Loyalty → revenue (the most direct support for 'merit pays')",
      stat: "High engaged-time readers return more and convert best; loyal = 29% of not-yet-subscriber pageviews",
      detail:
        "Chartbeat: pages with high Engaged Time are read by the most loyal audience and are the best candidates for subscription prompts; frequency of return, not raw pageviews, predicts value. Loyal visitors (return at least every other day) are 29% of pageviews from non-subscribers — the conversion pool.",
      source: "Chartbeat",
      url: "https://chartbeat.com/resources/research/using-engaged-time-to-understand-your-audience/",
      supports: "loyalty",
    },
    {
      area: "Habit → retention (13TB of real subscriber behaviour)",
      stat: "Clear correlation between regular habit and subscriber retention",
      detail:
        "Medill Subscriber Engagement Index analysed 13TB from the Chicago Tribune, SF Chronicle and Indianapolis Star: habit (frequency of visit) is the strongest behavioural predictor of retention. Poynter/Medill: frequent readers are far more valuable than occasional ones.",
      source: "Medill Local News Initiative, Northwestern",
      url: "https://localnewsinitiative.northwestern.edu/posts/2022/11/21/subscriptions-increasing/",
      supports: "revenue",
    },
    {
      area: "Depth → willingness to pay",
      stat: "73% say podcasts help them understand issues more deeply; those audiences more open to paying",
      detail:
        "Reuters DNR 2025: 73% of podcast listeners say the format helps them understand issues more deeply than other media, and those audiences are more open to paying for high-quality, deeply reported information. The report also flags renewed appeal of investigative journalism amid eroding trust.",
      source: "Reuters Institute Digital News Report 2025",
      url: "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025",
      supports: "revenue",
    },
    {
      area: "The hard backdrop (don't oversell)",
      stat: "Trust flat at 40%; paying for online news flat at 18%",
      detail:
        "Reuters DNR 2025: trust in news is flat at 40% (third year); paying for any online news is stuck at 18% across 20 richer countries (US 20%, Norway 42%); publishers are struggling to grow digital subscriptions while audiences shift to social/video creators. Merit must CONVERT against this headwind — the thesis isn't a free lunch.",
      source: "Reuters Institute Digital News Report 2025",
      url: "https://reutersinstitute.politics.ox.ac.uk/digital-news-report/2025/dnr-executive-summary",
      supports: "revenue",
    },
  ] as Evidence[],

  // Our own instrument — the proprietary signal, shipped and demonstrable today.
  internalMetric: {
    name: "merit_gap",
    formula: "reach − merit",
    definition:
      "Per story, reach = distribution readiness (trend/alignment/authority/freshness); merit = text-internal quality (named journalist over wire, named sources, citations). Positive gap = travelling further than it deserves (the commodity tax). Negative gap = deserving but under-reaching (champion it).",
    status:
      "LIVE in the scoring engine (potential.py / audit.py). The forward-facing Potential score now privileges merit at _W_MERIT (default 0.35) — the positioning expressed as a number a competitor can't copy without firing their own customer.",
  },

  // Intellectual honesty — what is and isn't settled. The anti-romantic fork.
  honesty: {
    proven:
      "The GENERAL thesis is not romantic: commodity/answer content is being disintermediated now and hit hardest (Pew, Chegg, Similarweb, DCN); depth/engagement/habit drive loyalty and retention (Chartbeat, Medill); deep reporting correlates with willingness to pay (Reuters).",
    notProven:
      "That OUR specific merit score predicts durable value. External research uses adjacent proxies (engaged time, frequency, habit), not our metric — and our own corpus can't test it: articles lack byline/source fields (no merit) and have no per-story outcome (no reach/durability ever recorded).",
    bindingConstraint:
      "Outcome data at story grain. We can compute merit on demand; we cannot compute reach we never observed. The build: re-fetch stored article URLs through the real extractor (for merit) + stand up a per-URL visibility collector (for the outcome, and to catch the perishable AIO pre/post baseline).",
    killCriterion:
      "If, controlling for domain and topic, our merit adds no durable-visibility or loyalty lift over reach-matched commodity, then 'merit pays' is false as a BUSINESS claim. The honest retreat is then mission-cost positioning (foundation/membership/patronage — PARI's model), not profit-maximising. Decide this before running, or motivated reasoning decides it for us.",
  },

  meta: {
    liveSearchedOn: "2026-06-25",
    note: "Secondary sources cited where used; swap to primary PDFs (Pew, Reuters DNR, Medill) as the citation of record before publishing externally.",
  },
} as const;
