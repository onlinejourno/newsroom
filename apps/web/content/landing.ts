/**
 * Platform landing copy — the one place to edit the marketing words on
 * app/[locale]/page.tsx. Edit here, then redeploy. No external CMS, so it stays
 * self-host-safe (every newsroom running OnlineJourno can edit its own copy).
 *
 * Live data (the "newsroom right now" stats) and the lifecycle/surfaces cards
 * (from lib/nav) are NOT here — they are generated, not copy.
 */
export const LANDING = {
  hero: {
    eyebrow: "OnlineJourno · Masthead",
    // Rendered on two lines (a <br/> between the parts).
    titleLines: ["Give every story", "a fair chance."],
    dek: "One place where everyone in the newsroom — rookie to editor — sees what is going on and what needs to be done: the original sources in, the story’s fair chance out. About journalism, by journalists, for journalists. Open source.",
  },

  snapshot: {
    // {h} is replaced with the snapshot window in hours.
    heading: "The newsroom right now · last {h}h of published output",
    signedInAs: "Signed in as",
    stats: {
      total: "published",
      grade: "made the grade",
      trending: "riding a trend",
      tweak: "need tweaking",
      intervene: "need intervention",
    },
    empty: "No published stories in the last {h}h yet — connect your newsroom’s CMS or a content source and run the pipeline to populate published output.",
    trend7dLabel: "Published · last 7 days",
    goToRoom: "Go to my room →",
    signOut: "Sign out",
  },

  loggedOut: {
    prompt: "See a newsroom’s situation at a glance — what’s live, what’s moving, what needs work. Explore it on demo data now, or sign in.",
    demoCta: "See the demo →",
    cta: "Sign in / Join →",
  },

  scholarship: {
    eyebrow: "Grounded in journalism scholarship",
    heading: "Not vibes — three tested lenses, built in.",
    intro:
      "Every score and tag on this platform traces back to established journalism scholarship. Here is what each one means and why it grounds the work.",
    lenses: [
      {
        k: "PEJ framing",
        s: "Project for Excellence in Journalism",
        d: "Every story is coded for its dominant narrative frame — combative, explanatory, straight, policy. A desk sees its own framing balance, not just one story at a time.",
      },
      {
        k: "Deuze typology",
        s: "Mark Deuze · First Monday, 2001",
        d: "What kind of journalism a source or newsroom practises. It types the record flowing in and anchors how the platform reasons about craft.",
      },
      {
        k: "User Needs",
        s: "BBC / smartocto · four drivers",
        d: "Why a reader comes to a story — the four user-need drivers (ADR 0049): Know (the facts, fast) · Understand (the why, the angles, the background) · Feel (human, surprising, moving) · Do (useful, actionable, service). Every signal is classified by need, and coverage is audited for balance — so the desk sees if it over-produces 'Know' (update) and under-serves the growth needs, Understand, Feel and Do. Extensible per newsroom to the fuller smartocto taxonomy (eight needs under the four drivers).",
      },
      {
        k: "SEJ Periodic Table",
        s: "Search Engine Journal · SEO elements",
        d: "The periodic table of SEO success factors — content, architecture, HTML, links, trust. The SEO + E-E-A-T audit scores every story against these elements, turning ranking factors into concrete fixes.",
      },
      {
        k: "Search Quality Guidelines",
        s: "Google Search Quality Evaluator Guidelines",
        d: "How Google's human raters judge pages — YMYL sensitivity, Page Quality, Needs Met, and E-E-A-T. The audit classifies each story by these and flags the lowest-quality risk signals.",
      },
    ],
    loop: "Sources → Analyse → Classify → Route → Alert → Publish → Audit",
    licence: "Apache 2.0 — run it in your newsroom",
  },
} as const;
