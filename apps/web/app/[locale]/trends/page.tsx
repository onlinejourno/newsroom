import {
  channelAffinity,
  distinctSignalRegions,
  entityWindows,
  publishedStoriesForScoring,
  signalsMentioning,
  tenantIdForSlug,
  topicDomains,
} from "@/lib/db";
import { getOrFetchOutletKeywords } from "@/lib/outletKeywords";
import { momentumLabel, topicMomentum } from "@/lib/trends";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const TOP = 12;

// Indian states and union territories for coarse entity-type classification.
const INDIAN_STATES = new Set([
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
  "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
  "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
  "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu",
  "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal",
  "delhi", "jammu and kashmir", "ladakh", "puducherry", "chandigarh",
  "andaman and nicobar", "dadra and nagar haveli", "daman and diu", "lakshadweep",
]);

function coarseType(topic: string): string {
  return INDIAN_STATES.has(topic.toLowerCase()) ? "Location" : "Topic";
}

function direction(recent: number, prior: number): string {
  if (recent > prior) return "Rising";
  if (recent < prior) return "Falling";
  return "Stable";
}

function predictionBand(momentum: number): string {
  if (momentum >= 80) return "Peak imminent — act now";
  if (momentum >= 65) return "Likely to peak within hours";
  if (momentum >= 45) return "Building — watch closely";
  if (momentum >= 25) return "Holding — monitor";
  return "Fading — may not recover";
}

const LABEL_COLOR: Record<string, string> = {
  "🔥": "#dc2626",
  "↑": "#ea580c",
  "→": "#2563eb",
  "~": "#6b7280",
  "↓": "#0d9488",
};

function labelColor(label: string): string {
  return LABEL_COLOR[label.slice(0, 2).trim()] ?? "#6b7280";
}

