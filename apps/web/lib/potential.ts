// Discover Potential — faithful port of discover-dashboard predict/scorer.py
// onto the platform's signal inflow. Composite of four weighted signals:
//   0.40 × trend momentum        (our convergence topics, not Google Trends)
//   0.30 × trend fit (your market) — alignment with the matched topic, then
//                                 down-weighted by marketRelevance when the
//                                 trend is clearly foreign to the outlet's geo
//   0.20 × topic ownership        (the source's share of coverage for the topic
//                                 in the inflow; unknown = 50, as upstream;
//                                 NOTE: competitor-relative authority vs local
//                                 domain peers arrives in Slice 4 with
//                                 Topic→Domains — authority value unchanged)
//   0.10 × freshness              (age bands ported verbatim)

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
  /** Trend fit (your market): base alignment down-weighted by marketRelevance. */
  alignment: number;
  /** Topic ownership (your coverage share): source's share of inflow for topic. */
  authority: number;
  freshness: number;
  /** True when the matched trend / item is clearly foreign to outletRegion. */
  foreign: boolean;
  /** The geo relevance factor applied to alignment: 1.0 (local/unknown) or 0.4 (foreign). */
  marketFactor: number;
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

/**
 * Determine whether a matched trend / signal item is within the outlet's
 * market. Geo is derived from `item.region` (a 2-letter ISO country code or
 * similar short tag attached to the item by the ingest pipeline).
 *
 * Rules:
 *  - geo unknown (null / empty) → local, factor 1.0 (don't penalise unknown)
 *  - geo matches outletRegion (case-insensitive) → local, factor 1.0
 *  - geo present and different from outletRegion → foreign, factor 0.4
 */
export function marketRelevance(
  item: { region?: string | null },
  outletRegion: string,
): { local: boolean; factor: number } {
  const geo = item.region?.trim().toUpperCase();
  if (!geo) return { local: true, factor: 1.0 };
  const outlet = outletRegion.trim().toUpperCase();
  if (geo === outlet) return { local: true, factor: 1.0 };
  return { local: false, factor: 0.4 };
}

export function scorePotential(
  item: {
    headline: string | null;
    entities: string[];
    published_at: Date | null;
    host: string | null;
    /** ISO 2-letter country/region code for the item's geo; null = unknown. */
    region?: string | null;
  },
  topics: TopicTrend[],
  // topic -> host -> coverage count, for the authority share
  coverage: Map<string, Map<string, number>>,
  now = new Date(),
  /** ISO 2-letter region code for the outlet (e.g. "IN"). Defaults to unknown
   *  → no market penalty (safe for callers that haven't migrated yet). */
  outletRegion = "",
): PotentialScore {
  const headline = item.headline ?? "";
  let matched: TopicTrend | null = null;
  let inHeadline = false;
  for (const t of topics) {
    const entityHit = item.entities.includes(t.topic);
    const headlineHit = headline ? titleGuard(headline, t.topic) : false;
    if ((entityHit || headlineHit) && (!matched || t.momentum > matched.momentum)) {
      matched = t;
      inHeadline = headlineHit;
    }
  }

  const momentum = matched ? matched.momentum : 30;

  // Trend fit (your market): base alignment is 100 (headline match) or 60
  // (entity-only), then multiplied by the market relevance factor so that
  // clearly foreign trends are down-weighted (e.g. 100 → 40 for factor 0.4).
  const baseAlignment = matched ? (inHeadline ? 100 : 60) : 0;
  const { local, factor } = matched
    ? marketRelevance(item, outletRegion)
    : { local: true, factor: 1.0 }; // no match → no penalty needed
  const alignment = Math.round(baseAlignment * factor);

  // Topic ownership (your coverage share). Competitor-relative authority vs
  // local domain peers arrives in Slice 4 with Topic→Domains; value unchanged.
  let authority = 50;
  if (matched && item.host) {
    const hosts = coverage.get(matched.topic);
    const total = hosts
      ? [...hosts.values()].reduce((a, b) => a + b, 0)
      : 0;
    if (hosts && total > 0) {
      authority = Math.round(((hosts.get(item.host) ?? 0) / total) * 100);
    }
  }

  const freshness = freshnessScore(item.published_at, now);
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
    foreign: !local,
    marketFactor: factor,
  };
}

export function hostOf(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].replace(/^www\./, "") : null;
}
