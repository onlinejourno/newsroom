// Site masthead — flat intelligence suite (ADR 0060, supersedes ADR 0058).
// PRIMARY renders as always-visible top-level links (Calendar first).
// WORKFLOW and ADMIN collapse into dropdowns; Admin is admin-only.
import { redirect } from "next/navigation";

import { endSession } from "@/lib/auth";
import { PRIMARY, WORKFLOW, ADMIN, type NavItem } from "@/lib/nav";

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
          {/* PRIMARY: flat top-level links — Calendar first, then intelligence tabs */}
          {PRIMARY.map((item: NavItem) => (
            <a
              key={item.path}
              href={href(item.path)}
              className="font-semibold no-underline hover:underline whitespace-nowrap"
              style={linkStyle}
            >
              {item.label}
            </a>
          ))}

          {/* Workflow dropdown */}
          <details name="masthead-rooms" className="relative">
            <summary
              className="cursor-pointer list-none select-none no-underline hover:underline font-semibold"
              style={linkStyle}
            >
              Workflow ▾
            </summary>
            <div
              className="absolute right-0 mt-2 flex flex-col gap-1.5 border p-3 min-w-52"
              style={{
                background: "var(--color-bg-card)",
                borderColor: "var(--color-frame)",
                zIndex: 20,
              }}
            >
              {WORKFLOW.map((item: NavItem) => (
                <a
                  key={item.path}
                  href={href(item.path)}
                  className="no-underline hover:underline whitespace-nowrap"
                  style={linkStyle}
                >
                  {item.label}
                </a>
              ))}
            </div>
          </details>

          {/* Admin dropdown — admin role only */}
          {role === "admin" && (
            <details name="masthead-rooms" className="relative">
              <summary
                className="cursor-pointer list-none select-none no-underline hover:underline font-semibold"
                style={linkStyle}
              >
                Admin ▾
              </summary>
              <div
                className="absolute right-0 mt-2 flex flex-col gap-1.5 border p-3 min-w-52"
                style={{
                  background: "var(--color-bg-card)",
                  borderColor: "var(--color-frame)",
                  zIndex: 20,
                }}
              >
                {ADMIN.map((item: NavItem) => (
                  <a
                    key={item.path}
                    href={href(item.path)}
                    className="no-underline hover:underline whitespace-nowrap"
                    style={linkStyle}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            </details>
          )}

          <span className="flex items-center gap-2 ml-2 text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
            {userName ? (
              <a href={href("account")} className="no-underline hover:underline" style={linkStyle}>
                {userName}
              </a>
            ) : null}
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