const DIR_COLOR: Record<string, string> = {
  Rising: "#16a34a",
  Falling: "#dc2626",
  Stable: "#6b7280",
};

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; region?: string }>;
}) {
  const { window: w, region } = await searchParams;
  const windowHours = Math.max(1, Number(w) || 24);
  const regionPick = region || null;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return null;

  // ── base data ──────────────────────────────────────────────────────────────
  const [recent, prior, regions, stories, affinity] = await Promise.all([
    entityWindows(tenantId, windowHours, 0, regionPick),
    entityWindows(tenantId, windowHours * 2, windowHours, regionPick),
    distinctSignalRegions(tenantId),
    publishedStoriesForScoring(tenantId, 168),
    channelAffinity(tenantId, 90),
  ]);

  const topics = topicMomentum(recent, prior).slice(0, TOP);

  const [drill, owners] = await Promise.all([
    Promise.all(
      topics.map((t) => signalsMentioning(tenantId, t.topic, windowHours, 3)),
    ),
    Promise.all(
      topics.map((t) => topicDomains(tenantId, t.topic, windowHours, 4)),
    ),
  ]);

  // ── outlet domain (mirrors potential/page.tsx derivation) ──────────────────
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
  let outletDomain = "thehindu.com";
  let maxFreq = 0;
  for (const [h, n] of hostFreq) {
    if (n > maxFreq) { maxFreq = n; outletDomain = h; }
  }

  // ── Top Keywords ───────────────────────────────────────────────────────────
  const keywords = await getOrFetchOutletKeywords(tenantId, outletDomain);

  // ── channel affinity convenience ───────────────────────────────────────────
  const ct = affinity.channel_totals;

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-6 md:p-10">
      {/* ── Header ── */}
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Trending Topics</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Trending Topics
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Topics moving right now — ranked by momentum across the enriched
          inflow. The same entity surfacing across multiple signals in the last{" "}
          {windowHours}h vs the prior {windowHours}h defines the trend; the
          momentum bands show how fast each topic is accelerating.
        </p>
      </header>

      {/* ── Window / Region filter ── */}
      <form
        method="get"
        className="mb-10 flex items-center gap-2 text-sm"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <label>
          Window:{" "}
          <select
            name="window"
            defaultValue={String(windowHours)}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            {[6, 12, 24, 48, 168].map((h) => (
              <option key={h} value={h}>
                Last {h} hours
              </option>
            ))}
          </select>
        </label>
        <label>
          Local pulse:{" "}
          <select
            name="region"
            defaultValue={regionPick ?? ""}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            <option value="">everywhere</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="px-3 py-1 border font-semibold"
          style={{ borderColor: "var(--color-rule)" }}
        >
          Apply
        </button>
      </form>

      {/* ── Section 1: Editorial Overview table ── */}
      <section className="mb-12">
        <h2
          className="text-xl font-bold mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Editorial Overview
        </h2>
        <p
          className="text-sm mb-4"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
        >
          Topics ranked by momentum in the last {windowHours}h window. Direction
          compares recent vs prior half-window; prediction reflects momentum
          band trajectory.
        </p>

        {topics.length === 0 ? (
          <p
            className="ds-frame p-4 text-sm"
            style={{ color: "var(--color-fg-secondary)", fontFamily: "var(--font-ui)" }}
          >
            No enriched signals in this window — run collect + enrich, or widen
            the window.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              style={{ fontFamily: "var(--font-ui)", borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-rule)" }}>
                  {["Topic", "Type", "Signal", "Score", "Direction", "Prediction"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 font-semibold"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {topics.map((t, i) => {
                  const label = momentumLabel(t.momentum);
                  const color = labelColor(label);
                  const dir = direction(t.recent, t.prior);
                  return (
                    <tr
                      key={t.topic}
                      style={{ borderBottom: "1px solid var(--color-rule)" }}
                    >
                      <td className="py-2.5 pr-4 font-semibold" style={{ color }}>
                        {t.topic}
                        {drill[i].length > 0 && (
                          <ul className="mt-1 space-y-0.5">
                            {drill[i].map((s) => (
                              <li key={s.id}>
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs hover:underline"
                                  style={{ color: "var(--color-fg-tertiary)" }}
                                >
                                  {s.headline ?? s.url}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                        {owners[i].length > 0 && (
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "var(--color-fg-tertiary)" }}
                          >
                            {owners[i].map((o) => `${o.host} ×${o.n}`).join(" · ")}
                          </p>
                        )}
                      </td>
                      <td
                        className="py-2.5 pr-4 text-xs"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {coarseType(t.topic)}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className="font-bold text-sm"
                          style={{ color }}
                        >
                          {label}
                        </span>
                      </td>
                      <td
                        className="py-2.5 pr-4 font-mono text-xs"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {t.momentum}
                      </td>
                      <td
                        className="py-2.5 pr-4 text-xs font-semibold"
                        style={{ color: DIR_COLOR[dir] }}
                      >
                        {dir}
                      </td>
                      <td
                        className="py-2.5 text-xs"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {predictionBand(t.momentum)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 2: Top Keywords (90d) ── */}
      <section className="mb-12">
        <h2
          className="text-xl font-bold mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Top Keywords (90d)
        </h2>
        <p
          className="text-sm mb-4"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
        >
          Ranking keywords for{" "}
          <span className="font-semibold">{outletDomain}</span> — volume,
          cost-per-click, competition, and estimated position. Cached 72h;
          refreshes automatically.
        </p>

        {keywords.length === 0 ? (
          <div
            className="ds-frame p-4 text-sm"
            style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
          >
            Keyword data unavailable for {outletDomain} — this fills
            automatically on the next pipeline run, or run{" "}
            <code className="font-mono text-xs">onlinejourno-scoring ranking-keywords {outletDomain}</code>{" "}
            to refresh now.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table
              className="w-full text-sm"
              style={{ fontFamily: "var(--font-ui)", borderCollapse: "collapse" }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--color-rule)" }}>
                  {["Keyword", "Volume", "CPC (USD)", "Competition", "Position"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left py-2 pr-4 font-semibold"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {keywords.slice(0, 30).map((kw) => (
                  <tr
                    key={kw.keyword}
                    style={{ borderBottom: "1px solid var(--color-rule)" }}
                  >
                    <td className="py-2 pr-4 font-medium">{kw.keyword}</td>
                    <td
                      className="py-2 pr-4 font-mono text-xs"
                      style={{ color: "var(--color-fg-secondary)" }}
                    >
                      {kw.vol != null ? kw.vol.toLocaleString() : "—"}
                    </td>
                    <td
                      className="py-2 pr-4 font-mono text-xs"
                      style={{ color: "var(--color-fg-secondary)" }}
                    >
                      {kw.cpc != null ? `$${kw.cpc.toFixed(2)}` : "—"}
                    </td>
                    <td
                      className="py-2 pr-4 font-mono text-xs"
                      style={{ color: "var(--color-fg-secondary)" }}
                    >
                      {kw.competition != null
                        ? kw.competition.toFixed(2)
                        : "—"}
                    </td>
                    <td
                      className="py-2 font-mono text-xs"
                      style={{ color: "var(--color-fg-secondary)" }}
                    >
                      {kw.position != null ? kw.position : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 3: Channel Performance & Entity Affinity ── */}
      <section className="mb-12">
        <h2
          className="text-xl font-bold mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Channel Performance &amp; Entity Affinity
        </h2>
        <p
          className="text-sm mb-6"
          style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
        >
          Which entity types &amp; sections you perform on across channels —
          logged every pipeline refresh, grows over time. Last 90 days.
        </p>

        {affinity.total === 0 ? (
          <div
            className="ds-frame p-4 text-sm mb-6"
            style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
          >
            Affinity logging just started — fills as the pipeline runs.
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {(
                [
                  {
                    label: "Google News",
                    key: "google_news",
                    description: "Appearances via Google News channel",
                  },
                  {
                    label: "Discover",
                    key: "discover",
                    description: "Appearances via Google Discover",
                  },
                  {
                    label: "Search",
                    key: "search",
                    description: "Appearances via Search channel",
                  },
                ] as const
              ).map(({ label, key, description }) => (
                <div
                  key={key}
                  className="ds-panel p-4"
                  title={description}
                >
                  <p
                    className="ds-label mb-1"
                    style={{ fontFamily: "var(--font-ui)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-3xl font-extrabold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {(ct[key] ?? 0).toLocaleString()}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--color-fg-tertiary)", fontFamily: "var(--font-ui)" }}
                  >
                    appearances (90d)
                  </p>
                </div>
              ))}
            </div>

            {/* By entity type table */}
            <h3
              className="text-base font-semibold mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              By entity type
            </h3>
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ fontFamily: "var(--font-ui)", borderCollapse: "collapse" }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-rule)" }}>
                    {["Entity type", "Appearances", "Top channels", "Top sections"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left py-2 pr-4 font-semibold"
                          style={{ color: "var(--color-fg-secondary)" }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {affinity.by_entity_type.map((row) => (
                    <tr
                      key={row.entity_type}
                      style={{ borderBottom: "1px solid var(--color-rule)" }}
                    >
                      <td className="py-2.5 pr-4 font-semibold">
                        {row.entity_type}
                      </td>
                      <td
                        className="py-2.5 pr-4 font-mono text-xs"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {row.appearances.toLocaleString()}
                      </td>
                      <td
                        className="py-2.5 pr-4 text-xs"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {row.top_channels.length > 0
                          ? row.top_channels.slice(0, 3).join(", ")
                          : "—"}
                      </td>
                      <td
                        className="py-2.5 text-xs"
                        style={{ color: "var(--color-fg-secondary)" }}
                      >
                        {row.top_sections.length > 0
                          ? row.top_sections.slice(0, 3).join(", ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
