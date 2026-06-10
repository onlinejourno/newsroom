// Site masthead — the OnlineJourno pyramid mark + wordmark + nav, every page.
const EDITORIAL = [
  { path: "brief", label: "Brief" },
  { path: "shortlist", label: "Shortlist" },
  { path: "signals", label: "Signals" },
  { path: "scores", label: "Scores" },
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
        <span aria-hidden className="opacity-40" style={linkStyle}>
          ·
        </span>
        <span className="text-xs uppercase tracking-wide" style={{ color: "var(--color-fg-tertiary)" }}>
          Admin
        </span>
        {ADMIN.map((l) => (
          <a key={l.path} href={href(l.path)} className="no-underline hover:underline" style={linkStyle}>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
