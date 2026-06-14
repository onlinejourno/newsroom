import { regionCoverage, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

type Status = {
  label: string;
  color: string;
};

function statusOf(signals: number, reporters: number): Status {
  if (signals >= 3 && reporters === 0)
    return { label: "UNCOVERED", color: "#dc2626" };
  if (reporters > 0 && signals === 0)
    return { label: "QUIET PATCH", color: "#d97706" };
  if (reporters > 0) return { label: "COVERED", color: "#16a34a" };
  return { label: "WATCH", color: "#6b7280" };
}

export default async function GapsPage() {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return null;
  const rows = await regionCoverage(tenantId);
  const uncovered = rows.filter(
    (r) => r.signals7d >= 3 && r.reporters === 0,
  ).length;

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Regional Gaps</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Regional gaps
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Where the record is moving versus where the reporters are — the
          EIP editor view. Signals are the last 7 days of geo-tagged inflow;
          reporters come from the directory&rsquo;s region assignments.
          {uncovered > 0
            ? ` ${uncovered} region${uncovered === 1 ? "" : "s"} currently uncovered.`
            : ""}
        </p>
      </header>
      <nav className="flex gap-4 text-sm mb-6" style={{ fontFamily: "var(--font-ui)" }}>
        <span className="font-bold">Regional gaps</span>
        <a className="underline" style={{ color: "var(--color-fg-secondary)" }} href="./coverage">Coverage gaps</a>
      </nav>

      <table className="w-full text-sm" style={{ fontFamily: "var(--font-ui)" }}>
        <thead>
          <tr
            className="text-xs uppercase tracking-wide text-left"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            <th className="py-2 pr-3">Region</th>
            <th className="py-2 pr-3">Signals · 7d</th>
            <th className="py-2 pr-3">Reporters</th>
            <th className="py-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const st = statusOf(r.signals7d, r.reporters);
            return (
              <tr
                key={r.region}
                className="border-t align-top"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <td className="py-2 pr-3 font-semibold">{r.region}</td>
                <td className="py-2 pr-3">
                  <a
                    className="underline"
                    href={`./trends?region=${encodeURIComponent(r.region)}`}
                  >
                    {r.signals7d}
                  </a>
                </td>
                <td className="py-2 pr-3">
                  {r.reporters > 0 ? (
                    <span title={r.reporter_names ?? ""}>
                      {r.reporters} — {r.reporter_names}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-2 pr-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-sm font-bold"
                    style={{ background: `${st.color}22`, color: st.color }}
                  >
                    {st.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </main>
  );
}
