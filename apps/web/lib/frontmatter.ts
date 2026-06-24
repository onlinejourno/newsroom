// Frontmatter v1 — the merit↔reach gap (spec: docs/superpowers/specs/
// 2026-06-23-frontmatter-design.md; mission: docs/MISSION.md — "merit should travel").
//
// MERIT = substance (Depth) + authority (E-E-A-T), DELIBERATELY excluding surface-fit
// so the gap means something. REACH = surface-readiness + placement. gap = merit −
// reach; a high positive gap = deserving work that isn't travelling. Pure +
// explainable (ground-up): every why carries its fix.
//
// depth/eeat are the audit's own sub-signals (distribution_fit_scores.signals),
// normalised to 0-100 from value/max — NOT raw word counts.

export type StorySignals = {
  depth: number | null; // 0-100 substance (audit "Depth" sub-signal)
  eeat: number | null; // 0-100 authority (audit "E-E-A-T" sub-signal)
  surfaceReadiness: number; // 0-100 mean surface composite (Discover/News/Search/…)
  onHomepage: boolean;
  listedCount: number; // how many sections/surfaces it's listed in
};

export type Assessment = {
  merit: number;
  meritParts: { depth: number | null; authority: number | null };
  reach: number;
  reachParts: { readiness: number; placement: number };
  gap: number; // merit − reach; positive = deserving but under-reaching
  whies: string[]; // why it isn't travelling
  fixes: string[]; // what to do about it
};

const clamp = (n: number) => Math.max(0, Math.min(100, n));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export function assess(s: StorySignals): Assessment {
  // ── merit: substance + authority (not surface-fit) ──
  const depth = s.depth == null ? null : clamp(s.depth);
  const authority = s.eeat == null ? null : clamp(s.eeat);
  const present = [depth, authority].filter((x): x is number => x != null);
  const merit = Math.round(avg(present));

  // ── reach: surface-readiness (0.7) + placement (0.3) ──
  const readiness = clamp(s.surfaceReadiness);
  const placement = s.onHomepage ? 100 : s.listedCount > 0 ? 50 : 15;
  const reach = Math.round(readiness * 0.7 + placement * 0.3);

  const gap = merit - reach;

  // ── diagnose: why deserving work isn't travelling + the fix (ground-up) ──
  const whies: string[] = [];
  const fixes: string[] = [];
  if (readiness < 60) {
    whies.push("Built for the page, not the surface — weak surface-readiness.");
    fixes.push("Fix the headline, schema and metadata (the audit's top fixes / Compositor).");
  }
  if (!s.onHomepage) {
    whies.push("Buried — not on the homepage.");
    fixes.push("Champion it to the front, or make it a section lead.");
  }

  return {
    merit,
    meritParts: {
      depth: depth == null ? null : Math.round(depth),
      authority: authority == null ? null : Math.round(authority),
    },
    reach,
    reachParts: { readiness: Math.round(readiness), placement },
    gap,
    whies,
    fixes,
  };
}

// ── Adapter: the audit row (storiesWithScores) → the signals assess() needs ──
// Structurally typed so this module stays dependency-light. Sub-signals are
// normalised value/max → 0-100; null when the named signal is absent (assess
// handles it). surfaceReadiness = mean of the surface composites.
type ScoreEntry = {
  score: number;
  signals?: { name: string; value: number; max: number }[] | null;
};
export type StoryLike = {
  scores: Record<string, ScoreEntry>;
  placement: { homepage?: boolean; listed_in?: string[] } | null;
};

function normSignal(scores: Record<string, ScoreEntry>, re: RegExp): number | null {
  for (const entry of Object.values(scores)) {
    for (const sig of entry.signals ?? []) {
      if (re.test(sig.name)) return sig.max > 0 ? clamp((sig.value / sig.max) * 100) : null;
    }
  }
  return null;
}

export function signalsFromStory(st: StoryLike): StorySignals {
  const composites = Object.values(st.scores).map((e) => e.score);
  return {
    depth: normSignal(st.scores, /depth|word|length/i),
    eeat: normSignal(st.scores, /e-?e-?a-?t|expert|authorit|trust/i),
    surfaceReadiness: composites.length
      ? composites.reduce((a, b) => a + b, 0) / composites.length
      : 0,
    onHomepage: st.placement?.homepage ?? false,
    listedCount: st.placement?.listed_in?.length ?? 0,
  };
}
