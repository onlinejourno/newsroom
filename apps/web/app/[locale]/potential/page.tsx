import {
  entityWindows,
  publishedStoriesForScoring,
  tenantIdForSlug,
  tenantRegion,
} from "@/lib/db";
import {
  WEIGHTS,
  scorePotential,
} from "@/lib/potential";
import { topicMomentum } from "@/lib/trends";

import { MinScoreSlider } from "@/components/MinScoreSlider";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const WINDOW_HOURS = 48;
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

  const [stories, recent, prior, outletRegion] = await Promise.all([
    publishedStoriesForScoring(tenantId, WINDOW_HOURS),
    entityWindows(tenantId, WINDOW_HOURS, 0),
    entityWindows(tenantId, WINDOW_HOURS * 2, WINDOW_HOURS),
    tenantRegion(tenantId),
  ]);
  const topics = topicMomentum(recent, prior).slice(0, 40);

  // Coverage per topic from published stories: topic -> host -> story count.
  const coverage = new Map<string, Map<string, number>>();
  for (const story of stories) {
    const host = story.url
      ? new URL(story.url).hostname.replace(/^www\./, "")
      : null;
    if (!host) continue;
    const ents = new Set(story.entities);
    for (const t of topics) {
      if (!ents.has(t.topic)) continue;
      const hosts = coverage.get(t.topic) ?? new Map<string, number>();
      hosts.set(host, (hosts.get(host) ?? 0) + 1);
      coverage.set(t.topic, hosts);
    }
  }

  const now = new Date();
  const allRanked = stories
    .map((story) => ({
      story,
      score: scorePotential(
        {
          host: story.url
            ? new URL(story.url).hostname.replace(/^www\./, "")
            : "",
          published_at: story.published_at,
          headline: story.headline ?? "",
          entities: story.entities,
          region: story.region,
        },
        topics,
        coverage,
        now,
        outletRegion,
      ),
    }))
    .sort((a, b) => b.score.potential - a.score.potential);

  const sectionOptions = [...new Set(
    allRanked.map((r) => r.story.section).filter((s): s is string => !!s),
  )].sort();
  const bandCounts: Record<string, number> = {};
  for (const r of allRanked)
    bandCounts[r.score.label] = (bandCounts[r.score.label] ?? 0) + 1;

  let ranked = allRanked;
  if (bands.length) ranked = ranked.filter((r) => bands.includes(r.score.label));
  if (sections.length)
    ranked = ranked.filter((r) => r.story.section && sections.includes(r.story.section));
  if (minScore > 0) ranked = ranked.filter((r) => r.score.potential >= minScore);
  if (!showAll) ranked = ranked.slice(0, SHOW);

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Story Scores</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Story Scores
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Your published stories ranked by Discover potential — so the digital
          desk can identify which ones to optimise, re-angle, or push to catch
          the trends that are moving right now.
        </p>
      </header>

      <details
        className="ds-frame p-4 mb-8 text-sm"
        style={{
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
              <td className="py-1 font-semibold">Momentum</td>
              <td>{WEIGHTS.momentum * 100}%</td>
              <td>
                How fast this topic is moving across the inflow right now. A
                topic climbing quickly scores high; one that&rsquo;s cooling
                scores low.
              </td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Trend fit</td>
              <td>{WEIGHTS.alignment * 100}%</td>
              <td>
                Does your story match a trend that&rsquo;s hot <em>in your
                market</em>? A trend heating up abroad counts much less
                (&times;0.4) and is flagged &ldquo;foreign trend&rdquo; — so a
                US story spiking on American Twitter doesn&rsquo;t inflate your
                score if you publish for an Indian audience.
              </td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Topic ownership</td>
              <td>{WEIGHTS.authority * 100}%</td>
              <td>
                Your newsroom&rsquo;s share of recent coverage on this topic
                among the stories in the inflow. High ownership means you&rsquo;re
                already seen as a voice on this subject.{" "}
                <em>
                  (Comparison against specific local competitor domains arrives
                  with Topic &rarr; Domains.)
                </em>
              </td>
            </tr>
            <tr>
              <td className="py-1 font-semibold">Freshness</td>
              <td>{WEIGHTS.freshness * 100}%</td>
              <td>
                Newer stories rank higher because the Discover window is
                time-sensitive. Under 2 hours = 100; under 24 hours = 70; under
                48 hours = 40; older = lower.
              </td>
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
        className="ds-frame p-4 mb-6 text-sm flex flex-wrap gap-x-6 gap-y-3 items-end"
        style={{
          fontFamily: "var(--font-ui)",
        }}
      >
        <fieldset>
          <legend className="ds-label mb-1">Filter by score level</legend>
          <div className="flex flex-wrap gap-1.5">
            {(["HIGH", "MEDIUM", "LOW", "VERY LOW"] as const).map((b) => (
              <label
                key={b}
                className="px-2.5 py-1 border cursor-pointer font-semibold"
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
            className="border px-2 py-1 min-w-44"
            style={{ borderColor: "var(--color-rule)", background: "var(--color-bg)" }}
          >
            {sectionOptions.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>
        </label>
        <MinScoreSlider defaultValue={minScore} />
        <label className="flex items-center gap-1.5">
          <input type="checkbox" name="all" value="1" defaultChecked={showAll} />
          Show all stories
        </label>
        <button
          type="submit"
          className="px-4 py-1.5 text-sm font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          Apply
        </button>
        <a
          href="?"
          className="px-4 py-1.5 text-sm font-semibold border no-underline"
          style={{ borderColor: "var(--color-rule)", color: "var(--color-fg-secondary)" }}
        >
          Reset
        </a>
        <span style={{ color: "var(--color-fg-tertiary)" }}>
          {ranked.length} of {allRanked.length} shown
        </span>
      </form>

      <ol className="space-y-3 list-none">
        {ranked.map(({ story, score }) => (
          <li
            key={story.id}
            className="ds-panel p-4"
            style={{
              borderLeft: `4px solid ${LABEL_COLOR[score.label]}`,
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
              {score.foreign ? (
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    border: "1px solid var(--color-fg-tertiary)",
                    color: "var(--color-fg-tertiary)",
                  }}
                >
                  foreign trend — down-weighted
                </span>
              ) : null}
            </div>
            <a
              href={story.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-lg leading-snug block mt-1"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {story.headline ?? story.url}
            </a>
            <p
              className="text-xs mt-1"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--color-fg-secondary)",
              }}
            >
              momentum {score.momentum} · trend fit {score.alignment} ·
              topic ownership {score.authority} · freshness {score.freshness}
            </p>
            <p
              className="text-xs mt-1"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--color-fg-tertiary)",
              }}
            >
              {[story.section].filter(Boolean).join(" · ")}{" "}
              {formatDate(story.published_at)}
            </p>
          </li>
        ))}
      </ol>
    </main>
  );
}
