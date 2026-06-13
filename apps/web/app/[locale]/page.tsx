import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { entityWindows, storiesWithScores, tenantIdForSlug } from "@/lib/db";
import { endSession, getAccount, roomForRole } from "@/lib/auth";
import { topicMomentum } from "@/lib/trends";

const TENANT_SLUG = "self";
const SNAPSHOT_HOURS = 12;

function composite(scores: Record<string, { score: number }>): number {
  const vals = Object.values(scores).map((s) => s.score);
  return vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 0;
}

// The newsroom situation at a glance (founder spec): published in the window,
// made the grade (>=75, no embellishment needed), riding a moving topic,
// needs tweaking (50-74), needs serious intervention (<50).
async function orgSnapshot(tenantId: string) {
  const [stories, recent, prior] = await Promise.all([
    storiesWithScores(tenantId, 500, SNAPSHOT_HOURS),
    entityWindows(tenantId, 48, 0),
    entityWindows(tenantId, 96, 48),
  ]);
  const hot = new Set(
    topicMomentum(recent, prior)
      .filter((t) => t.momentum >= 45)
      .map((t) => t.topic.toLowerCase()),
  );
  let grade = 0;
  let tweak = 0;
  let intervene = 0;
  let trending = 0;
  for (const st of stories) {
    const c = composite(st.scores);
    if (c >= 75) grade++;
    else if (c >= 50) tweak++;
    else intervene++;
    const hl = (st.headline ?? "").toLowerCase();
    if ([...hot].some((t) => t.length >= 3 && hl.includes(t))) trending++;
  }
  return { total: stories.length, grade, tweak, intervene, trending };
}

