import {
  type BriefSection,
  fetchLatestBrief,
  fetchSignalUrls,
  tenantIdForSlug,
} from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

function formatDate(value: Date | string | null): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

function SearchFit({ fit }: { fit: BriefSection["search_fit"] }) {
  if (!fit || !fit.keyword) return null;
  const strong = (fit.volume ?? 0) >= 1000;
  const arrow = fit.trend === "rising" ? "↑" : fit.trend === "falling" ? "↓" : "→";
  return (
    <p
      className="mt-2 text-sm"
      style={{
        fontFamily: "var(--font-ui)",
        color: strong ? "var(--ioj-green-600)" : "var(--amber-600)",
      }}
    >
      <strong>Search fit: {strong ? "strong" : "weak"}</strong> — “{fit.keyword}”{" "}
      {fit.volume.toLocaleString("en-IN")}/mo {strong ? arrow : "· Direct/loyalty story, not a Search play"}
    </p>
  );
}

export default async function BriefPage() {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  const brief = tenantId ? await fetchLatestBrief(tenantId) : null;

  if (!brief) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl text-center">
          <p className="ds-label mb-2">OnlineJourno · Brief</p>
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>
            No brief yet.
          </h1>
          <p className="text-base" style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-2)" }}>
            Run <code>onlinejourno-agents shortlist</code> then <code>brief</code> to compose one.
          </p>
        </div>
      </main>
    );
  }

  const sections = brief.content?.sections ?? [];
  const allIds = sections.flatMap((s) => s.signals ?? []);
  const urls = tenantId ? await fetchSignalUrls(tenantId, allIds) : new Map<string, string>();
  const beat = (brief.content?.meta?.beat as string) ?? "desk";

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Morning Brief</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {beat}
        </h1>
        <p className="text-base" style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-2)" }}>
          {formatDate(brief.edition_date)} · {sections.length} sections · composed {formatDate(brief.composed_at)}
        </p>
      </header>

      <hr className="ds-rule mb-8" />

      {sections.length === 0 ? (
        <p style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-2)" }}>
          This brief has no sections.
        </p>
      ) : (
        <div className="space-y-10">
          {sections.map((sec, i) => (
            <section key={i}>
              <h2
                className="text-2xl font-bold leading-snug mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {sec.heading || "Untitled"}
              </h2>
              {sec.lede_one_liner ? (
                <p
                  className="text-lg font-semibold mb-2"
                  style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-1)" }}
                >
                  {sec.lede_one_liner}
                </p>
              ) : null}
              {sec.body ? (
                <p
                  className="text-base leading-loose"
                  style={{ fontFamily: "var(--font-body)", color: "var(--color-fg-1)" }}
                >
                  {sec.body}
                </p>
              ) : null}
              <SearchFit fit={sec.search_fit} />
              {(sec.signals ?? []).length > 0 ? (
                <div className="mt-3">
                  <p className="ds-label mb-1">Sources</p>
                  <ul className="list-none space-y-1">
                    {(sec.signals ?? []).map((sid) => {
                      const url = urls.get(sid);
                      return (
                        <li key={sid} className="text-sm" style={{ fontFamily: "var(--font-ui)" }}>
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "var(--color-link)" }}
                            >
                              {url}
                            </a>
                          ) : (
                            <span style={{ color: "var(--color-fg-3)" }}>signal {sid}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
