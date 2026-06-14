import { probityScan } from "@/lib/probity";

export const dynamic = "force-dynamic";

function gaugeColor(score: number): string {
  if (score >= 75) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

const DIMENSION_LABELS: Record<string, string> = {
  surveillance: "Surveillance",
  adTechDepth: "Ad-Tech Depth",
  consentIntegrity: "Consent Integrity",
  pageBloat: "Page Bloat",
  performance: "Performance",
};

function fmtBytes(n?: number): string {
  if (!n) return "—";
  if (n > 1_048_576) return `${(n / 1_048_576).toFixed(2)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

export default async function ProbityPage({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  const result = url ? await probityScan(url) : null;

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Probity</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Probity audit
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          What the page does to the reader — trackers, real-time bidding,
          consent honesty, page weight. The Digital Mirror engine
          (web-bloat-checker), as a platform audit. A scan takes 15–40
          seconds and reflects this machine&rsquo;s network vantage point.
        </p>
      </header>

      <form
        method="get"
        className="flex flex-wrap gap-2 items-center mb-8"
        style={{ fontFamily: "var(--font-ui)" }}
      >
        <input
          type="url"
          name="url"
          required
          defaultValue={url ?? ""}
          placeholder="https://…  (a story or a homepage)"
          className="flex-1 min-w-64 border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--color-rule)",
            background: "var(--color-bg)",
          }}
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold"
          style={{ background: "var(--color-brand)", color: "white" }}
        >
          Scan
        </button>
      </form>

      {result?.error ? (
        <p className="text-sm" style={{ color: "#b91c1c" }}>
          {result.error}
        </p>
      ) : null}

      {result && !result.error ? (
        <div className="space-y-4">
          <section
            className="ds-frame p-5 flex items-center justify-between gap-4 flex-wrap"
          >
            <div>
              <p className="ds-label mb-1">Democratic Infrastructure Score</p>
              <p
                className="text-xs max-w-md"
                style={{ color: "var(--color-fg-secondary)" }}
              >
                {url}
              </p>
            </div>
            <div className="text-center">
              <span
                className="text-5xl font-extrabold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: gaugeColor(result.overall),
                }}
              >
                {result.overall}
              </span>
              <p
                className="text-sm font-bold"
                style={{ color: gaugeColor(result.overall) }}
              >
                {result.overallGrade}
              </p>
            </div>
          </section>

          <section
            className="ds-frame p-5"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <p className="ds-label mb-3">Five dimensions</p>
            {Object.entries(result.dimensions).map(([key, score]) => (
              <div key={key} className="flex items-center gap-3 mb-2">
                <span className="w-36 text-sm font-semibold">
                  {DIMENSION_LABELS[key] ?? key}
                </span>
                <div
                  className="flex-1 h-3 rounded-full overflow-hidden"
                  style={{ background: "var(--color-border)" }}
                >
                  <div
                    style={{
                      width: `${score}%`,
                      height: "100%",
                      background: gaugeColor(score),
                    }}
                  />
                </div>
                <span
                  className="w-16 text-right text-sm font-bold"
                  style={{ color: gaugeColor(score) }}
                >
                  {score}/100
                </span>
              </div>
            ))}
          </section>

          {result.flags.length > 0 ? (
            <section
              className="ds-frame p-5"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              <p className="ds-label mb-3">Findings at a glance</p>
              <div className="flex flex-wrap gap-2">
                {result.flags.map((f, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded-sm font-semibold"
                    style={{
                      background:
                        f.severity === "good" ? "#16a34a22" : "#dc262622",
                      color: f.severity === "good" ? "#16a34a" : "#dc2626",
                    }}
                  >
                    {f.label ?? f.title ?? f.id}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section
            className="ds-frame p-5 text-sm flex flex-wrap gap-6"
            style={{ fontFamily: "var(--font-ui)" }}
          >
            <span>
              <strong>{result.summary?.totalRequests ?? "—"}</strong> requests
            </span>
            <span>
              <strong>{fmtBytes(result.summary?.totalBytes)}</strong>{" "}
              transferred
            </span>
            <span>
              <strong>{result.summary?.trackers ?? 0}</strong> trackers
            </span>
            {result.openness != null ? (
              <span>
                openness <strong>{result.openness}</strong>
              </span>
            ) : null}
            {result.paywallScore != null ? (
              <span>
                paywall quality <strong>{result.paywallScore}</strong>
              </span>
            ) : null}
            <a
              className="underline"
              href={result.reportUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              full Digital Mirror report ↗
            </a>
          </section>
        </div>
      ) : null}
    </main>
  );
}