// The five rooms of the story lifecycle (ADR 0053), each with who stands in
// it and what question it answers. The front door routes by role, not tool.
const ROOMS = [
  {
    href: "signals",
    room: "① Today",
    who: "Reporter · Bureau chief · Editor",
    title: "What is going on",
    desc: "The public record flowing in — governments, courts, tenders, wires — analysed, classified and routed to the reporter on the beat, with alerts. Potential tells her what to take up first: trending now, likely to trend today.",
    links: [
      { href: "potential", label: "Potential" },
      { href: "trends", label: "Trends" },
      { href: "journalists", label: "Reporter feeds" },
    ],
  },
  {
    href: "scores",
    room: "② Stories",
    who: "Desk · Reporter",
    title: "A fair chance on every surface",
    desc: "Once published, is the story built for each surface — Discover, News, Search, and the AI surfaces each reading in their own way? Automatic audits, paste-a-URL checks, and the hidden gems the night desk buried.",
    links: [
      { href: "gems", label: "Hidden gems" },
      { href: "scores", label: "Audit a URL" },
    ],
  },
  {
    href: "probity",
    room: "③ Standards",
    who: "Everyone",
    title: "Probity and verification",
    desc: "What the page does to the reader — trackers, consent honesty, weight — seared into the workflow. Factcheck joins here. The conscience dashboards: reader-need mix and framing balance.",
    links: [{ href: "signals", label: "Need mix" }],
  },
  {
    href: "gaps",
    room: "④ Newsroom",
    who: "Editor · Vertical heads",
    title: "People and strategy",
    desc: "Who covers what, where the record moves with no reporter on it, and — coming — the masthead's strategic topics and what its subscribers actually read.",
    links: [{ href: "journalists", label: "Directory" }],
  },
  {
    href: "scores",
    room: "⑤ Learn",
    who: "Everyone new to digital",
    title: "The medium, explained inside the tool",
    desc: "Assistive for those who don't know, a workhorse for the cognoscenti: every score, frame and surface explains itself. Start with the explainers on Potential and Scores; the full learning layer (m-learn) is being built.",
    links: [{ href: "potential", label: "See an explainer" }],
  },
] as const;

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const account = await getAccount();
  const user = account
    ? {
        name: account.display_name ?? account.email,
        role: account.role,
        slug: account.profile_slug,
        beats: account.beats,
      }
    : null;
  const snapshot = tenantId && user ? await orgSnapshot(tenantId) : null;

  async function signOut() {
    "use server";
    await endSession();
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 py-16">
      <div className="max-w-3xl w-full text-center">
        <Image
          src="/brand/logo-mark.png"
          alt="OnlineJourno"
          width={110}
          height={110}
          priority
          className="mx-auto mb-8"
        />

        <p className="ds-label mb-4">OnlineJourno · Platform</p>

        <h1
          className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Give every story
          <br />a fair chance.
        </h1>

        <p
          className="text-lg md:text-xl mb-10"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
            lineHeight: 1.55,
          }}
        >
          One place where everyone in the newsroom — rookie to editor — sees
          what is going on and what needs to be done: the original sources in,
          the story&rsquo;s fair chance out. About journalism, by journalists,
          for journalists. Open source.
        </p>

        {user && snapshot ? (
          <section
            className="rounded-sm border p-5 text-left mb-2"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg-card)",
              fontFamily: "var(--font-ui)",
            }}
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
              <p className="ds-label">
                The newsroom right now · last {SNAPSHOT_HOURS}h of published
                output
              </p>
              <span className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
                Signed in as <strong>{user.name}</strong> ({user.role ?? "reporter"})
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              {[
                { n: snapshot.total, l: "published", c: "var(--color-fg-primary)" },
                { n: snapshot.grade, l: "made the grade", c: "#16a34a" },
                { n: snapshot.trending, l: "riding a trend", c: "#2563eb" },
                { n: snapshot.tweak, l: "need tweaking", c: "#d97706" },
                { n: snapshot.intervene, l: "need intervention", c: "#dc2626" },
              ].map((k) => (
                <div key={k.l}>
                  <p className="text-3xl font-extrabold" style={{ color: k.c, fontFamily: "var(--font-display)" }}>
                    {k.n}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-fg-secondary)" }}>
                    {k.l}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
              <Link
                href={`/${locale}/${roomForRole(user.role, user.slug)}` as Route}
                className="px-4 py-2 rounded-sm text-sm font-semibold no-underline"
                style={{ background: "var(--color-brand)", color: "white" }}
              >
                Go to my room →
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs underline"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  Sign out
                </button>
              </form>
            </div>
          </section>
        ) : (
          <section
            className="rounded-sm border p-5 mb-2"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg-card)",
              fontFamily: "var(--font-ui)",
            }}
          >
            <p className="text-base mb-3">
              Sign in to see your newsroom&rsquo;s situation — or join in
              under two minutes.
            </p>
            <Link
              href={`/${locale}/onboarding`}
              className="px-4 py-2 rounded-sm text-sm font-semibold no-underline"
              style={{ background: "var(--color-brand)", color: "white" }}
            >
              Sign in / Join →
            </Link>
          </section>
        )}

        <hr className="ds-rule my-10" />

        <div className="grid grid-cols-1 gap-4 text-left">
          {ROOMS.map((r) => (
            <div
              key={r.room}
              className="rounded-sm border p-5"
              style={{
                borderColor: "var(--color-border)",
                background: "var(--color-bg-card)",
              }}
            >
              <div
                className="flex items-baseline justify-between gap-3 flex-wrap mb-1"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                <p className="ds-label">{r.room}</p>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  {r.who}
                </span>
              </div>
              <Link
                href={`/${locale}/${r.href}`}
                className="text-xl font-bold hover:underline"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {r.title}
              </Link>
              <p
                className="text-sm mt-1"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-fg-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {r.desc}
              </p>
              <p
                className="text-sm mt-2 flex gap-4 flex-wrap"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                {r.links.map((l) => (
                  <Link
                    key={l.label}
                    href={`/${locale}/${l.href}`}
                    className="underline"
                    style={{ color: "var(--color-brand)" }}
                  >
                    {l.label}
                  </Link>
                ))}
              </p>
            </div>
          ))}
        </div>

        <hr className="ds-rule my-10" />

        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          <div>
            <p className="ds-label mb-2">The loop</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Sources → Analyse → Classify → Route → Alert → Publish → Audit
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Grounding</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              PEJ framing · Deuze · User Needs
            </p>
          </div>
          <div>
            <p className="ds-label mb-2">Licence</p>
            <p
              className="font-semibold text-sm"
              style={{ color: "var(--color-fg-primary)" }}
            >
              Apache 2.0 — run it in your newsroom
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
