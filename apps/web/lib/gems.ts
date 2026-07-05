// Hidden Gems scoring — restored to the original discover-dashboard design:
// five explicit signals summing to /100, each shown with its own bar.
//   TREND   /40  alignment with a moving topic (our convergence momentum)
//   IMAGE   /20  Discover-card image (from the stored audit's image check)
//   DEPTH   /15  body depth (from the stored audit's depth check)
//   URGENCY /15  the at-risk Discover window — 12–24h scores highest
//   FRESH   /10  publish-age freshness bands
// Placement signals from the original (only-in-sub-section, on-homepage)
// need site-structure data the CMS adapter does not expose yet — they are
// named on the page, not faked.

import type { TopicTrend } from "@/lib/trends";

export type GemSignals = {
  trend: number;
  image: number;
  depth: number;
  urgency: number;
  fresh: number;
};

export type DeskAction = { label: string; reason: string };

export type Gem = {
  score: number;
  band: "HIGH" | "MEDIUM" | "LOW";
  signals: GemSignals;
  matchedTopic: string;
  momentum: number;
  ageHours: number | null;
  ageBucket: AgeBucket;
  missingImage: boolean;
  onHomepage: boolean;
  buried: boolean;
  listedIn: string[];
  placementChecked: boolean;
  actions: DeskAction[];
};

export type AgeBucket = "<6h" | "6-12h" | "12-24h" | "24-48h" | ">48h" | "unknown";

export const AGE_BUCKETS: AgeBucket[] = ["<6h", "6-12h", "12-24h", "24-48h", ">48h"];

type AuditCheck = { name: string; value: number; max: number; note: string };
type SurfaceAudit = { score: number; signals?: AuditCheck[] };

function check(
  scores: Record<string, SurfaceAudit>,
  surface: string,
  name: string,
): AuditCheck | null {
  return scores[surface]?.signals?.find((s) => s.name === name) ?? null;
}

export function ageBucketOf(ageHours: number | null): AgeBucket {
  if (ageHours == null) return "unknown";
  if (ageHours < 6) return "<6h";
  if (ageHours < 12) return "6-12h";
  if (ageHours < 24) return "12-24h";
  if (ageHours < 48) return "24-48h";
  return ">48h";
}

// 12–24h is the at-risk Discover window (original's core insight): the story
// is about to age out — promote NOW or lose the chance.
function urgencyScore(ageHours: number | null): number {
  if (ageHours == null) return 0;
  if (ageHours < 6) return 6;
  if (ageHours < 12) return 12;
  if (ageHours < 24) return 15;
  if (ageHours < 48) return 8;
  return 0;
}

function freshScore(ageHours: number | null): number {
  if (ageHours == null) return 5;
  if (ageHours < 6) return 10;
  if (ageHours < 12) return 8;
  if (ageHours < 24) return 6;
  if (ageHours < 48) return 3;
  return 0;
}

export function scoreGem(
  story: {
    headline: string | null;
    published_at: Date | null;
    scores: Record<string, SurfaceAudit>;
    placement?: {
      homepage?: boolean;
      listed_in?: string[];
      only_in_subsection?: boolean;
    } | null;
  },
  topics: TopicTrend[],
  now = new Date(),
): Gem {
  const headline = (story.headline ?? "").toLowerCase();
  let matched: TopicTrend | null = null;
  for (const t of topics) {
    if (t.topic.length < 3) continue;
    if (headline.includes(t.topic.toLowerCase())) {
      if (!matched || t.momentum > matched.momentum) matched = t;
    }
  }
  const trend = matched ? Math.round((matched.momentum / 100) * 40) : 0;

  const img = check(story.scores, "discover", "Large image");
  const image = img ? Math.round((img.value / img.max) * 20) : 0;
  const missingImage = img != null && img.value === 0;

  const dep = check(story.scores, "google_search", "Depth");
  const depth = dep ? Math.round((dep.value / dep.max) * 15) : 0;

  const ageHours = story.published_at
    ? (now.getTime() - new Date(story.published_at).getTime()) / 3_600_000
    : null;
  const urgency = urgencyScore(ageHours);
  const fresh = freshScore(ageHours);

  const score = trend + image + depth + urgency + fresh;
  const band: Gem["band"] = score >= 70 ? "HIGH" : score >= 40 ? "MEDIUM" : "LOW";

  const pl = story.placement ?? null;
  const onHomepage = pl?.homepage === true;
  const buried = pl?.only_in_subsection === true;
  const listedIn = pl?.listed_in ?? [];
  const placementChecked = pl != null;

  // The original's reasoned desk prompts — each action says WHY.
  const actions: DeskAction[] = [];
  if (score >= 70 && image >= 15 && !onHomepage)
    actions.push({
      label: "🏠 Homepage / app push",
      reason: "High score + image — strong candidate for homepage feature or app push notification",
    });
  if (matched)
    actions.push({
      label: "📱 Social post",
      reason: `Aligns with trending '${matched.topic}' — tweet, thread, or Reel opportunity`,
    });
  if (image >= 15 && ageHours != null && ageHours < 18)
    actions.push({
      label: "📡 Discover-ready",
      reason: "Image present + published < 18 h — eligible for Google Discover card",
    });
  if (buried)
    actions.push({
      label: "📰 Google News boost",
      reason: "Buried in sub-section — manually submit to Google News top-stories or share link with editors",
    });
  if (buried && score >= 55)
    actions.push({
      label: "📧 Newsletter / digest pick",
      reason: "Strong story buried in section — ideal for morning newsletter curation",
    });
  if (missingImage)
    actions.push({
      label: "🖼 Add ≥1200px image",
      reason: "No Discover-card image detected — the single biggest Discover lever",
    });

  return {
    score,
    band,
    signals: { trend, image, depth, urgency, fresh },
    matchedTopic: matched?.topic ?? "",
    momentum: matched ? Math.round(matched.momentum * 10) / 10 : 0,
    ageHours: ageHours == null ? null : Math.round(ageHours),
    ageBucket: ageBucketOf(ageHours),
    missingImage,
    onHomepage,
    buried,
    listedIn,
    placementChecked,
    actions,
  };
}

export const SIGNAL_META: { key: keyof GemSignals; label: string; max: number; color: string }[] = [
  { key: "trend", label: "TREND", max: 40, color: "#dc2626" },
  { key: "image", label: "IMAGE", max: 20, color: "#2563eb" },
  { key: "depth", label: "DEPTH", max: 15, color: "#92400e" },
  { key: "urgency", label: "URGENCY", max: 15, color: "#d97706" },
  { key: "fresh", label: "FRESH", max: 10, color: "#16a34a" },
];
