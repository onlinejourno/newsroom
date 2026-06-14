import { coverageMatrix, tenantIdForSlug } from "@/lib/db";

export const dynamic = "force-dynamic";

const TENANT_SLUG = "self";

// Status rules (documented, deterministic):
// 🟢 Complete — at least one enabled primary source AND ≥5 signals in 7 days.
// 🟡 Partial  — some enabled source and some flow, but thin or MSM-test only.
// 🔴 Gap      — no enabled source, or zero flow in 7 days.
function statusOf(r: {
  src_enabled: number;
  src_primary: number;
  signals7d: number;
}): { icon: string; label: string; color: string } {
  if (r.src_primary >= 1 && r.signals7d >= 5)
    return { icon: "🟢", label: "Complete", color: "#16a34a" };
  if (r.src_enabled >= 1 && r.signals7d >= 1)
    return { icon: "🟡", label: "Partial", color: "#d97706" };
  return { icon: "🔴", label: "Gap", color: "#dc2626" };
}

export default async function CoveragePage() {
  const tenantId = await tenantIdForSlug(TENANT_SLUG);
  if (!tenantId) return null;
  const rows = await coverageMatrix(tenantId);
  const gaps = rows.filter((r) => statusOf(r).label === "Gap").length;

  return (
    <main className="min-h-screen max-w-4xl mx-auto p-6 md:p-10">
      <header className="mb-8">
        <p className="ds-label mb-2">OnlineJourno · Coverage Gap Matrix</p>
        <h1
          className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Coverage gaps
        </h1>
        <p
          className="text-base max-w-2xl"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-fg-secondary)",
          }}
        >
          Which beats have systematic sources and real flow, which run thin,
          and which are uncovered (ADR 0054). 🟢 needs an enabled{" "}
          <strong>primary</strong> source and ≥5 signals in 7 days; 🟡 has
          something but thin or test-feeds only; 🔴 has no enabled source or
          no flow.{gaps > 0 ? ` ${gaps} beat${gaps === 1 ? "" : "s"} in gap.` : ""}
        </p>
      </header>
      <nav className="flex gap-4 text-sm mb-6" style={{ fontFamily: "var(--font-ui)" }}>
        <a className="underline" style={{ color: "var(--color-fg-secondary)" }} href="./gaps">Regional gaps</a>
        <span className="font-bold">Coverage gaps</span>
      </nav>

      <table className="w-full text-sm" style={{ fontFamily: "var(--font-ui)" }}>
        <thead>
          <tr
            className="text-xs uppercase tracking-wide text-left"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            <th className="py-2 pr-3">Beat / section</th>
            <th className="py-2 pr-3">Sources (primary)</th>
            <th className="py-2 pr-3">Signals · 7d</th>
            <th className="py-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const st = statusOf(r);
            return (
              <tr
                key={r.beat}
                className="border-t align-top"
                style={{ borderColor: "var(--color-rule)" }}
              >
                <td className="py-2 pr-3 font-semibold">{r.beat}</td>
                <td className="py-2 pr-3" title={r.src_names ?? ""}>
                  {r.src_enabled} ({r.src_primary} primary)
                </td>
                <td className="py-2 pr-3">
                  <a
                    className="underline"
                    href={`./signals?beat=${encodeURIComponent(r.beat)}`}
                  >
                    {r.signals7d}
                  </a>
                </td>
                <td className="py-2 pr-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-sm font-bold"
                    style={{ background: `${st.color}22`, color: st.color }}
                  >
                    {st.icon} {st.label}
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
