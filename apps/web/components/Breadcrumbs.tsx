"use client";

// Breadcrumbs (ADR 0058 — IA connective tissue): one client component, driven
// by the route, rendered once in the layout. Every page says where it sits in
// the four-job map (Plan / Produce / Check / Newsroom) so you are never lost
// and can always step back up the path. No per-page wiring.
import { usePathname } from "next/navigation";

type Crumb = { label: string; href?: string };

// First path segment after the locale → its trail. Detail routes append a tail.
const TRAILS: Record<string, Crumb[]> = {
  signals: [{ label: "Plan" }, { label: "Signals", href: "signals" }],
  potential: [{ label: "Plan" }, { label: "Potential", href: "potential" }],
  trends: [{ label: "Plan" }, { label: "Trends", href: "trends" }],
  calendar: [{ label: "Plan" }, { label: "Calendar", href: "calendar" }],
  newslist: [{ label: "Produce" }, { label: "Newslist", href: "newslist" }],
  shortlist: [{ label: "Produce" }, { label: "Shortlist", href: "shortlist" }],
  brief: [{ label: "Produce" }, { label: "Morning brief", href: "brief" }],
  gems: [{ label: "Plan" }, { label: "Hidden gems", href: "gems" }],
  scores: [{ label: "Check" }, { label: "Scores", href: "scores" }],
  probity: [{ label: "Check" }, { label: "Probity", href: "probity" }],
  standards: [{ label: "Check" }, { label: "Compliance", href: "standards" }],
  journalists: [{ label: "Newsroom" }, { label: "Journalists", href: "journalists" }],
  gaps: [{ label: "Newsroom" }, { label: "Gaps", href: "gaps" }],
  coverage: [{ label: "Newsroom" }, { label: "Coverage", href: "coverage" }],
  architecture: [{ label: "Admin" }, { label: "Architecture", href: "architecture" }],
  // detail routes — the spine cross-links live on the pages themselves
  signal: [{ label: "Plan" }, { label: "Signals", href: "signals" }, { label: "Signal" }],
  feed: [{ label: "Newsroom" }, { label: "Journalists", href: "journalists" }, { label: "Reporter feed" }],
};

const HIDE = new Set(["login", "register", "onboarding", "pending"]);

export default function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean); // [locale, base, ...]
  const locale = parts[0] || "en";
  const base = parts[1];
  if (!base || HIDE.has(base)) return null; // home + auth pages: no crumb

  let trail = TRAILS[base];
  if (base === "admin") {
    const sub = parts[2] ?? "";
    trail = [{ label: "Admin" }, { label: sub ? sub[0].toUpperCase() + sub.slice(1) : "Admin" }];
  }
  if (!trail) return null;

  const link = { color: "var(--color-fg-secondary)", textDecoration: "none" } as const;
  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-2 px-6 py-2 border-b text-xs"
      style={{
        background: "var(--color-bg-card)",
        borderColor: "var(--color-rule)",
        fontFamily: "var(--font-ui)",
        color: "var(--color-fg-tertiary)",
      }}
    >
      <a href={`/${locale}`} className="hover:underline" style={link}>
        Home
      </a>
      {trail.map((c, i) => {
        const isLast = i === trail.length - 1;
        return (
          <span key={`${c.label}-${i}`} className="flex items-center gap-2">
            <span style={{ color: "var(--color-fg-tertiary)" }}>›</span>
            {c.href && !isLast ? (
              <a href={`/${locale}/${c.href}`} className="hover:underline" style={link}>
                {c.label}
              </a>
            ) : (
              <span
                style={{
                  color: isLast ? "var(--color-fg-primary)" : "var(--color-fg-tertiary)",
                  fontWeight: isLast ? 700 : 400,
                }}
              >
                {c.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
