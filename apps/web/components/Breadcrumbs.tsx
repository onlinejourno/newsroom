"use client";

// Breadcrumbs (ADR 0060 — flat IA, supersedes ADR 0058 four-job rooms): one
// client component, driven by the route. Labels come from the flat nav registry
// so masthead, front-door and breadcrumbs never disagree. No per-page wiring.
import { usePathname } from "next/navigation";
import { LABEL_BY_PATH } from "@/lib/nav";

const HIDE = new Set(["login", "register", "onboarding", "pending"]);

/** Capitalise each word, replace hyphens/underscores with spaces. */
function titleCase(s: string): string {
  return s
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean); // [locale, base?, sub?, ...]
  const locale = parts[0] || "en";
  const base = parts[1];
  if (!base || HIDE.has(base)) return null; // home + auth pages: no crumb

  // Build the lookup key. Admin sub-paths exist in the registry as "admin/users"
  // etc.; for everything else the key is just the first segment after the locale.
  const sub = parts[2];
  const joinedKey = sub ? `${base}/${sub}` : undefined;
  const key = joinedKey && LABEL_BY_PATH[joinedKey] ? joinedKey : base;
  const label = LABEL_BY_PATH[key] ?? titleCase(sub ?? base);

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
      <span className="flex items-center gap-2">
        <span style={{ color: "var(--color-fg-tertiary)" }}>›</span>
        <span
          style={{
            color: "var(--color-fg-primary)",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
      </span>
    </nav>
  );
}
