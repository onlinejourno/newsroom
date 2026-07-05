// Trend scoring — faithful TS port of packages/agents-py/.../trend_score.py
// (itself the discover-dashboard momentum/trajectory logic). Keep the two in
// sync; the Python module is the reference.

export type TopicTrend = {
  topic: string;
  momentum: number;
  trajectory: string;
  recent: number;
  prior: number;
};

export function slopeToScore(
  slope: number,
  current: number,
  peak: number,
): number {
  const base = Math.min(current, 100);
  const slopeBoost =
    slope > 0 ? Math.min(slope * 5, 30) : Math.max(slope * 3, -30);
  const peakRatio = peak > 0 ? current / peak : 1.0;
  const peakPenalty = peakRatio > 0.8 ? 0 : (1 - peakRatio) * 20;
  return Math.max(0, Math.min(100, base + slopeBoost - peakPenalty));
}

export function predictTrajectory(
  slope: number,
  current: number,
  peak: number,
): string {
  if (current <= 0) return "no signal yet";
  const peakRatio = peak > 0 ? current / peak : 1.0;
  if (slope > 2.0 && peakRatio < 0.75)
    return "still building — peak not yet reached";
  if (slope > 0.5 && peakRatio >= 0.75) return "near peak — may plateau";
  if (peakRatio >= 0.95 && Math.abs(slope) <= 0.5)
    return "at peak — watch for plateau";
  if (slope < -2.0) return "fading fast — post-peak";
  if (slope < -0.5) return "cooling — interest declining";
  return "momentum holding steady";
}

/** The prototype's editorial momentum label bands (discover-dashboard). */
export function momentumLabel(score: number): string {
  if (score >= 80) return "🔥 Breaking surge";
  if (score >= 65) return "↑ Rising fast";
  if (score >= 45) return "→ Building momentum";
  if (score >= 25) return "~ Holding steady";
  return "↓ Cooling";
}

export function topicMomentum(
  recentEntities: string[][],
  priorEntities: string[][],
): TopicTrend[] {
  const recent = new Map<string, number>();
  for (const ents of recentEntities) {
    for (const e of new Set(ents.filter(Boolean))) {
      recent.set(e, (recent.get(e) ?? 0) + 1);
    }
  }
  const prior = new Map<string, number>();
  for (const ents of priorEntities) {
    for (const e of new Set(ents.filter(Boolean))) {
      prior.set(e, (prior.get(e) ?? 0) + 1);
    }
  }
  const maxRecent = Math.max(1, ...recent.values());
  const out: TopicTrend[] = [];
  for (const [topic, r] of recent) {
    const p = prior.get(topic) ?? 0;
    const heat = (r / maxRecent) * 100;
    const priorHeat = (p / maxRecent) * 100;
    const slope = heat - priorHeat;
    const peak = Math.max(heat, priorHeat, 1.0);
    out.push({
      topic,
      momentum: Math.round(slopeToScore(slope, heat, peak) * 10) / 10,
      trajectory: predictTrajectory(slope, heat, peak),
      recent: r,
      prior: p,
    });
  }
  out.sort((a, b) => b.momentum - a.momentum);
  return out;
}
