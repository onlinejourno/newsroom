// The flat information architecture (ADR 0060, supersedes the four-job rooms of
// ADR 0058). Mirrors the original discover-dashboard: the Calendar is the spine,
// the intelligence tabs hang off it. ONE source so masthead, front-door and
// breadcrumbs never disagree. Route paths are unchanged from earlier slices;
// only grouping/labels/order change here.
export type NavItem = { path: string; label: string; blurb: string };

// Primary nav — the Calendar spine + the original's 7 intelligence tabs + the raw inflow.
export const PRIMARY: NavItem[] = [
  { path: "calendar", label: "Calendar", blurb: "Promises ahead — the planning spine" },
  { path: "trends", label: "Trending Topics", blurb: "Moving topics, right now" },
  { path: "potential", label: "Story Scores", blurb: "Published stories ranked to optimise for the trends" },
  { path: "story-analyser", label: "Story Analyser", blurb: "Audit one story — SEO + E-E-A-T, every signal" },
  { path: "topic-domains", label: "Topic → Domains", blurb: "Which domains own a topic" },
  { path: "local-pulse", label: "Local Pulse", blurb: "What's trending by state & city" },
  { path: "gems", label: "Hidden Gems", blurb: "Already-published, buried — worth re-optimising" },
  { path: "eip-signals", label: "EIP Signals", blurb: "Subscription & editorial-intelligence signals" },
  { path: "signals", label: "Signals", blurb: "The raw public record flowing in" },
];

// Secondary "Workflow" group — the production/check/newsroom pages stay reachable,
// just no longer top-level rooms.
export const WORKFLOW: NavItem[] = [
  { path: "newslist", label: "Newslist", blurb: "Every story in flight" },
  { path: "scores", label: "Surface Scores", blurb: "Channel-distribution audit" },
  { path: "probity", label: "Probity", blurb: "Page-honesty audit" },
  { path: "standards", label: "Compliance", blurb: "GDPR / DPDPA" },
  { path: "journalists", label: "Journalists", blurb: "People & coverage gaps" },
  { path: "brief", label: "Morning brief", blurb: "The day's brief" },
];

export const ADMIN: NavItem[] = [
  { path: "admin/users", label: "Accounts & approvals", blurb: "" },
  { path: "admin/sources", label: "Sources", blurb: "" },
  { path: "admin/connectors", label: "Connectors", blurb: "" },
  { path: "admin/surfaces", label: "Surfaces", blurb: "" },
  { path: "architecture", label: "Architecture", blurb: "" },
];

// Flat lookup: path → label, for breadcrumbs.
export const LABEL_BY_PATH: Record<string, string> = Object.fromEntries(
  [...PRIMARY, ...WORKFLOW, ...ADMIN].map((i) => [i.path, i.label]),
);
