import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  entityWindows,
  publishedPerDay,
  storiesWithScores,
  tenantIdForSlug,
} from "@/lib/db";
import { endSession, getAccount, roomForRole } from "@/lib/auth";
import { Sparkline } from "@/components/Sparkline";
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
  const trend = await publishedPerDay(tenantId, 7);
  return { total: stories.length, grade, tweak, intervene, trending, trend };
}

// The five rooms of the story lifecycle (ADR 0053), each with who stands in
// it and what question it answers. The front door routes by role, not tool.
// The front door mirrors the four-job IA (ADR 0058): the same Plan · Produce ·
// Check · Newsroom the masthead uses, so the door and the nav never disagree.
const ROOMS = [
  {
    href: "signals",
    room: "Plan",
    who: "Reporter · Bureau chief · Editor",
    title: "Decide what to cover",
    desc: "The public record flowing in — governments, courts, tenders, wires — analysed, classified and routed to the reporter on the beat. Potential says what to take up first; the Calendar shows what's coming before it breaks; Hidden gems resurfaces your own buried stories.",
    links: [
      { href: "signals", label: "Signals" },
      { href: "potential", label: "Potential" },
      { href: "trends", label: "Trends" },
      { href: "calendar", label: "Calendar" },
      { href: "gems", label: "Hidden gems" },
    ],
  },
  {
    href: "newslist",
    room: "Produce",
    who: "Desk · Reporter · Editor",
    title: "Move it — signal → published",
    desc: "The spine: every story in flight on one board. Pitch or commission, assign a reporter with an ETA, file, approve, publish — the state visible to the whole desk, on-time tracked.",
    links: [
      { href: "newslist", label: "Newslist" },
      { href: "shortlist", label: "Shortlist" },
      { href: "brief", label: "Morning brief" },
    ],
  },
  {
    href: "scores",
    room: "Check",
    who: "Desk · Everyone",
    title: "Fair, honest, good",
    desc: "Once published, does the story get a fair chance on every surface — Discover, News, Search, the AI readers? Plus probity — what the page does to the reader — and compliance, both seared into the workflow.",
    links: [
      { href: "scores", label: "Scores" },
      { href: "probity", label: "Probity" },
      { href: "standards", label: "Compliance" },
    ],
  },
  {
    href: "journalists",
    room: "Newsroom",
    who: "Editor · Vertical heads",
    title: "People & strategy",
    desc: "Who covers what, and where the record moves with no reporter on it. And every score, frame and surface explains itself inside the tool — assistive for those new to digital, a workhorse for the cognoscenti.",
    links: [
      { href: "journalists", label: "Journalists" },
      { href: "gaps", label: "Gaps" },
    ],
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
            className="ds-frame p-5 text-left mb-2"
            style={{ fontFamily: "var(--font-ui)" }}
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
            <div className="flex items-center gap-3 mt-4 pt-3 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <span className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
                Published · last 7 days
              </span>
              <Sparkline points={snapshot.trend} color="#2563eb" />
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
            className="ds-frame p-5 mb-2"
            style={{ fontFamily: "var(--font-ui)" }}
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
            <div key={r.room} className="ds-frame p-5">
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

        {/* Grounded in journalism scholarship — the platform's intellectual
            spine, made explicit (not a footnote). Three tested lenses. */}
        <section className="ds-frame p-6 text-left">
          <p className="ds-label mb-1">Grounded in journalism scholarship</p>
          <h2 className="ds-h2 mb-1">Not vibes — three tested lenses, built in.</h2>
          <p
            className="text-sm mb-5"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-secondary)" }}
          >
            Every score and tag on this platform traces back to established
            journalism scholarship. Here is what each one means and why it
            grounds the work.
          </p>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            {[
              {
                k: "PEJ framing",
                s: "Project for Excellence in Journalism",
                d: "Every story is coded for its dominant narrative frame — combative, explanatory, straight, policy. A desk sees its own framing balance, not just one story at a time.",
              },
              {
                k: "Deuze typology",
                s: "Mark Deuze · First Monday, 2001",
                d: "What kind of journalism a source or newsroom practises. It types the record flowing in and anchors how the platform reasons about craft.",
              },
              {
                k: "User Needs",
                s: "BBC / smartocto · six needs",
                d: "Why a reader comes to a story — the six user needs: Update me (the facts, fast) · Keep me on trend (what everyone's discussing) · Give me perspective (the why, the angles) · Educate me (the background to follow it) · Divert me (a moment's relief — human, surprising) · Inspire me (what lifts and moves). Every signal is classified by need, and coverage is audited for balance — so the desk sees if it over-produces 'Update me' and under-serves the growth needs, 'Educate me' and 'Inspire me'.",
              },
              {
                k: "SEJ Periodic Table",
                s: "Search Engine Journal · SEO elements",
                d: "The periodic table of SEO success factors — content, architecture, HTML, links, trust. The SEO + E-E-A-T audit scores every story against these elements, turning ranking factors into concrete fixes.",
              },
              {
                k: "Search Quality Guidelines",
                s: "Google Search Quality Evaluator Guidelines",
                d: "How Google's human raters judge pages — YMYL sensitivity, Page Quality, Needs Met, and E-E-A-T. The audit classifies each story by these and flags the lowest-quality risk signals.",
              },
            ].map((g) => (
              <div key={g.k}>
                <p
                  className="font-bold text-lg"
                  style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}
                >
                  {g.k}
                </p>
                <p className="ds-meta mb-2">{g.s}</p>
                <p
                  className="text-sm"
                  style={{
                    fontFamily: "var(--font-body)",
                    color: "var(--color-fg-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {g.d}
                </p>
              </div>
            ))}
          </div>
          <p
            className="text-xs mt-6 pt-4 border-t flex gap-x-6 gap-y-1 flex-wrap"
            style={{
              borderColor: "var(--color-rule)",
              fontFamily: "var(--font-ui)",
              color: "var(--color-fg-tertiary)",
            }}
          >
            <span>
              <strong style={{ color: "var(--color-fg-secondary)" }}>The loop:</strong>{" "}
              Sources → Analyse → Classify → Route → Alert → Publish → Audit
            </span>
            <span>
              <strong style={{ color: "var(--color-fg-secondary)" }}>Licence:</strong>{" "}
              Apache 2.0 — run it in your newsroom
            </span>
          </p>
        </section>
      </div>
    </main>
  );
}
