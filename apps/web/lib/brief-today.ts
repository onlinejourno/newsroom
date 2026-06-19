// Pure BRIEF·Today logic — story_leads rows → lead-cards, and newsroom-now stat
// shaping. No DB, no React; unit-tested. See docs/superpowers/specs/
// 2026-06-19-onlinejourno-brief-today-design.md.

export type LeadRow = {
  title: string;
  beat: string | null;
  importance: string; // low | normal | high | urgent
  status: string; // idea | pitched | assigned | filed | approved | published | killed
  trend_score: number | null;
  note: string | null;
  created_at: Date | string;
};

export type LeadSignal = { trend_reason: string | null; user_need: string | null } | null;
export type Severity = "high" | "med" | "low";
export type LeadAction = "compose" | "analyse" | "audit";

export type LeadCard = {
  ts: string;
  severity: Severity;
  beat: string;
  need: string | null;
  potential: boolean;
  headline: string;
  why: string;
  action: LeadAction;
  sources: number;
};

const SEVERITY: Record<string, Severity> = {
  urgent: "high",
  high: "high",
  normal: "med",
  low: "low",
};

const ACTION: Record<string, LeadAction> = {
  idea: "compose",
  pitched: "compose",
  assigned: "analyse",
  filed: "audit",
  approved: "audit",
  published: "audit",
  killed: "audit",
};

function istTime(v: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(v));
}

export function leadToCard(lead: LeadRow, signal: LeadSignal, sources: number): LeadCard {
  return {
    ts: istTime(lead.created_at),
    severity: SEVERITY[lead.importance] ?? "med",
    beat: lead.beat ?? "general",
    need: signal?.user_need ?? null,
    potential: lead.trend_score != null && lead.trend_score >= 60,
    headline: lead.title,
    why: lead.note ?? signal?.trend_reason ?? "",
    action: ACTION[lead.status] ?? "compose",
    sources: Math.max(1, sources),
  };
}

export type Tone = "neutral" | "good" | "info" | "warn" | "accent";
export type NowStat = { key: string; label: string; tone: Tone; n: number };
export type NowCounts = {
  signalsIn: number;
  leadsNeedingDecision: number;
  sourcesLive: number;
  publishedToday: number;
};

export function newsroomNow(c: NowCounts): NowStat[] {
  return [
    { key: "signalsIn", label: "Signals in · 24h", tone: "info", n: c.signalsIn },
    {
      key: "leads",
      label: "Leads need a decision",
      tone: c.leadsNeedingDecision > 0 ? "accent" : "neutral",
      n: c.leadsNeedingDecision,
    },
    { key: "sources", label: "Sources live", tone: "neutral", n: c.sourcesLive },
    { key: "published", label: "Published today", tone: "good", n: c.publishedToday },
  ];
}

export const TONE_COLOR: Record<Tone, string> = {
  neutral: "var(--color-fg-tertiary)",
  good: "var(--color-ioj-green-600)",
  info: "var(--color-brand)",
  warn: "var(--color-amber-600)",
  accent: "var(--color-urgent)",
};
