import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  entityWindows,
  publishedPerDay,
  storiesWithScores,
} from "@/lib/db";
import { assertWritable, endSession, getAccount, roomForRole } from "@/lib/auth";
import { currentTenantId } from "@/lib/tenant";
import { Sparkline } from "@/components/Sparkline";
import { topicMomentum } from "@/lib/trends";
import { LIFECYCLE, WORKFLOW_EXTRA } from "@/lib/nav";
import { LANDING } from "@/content/landing";

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


export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tenantId = await currentTenantId();
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
    const me = await getAccount();
    assertWritable(me);
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

        <p className="ds-label mb-4">{LANDING.hero.eyebrow}</p>

        <h1
          className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {LANDING.hero.titleLines[0]}
          <br />{LANDING.hero.titleLines[1]}
        </h1>

        <p
          className="text-lg md:text-xl mb-10"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
            lineHeight: 1.55,
          }}
        >
          {LANDING.hero.dek}
        </p>

        {user && snapshot ? (
          <section
            className="ds-frame p-5 text-left mb-2"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
              <p className="ds-label">
                {LANDING.snapshot.heading.replace("{h}", String(SNAPSHOT_HOURS))}
              </p>
              <span className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
                {LANDING.snapshot.signedInAs} <strong>{user.name}</strong> ({user.role ?? "reporter"})
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              {[
                { n: snapshot.total, l: LANDING.snapshot.stats.total, c: "var(--color-fg-primary)" },
                { n: snapshot.grade, l: LANDING.snapshot.stats.grade, c: "#16a34a" },
                { n: snapshot.trending, l: LANDING.snapshot.stats.trending, c: "#2563eb" },
                { n: snapshot.tweak, l: LANDING.snapshot.stats.tweak, c: "#d97706" },
                { n: snapshot.intervene, l: LANDING.snapshot.stats.intervene, c: "#dc2626" },
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
            {snapshot.total === 0 ? (
              <p className="text-xs mt-3" style={{ color: "var(--color-fg-tertiary)" }}>
                {LANDING.snapshot.empty.replace("{h}", String(SNAPSHOT_HOURS))}
              </p>
            ) : null}
            <div className="flex items-center gap-3 mt-4 pt-3 border-t" style={{ borderColor: "var(--color-rule)" }}>
              <span className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
                {LANDING.snapshot.trend7dLabel}
              </span>
              <Sparkline points={snapshot.trend} color="#2563eb" />
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap mt-4">
              <Link
                href={`/${locale}/${roomForRole(user.role, user.slug)}` as Route}
                className="px-4 py-2 rounded-sm text-sm font-semibold no-underline"
                style={{ background: "var(--color-brand)", color: "white" }}
              >
                {LANDING.snapshot.goToRoom}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-xs underline"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  {LANDING.snapshot.signOut}
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
              {LANDING.loggedOut.prompt}
            </p>
            <Link
              href={`/${locale}/onboarding`}
              className="px-4 py-2 rounded-sm text-sm font-semibold no-underline"
              style={{ background: "var(--color-brand)", color: "white" }}
            >
              {LANDING.loggedOut.cta}
            </Link>
          </section>
        )}

        <hr className="ds-rule my-10" />

        {/* Lifecycle — Plan·Calendar lead card, prominent. */}
        <div className="text-left mb-6">
          <Link
            href={`/${locale}/${LIFECYCLE[0].path}` as Route}
            className="block ds-frame p-6 hover:no-underline"
            style={{ textDecoration: "none" }}
          >
            <p className="ds-label mb-1">{LIFECYCLE[0].verb} · Start here</p>
            <p
              className="text-2xl font-extrabold mb-1 hover:underline"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}
            >
              {LIFECYCLE[0].label}
            </p>
            <p
              className="text-sm"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-fg-secondary)",
                lineHeight: 1.5,
              }}
            >
              {LIFECYCLE[0].blurb}
            </p>
          </Link>
        </div>

        {/* Remaining lifecycle stages — grid */}
        <div className="grid md:grid-cols-3 gap-4 text-left mb-8">
          {LIFECYCLE.slice(1).map((s) => (
            <Link
              key={s.path}
              href={`/${locale}/${s.path}` as Route}
              className="block ds-frame p-4 hover:no-underline"
              style={{ textDecoration: "none" }}
            >
              <p className="ds-meta mb-1" style={{ color: "var(--color-fg-tertiary)" }}>{s.verb}</p>
              <p
                className="font-bold mb-1"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}
              >
                {s.label}
              </p>
              <p
                className="text-sm"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-fg-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {s.blurb}
              </p>
            </Link>
          ))}
        </div>

        {/* Secondary surfaces — compact link row */}
        <div className="text-left mb-4" style={{ fontFamily: "var(--font-ui)" }}>
          <p className="ds-label mb-2">More surfaces</p>
          <p className="text-sm flex gap-4 flex-wrap">
            {WORKFLOW_EXTRA.map((s) => (
              <Link
                key={`${s.verb}-${s.path}`}
                href={`/${locale}/${s.path}` as Route}
                className="underline"
                style={{ color: "var(--color-brand)" }}
              >
                {s.label}
              </Link>
            ))}
          </p>
        </div>

        <hr className="ds-rule my-10" />

        {/* Grounded in journalism scholarship — the platform's intellectual
            spine, made explicit (not a footnote). Three tested lenses. */}
        <section className="ds-frame p-6 text-left">
          <p className="ds-label mb-1">{LANDING.scholarship.eyebrow}</p>
          <h2 className="ds-h2 mb-1">{LANDING.scholarship.heading}</h2>
          <p
            className="text-sm mb-5"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-secondary)" }}
          >
            {LANDING.scholarship.intro}
          </p>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            {LANDING.scholarship.lenses.map((g) => (
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
              {LANDING.scholarship.loop}
            </span>
            <span>
              <strong style={{ color: "var(--color-fg-secondary)" }}>Licence:</strong>{" "}
              {LANDING.scholarship.licence}
            </span>
          </p>
        </section>
      </div>
    </main>
  );
}
