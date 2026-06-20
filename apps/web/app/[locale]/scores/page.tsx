import { analyzeUrl, type AnalyzeResult } from "@/lib/analyze";
import { probityScan, type ProbityResult } from "@/lib/probity";
import {
  storiesWithScores,
  storyClassifications,
  storyCount,
} from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import {
  ROLE_META,
  subscriptionRole,
  type SubscriptionRole,
} from "@/lib/differentiation";

export const dynamic = "force-dynamic";

// The Differentiation Ratio (ADR 0054-B): share of own output that is
// conversion/renewal-driver content vs the commodity AI summarises for free —
// "the single most important number" for a subscription masthead.
function DifferentiationPanel({
  classes,
  total,
}: {
  classes: { frame: string | null; user_need: string | null }[];
  total: number;
}) {
  if (classes.length === 0) return null;
  const counts: Record<SubscriptionRole, number> = {
    table_stakes: 0,
    conversion_driver: 0,
    renewal_driver: 0,
  };
  for (const c of classes) counts[subscriptionRole(c.frame, c.user_need)]++;
  const n = classes.length;
  const drivers = counts.conversion_driver + counts.renewal_driver;
  const ratio = Math.round((drivers / n) * 100);
  const order: SubscriptionRole[] = [
    "conversion_driver",
    "renewal_driver",
    "table_stakes",
  ];
  return (
    <section
      className="ds-frame p-4 mb-8"
      style={{
        fontFamily: "var(--font-ui)",
      }}
    >
      <p className="ds-label mb-2">
        Differentiation ratio · {ratio}% driver content · {n} of {total}{" "}
        stories classified
      </p>
      <div
        className="flex h-3 w-full overflow-hidden rounded-full mb-2"
        style={{ background: "var(--color-border)" }}
      >
        {order.map((role) =>
          counts[role] > 0 ? (
            <div
              key={role}
              style={{
                width: `${(counts[role] / n) * 100}%`,
                background: ROLE_META[role].color,
              }}
              title={`${ROLE_META[role].label}: ${counts[role]}`}
            />
          ) : null,
        )}
      </div>
      <p className="text-xs" style={{ color: "var(--color-fg-secondary)" }}>
        {order
          .map(
            (role) =>
              `${ROLE_META[role].label} ${Math.round((counts[role] / n) * 100)}%`,
          )
          .join(" · ")}
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--color-fg-tertiary)" }}>
        Heuristic v1 over PEJ frame + reader need (ADR 0054): analysis,
        accountability and profile frames → conversion; service (&lsquo;do&rsquo;)
        and explainer depth → renewal; straight/update output → table stakes,
        the layer AI summarises for free.
      </p>
    </section>
  );
}

const SURFACE_ORDER = ["discover", "google_news", "google_search"] as const;
const SURFACE_SHORT: Record<string, string> = {
  discover: "D",
  google_news: "N",
  google_search: "S",
};

function band(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "HIGH", color: "#16a34a" };
  if (score >= 50) return { label: "MEDIUM", color: "#2563eb" };
  return { label: "LOW", color: "#b45309" };
}

function cellColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#2563eb";
  return "#b45309";
}

function composite(scores: Record<string, { score: number }>): number {
  const vals = Object.values(scores).map((s) => s.score);
  return vals.length
    ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
    : 0;
}

