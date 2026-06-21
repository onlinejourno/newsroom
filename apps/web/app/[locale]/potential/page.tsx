import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  cachedTopicDomains,
  entityWindows,
  publishedStoriesForScoring,
  tenantRegion,
  upsertTopicDomains,
} from "@/lib/db";
import { assertWritable, getAccount } from "@/lib/auth";
import { currentTenantId } from "@/lib/tenant";
import {
  WEIGHTS,
  scorePotential,
} from "@/lib/potential";
import { fetchTopicDomains } from "@/lib/topicDomains";
import { topicMomentum } from "@/lib/trends";

import { MinScoreSlider } from "@/components/MinScoreSlider";

export const dynamic = "force-dynamic";

const WINDOW_HOURS = 48;
const SHOW = 30;
/** Max distinct trends to warm per on-demand refresh (avoid GDELT storms). */
const WARM_CAP = 8;

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
  const tenantId = await currentTenantId();
  if (!tenantId) return null;

  const [stories, recent, prior, outletRegion] = await Promise.all([
    publishedStoriesForScoring(tenantId, WINDOW_HOURS),
    entityWindows(tenantId, WINDOW_HOURS, 0),
    entityWindows(tenantId, WINDOW_HOURS * 2, WINDOW_HOURS),
    tenantRegion(tenantId),
  ]);
  const topics = topicMomentum(recent, prior).slice(0, 40);

  // Derive outletDomain from the dominant host in published stories.
  const hostFreq = new Map<string, number>();
  for (const story of stories) {
    if (!story.url) continue;
    try {
      const h = new URL(story.url).hostname.replace(/^www\./, "");
      if (h) hostFreq.set(h, (hostFreq.get(h) ?? 0) + 1);
    } catch {
      // malformed URL — skip
    }
  }
  let outletDomain: string | undefined;
  let maxFreq = 0;
  for (const [h, n] of hostFreq) {
    if (n > maxFreq) { maxFreq = n; outletDomain = h; }
  }

  // Coverage per topic from published stories: topic -> host -> story count.
  const coverage = new Map<string, Map<string, number>>();
  for (const story of stories) {
    const host = story.url
      ? (() => {
          try { return new URL(story.url).hostname.replace(/^www\./, ""); }
          catch { return null; }
        })()
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

  // Collect distinct matched trends across all stories (for cache reads + warm UI).
  const storyTrends = new Map<string, string>(); // storyId → matchedTrend
  for (const story of stories) {
    const ents = new Set(story.entities);
    const headline = story.headline ?? "";
    for (const t of topics) {
      if (ents.has(t.topic) || (headline && headline.toLowerCase().includes(t.topic.toLowerCase()))) {
        storyTrends.set(story.id, t.topic);
        break;
      }
    }
  }
  const distinctTrends = [...new Set(storyTrends.values())];

  // On load: read cache once per distinct trend (NO fetchTopicDomains on load).
  const trendDomainsCache = new Map<string, { domain: string; count: number }[]>();
  await Promise.all(
    distinctTrends.map(async (trend) => {
      const cached = await cachedTopicDomains(tenantId, trend);
      if (cached && cached.domains.length > 0) {
        trendDomainsCache.set(trend, cached.domains);
      }
    }),
  );

  const now = new Date();
  const allRanked = stories
    .map((story) => {
      const matchedTrend = storyTrends.get(story.id);
      const topicDomains = matchedTrend
        ? trendDomainsCache.get(matchedTrend)
        : undefined;
      return {
        story,
        score: scorePotential(
          {
            host: story.url
              ? (() => {
                  try { return new URL(story.url).hostname.replace(/^www\./, ""); }
                  catch { return null; }
                })()
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
          topicDomains,
          outletDomain,
        ),
      };
    })
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

  // On-demand warm action: fetch GDELT for top WARM_CAP distinct trends shown.
  async function refreshCompetitorData(_formData: FormData) {
    "use server";
    const me = await getAccount();
    assertWritable(me);
    const tid = await currentTenantId();
    if (!tid) return;

    const [recentW, priorW] = await Promise.all([
      entityWindows(tid, WINDOW_HOURS, 0),
      entityWindows(tid, WINDOW_HOURS * 2, WINDOW_HOURS),
    ]);
    const topicsW = topicMomentum(recentW, priorW).slice(0, 40);
    const storiesW = await publishedStoriesForScoring(tid, WINDOW_HOURS);

    // Collect distinct matched trends (order by score desc proxy: topic momentum).
    const trendSet = new Set<string>();
    for (const story of storiesW) {
      const ents = new Set(story.entities);
      for (const t of topicsW) {
        if (ents.has(t.topic) || (story.headline ?? "").toLowerCase().includes(t.topic.toLowerCase())) {
          trendSet.add(t.topic);
          break;
        }
      }
      if (trendSet.size >= WARM_CAP) break;
    }

    await Promise.all(
      [...trendSet].map(async (trend) => {
        const result = await fetchTopicDomains(trend, 7);
        if (result.available && result.source && result.domains) {
          await upsertTopicDomains(tid, trend, result.source, result.domains);
        }
      }),
    );

    revalidatePath("/[locale]/potential", "page");
    redirect("/potential" as `/${string}`);
  }

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
                {" "}
                <strong>vs competitor domains</strong> (GDELT, cached) — falls
                back to your own coverage share until competitor data is
                refreshed.{" "}
                <em>
                  Competitor data refreshes on demand; cached 12h.
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

      {/* On-demand competitor data warm */}
      <div
        className="ds-frame p-3 mb-6 text-xs flex items-center gap-4"
        style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
      >
        <form action={refreshCompetitorData}>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold border"
            style={{
              borderColor: "var(--color-rule)",
              color: "var(--color-fg-secondary)",
              background: "transparent",
            }}
          >
            Refresh competitor data
          </button>
        </form>
        <span>
          Competitor data refreshes on demand; cached 12h. Warms up to{" "}
          {WARM_CAP} trends via GDELT.
        </span>
      </div>

      {allRanked.length === 0 ? (
        <div className="ds-frame p-6 text-center" style={{ fontFamily: "var(--font-ui)" }}>
          <p className="text-base mb-1" style={{ color: "var(--color-fg-primary)" }}>
            No published stories yet.
          </p>
          <p className="text-sm" style={{ color: "var(--color-fg-secondary)" }}>
            Story Scores ranks your newsroom&rsquo;s published stories (last 48h)
            against live trends. Connect your newsroom&rsquo;s CMS or a content
            source, then run the pipeline.
          </p>
        </div>
      ) : null}
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
              topic ownership {score.authority}
              {" "}
              <span style={{ color: "var(--color-fg-tertiary)" }}>
                {score.authoritySource === "competitors"
                  ? "(vs competitors)"
                  : "(your coverage)"}
              </span>
              {" "}· freshness {score.freshness}
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
