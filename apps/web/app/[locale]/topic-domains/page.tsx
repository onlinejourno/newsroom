import { redirect } from "next/navigation";
import type { Route } from "next";

import { getAccount } from "@/lib/auth";
import { fetchTopicDomains } from "@/lib/topicDomains";
import ResponsiveTable from "@/components/ui/ResponsiveTable";

export const dynamic = "force-dynamic";

const LOOKBACK_OPTIONS = [
  { value: "3",  label: "Last 3 days" },
  { value: "7",  label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
];

export default async function TopicDomainsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ topic?: string; days?: string }>;
}) {
  const { locale } = await params;
  const me = await getAccount();
  if (!me) redirect(`/${locale}/login` as Route);

  const { topic, days: daysParam } = await searchParams;
  const days = Number(daysParam ?? 7);
  const safeDays = [3, 7, 14, 30].includes(days) ? days : 7;

  let res = null;
  if (topic?.trim()) {
    res = await fetchTopicDomains(topic.trim(), safeDays);
  }

  const domains = res?.available ? (res.domains ?? []) : [];
  const maxCount = domains.length > 0 ? Math.max(...domains.map((d) => d.count)) : 1;
  const isGdeltFallback =
    res?.source && res.source !== "GDELT" && res.source !== "gdelt";

  return (
    <main className="min-h-screen max-w-3xl mx-auto p-6 md:p-10">
      <header className="mb-6">
        <p className="ds-label mb-2">OnlineJourno · Topic → Domains</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Topic → Domains
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Enter any topic or keyword to see which domains are publishing the most
          stories about it right now — so you know who owns the conversation and
          who you&rsquo;re up against before you pitch or publish.
        </p>
      </header>

      {/* ── Input form ── */}
      <form
        method="get"
        className="ds-frame p-5 mb-8"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Topic / keyword</span>
            <input
              type="text"
              name="topic"
              defaultValue={topic ?? ""}
              placeholder="e.g. climate finance, AI regulation, cricket World Cup"
              required
              className="border px-3 py-2 text-sm w-full"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-bg)",
                fontFamily: "var(--font-ui)",
              }}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ds-label">Lookback window</span>
            <select
              name="days"
              defaultValue={String(safeDays)}
              className="border px-3 py-2 text-sm"
              style={{
                borderColor: "var(--color-rule)",
                background: "var(--color-bg)",
              }}
            >
              {LOOKBACK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3 items-center flex-wrap">
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold"
              style={{ background: "var(--color-brand)", color: "white" }}
            >
              Fetch Top Domains
            </button>
            {topic && (
              <a
                href="?"
                className="text-sm underline"
                style={{ color: "var(--color-fg-tertiary)" }}
              >
                Clear
              </a>
            )}
          </div>
        </div>
      </form>

      {/* ── Results ── */}
      {res && (
        <section>
          {/* Source note */}
          <p
            className="text-xs mb-4"
            style={{
              fontFamily: "var(--font-ui)",
              color: isGdeltFallback
                ? "var(--color-fg-tertiary)"
                : "var(--color-fg-secondary)",
            }}
          >
            {isGdeltFallback
              ? `GDELT rate-limited — showing Google News story volume instead (source: ${res.source})`
              : `Source: ${res.source ?? "GDELT"}`}
          </p>

          {domains.length > 0 ? (
            <div className="ds-frame overflow-hidden">
              <p
                className="ds-label px-4 pt-4 pb-2"
                style={{ borderBottom: "1px solid var(--color-rule)" }}
              >
                Top domains for &ldquo;{res.topic ?? topic}&rdquo;
                {res.days ? ` · last ${res.days} days` : ""}
              </p>

              <ResponsiveTable><table
                className="w-full text-sm"
                style={{ fontFamily: "var(--font-ui)" }}
              >
                <thead>
                  <tr
                    style={{
                      color: "var(--color-fg-tertiary)",
                      borderBottom: "1px solid var(--color-rule)",
                    }}
                  >
                    <th className="text-right px-4 py-2 font-medium w-10">#</th>
                    <th className="text-left px-4 py-2 font-medium">Domain</th>
                    <th className="text-right px-4 py-2 font-medium w-24">Stories</th>
                    <th className="px-4 py-2 w-40"></th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((d, i) => {
                    const pct = maxCount > 0 ? Math.round((d.count / maxCount) * 100) : 0;
                    return (
                      <tr
                        key={d.domain}
                        style={{
                          borderBottom:
                            i < domains.length - 1
                              ? "1px solid var(--color-rule)"
                              : undefined,
                        }}
                      >
                        <td
                          className="text-right px-4 py-2.5 tabular-nums"
                          style={{ color: "var(--color-fg-tertiary)" }}
                        >
                          {i + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{d.domain}</td>
                        <td
                          className="text-right px-4 py-2.5 tabular-nums"
                          style={{ color: "var(--color-fg-secondary)" }}
                        >
                          {d.count.toLocaleString()}
                        </td>
                        <td className="px-4 py-2.5">
                          <div
                            className="h-2 rounded-sm"
                            style={{
                              width: `${pct}%`,
                              background: "var(--color-brand)",
                              opacity: 0.6,
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></ResponsiveTable>
            </div>
          ) : (
            <div
              className="ds-frame p-5 text-sm"
              style={{
                fontFamily: "var(--font-ui)",
                color: "var(--color-fg-secondary)",
              }}
            >
              No coverage found — try a broader English keyword.
            </div>
          )}
        </section>
      )}
    </main>
  );
}
