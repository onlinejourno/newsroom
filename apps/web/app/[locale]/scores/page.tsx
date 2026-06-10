import { analyzeUrl, type AnalyzeResult } from "@/lib/analyze";
import { storiesWithScores, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

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
  }>;
}) {
  await params;
  const { section, sort, url, need } = await searchParams;
  const tenantId = await tenantIdForSlug(TENANT_SLUG);

  const all = tenantId ? await storiesWithScores(tenantId) : [];
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

  const analysis = url ? await analyzeUrl(url, need) : null;

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
          Search. {rows.length} of {all.length} shown.
        </p>
      </header>

      <section
        className="rounded-sm border p-4 mb-8"
        style={{
          borderColor: "var(--color-border)",
          background: "var(--color-bg-card)",
        }}
      >
        <p className="ds-label mb-2">Analyze a URL on demand</p>
        <form method="get" className="flex flex-wrap gap-2 items-center">
          <input
            type="url"
            name="url"
            required
            defaultValue={url ?? ""}
            placeholder="https://…/article"
            className="flex-1 min-w-64 border rounded-sm px-3 py-2 text-sm"
            style={{
              borderColor: "var(--color-border)",
              fontFamily: "var(--font-ui)",
              background: "var(--color-bg)",
            }}
          />
          <select
            name="need"
            defaultValue={need ?? ""}
            className="border rounded-sm px-2 py-2 text-sm"
            style={{
              borderColor: "var(--color-border)",
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
          <button
            type="submit"
            className="px-4 py-2 rounded-sm text-sm font-semibold"
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
          the audit (ADR 0049).
        </p>
        {analysis ? <AnalyzePanel res={analysis} /> : null}
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
            className="border rounded-sm px-2 py-1"
            style={{
              borderColor: "var(--color-border)",
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
          Sort:{" "}
          <select
            name="sort"
            defaultValue={sort ?? "composite"}
            className="border rounded-sm px-2 py-1"
            style={{
              borderColor: "var(--color-border)",
              background: "var(--color-bg)",
            }}
          >
            <option value="composite">Composite (highest first)</option>
            <option value="recent">Most recent</option>
          </select>
        </label>
        <button
          type="submit"
          className="px-3 py-1 rounded-sm border font-semibold"
          style={{ borderColor: "var(--color-border)" }}
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
                style={{ borderColor: "var(--color-border)" }}
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
                      className="cursor-pointer"
                      style={{ color: "var(--color-brand)" }}
                    >
                      Audit
                    </summary>
                    <ul
                      className="mt-1 space-y-0.5"
                      style={{
                        fontFamily: "var(--font-ui)",
                        color: "var(--color-fg-secondary)",
                      }}
                    >
                      {SURFACE_ORDER.filter((k) => story.scores[k]).map(
                        (k) => (
                          <li key={k}>
                            <strong>{SURFACE_SHORT[k]}</strong>:{" "}
                            {story.scores[k].top_fix ?? "no fix needed"}
                          </li>
                        ),
                      )}
                    </ul>
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
