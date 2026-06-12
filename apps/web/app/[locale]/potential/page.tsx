import {
  entityWindows,
  fetchLatestSignals,
  tenantIdForSlug,
} from "@/lib/db";
import {
  WEIGHTS,
  hostOf,
  scorePotential,
} from "@/lib/potential";
import { topicMomentum } from "@/lib/trends";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const WINDOW_HOURS = 48;
const POOL = 80; // signals considered
const SHOW = 30;

const LABEL_COLOR: Record<string, string> = {
  HIGH: "#dc2626",
  MEDIUM: "#ca8a04",
  LOW: "#ea580c",
  "VERY LOW": "#6b7280",
};

function formatDate(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function PotentialPage({
  searchParams,
}: {
  searchParams: Promise<{
    band?: string | string[];
    section?: string | string[];
    min?: string;
    all?: string;
  }>;
}) {
  const sp = await searchParams;
  const bands = ([] as string[]).concat(sp.band ?? []);
  const sections = ([] as string[]).concat(sp.section ?? []);
  const minScore = Math.max(0, Number(sp.min) || 0);
  const showAll = sp.all === "1";
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return null;

  const [signals, recent, prior] = await Promise.all([
    fetchLatestSignals(tenantId, POOL),
    entityWindows(tenantId, WINDOW_HOURS, 0),
    entityWindows(tenantId, WINDOW_HOURS * 2, WINDOW_HOURS),
  ]);
  const topics = topicMomentum(recent, prior).slice(0, 40);

  // Coverage per topic from the same pool: topic -> host -> signal count.
  const coverage = new Map<string, Map<string, number>>();
  for (const s of signals) {
    const host = hostOf(s.url);
    if (!host) continue;
    const ents = new Set(s.enrichment?.analyse?.entities ?? []);
    for (const t of topics) {
      if (!ents.has(t.topic)) continue;
      const hosts = coverage.get(t.topic) ?? new Map<string, number>();
      hosts.set(host, (hosts.get(host) ?? 0) + 1);
      coverage.set(t.topic, hosts);
    }
  }

  const now = new Date();
  const allRanked = signals
    .map((s) => ({
      signal: s,
      score: scorePotential(
        {
          headline: s.headline,
          entities: s.enrichment?.analyse?.entities ?? [],
          published_at: s.published_at,
          host: hostOf(s.url),
        },
        topics,
        coverage,
        now,
      ),
    }))
    .sort((a, b) => b.score.potential - a.score.potential);

  const sectionOptions = [...new Set(
    allRanked.map((r) => r.signal.beat).filter((b): b is string => !!b),
  )].sort();
  const bandCounts: Record<string, number> = {};
  for (const r of allRanked)
    bandCounts[r.score.label] = (bandCounts[r.score.label] ?? 0) + 1;

  let ranked = allRanked;
  if (bands.length) ranked = ranked.filter((r) => bands.includes(r.score.label));
  if (sections.length)
    ranked = ranked.filter((r) => r.signal.beat && sections.includes(r.signal.beat));
  if (minScore > 0) ranked = ranked.filter((r) => r.score.potential >= minScore);
  if (!showAll) ranked = ranked.slice(0, SHOW);

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Discover Potential</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Discover Potential
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          The inflow ranked by what to take up first — each signal scored
          against the moving topics. The proven discover-dashboard composite,
          fed by the platform&rsquo;s own convergence engine.
        </p>
      </header>

      <details
        className="rounded-sm border p-4 mb-8 text-sm"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg-card)",
          fontFamily: "var(--font-ui)",
        }}
      >
        <summary
          className="cursor-pointer font-semibold"
          style={{ color: "var(--color-brand)" }}
        >
          How is the Discover Potential score calculated?
        </summary>
        <table className="mt-3 text-xs w-full max-w-xl">
          <tbody>
            <tr>
              <td className="py-1 font-semibold">Trend momentum</td>
              <td>{WEIGHTS.momentum * 100}%</td>
              <td>how fast the matched topic is moving in the inflow</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Content alignment</td>
              <td>{WEIGHTS.alignment * 100}%</td>
              <td>topic in the headline (guarded match) or entities</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Domain authority</td>
              <td>{WEIGHTS.authority * 100}%</td>
              <td>the source&rsquo;s share of coverage for the topic</td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Freshness</td>
              <td>{WEIGHTS.freshness * 100}%</td>
              <td>&lt;2h=100 · &lt;24h=70 · &lt;48h=40 · &gt;72h=10</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
          HIGH ≥75 — take it up now · MEDIUM ≥55 — good candidate · LOW ≥35 —
          monitor · VERY LOW — weak trend match (may still hold editorial
          value).
        </p>
      </details>

      <form
        method="get"
        className="rounded-sm border p-4 mb-6 text-sm flex flex-wrap gap-x-6 gap-y-3 items-end"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg-card)",
          fontFamily: "var(--font-ui)",
        }}
      >
        <fieldset>
          <legend className="ds-label mb-1">Filter by score level</legend>
          <div className="flex flex-wrap gap-1.5">
            {(["HIGH", "MEDIUM", "LOW", "VERY LOW"] as const).map((b) => (
              <label
                key={b}
                className="px-2.5 py-1 rounded-sm border cursor-pointer font-semibold"
                style={{
                  borderColor: LABEL_COLOR[b],
                  color: LABEL_COLOR[b],
                  background: bands.includes(b) ? `${LABEL_COLOR[b]}22` : "transparent",
                }}
              >
                <input
                  type="checkbox"
                  name="band"
                  value={b}
                  defaultChecked={bands.includes(b)}
                  className="mr-1 accent-current"
                />
                {b} ({bandCounts[b] ?? 0})
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="ds-label">Filter by section</span>
          <select
            name="section"
            multiple
            size={3}
            defaultValue={sections}
            className="border rounded-sm px-2 py-1 min-w-44"
            style={{ borderColor: "var(--color-border)", background: "var(--color-bg)" }}
          >
            {sectionOptions.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="ds-label">Minimum score · {minScore}</span>
          <input
            type="range"
            name="min"
            min={0}
            max={100}
            defaultValue={minScore}
            className="w-44"
          />
        </label>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="all" value="1" defaultChecked={showAll} />
          Show all stories
        </label>
        <button
          type="submit"
          className="px-4 py-1.5 rounded-sm text-sm font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          Apply
        </button>
        <span style={{ color: "var(--color-fg-tertiary)" }}>
          {ranked.length} of {allRanked.length} shown
        </span>
      </form>

      <ol className="space-y-3 list-none">
        {ranked.map(({ signal, score }) => (
          <li
            key={signal.id}
            className="rounded-sm border p-4"
            style={{
              borderColor: "var(--color-border)",
              borderLeft: `4px solid ${LABEL_COLOR[score.label]}`,
              background: "var(--color-bg-card)",
            }}
          >
            <div
              className="flex items-baseline gap-2 flex-wrap text-sm"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <strong style={{ color: LABEL_COLOR[score.label] }}>
                [{score.label}] {score.potential}/100
              </strong>
              {score.matchedTrend ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    border: "1px solid var(--color-fg-tertiary)",
                    color: "var(--color-fg-secondary)",
                  }}
                >
                  trend: {score.matchedTrend}
                </span>
              ) : null}
            </div>
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-lg leading-snug block mt-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {signal.headline ?? signal.url}
            </a>
            <p
              className="text-xs mt-1"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--color-fg-secondary)",
              }}
            >
              momentum {score.momentum} · alignment {score.alignment} ·
              authority {score.authority} · freshness {score.freshness}
            </p>
            <p
              className="text-xs mt-1"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--color-fg-tertiary)",
              }}
            >
              {[signal.beat, signal.source_name].filter(Boolean).join(" · ")} ·{" "}
              {formatDate(signal.published_at)}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