function AnalyzePanel({ res }: { res: AnalyzeResult }) {
  if (res.error) {
    return (
      <p className="text-sm mt-3" style={{ color: "#b91c1c" }}>
        {res.error}
      </p>
    );
  }
  const b = band(res.composite);
  return (
    <div className="mt-4 text-sm" style={{ fontFamily: "var(--font-ui)" }}>
      <p className="font-bold" style={{ fontFamily: "var(--font-display)" }}>
        {res.title || res.url}
      </p>
      <p style={{ color: "var(--color-fg-secondary)" }}>
        {res.word_count ?? 0} words · composite{" "}
        <strong style={{ color: b.color }}>
          {res.composite} {b.label}
        </strong>
        {res.user_need ? ` · need: ${res.user_need}` : null}
      </p>
      <ul className="mt-2 space-y-1">
        {Object.entries(res.channels).map(([surface, ch]) => (
          <li key={surface}>
            <span
              className="inline-block w-20 font-semibold"
              style={{
                color: res.priority_surfaces?.includes(surface)
                  ? "var(--color-brand)"
                  : "var(--color-fg-primary)",
              }}
            >
              {res.priority_surfaces?.includes(surface) ? "★ " : ""}
              {surface.split("_").pop()}
            </span>{" "}
            <strong style={{ color: cellColor(ch.score) }}>
              {ch.grade} ({ch.score})
            </strong>{" "}
            <span style={{ color: "var(--color-fg-secondary)" }}>
              — {ch.top_fix ?? "no fix needed"}
            </span>
          </li>
        ))}
      </ul>
      {res.top_fix ? (
        <p className="mt-2 font-semibold" style={{ color: "#b45309" }}>
          Fix first: {res.top_fix}
        </p>
      ) : null}
    </div>
  );
}

