// The story-lifecycle information architecture (redesign Phase A, supersedes the
// flat nav of ADR 0060). The masthead is the lifecycle: PLAN → BRIEF → IN →
// FRAME → DRAFT → SCORE. Each stage is a verb (kicker) + a noun (label) + the
// route it lands on. Route paths are unchanged from ADR 0060 — only grouping,
// labels and order change. ONE source so masthead, front-door and breadcrumbs
// never disagree.
export type Stage = {
  verb: string;       // PLAN, BRIEF, IN, FRAME, DRAFT, SCORE
  label: string;      // Calendar, Today, Sources, Analyse, Compose, Audit
  path: string;       // unchanged route
  blurb: string;
  minRole?: "reporter" | "desk" | "editor" | "admin"; // lowest role that sees it (default: all)
};

// The six lifecycle stages, in working order.
export const LIFECYCLE: Stage[] = [
  { verb: "Plan",  label: "Calendar",  path: "calendar",       blurb: "Promises ahead — the planning spine" },
  { verb: "Brief", label: "Today",     path: "brief",          blurb: "The day's brief — your inflow, scoped to you" },
  { verb: "In",    label: "Sources",   path: "signals",        blurb: "The public record flowing in" },
  { verb: "Frame", label: "Analyse",   path: "trends",         blurb: "What's moving + the framing landscape — where you stand" },
  { verb: "Draft", label: "Compose",   path: "newslist",       blurb: "Stories in flight — draft & commission", minRole: "reporter" },
  { verb: "Score", label: "Audit",     path: "potential",      blurb: "Fair-chance — distribution-fit + probity", minRole: "desk" },
];

// Secondary destinations reachable from their stage (kept off the top bar to
// avoid the old overload). Grouped by the stage they belong to.
export const WORKFLOW_EXTRA: Stage[] = [
  { verb: "Frame", label: "Topic → Domains", path: "topic-domains", blurb: "Which domains own a topic" },
  { verb: "Frame", label: "Local Pulse",     path: "local-pulse",   blurb: "Trending by state & city" },
  { verb: "Score", label: "Surface Scores",  path: "scores",        blurb: "Per-surface channel audit" },
  { verb: "Score", label: "Hidden Gems",     path: "gems",          blurb: "Buried, worth re-optimising" },
  { verb: "Score", label: "Frontmatter",     path: "frontmatter",   blurb: "Deserving work that isn't reaching — the merit↔reach gap" },
  { verb: "Score", label: "Story Analyser",  path: "story-analyser", blurb: "Audit one story" },
  { verb: "Score", label: "Probity",         path: "probity",       blurb: "Page-honesty audit" },
  { verb: "Score", label: "Compliance",      path: "standards",     blurb: "GDPR / DPDPA" },
  { verb: "Brief", label: "Morning brief",   path: "brief",         blurb: "The day's brief" },
  { verb: "Plan",  label: "Journalists",     path: "journalists",   blurb: "People & coverage gaps" },
];

export const ADMIN: Stage[] = [
  { verb: "Admin", label: "Accounts & approvals", path: "admin/users",      blurb: "" },
  { verb: "Admin", label: "Sources",              path: "admin/sources",    blurb: "" },
  { verb: "Admin", label: "Connectors",           path: "admin/connectors", blurb: "" },
  { verb: "Admin", label: "Surfaces",             path: "admin/surfaces",   blurb: "" },
  { verb: "Admin", label: "Architecture",         path: "architecture",     blurb: "" },
];

// Flat path → label lookup for breadcrumbs (every known surface).
export const LABEL_BY_PATH: Record<string, string> = Object.fromEntries(
  [...LIFECYCLE, ...WORKFLOW_EXTRA, ...ADMIN].map((s) => [s.path, s.label]),
);

// Role ordering for minRole gating.
const ROLE_RANK: Record<string, number> = { reporter: 0, desk: 1, editor: 2, admin: 3 };
export function stageVisible(stage: Stage, role: string | null): boolean {
  if (!stage.minRole) return true;
  return (ROLE_RANK[role ?? "reporter"] ?? 0) >= ROLE_RANK[stage.minRole];
}
