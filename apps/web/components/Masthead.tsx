// Site masthead — the five lifecycle rooms (ADR 0053), gated by account
// (ADR 0055): Admin room only for the admin tier; signed-out shows brand +
// Sign in only.
import { redirect } from "next/navigation";

import { endSession } from "@/lib/auth";

type Item = { path: string; label: string };
type Room = { label: string; items: Item[]; adminOnly?: boolean };

const ROOMS: Room[] = [
  {
    label: "Today",
    items: [
      { path: "newslist", label: "Newslist — signal → published" },
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
    items: [
      { path: "probity", label: "Probity audit" },
      { path: "standards", label: "Compliance — GDPR / DPDPA" },
    ],
  },
  {
    label: "Newsroom",
    items: [
      { path: "journalists", label: "Journalists" },
      { path: "gaps", label: "Regional gaps" },
      { path: "coverage", label: "Coverage gaps" },
    ],
  },
  {
    label: "Admin",
    adminOnly: true,
    items: [
      { path: "admin/users", label: "Accounts & approvals" },
      { path: "admin/sources", label: "Sources" },
      { path: "admin/connectors", label: "Connectors" },
      { path: "admin/surfaces", label: "Surfaces" },
      { path: "architecture", label: "Architecture" },
    ],
  },
];

const linkStyle = { color: "var(--color-fg-secondary)" } as const;

export default function Masthead({
  locale = "en",
  role = null,
  userName = null,
}: {
  locale?: string;
  role?: string | null;
  userName?: string | null;
}) {
  const href = (p: string) => `/${locale}/${p}`;

  async function signOut() {
    "use server";
    await endSession();
    redirect(`/${locale}/login`);
  }

  return (
    <header
      className="flex items-center gap-x-5 gap-y-2 px-6 py-3 border-b sticky top-0 z-10 flex-wrap"
      style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
    >
      <a href={role ? href("") : `/${locale}/login`} className="flex items-center gap-2 no-underline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" width={30} height={26} />
        <span
          className="text-lg font-extrabold tracking-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}
        >
          OnlineJourno
        </span>
      </a>

      {role ? (
        <nav className="flex items-center gap-x-5 gap-y-1 text-sm flex-wrap md:ml-auto">
          {ROOMS.filter((r) => !r.adminOnly || role === "admin").map((room) => (
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
          <span className="flex items-center gap-2 ml-2 text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
            {userName ? <span>{userName}</span> : null}
            <form action={signOut}>
              <button type="submit" className="underline" style={linkStyle}>
                Sign out
              </button>
            </form>
          </span>
        </nav>
      ) : (
        <a
          href={`/${locale}/login`}
          className="md:ml-auto text-sm font-semibold no-underline hover:underline"
          style={linkStyle}
        >
          Sign in
        </a>
      )}
    </header>
  );
}
