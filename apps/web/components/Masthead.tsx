// Site masthead — the OnlineJourno mark + the five rooms of the story
// lifecycle (ADR 0053): Today → Stories → Standards → Newsroom → Learn,
// with Admin folded. Rooms are no-JS <details> popovers.
const ROOMS: {
  label: string;
  items: { path: string; label: string }[];
}[] = [
  {
    label: "Today",
    items: [
      { path: "signals", label: "Signals — the inflow" },
      { path: "potential", label: "Potential — take up first" },
      { path: "trends", label: "Trends — moving topics" },
      { path: "shortlist", label: "Shortlist" },
      { path: "brief", label: "Morning brief" },
    ],
  },
  {
    label: "Stories",
    items: [
      { path: "scores", label: "Scores — surface audit" },
      { path: "gems", label: "Hidden gems" },
    ],
  },
  {
    label: "Standards",
    items: [{ path: "probity", label: "Probity audit" }],
  },
  {
    label: "Newsroom",
    items: [
      { path: "onboarding", label: "Join — 3 questions" },
      { path: "journalists", label: "Journalists" },
      { path: "gaps", label: "Regional gaps" },
      { path: "coverage", label: "Coverage gaps" },
    ],
  },
  {
    label: "Admin",
    items: [
      { path: "admin/sources", label: "Sources" },
      { path: "admin/connectors", label: "Connectors" },
      { path: "admin/surfaces", label: "Surfaces" },
      { path: "architecture", label: "Architecture" },
    ],
  },
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

      <nav className="flex items-center gap-x-5 gap-y-1 text-sm flex-wrap md:ml-auto">
        {ROOMS.map((room) => (
          <details key={room.label} name="masthead-rooms" className="relative">
            <summary
              className="cursor-pointer list-none select-none no-underline hover:underline font-semibold"
              style={linkStyle}
            >
              {room.label} ▾
            </summary>
            <div
              className="absolute right-0 mt-2 flex flex-col gap-1.5 rounded-sm border p-3 min-w-52 shadow-sm"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-border)",
                zIndex: 20,
              }}
            >
              {room.items.map((l) => (
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
        ))}
      </nav>
    </header>
  );
}
