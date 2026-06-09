import {
  fetchShortlistRanked,
  type ShortlistSort,
  tenantIdForSlug,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";
const SORTS: { key: ShortlistSort; label: string; hint: string }[] = [
  { key: "importance", label: "Importance", hint: "highest AI score" },
  { key: "recency", label: "Recency", hint: "newest news first" },
  { key: "velocity", label: "Velocity", hint: "most-covered topic" },
];

function fmtTime(value: Date | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export default async function ShortlistPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const sort: ShortlistSort = SORTS.some((s) => s.key === sp.sort)
    ? (sp.sort as ShortlistSort)
    : "importance";

  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const items = tenantId ? await fetchShortlistRanked(tenantId, { sort }) : [];

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Shortlist</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Today&rsquo;s shortlist
        </h1>
        <p
          className="text-base"
          style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-2)" }}
        >
          {items.length} stories · last 24h · the editor&rsquo;s lens, your call.
        </p>
      </header>

      {/* Sort lens — server-rendered links, no client JS */}
      <nav className="flex gap-2 mb-8" aria-label="Sort">
        {SORTS.map((s) => {
          const active = s.key === sort;
          return (
            <a
              key={s.key}
              href={`/${locale}/shortlist?sort=${s.key}`}
              title={s.hint}
              className="px-3 py-1.5 text-sm font-semibold"
              style={{
                fontFamily: "var(--font-ui)",
                borderRadius: "var(--radius-pill)",
                background: active ? "var(--ioj-green-600)" : "var(--color-bg-card)",
                color: active ? "var(--color-fg-inv)" : "var(--color-fg-1)",
                border: `1px solid ${active ? "var(--ioj-green-600)" : "var(--color-border)"}`,
              }}
            >
              {s.label}
            </a>
          );
        })}
      </nav>

      <hr className="ds-rule mb-8" />

      {items.length === 0 ? (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-2)" }}>
          No shortlist in the last 24h. Run the pipeline (or wait for 06:30).
        </p>
      ) : (
        <ol className="space-y-7 list-none">
          {items.map((it, i) => (
            <li key={it.signal_id}>
              <div className="flex items-baseline gap-3 mb-1">
                <span
                  className="text-sm font-bold"
                  style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-3)" }}
                >
                  {i + 1}
                </span>
                <span
                  className="ds-label"
                  title="AI importance score"
                  style={{ color: "var(--ioj-green-800)" }}
                >
                  {it.score?.toFixed(2)}
                </span>
                {it.velocity > 1 ? (
                  <span
                    className="ds-label"
                    title="stories sharing this topic in the window"
                    style={{ color: "var(--amber-600)" }}
                  >
                    ×{it.velocity}
                  </span>
                ) : null}
                <span
                  className="text-xs"
                  style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-3)" }}
                >
                  {it.source_name ?? "?"} · {fmtTime(it.published_at)}
                </span>
              </div>
              <a
                href={it.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xl font-bold leading-snug"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-1)" }}
              >
                {it.headline ?? it.url}
              </a>
              {it.rationale ? (
                <p
                  className="mt-1 text-sm leading-normal"
                  style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-2)" }}
                >
                  {it.rationale}
                </p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
