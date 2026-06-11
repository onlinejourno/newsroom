// Site masthead — the OnlineJourno pyramid mark + wordmark + nav, every page.
const EDITORIAL = [
  { path: "brief", label: "Brief" },
  { path: "shortlist", label: "Shortlist" },
  { path: "signals", label: "Signals" },
  { path: "potential", label: "Potential" },
  { path: "trends", label: "Trends" },
  { path: "scores", label: "Scores" },
  { path: "gems", label: "Gems" },
  { path: "probity", label: "Probity" },
  { path: "gaps", label: "Regional Gaps" },
  { path: "journalists", label: "Journalists" },
];
const ADMIN = [
  { path: "admin/sources", label: "Sources" },
  { path: "admin/connectors", label: "Connectors" },
  { path: "admin/surfaces", label: "Surfaces" },
  { path: "architecture", label: "Architecture" },
];

const linkStyle = { color: "var(--color-fg-secondary)" } as const;

export default function Masthead({ locale = "en" }: { locale?: string }) {
  const href = (p: string) => `/${locale}/${p}`;
  return (
    <header
      className="flex items-center gap-x-5 gap-y-2 px-6 py-3 border-b sticky top-0 z-10 flex-wrap"
      style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
    >
      <a href={`/${locale}`} className="flex items-center gap-2 no-underline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" width={30} height={26} />
        <span
          className="text-lg font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}
        >
          OnlineJourno
        </span>
      </a>

      <nav className="flex items-center gap-x-4 gap-y-1 text-sm flex-wrap md:ml-auto">
        {EDITORIAL.map((l) => (
          <a key={l.path} href={href(l.path)} className="no-underline hover:underline" style={linkStyle}>
            {l.label}
          </a>
        ))}
        {/* Admin folds into one menu (no-JS <details> popover). */}
        <details className="relative">
          <summary
            className="cursor-pointer list-none select-none no-underline hover:underline"
            style={linkStyle}
          >
            Admin ▾
          </summary>
          <div
            className="absolute right-0 mt-2 flex flex-col gap-1 rounded-sm border p-3 min-w-36 shadow-sm"
            style={{
              background: "var(--color-bg-card)",
              borderColor: "var(--color-border)",
              zIndex: 20,
            }}
          >
            {ADMIN.map((l) => (
              <a
                key={l.path}
                href={href(l.path)}
                className="no-underline hover:underline whitespace-nowrap"
                style={linkStyle}
              >
                {l.label}
              </a>
            ))}
          </div>
        </details>
      </nav>
    </header>
  );
}
