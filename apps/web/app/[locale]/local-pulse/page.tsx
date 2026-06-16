import { redirect } from "next/navigation";
import type { Route } from "next";

import { getAccount } from "@/lib/auth";
import { regionalPulse, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

export default async function LocalPulsePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ region?: string }>;
}) {
  const { locale } = await params;
  const me = await getAccount();
  if (!me) redirect(`/${locale}/login` as Route);

  const { region: regionFilter } = await searchParams;

  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const pulse = tenantId ? await regionalPulse(tenantId, 48) : [];

  // All regions ordered by signalCount desc (DB already sorts this way, but be explicit).
  const allRegions = pulse.sort((a, b) => b.signalCount - a.signalCount);
  const totalSignals = allRegions.reduce((s, r) => s + r.signalCount, 0);

  // If a region filter is active, narrow to that one.
  const focused = regionFilter?.trim()
    ? allRegions.filter(
        (r) => r.region.toLowerCase() === regionFilter.trim().toLowerCase(),
      )
    : allRegions;

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      {/* ── Header ── */}
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Local Pulse</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Local Pulse
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          What&rsquo;s trending by state &amp; city — from your own geo-tagged
          coverage. Spot where a region is moving but you&rsquo;re thin before
          the desk meets.
        </p>
        {allRegions.length > 0 && (
          <p
            className="text-xs mt-2"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--color-fg-tertiary)",
            }}
          >
            {totalSignals.toLocaleString()} signals across {allRegions.length}{" "}
            regions · last 48 hours
          </p>
        )}
      </header>

      {/* ── Region filter chips ── */}
      {allRegions.length > 1 && (
        <nav
          className="flex flex-wrap gap-2 mb-8"
          aria-label="Filter by region"
          style={{ fontFamily: "var(--font-ui)" }}
        >
          {/* "All" chip */}
          <a
            href="?"
            className="px-3 py-1 text-xs rounded-full border"
            style={{
              borderColor: "var(--color-rule)",
              background: !regionFilter
                ? "var(--color-brand)"
                : "var(--color-bg)",
              color: !regionFilter ? "white" : "var(--color-fg-secondary)",
              textDecoration: "none",
            }}
          >
            All
          </a>

          {allRegions.map((r) => {
            const isActive =
              regionFilter?.trim().toLowerCase() ===
              r.region.toLowerCase();
            return (
              <a
                key={r.region}
                href={`?region=${encodeURIComponent(r.region)}`}
                className="px-3 py-1 text-xs rounded-full border"
                style={{
                  borderColor: "var(--color-rule)",
                  background: isActive
                    ? "var(--color-brand)"
                    : "var(--color-bg)",
                  color: isActive ? "white" : "var(--color-fg-secondary)",
                  textDecoration: "none",
                }}
              >
                {r.region}
              </a>
            );
          })}
        </nav>
      )}

      {/* ── Results ── */}
      {focused.length === 0 && allRegions.length === 0 ? (
        /* Empty state — no geo-tagged data yet */
        <div
          className="ds-frame p-6 text-sm"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--color-fg-secondary)",
          }}
        >
          No geo-tagged signals yet — regions appear once the NLP enrichment
          tags coverage.
        </div>
      ) : focused.length === 0 ? (
        /* Filter active but matched nothing */
        <div
          className="ds-frame p-6 text-sm"
          style={{
            fontFamily: "var(--font-ui)",
            color: "var(--color-fg-secondary)",
          }}
        >
          No signals for &ldquo;{regionFilter}&rdquo; in the last 48 hours.{" "}
          <a
            href="?"
            style={{ color: "var(--color-brand)", textDecoration: "underline" }}
          >
            Show all regions
          </a>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {focused.map((r) => {
            const sharePct =
              totalSignals > 0
                ? Math.round((r.signalCount / totalSignals) * 100)
                : 0;

            return (
              <section key={r.region} className="ds-frame overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-baseline justify-between px-4 pt-4 pb-3"
                  style={{ borderBottom: "1px solid var(--color-rule)" }}
                >
                  <h2
                    className="font-bold text-lg leading-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {r.region}
                  </h2>
                  <span
                    className="text-xs tabular-nums ml-4 shrink-0"
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "var(--color-fg-tertiary)",
                    }}
                  >
                    {r.signalCount.toLocaleString()} signals
                    {totalSignals > 0 ? ` · ${sharePct}%` : ""}
                  </span>
                </div>

                {/* Topics */}
                {r.topics.length > 0 ? (
                  <ol
                    className="divide-y text-sm"
                    style={{
                      fontFamily: "var(--font-ui)",
                      borderColor: "var(--color-rule)",
                    }}
                  >
                    {r.topics.map((t, i) => (
                      <li
                        key={t.topic}
                        className="flex items-center justify-between px-4 py-2.5 gap-3"
                        style={{ borderColor: "var(--color-rule)" }}
                      >
                        <span
                          className="tabular-nums w-5 shrink-0 text-right"
                          style={{ color: "var(--color-fg-tertiary)" }}
                        >
                          {i + 1}
                        </span>
                        <span
                          className="flex-1 capitalize"
                          style={{ color: "var(--color-fg)" }}
                        >
                          {t.topic}
                        </span>
                        <span
                          className="tabular-nums shrink-0"
                          style={{ color: "var(--color-fg-secondary)" }}
                        >
                          {t.count}
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p
                    className="px-4 py-3 text-xs"
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "var(--color-fg-tertiary)",
                    }}
                  >
                    No entity topics extracted yet.
                  </p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
