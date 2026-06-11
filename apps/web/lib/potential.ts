// Discover Potential — faithful port of discover-dashboard predict/scorer.py
// onto the platform's signal inflow. Composite of four weighted signals:
//   0.40 × trend momentum   (our convergence topics, not Google Trends)
//   0.30 × content alignment (matched topic in headline/entities — the
//                             original's TF-IDF + title guard becomes an
//                             entity match, which is word-precise by design)
//   0.20 × domain authority  (the source's share of coverage for the topic
//                             in the inflow; unknown = 50, as upstream)
//   0.10 × freshness         (age bands ported verbatim)

import type { TopicTrend } from "@/lib/trends";

export const WEIGHTS = {
  momentum: 0.4,
  alignment: 0.3,
  authority: 0.2,
  freshness: 0.1,
} as const;

export type PotentialScore = {
  potential: number;
  label: "HIGH" | "MEDIUM" | "LOW" | "VERY LOW";
  matchedTrend: string;
  momentum: number;
  alignment: number;
  authority: number;
  freshness: number;
};

export function freshnessScore(published: Date | null, now: Date): number {
  if (!published) return 50;
  const ageH = (now.getTime() - new Date(published).getTime()) / 3_600_000;
  if (ageH < 2) return 100;
  if (ageH < 6) return 90;
  if (ageH < 12) return 80;
  if (ageH < 24) return 70;
  if (ageH < 48) return 40;
  if (ageH < 72) return 20;
  return 10;
}

export function potentialLabel(score: number): PotentialScore["label"] {
  if (score >= 75) return "HIGH";
  if (score >= 55) return "MEDIUM";
  if (score >= 35) return "LOW";
  return "VERY LOW";
}

/** Title guard (ported): every content word (≥4 chars) of the trend term must
 * appear at a word boundary in the headline; short single terms must appear
 * exactly. Kills incidental-description false positives. */
export function titleGuard(headline: string, term: string): boolean {
  const title = headline.toLowerCase();
  const words = term
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (words.length > 0) {
    return words.every((w) => new RegExp(`\\b${esc(w)}\\b`).test(title));
  }
  return new RegExp(`\\b${esc(term.toLowerCase())}\\b`).test(title);
}

export function scorePotential(
  signal: {
    headline: string | null;
    entities: string[];
    published_at: Date | null;
    host: string | null;
  },
  topics: TopicTrend[],
  // topic -> host -> coverage count, for the authority share
  coverage: Map<string, Map<string, number>>,
  now = new Date(),
): PotentialScore {
  const headline = signal.headline ?? "";
  let matched: TopicTrend | null = null;
  let inHeadline = false;
  for (const t of topics) {
    const entityHit = signal.entities.includes(t.topic);
    const headlineHit = headline ? titleGuard(headline, t.topic) : false;
    if ((entityHit || headlineHit) && (!matched || t.momentum > matched.momentum)) {
      matched = t;
      inHeadline = headlineHit;
    }
  }

  const momentum = matched ? matched.momentum : 30;
  // Alignment grades how centrally the topic figures: in the headline (the
  // original's guarded match) vs only among extracted entities.
  const alignment = matched ? (inHeadline ? 100 : 60) : 0;

  let authority = 50;
  if (matched && signal.host) {
    const hosts = coverage.get(matched.topic);
    const total = hosts
      ? [...hosts.values()].reduce((a, b) => a + b, 0)
      : 0;
    if (hosts && total > 0) {
      authority = Math.round(((hosts.get(signal.host) ?? 0) / total) * 100);
    }
  }

  const freshness = freshnessScore(signal.published_at, now);
  const potential =
    WEIGHTS.momentum * momentum +
    WEIGHTS.alignment * alignment +
    WEIGHTS.authority * authority +
    WEIGHTS.freshness * freshness;

  return {
    potential: Math.round(potential * 10) / 10,
    label: potentialLabel(potential),
    matchedTrend: matched?.topic ?? "",
    momentum: Math.round(momentum * 10) / 10,
    alignment,
    authority,
    freshness,
  };
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].replace(/^www\./, "") : null;
}
