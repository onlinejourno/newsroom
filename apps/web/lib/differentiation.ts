// The Differentiation Ratio (ADR 0054-B, from the Business Standard strategy
// paper): every own story is table_stakes (commodity AI summarises for free),
// a conversion_driver (analysis/exclusive — why someone subscribes), or a
// renewal_driver (service/explainer depth — why they stay). v1 is a
// documented heuristic over the PEJ frame + reader need; human override and
// per-newsroom config come later.

export type SubscriptionRole =
  | "table_stakes"
  | "conversion_driver"
  | "renewal_driver";

const CONVERSION_FRAMES = new Set([
  "Policy Explored",
  "Reality Check",
  "Institutional Critique",
  "Wrongdoing Exposed",
  "Historical Outlook",
  "Personality Profile",
]);

const EXPLAINER_FRAMES = new Set(["Process", "Trend"]);

export function subscriptionRole(
  frame: string | null | undefined,
  userNeed: string | null | undefined,
): SubscriptionRole {
  if (frame && CONVERSION_FRAMES.has(frame)) return "conversion_driver";
  if (userNeed === "do") return "renewal_driver";
  if (frame && EXPLAINER_FRAMES.has(frame) && userNeed === "understand")
    return "renewal_driver";
  return "table_stakes";
}

export const ROLE_META: Record<
  SubscriptionRole,
  { label: string; color: string }
> = {
  table_stakes: { label: "Table stakes", color: "#6b7280" },
  conversion_driver: { label: "Conversion driver", color: "#16a34a" },
  renewal_driver: { label: "Renewal driver", color: "#4f46e5" },
};
