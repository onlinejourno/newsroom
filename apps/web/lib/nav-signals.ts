// Living masthead (context-sensitive nav, step 1 — the moment axis). Pure logic:
// map per-stage live counts to a badge tone + pick the single stage that most
// needs attention now ("nowPath", which the masthead marks with a dot). Tone is
// the stage's *natural* urgency — emphasis is a separate dot, so a quiet day of
// "new signals" never masquerades as critical.

export type NavTone = "critical" | "warning" | "neutral";
export type StageSignal = { count: number; tone: NavTone };

export type NavCounts = {
  calendar: number; // at-risk deadlines (time-critical)
  brief: number; // open leads needing a decision
  signals: number; // new inflow (24h)
  newslist: number; // stories in flight
  potential: number; // recently published, to review
};

// Priority order for "what needs attention now" — first non-zero wins the dot.
const PRIORITY: (keyof NavCounts)[] = ["calendar", "brief", "signals", "newslist", "potential"];

const BASE_TONE: Record<keyof NavCounts, NavTone> = {
  calendar: "critical",
  brief: "warning",
  signals: "neutral",
  newslist: "neutral",
  potential: "neutral",
};

export function deriveNavSignals(counts: NavCounts): {
  byPath: Record<string, StageSignal>;
  nowPath: string | null;
} {
  const nowPath = PRIORITY.find((p) => counts[p] > 0) ?? null;
  const byPath: Record<string, StageSignal> = {};
  for (const p of PRIORITY) {
    if (counts[p] > 0) byPath[p] = { count: counts[p], tone: BASE_TONE[p] };
  }
  return { byPath, nowPath };
}

export type StageEmphasis = "focus" | "recede" | "normal";

/** Step 3 (focus + recede): the now-stage is "focus" (boxed); a stage with no
 *  live signal that you're not currently on "recede"s (dims); everything else is
 *  "normal". Order is never changed — only visual weight, so the plan→score
 *  reading sequence is preserved. */
export function stageEmphasis(args: {
  isNow: boolean;
  hasSignal: boolean;
  isActive: boolean;
}): StageEmphasis {
  if (args.isNow) return "focus";
  if (!args.hasSignal && !args.isActive) return "recede";
  return "normal";
}
