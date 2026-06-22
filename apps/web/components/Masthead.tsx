// Site masthead — story-lifecycle IA (redesign Phase A, supersedes ADR 0060).
// Renders six verb·noun stages (Plan·Calendar → Score·Audit); active stage gets
// an underline; role-gated stages hidden; admin gets a Surfaces dropdown.
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { endSession } from "@/lib/auth";
import { LIFECYCLE, ADMIN, stageVisible, type Stage } from "@/lib/nav";
import { navStageCounts } from "@/lib/db";
import { deriveNavSignals } from "@/lib/nav-signals";
import { currentTenantId } from "@/lib/tenant";
import { Badge } from "@/components/ui/badge";

export default async function Masthead({
  locale = "en",
  role = null,
  userName = null,
  beats = null,
}: {
  locale?: string;
  role?: string | null;
  userName?: string | null;
  beats?: string[] | null;
}) {
  const href = (p: string) => `/${locale}/${p}`;
  // Active stage: first path segment after the locale.
  const path = (await headers()).get("x-invoke-path") ?? "";
  const seg = path.split("/").filter(Boolean)[1] ?? "";

  async function signOut() {
    "use server";
    await endSession();
    redirect(`/${locale}/login`);
  }

  const stages = LIFECYCLE.filter((s) => stageVisible(s, role));
  // Living masthead: per-stage live counts + the one stage that needs attention now.
  const tenantId = role ? await currentTenantId() : null;
  // Reporters see their beats' load; desk/editor/admin see the whole newsroom.
  const scopeBeats = role === "reporter" && beats?.length ? beats : null;
  const counts = tenantId
    ? await navStageCounts(tenantId, scopeBeats)
    : { calendar: 0, brief: 0, signals: 0, newslist: 0, potential: 0 };
  const navSig = deriveNavSignals(counts);

  return (
    <header
      className="flex items-center gap-x-6 px-6 py-3 border-b sticky top-0 z-10 flex-wrap"
      style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border)" }}
    >
      {/* Logo → the product homepage (onlinejourno.com), per brand. */}
      <a href="https://onlinejourno.com" className="flex items-center gap-2 no-underline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.png" alt="" width={28} height={24} />
        <span className="text-lg font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}>
          OnlineJourno
        </span>
      </a>

      {role ? (
        <nav className="flex items-center gap-x-6 flex-wrap md:ml-auto">
          {stages.map((s: Stage) => {
            const active = s.path.split("/")[0] === seg;
            const sig = navSig.byPath[s.path];
            return (
              <a key={s.path} href={href(s.path)} title={s.blurb}
                 className="no-underline group flex flex-col leading-none pb-1"
                 style={{ borderBottom: `2px solid ${active ? "var(--color-urgent)" : "transparent"}` }}>
                <span className="ds-meta" style={{ color: "var(--color-fg-tertiary)" }}>{s.verb}</span>
                <span className="text-[15px] font-semibold flex items-center gap-1.5"
                      style={{ fontFamily: "var(--font-display)",
                               color: active ? "var(--color-fg-primary)" : "var(--color-fg-secondary)" }}>
                  {s.label}
                  {sig && (
                    <Badge tone={sig.tone} dot={s.path === navSig.nowPath}>
                      {sig.count}
                    </Badge>
                  )}
                </span>
              </a>
            );
          })}

          {role === "admin" && (
            <details name="masthead-rooms" className="relative">
              <summary className="ds-meta cursor-pointer list-none select-none"
                       style={{ color: "var(--color-fg-tertiary)" }}>Surfaces ▾</summary>
              <div className="absolute right-0 mt-2 flex flex-col gap-1.5 border p-3 min-w-52"
                   style={{ background: "var(--color-bg-card)", borderColor: "var(--color-frame)", zIndex: 20 }}>
                {ADMIN.map((s) => (
                  <a key={s.path} href={href(s.path)} className="no-underline hover:underline text-sm"
                     style={{ color: "var(--color-fg-secondary)" }}>{s.label}</a>
                ))}
              </div>
            </details>
          )}

          <span className="flex items-center gap-3 ml-2 text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
            {userName ? (
              <a href={href("account")} className="no-underline hover:underline">{userName}</a>
            ) : null}
            <form action={signOut}><button type="submit" className="underline">Sign out</button></form>
          </span>
        </nav>
      ) : (
        <a href={`/${locale}/login`} className="md:ml-auto text-sm font-semibold no-underline hover:underline"
           style={{ color: "var(--color-fg-secondary)" }}>Sign in</a>
      )}
    </header>
  );
}
