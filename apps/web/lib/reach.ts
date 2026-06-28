// Reach / prominence — TS mirror of the canonical reach contract.
// Python reference: packages/agents-py/src/onlinejourno_agents/reach.py
// Both sides are pinned by packages/agents-py/tests/golden/reach.golden.json
// (see reach.test.ts). Keep this file in lockstep with the Python engine.
//
// ONE reach measure for "how far has this travelled?", consumed by Frontmatter
// (own stories) and Pulse (the ecosystem). Reach SOURCE may differ per product;
// the engine + shape are shared so reach is never forked.

export type Basis = "observed" | "predicted" | "proxy" | "unavailable";

const BASIS_WEIGHT: Record<Basis, number> = {
  observed: 1.0, // real rank/count from the surface
  predicted: 0.6, // sampled + perishable (AI Overviews, SERP position)
  proxy: 0.4, // open correlate (GDELT, Trends, Bluesky, Wikipedia)
  unavailable: 0.0, // dark (closed/WhatsApp) — recorded, never scored
};

export type Surface =
  | "search" | "news" | "discover" | "ai_overview" | "ai_assistant"
  | "trends" | "social" | "video" | "wiki" | "referral"
  | "readiness" | "placement"; // own-desk surfaces (Frontmatter)

export type SurfaceSignal = {
  surface: Surface;
  value: number; // 0..100
  basis: Basis;
  weight?: number; // default 1
  note?: string;
};

export type ReachScore = {
  reach: number; // 0..100
  confidence: number; // 0..1
  basisSummary: Basis;
  surfaces: SurfaceSignal[];
  note?: string;
};

// Deterministic, basis-aware composite — MUST match reach.py::compute_reach.
export function computeReach(signals: SurfaceSignal[]): ReachScore {
  const norm = signals.map((s) => ({ ...s, weight: s.weight ?? 1 }));
  const scorable = norm.filter((s) => BASIS_WEIGHT[s.basis] > 0 && (s.weight ?? 1) > 0);
  if (scorable.length === 0) {
    return { reach: 0, confidence: 0, basisSummary: "unavailable", surfaces: norm, note: "no scorable reach signals" };
  }
  const num = scorable.reduce((a, s) => a + s.value * s.weight! * BASIS_WEIGHT[s.basis], 0);
  const den = scorable.reduce((a, s) => a + s.weight! * BASIS_WEIGHT[s.basis], 0);
  const reach = num / den;
  const totalW = norm.filter((s) => (s.weight ?? 1) > 0).reduce((a, s) => a + s.weight!, 0) || 1;
  const confidence = scorable.reduce((a, s) => a + s.weight! * BASIS_WEIGHT[s.basis], 0) / totalW;
  const order: Basis[] = ["observed", "predicted", "proxy"];
  const present = order.filter((b) => scorable.some((s) => s.basis === b));
  const basisSummary: Basis = present.length ? present[present.length - 1] : "unavailable";
  return { reach, confidence, basisSummary, surfaces: norm };
}
