import {
  entityWindows,
  storiesWithScores,
} from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import {
  AGE_BUCKETS,
  SIGNAL_META,
  ageBucketOf,
  scoreGem,
  type Gem,
} from "@/lib/gems";
import { topicMomentum } from "@/lib/trends";

export const dynamic = "force-dynamic";

const TREND_WINDOW_HOURS = 48;
const SHOW = 60;

const BAND_COLOR: Record<Gem["band"], string> = {
  HIGH: "#1d4ed8",
  MEDIUM: "#b45309",
  LOW: "#6b7280",
};

const BUCKET_COLOR: Record<string, string> = {
  "<6h": "#16a34a",
  "6-12h": "#1d4ed8",
  "12-24h": "#d97706",
  "24-48h": "#92400e",
  ">48h": "#dc2626",
};

export default async function GemsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; band?: string; sort?: string }>;
}) {
  const { filter, band, sort } = await searchParams;
  const tenantId = await currentTenantId();
  if (!tenantId) return null;

  const [stories, recent, prior] = await Promise.all([
    storiesWithScores(tenantId, 500),
    entityWindows(tenantId, TREND_WINDOW_HOURS, 0),
    entityWindows(tenantId, TREND_WINDOW_HOURS * 2, TREND_WINDOW_HOURS),
  ]);
  const topics = topicMomentum(recent, prior).slice(0, 80);
  const now = new Date();

  const all = stories.map((story) => ({
    story,
    gem: scoreGem(story, topics, now),
  }));

  // Stat-card counts over the full scan (the cards are clickable filters).
  const stats = {
    scanned: all.length,
    high: all.filter((g) => g.gem.band === "HIGH").length,
    atRisk: all.filter((g) => g.gem.ageBucket === "12-24h").length,
    missingImage: all.filter((g) => g.gem.missingImage).length,
    buried: all.filter((g) => g.gem.buried).length,
    onHomepage: all.filter((g) => g.gem.onHomepage).length,
  };
  // Section coverage heatmap: published per section, last 24h.
  const sectionCounts = new Map<string, number>();
  for (const { story, gem } of all) {
    if (gem.ageHours != null && gem.ageHours <= 24) {
      const k = story.section || story.beat || "(unsectioned)";
      sectionCounts.set(k, (sectionCounts.get(k) ?? 0) + 1);
    }
  }
  const heat = [...sectionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14);
  const heatMax = Math.max(1, ...heat.map(([, n]) => n));
  const bucketCounts = Object.fromEntries(
    AGE_BUCKETS.map((b) => [b, all.filter((g) => g.gem.ageBucket === b).length]),
  );
  const bandCounts = {
    HIGH: stats.high,
    MEDIUM: all.filter((g) => g.gem.band === "MEDIUM").length,
  };

  let rows = all;
  if (filter === "at-risk") rows = rows.filter((g) => g.gem.ageBucket === "12-24h");
  if (filter === "missing-image") rows = rows.filter((g) => g.gem.missingImage);
  if (filter === "buried") rows = rows.filter((g) => g.gem.buried);
  if (filter === "homepage") rows = rows.filter((g) => g.gem.onHomepage);
  if (filter && AGE_BUCKETS.includes(filter as never))
    rows = rows.filter((g) => g.gem.ageBucket === filter);
  if (band) rows = rows.filter((g) => g.gem.band === band);

  rows = [...rows].sort((a, b) => {
    if (sort === "recent") {
      return (
        new Date(b.story.published_at ?? 0).getTime() -
        new Date(a.story.published_at ?? 0).getTime()
      );
    }
    if (sort === "urgency") return b.gem.signals.urgency - a.gem.signals.urgency;
    return b.gem.score - a.gem.score;
  });
  rows = rows.slice(0, SHOW);

  const qs = (params: Record<string, string | undefined>) => {
    const merged = { filter, band, sort, ...params };
    const parts = Object.entries(merged)
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`);
    return parts.length ? `?${parts.join("&")}` : "?";
  };

  const card =
    "ds-panel p-3 text-center block no-underline";

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Hidden Gems</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Hidden Gems
        </h1>
        <p
          className="text-base max-w-3xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Already-published stories that are buried or under-surfaced — scored
          against live trends so the digital desk can re-optimise or resurface
          them before the{" "}
          <strong>12–24h at-risk Discover window</strong> closes. Stat cards
          are clickable filters; action chips show what to do now.
        </p>
      </header>

      {all.length === 0 ? (
        <div className="ds-frame p-6 mb-6 text-center" style={{ fontFamily: "var(--font-ui)" }}>
          <p className="text-base mb-1" style={{ color: "var(--color-fg-primary)" }}>
            No published stories yet.
          </p>
          <p className="text-sm" style={{ color: "var(--color-fg-secondary)" }}>
            Hidden Gems resurfaces already-published stories worth re-optimising.
            Connect your newsroom&rsquo;s CMS or a content source, then run the
            pipeline.
          </p>
        </div>
      ) : null}

      <div
        className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {[
          { label: "STORIES SCANNED", n: stats.scanned, f: undefined, c: "var(--color-fg-primary)" },
          { label: "💎 HIGH-POTENTIAL", n: stats.high, f: undefined, b: "HIGH", c: "#1d4ed8" },
          { label: "⏰ AT-RISK (12–24 H)", n: stats.atRisk, f: "at-risk", c: "#d97706" },
          { label: "🔍 BURIED (SUB-SECTION)", n: stats.buried, f: "buried", c: "#92400e" },
          { label: "🖼 MISSING IMAGE", n: stats.missingImage, f: "missing-image", c: "#dc2626" },
          { label: "🏠 ON HOMEPAGE", n: stats.onHomepage, f: "homepage", c: "#16a34a" },
        ].map((s) => {
          const active =
            (s.f && filter === s.f) || (s.b && band === s.b);
          return (
            <a
              key={s.label}
              href={qs({
                filter: s.f,
                band: (s as { b?: string }).b,
              })}
              className={card}
              style={{
                borderColor: active ? s.c : "var(--color-rule)",
                borderWidth: active ? 2 : 1,
              }}
            >
              <p className="text-xs" style={{ color: "var(--color-fg-tertiary)" }}>
                {s.label}
              </p>
              <p
                className="text-3xl font-extrabold"
                style={{ color: s.c, fontFamily: "var(--font-display)" }}
              >
                {s.n}
              </p>
            </a>
          );
        })}
      </div>

      <div
        className="flex flex-wrap items-center gap-2 mb-3 text-xs"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {AGE_BUCKETS.map((b) => (
          <a
            key={b}
            href={qs({ filter: filter === b ? undefined : b })}
            className="px-3 py-1 rounded-full font-bold no-underline"
            style={{
              background: BUCKET_COLOR[b],
              color: "white",
              opacity: filter && filter !== b ? 0.45 : 1,
            }}
          >
            {b} {bucketCounts[b]}
          </a>
        ))}
        <span className="mx-2" style={{ color: "var(--color-fg-tertiary)" }}>
          ·
        </span>
        <a
          href={qs({ band: undefined })}
          className="px-3 py-1 rounded-full border no-underline font-semibold"
          style={{ borderColor: "var(--color-rule)" }}
        >
          All
        </a>
        <a
          href={qs({ band: "HIGH" })}
          className="px-3 py-1 rounded-full border no-underline font-semibold"
          style={{ borderColor: "#1d4ed8", color: "#1d4ed8" }}
        >
          💎 HIGH ({bandCounts.HIGH})
        </a>
        <a
          href={qs({ band: "MEDIUM" })}
          className="px-3 py-1 rounded-full border no-underline font-semibold"
          style={{ borderColor: "#b45309", color: "#b45309" }}
        >
          ✨ MEDIUM ({bandCounts.MEDIUM})
        </a>
        <span className="mx-2" style={{ color: "var(--color-fg-tertiary)" }}>
          ·
        </span>
        <form method="get" className="inline-flex items-center gap-1">
          {filter ? <input type="hidden" name="filter" value={filter} /> : null}
          {band ? <input type="hidden" name="band" value={band} /> : null}
          <label>
            Sort:{" "}
            <select
              name="sort"
              defaultValue={sort ?? "score"}
              className="border px-2 py-1"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-bg)",
              }}
            >
              <option value="score">Gem score (highest)</option>
              <option value="urgency">Most at-risk</option>
              <option value="recent">Most recent</option>
            </select>
          </label>
          <button
            type="submit"
            className="px-2 py-1 border font-semibold"
            style={{ borderColor: "var(--color-rule)" }}
          >
            Apply
          </button>
        </form>
      </div>

      <details
        className="ds-frame p-4 mb-4 text-sm"
        style={{
          fontFamily: "var(--font-ui)",
        }}
      >
        <summary className="cursor-pointer font-semibold" style={{ color: "var(--color-brand)" }}>
          📊 Section coverage heatmap — which parts of the site have been updated?
        </summary>
        <p className="ds-label mt-3 mb-2">Stories published per section — last 24 h</p>
        {heat.length === 0 ? (
          <p style={{ color: "var(--color-fg-tertiary)" }}>
            Nothing published in the last 24 h in the connected corpus.
          </p>
        ) : (
          <div className="space-y-1">
            {heat.map(([sec, n], i) => (
              <div key={sec} className="flex items-center gap-2 text-xs">
                <span className="w-48 text-right" style={{ color: "var(--color-fg-secondary)" }}>
                  {sec}
                </span>
                <div className="flex-1 h-4 rounded-sm overflow-hidden" style={{ background: "var(--color-border)" }}>
                  <div
                    style={{
                      width: `${(n / heatMax) * 100}%`,
                      height: "100%",
                      background: i < 4 ? "#15803d" : i < 9 ? "#1d4ed8" : "#6d28d9",
                      opacity: 0.85,
                    }}
                  />
                </div>
                <span className="w-6">{n}</span>
              </div>
            ))}
          </div>
        )}
      </details>

      <p
        className="text-sm mb-4"
        style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
      >
        Showing <strong>{rows.length}</strong> stories
        {filter || band ? " · filtered" : ""}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(({ story, gem }, i) => (
          <div
            key={story.id}
            className="ds-panel p-4"
          >
            <div
              className="flex items-center justify-between gap-2 flex-wrap mb-1 text-xs"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <span>
                <strong className="text-xl" style={{ fontFamily: "var(--font-display)" }}>
                  #{i + 1} {gem.score}
                </strong>
                <span style={{ color: "var(--color-fg-tertiary)" }}>/100</span>
              </span>
              <span className="flex gap-1.5 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded-full font-bold"
                  style={{ background: `${BAND_COLOR[gem.band]}22`, color: BAND_COLOR[gem.band] }}
                >
                  {gem.band === "HIGH" ? "💎" : gem.band === "MEDIUM" ? "✨" : "📄"}{" "}
                  {gem.band}
                </span>
                {gem.ageBucket === "12-24h" ? (
                  <span
                    className="px-2 py-0.5 rounded-full font-bold"
                    style={{ background: "#d9770622", color: "#92400e" }}
                  >
                    ⏰ AT-RISK WINDOW
                  </span>
                ) : null}
              </span>
            </div>

            <a
              href={story.url ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-base leading-snug block"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {story.headline}
            </a>
            <p
              className="text-xs mt-1"
              style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-secondary)" }}
            >
              {[story.section, story.beat].filter(Boolean).join(" · ")}
              {gem.ageHours != null ? ` · ${gem.ageHours}h old` : ""}
              {gem.onHomepage ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full" style={{ background: "#16a34a22", color: "#16a34a" }}>
                  🏠 on homepage
                </span>
              ) : null}
              {gem.buried ? (
                <span className="ml-1 px-1.5 py-0.5 rounded-full" style={{ background: "#92400e22", color: "#92400e" }}>
                  🔍 only in sub-section
                </span>
              ) : null}
              {gem.matchedTopic ? (
                <>
                  {" · "}
                  <span
                    className="px-1.5 py-0.5 rounded-full"
                    style={{ background: "#dc262615", color: "#dc2626" }}
                  >
                    🔥 {gem.matchedTopic} ({gem.momentum})
                  </span>
                </>
              ) : null}
            </p>

            <div
              className="grid grid-cols-5 gap-2 mt-3 text-xs"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {SIGNAL_META.map((m) => (
                <div key={m.key}>
                  <p style={{ color: "var(--color-fg-tertiary)" }}>{m.label}</p>
                  <div
                    className="h-2 rounded-full overflow-hidden my-1"
                    style={{ background: "var(--color-border)" }}
                  >
                    <div
                      style={{
                        width: `${(gem.signals[m.key] / m.max) * 100}%`,
                        height: "100%",
                        background: m.color,
                      }}
                    />
                  </div>
                  <p>
                    <strong>{gem.signals[m.key]}</strong>
                    <span style={{ color: "var(--color-fg-tertiary)" }}>/{m.max}</span>
                  </p>
                </div>
              ))}
            </div>

            {gem.placementChecked ? (
              <p className="text-xs mt-2" style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-tertiary)" }}>
                📍 Listed in:{" "}
                {gem.listedIn.length
                  ? gem.listedIn.join(" · ")
                  : "no crawled front (rotated off / aged out)"}
              </p>
            ) : null}

            {gem.actions.length ? (
              <div className="mt-3 text-xs" style={{ fontFamily: "var(--font-ui)" }}>
                <p className="font-bold mb-1">Digital desk actions:</p>
                <ul className="space-y-1">
                  {gem.actions.map((a) => (
                    <li
                      key={a.label}
                      className="border px-2 py-1.5"
                      style={{ borderColor: "var(--color-rule)" }}
                    >
                      <strong style={{ color: "#1d4ed8" }}>{a.label}</strong>{" "}
                      <span style={{ color: "var(--color-fg-secondary)" }}>— {a.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="mt-2 text-xs" style={{ fontFamily: "var(--font-ui)" }}>
              <a
                className="underline"
                href={`./scores?url=${encodeURIComponent(story.url ?? "")}`}
              >
                Run full surface audit →
              </a>
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
