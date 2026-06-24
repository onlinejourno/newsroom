import {
  type BriefSection,
  fetchLatestBrief,
  fetchSignalUrls,
  listBeats,
  openLeadsRanked,
  newsroomNowCounts,
  publishedPerDay,
  tenantCity,
} from "@/lib/db";
import { currentTenantId } from "@/lib/tenant";
import { getAccount } from "@/lib/auth";
import TodayHome from "@/components/brief/TodayHome";
import { leadToCard, newsroomNow } from "@/lib/brief-today";

export const dynamic = "force-dynamic";

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

export default async function BriefPage({
  searchParams,
}: {
  searchParams: Promise<{ beat?: string }>;
}) {
  const { beat: beatParam } = await searchParams;
  const tenantId = await currentTenantId();
  const beats = tenantId ? await listBeats(tenantId) : [];
  // Default: the signed-in journalist's first beat, if a brief desk exists
  // for it; else the explicit ?beat=; else the latest brief of any desk.
  const account = await getAccount();
  const user = account
    ? { name: account.display_name ?? account.email, beats: account.beats }
    : null;
  const userBeatSlug = user?.beats?.[0]
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const pick =
    beatParam ??
    (userBeatSlug && beats.some((b) => b.slug === userBeatSlug)
      ? userBeatSlug
      : null);
  const brief = tenantId ? await fetchLatestBrief(tenantId, pick) : null;

  const tid = tenantId ?? "";
  const [leads, counts, published7d] = await Promise.all([
    tid ? openLeadsRanked(tid, 8) : Promise.resolve([]),
    tid ? newsroomNowCounts(tid) : Promise.resolve({ signalsIn: 0, leadsNeedingDecision: 0, sourcesLive: 0, publishedToday: 0 }),
    tid ? publishedPerDay(tid, 7) : Promise.resolve([]),
  ]);
  const cards = leads.map((l) =>
    leadToCard(
      l,
      l.trend_reason || l.user_need ? { trend_reason: l.trend_reason, user_need: l.user_need } : null,
      l.sources,
    ),
  );
  const stats = newsroomNow(counts);
  const city = tid ? ((await tenantCity(tid)) || null) : null;
  const firstName = (account?.display_name ?? account?.email ?? "there").split("@")[0].split(" ")[0];
  const dateLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata",
  }).format(new Date());

  const beatPicker = beats.length ? (
    <form
      method="get"
      className="mb-6 flex items-center gap-2 text-sm"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      <label>
        Desk:{" "}
        <select
          name="beat"
          defaultValue={pick ?? ""}
          className="border px-2 py-1"
          style={{
            borderColor: "var(--color-rule)",
            background: "var(--color-bg)",
          }}
        >
          <option value="">latest (any desk)</option>
          {beats.map((b) => (
            <option key={b.slug} value={b.slug}>
              {b.name}
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
      {user ? (
        <span style={{ color: "var(--color-fg-tertiary)" }}>
          signed in: {user.name}
          {userBeatSlug && !beats.some((b) => b.slug === userBeatSlug)
            ? ` (no brief desk for ${user.beats?.[0]} yet)`
            : ""}
        </span>
      ) : null}
    </form>
  ) : null;

  if (!brief) {
    // Today is the primary home — it renders even with no composed digest yet.
    return (
      <>
        <TodayHome
          firstName={firstName}
          dateLabel={dateLabel}
          city={city}
          cards={cards}
          stats={stats}
          windowLabel="last 24h"
          published7d={published7d}
        />
        <div className="max-w-5xl mx-auto px-6 md:px-10">
          <hr style={{ borderColor: "var(--color-rule)", margin: "8px 0 24px" }} />
          <h2 className="ds-h2" id="todays-brief">Today&rsquo;s composed brief</h2>
          {beatPicker}
          <p className="empty-note" style={{ marginTop: 12 }}>
            No brief composed yet — run <code>onlinejourno-agents shortlist</code> then <code>brief</code>.
          </p>
        </div>
      </>
    );
  }

  const sections = brief.content?.sections ?? [];
  const allIds = sections.flatMap((s) => s.signals ?? []);
  const urls = tenantId ? await fetchSignalUrls(tenantId, allIds) : new Map<string, string>();
  const beat = (brief.content?.meta?.beat as string) ?? "desk";

  return (
    <>
      <TodayHome
        firstName={firstName}
        dateLabel={dateLabel}
        city={city}
        cards={cards}
        stats={stats}
        windowLabel="last 24h"
        published7d={published7d}
      />
      <div className="max-w-5xl mx-auto px-6 md:px-10">
        <hr style={{ borderColor: "var(--color-rule)", margin: "8px 0 24px" }} />
        <h2 className="ds-h2" id="todays-brief">Today&rsquo;s composed brief</h2>
      </div>
      {/* existing composed-digest JSX unchanged below */}
      <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
        {beatPicker}
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
    </>
  );
}