// Probity (ADR 0052) fused into the audit: a story's "fair chance" is also a
// question of whether the page is honest to the reader. Same colour bands.
const PROBITY_DIMS: Record<string, string> = {
  surveillance: "Surveillance",
  adTechDepth: "Ad-tech depth",
  consentIntegrity: "Consent integrity",
  pageBloat: "Page bloat",
  performance: "Performance",
};
function probityColor(n: number): string {
  if (n >= 75) return "#16a34a";
  if (n >= 50) return "#d97706";
  return "#dc2626";
}
function ProbityCard({ p }: { p: ProbityResult }) {
  if (p.error) {
    return (
      <div
        className="mt-4 pt-4 border-t text-sm"
        style={{ borderColor: "var(--color-rule)", fontFamily: "var(--font-ui)" }}
      >
        <p className="ds-meta mb-1">Probity — honest to the reader</p>
        <p style={{ color: "#b91c1c" }}>{p.error}</p>
      </div>
    );
  }
  return (
    <div
      className="mt-4 pt-4 border-t text-sm"
      style={{ borderColor: "var(--color-rule)", fontFamily: "var(--font-ui)" }}
    >
      <p className="ds-meta mb-1">Probity — honest to the reader</p>
      <p>
        Overall{" "}
        <strong style={{ color: probityColor(p.overall) }}>
          {p.overall} {p.overallGrade}
        </strong>
        {p.summary?.trackers != null ? ` · ${p.summary.trackers} trackers` : ""}
        {p.summary?.thirdPartyRequests != null
          ? ` · ${p.summary.thirdPartyRequests} third-party requests`
          : ""}
      </p>
      <ul className="mt-2 space-y-1">
        {Object.entries(p.dimensions).map(([k, v]) => (
          <li key={k}>
            <span className="inline-block w-36 font-semibold">{PROBITY_DIMS[k] ?? k}</span>{" "}
            <strong style={{ color: probityColor(v) }}>{v}</strong>
          </li>
        ))}
      </ul>
      {p.flags?.length ? (
        <p className="mt-2" style={{ color: "#b45309" }}>
          {p.flags.length} flag{p.flags.length === 1 ? "" : "s"}:{" "}
          {p.flags
            .slice(0, 3)
            .map((f) => f.label ?? f.title)
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}
      {p.reportUrl ? (
        <p className="mt-1">
          <a
            className="underline"
            href={p.reportUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-brand)" }}
          >
            Full Digital Mirror report ↗
          </a>
        </p>
      ) : null}
    </div>
  );
}

export default async function ScoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    section?: string;
    sort?: string;
    url?: string;
    need?: string;
    hours?: string;
    probity?: string;
  }>;
}) {
  await params;
  const { section, sort, url, need, hours, probity } = await searchParams;
  const sinceHours = hours && Number(hours) > 0 ? Number(hours) : null;
  const tenantId = await currentTenantId();

  const [all, classes, total] = tenantId
    ? await Promise.all([
        storiesWithScores(tenantId, 200, sinceHours),
        storyClassifications(tenantId),
        storyCount(tenantId),
      ])
    : [[], [], 0];
  const sections = Array.from(
    new Set(all.map((s) => s.section).filter((x): x is string => Boolean(x))),
  ).sort();

  let rows = section ? all.filter((s) => s.section === section) : all;
  rows = [...rows].sort((a, b) => {
    if (sort === "recent") {
      return (
        new Date(b.published_at ?? 0).getTime() -
        new Date(a.published_at ?? 0).getTime()
      );
    }
    return composite(b.scores) - composite(a.scores);
  });

  const [analysis, probityResult] = await Promise.all([
    url ? analyzeUrl(url, need) : null,
    url && probity === "1" ? probityScan(url) : null,
  ]);

  return (
    <main className="min-h-screen max-w-5xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Story Scores</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Story Scores
        </h1>
        <p
          className="text-base"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          The newsroom&rsquo;s own published stories (via the CMS connector),
          scored for their fair chance on each surface — Discover · News ·
          Search — and, with probity on, whether the page is honest to the
          reader: trackers, consent, weight (ADR 0052). {rows.length} of{" "}
          {all.length} scored.
        </p>
      </header>

      <DifferentiationPanel classes={classes} total={total} />

      <section className="ds-frame p-4 mb-8">
        <p className="ds-label mb-2">Analyze a URL on demand</p>
        <form method="get" className="flex flex-wrap gap-2 items-center">
          <input
            type="url"
            name="url"
            required
            defaultValue={url ?? ""}
            placeholder="https://example.com/…/article"
            className="flex-1 min-w-64 border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--color-rule)",
              fontFamily: "var(--font-ui)",
              background: "var(--color-bg)",
            }}
          />
          <select
            name="need"
            defaultValue={need ?? ""}
            className="border px-2 py-2 text-sm"
            style={{
              borderColor: "var(--color-rule)",
              fontFamily: "var(--font-ui)",
              background: "var(--color-bg)",
            }}
          >
            <option value="">need: auto/none</option>
            <option value="know">Know</option>
            <option value="understand">Understand</option>
            <option value="feel">Feel</option>
            <option value="do">Do</option>
          </select>
          <label
            className="flex items-center gap-1 text-sm"
            style={{ fontFamily: "var(--font-ui)" }}
            title="Also scan the page for trackers, consent honesty and weight (slower, 15–40s)"
          >
            <input type="checkbox" name="probity" value="1" defaultChecked={probity === "1"} />
            + probity
          </label>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--color-brand)", color: "white" }}
          >
            Analyze
          </button>
        </form>
        <p
          className="text-xs mt-2"
          style={{ color: "var(--color-fg-tertiary)" }}
        >
          Works for any age — fetches and audits the live article. Need weights
          the audit (ADR 0049). Tick <strong>+ probity</strong> to also scan the
          page for trackers, consent honesty and weight (ADR 0052) — slower.
        </p>
        {analysis ? <AnalyzePanel res={analysis} /> : null}
        {probityResult ? <ProbityCard p={probityResult} /> : null}
      </section>

      <form
        method="get"
        className="flex flex-wrap gap-3 items-center mb-4 text-sm"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <label>
          Section:{" "}
          <select
            name="section"
            defaultValue={section ?? ""}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            <option value="">all</option>
            {sections.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label>
          Published:{" "}
          <select
            name="hours"
            defaultValue={hours ?? ""}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            <option value="">all time</option>
            {[2, 3, 6, 12, 24, 48].map((h) => (
              <option key={h} value={h}>
                last {h}h
              </option>
            ))}
          </select>
        </label>
        <label>
          Sort:{" "}
          <select
            name="sort"
            defaultValue={sort ?? "composite"}
            className="border px-2 py-1"
            style={{
              borderColor: "var(--color-rule)",
              background: "var(--color-bg)",
            }}
          >
            <option value="composite">Composite (highest first)</option>
            <option value="recent">Most recent</option>
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

      {rows.length === 0 ? (
        <p style={{ color: "var(--color-fg-secondary)" }}>
          No scored stories yet. Run <code>cms-pull</code> then{" "}
          <code>score-stories</code>.
        </p>
      ) : (
        <ol className="list-none space-y-px">
          <li
            className="grid grid-cols-[2rem_1fr_7rem_9rem] gap-2 px-3 py-2 text-xs font-bold uppercase tracking-wide"
            style={{
              fontFamily: "var(--font-ui)",
              color: "var(--color-fg-tertiary)",
            }}
          >
            <span>#</span>
            <span>Story</span>
            <span>Composite</span>
            <span>D · N · S</span>
          </li>
          {rows.map((story, i) => {
            const comp = composite(story.scores);
            const b = band(comp);
            return (
              <li
                key={story.id}
                className="grid grid-cols-[2rem_1fr_7rem_9rem] gap-2 px-3 py-3 border-t items-start"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <span
                  className="text-sm"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  {i + 1}
                </span>
                <span>
                  <a
                    href={story.url ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-base leading-snug block"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {story.headline ?? story.url}
                  </a>
                  <span
                    className="text-xs"
                    style={{
                      fontFamily: "var(--font-ui)",
                      color: "var(--color-fg-secondary)",
                    }}
                  >
                    {[story.section, story.beat].filter(Boolean).join(" · ")}
                  </span>
                  <details className="mt-1 text-xs">
                    <summary
                      className="cursor-pointer font-semibold"
                      style={{ color: "var(--color-brand)" }}
                    >
                      Audit ▾
                    </summary>
                    <div
                      className="mt-3 grid gap-3 md:grid-cols-3"
                      style={{ fontFamily: "var(--font-ui)" }}
                    >
                      {Object.keys(story.scores).map((k) => {
                        const ch = story.scores[k];
                        const checks = ch.signals ?? [];
                        const sev = (c: { value: number; max: number }) =>
                          c.value >= c.max
                            ? { icon: "✓", color: "#16a34a", bg: "transparent" }
                            : c.value === 0
                              ? { icon: "✗", color: "#dc2626", bg: "#dc262611" }
                              : { icon: "⚠", color: "#b45309", bg: "#d9770611" };
                        const label = k
                          .split("_")
                          .pop()!
                          .replace(/^./, (c) => c.toUpperCase());
                        return (
                          <div key={k} className="ds-panel">
                            <div
                              className="flex items-baseline justify-between px-3 py-2 border-b"
                              style={{ borderColor: "var(--color-rule)" }}
                            >
                              <strong className="text-sm">{label}</strong>
                              <span
                                className="text-xs font-bold px-1.5 py-0.5 rounded-sm"
                                style={{
                                  background: `${cellColor(ch.score)}22`,
                                  color: cellColor(ch.score),
                                }}
                              >
                                {ch.score}/100 · {ch.grade}
                              </span>
                            </div>
                            <ul>
                              {checks.map((c) => {
                                const v = sev(c);
                                return (
                                  <li
                                    key={c.name}
                                    className="px-3 py-2 border-b last:border-b-0"
                                    style={{
                                      borderColor: "var(--color-rule)",
                                      background: v.bg,
                                    }}
                                  >
                                    <span
                                      className="font-bold mr-1"
                                      style={{ color: v.color }}
                                    >
                                      {v.icon}
                                    </span>
                                    <strong>{c.name}</strong>{" "}
                                    <span
                                      style={{
                                        color: "var(--color-fg-secondary)",
                                      }}
                                    >
                                      ({c.value}/{c.max})
                                    </span>
                                    <div
                                      className="mt-0.5"
                                      style={{
                                        color: "var(--color-fg-secondary)",
                                      }}
                                    >
                                      {c.note}
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                </span>
                <span style={{ fontFamily: "var(--font-ui)" }}>
                  <strong className="text-xl" style={{ color: b.color }}>
                    {comp}
                  </strong>{" "}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-sm font-bold"
                    style={{ background: `${b.color}22`, color: b.color }}
                  >
                    {b.label}
                  </span>
                </span>
                <span
                  className="flex gap-2 text-sm font-bold"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  {SURFACE_ORDER.map((k) =>
                    story.scores[k] ? (
                      <span
                        key={k}
                        title={`${k}: grade ${story.scores[k].grade}`}
                        className="px-2 py-1 rounded-sm"
                        style={{
                          background: `${cellColor(story.scores[k].score)}1a`,
                          color: cellColor(story.scores[k].score),
                        }}
                      >
                        {story.scores[k].score}
                      </span>
                    ) : null,
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
