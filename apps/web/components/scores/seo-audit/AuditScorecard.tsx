import * as React from "react";
import ResponsiveTable from "@/components/ui/ResponsiveTable";

export interface AuditScorecardProps {
  score: number;
  grade: string;
  counts: { critical: number; warning: number; ok: number };
}

function gradeColors(grade: string): { bg: string; fg: string; border: string } {
  if (grade === "A" || grade === "B") {
    return {
      bg: "var(--color-brand-bg)",
      fg: "var(--color-brand-dark)",
      border: "var(--color-brand)",
    };
  }
  if (grade === "C") {
    return {
      bg: "var(--color-amber-100)",
      fg: "var(--color-amber-600)",
      border: "var(--color-amber-600)",
    };
  }
  // D or F
  return {
    bg: "var(--color-urgent-bg)",
    fg: "var(--color-urgent)",
    border: "var(--color-urgent)",
  };
}

export function AuditScorecard({ score, grade, counts }: AuditScorecardProps) {
  const total = counts.critical + counts.warning + counts.ok;
  const colors = gradeColors(grade);

  // Severity bar segments as percentages (guard divide-by-zero)
  const pct = (n: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : "0%");

  return (
    <section
      className="ds-frame p-5 mb-6"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {/* Score + grade row */}
      <div className="flex items-baseline gap-4 mb-4">
        <span
          className="ds-stat"
          style={{ color: colors.fg }}
          title={`SEO + E-E-A-T score: ${score}/100`}
        >
          {Math.round(score)}
          <span
            className="text-base font-semibold"
            style={{ color: "var(--color-fg-secondary)" }}
          >
            /100
          </span>
        </span>

        {/* Grade chip */}
        <span
          className="inline-flex items-center px-2.5 py-1 text-sm font-bold uppercase tracking-widest"
          style={{
            background: colors.bg,
            color: colors.fg,
            border: `1px solid ${colors.border}`,
          }}
        >
          {grade}
        </span>

        {/* Counts summary */}
        <span
          className="text-xs flex gap-3 ml-auto"
          style={{ color: "var(--color-fg-secondary)" }}
        >
          {counts.critical > 0 && (
            <span style={{ color: "var(--color-urgent)", fontWeight: 700 }}>
              {counts.critical} critical
            </span>
          )}
          {counts.warning > 0 && (
            <span style={{ color: "var(--color-amber-600)", fontWeight: 600 }}>
              {counts.warning} warning
            </span>
          )}
          <span style={{ color: "var(--color-brand-dark)" }}>
            {counts.ok} ok
          </span>
        </span>
      </div>

      {/* Stacked severity bar */}
      {total > 0 && (
        <div
          className="flex h-2.5 w-full overflow-hidden mb-4"
          style={{ background: "var(--color-border)" }}
          title={`${counts.critical} critical · ${counts.warning} warning · ${counts.ok} ok`}
        >
          {counts.critical > 0 && (
            <div
              style={{ width: pct(counts.critical), background: "var(--color-urgent)" }}
            />
          )}
          {counts.warning > 0 && (
            <div
              style={{ width: pct(counts.warning), background: "var(--color-amber-600)" }}
            />
          )}
          {counts.ok > 0 && (
            <div
              style={{ width: pct(counts.ok), background: "var(--color-brand)" }}
            />
          )}
        </div>
      )}

      {/* Formula explainer */}
      <details className="text-xs" style={{ color: "var(--color-fg-secondary)" }}>
        <summary
          className="cursor-pointer font-semibold select-none"
          style={{ color: "var(--color-fg-tertiary)" }}
        >
          How is this score calculated?
        </summary>
        <div
          className="mt-3 p-3 border-t text-xs leading-relaxed"
          style={{
            borderColor: "var(--color-rule)",
            fontFamily: "var(--font-ui)",
            color: "var(--color-fg-secondary)",
          }}
        >
          <p className="mb-2">
            <strong>Formula:</strong>{" "}
            <code style={{ fontFamily: "var(--font-mono)" }}>
              (passed / total) × 100 − critical × 12 − warning × 4
            </code>
          </p>
          <p className="mb-2">
            Each SEJ signal check is marked <em>ok</em>, <em>warning</em>, or{" "}
            <em>critical</em>. The base score is the pass rate scaled to 100.
            Critical failures cost 12 points each; warnings cost 4. The result
            is clamped to 0–100.
          </p>
          <ResponsiveTable><table
            className="text-xs w-full"
            style={{
              borderCollapse: "collapse",
              fontFamily: "var(--font-mono)",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-rule)" }}>
                <th className="text-left py-1 pr-4">Grade</th>
                <th className="text-left py-1">Score band</th>
              </tr>
            </thead>
            <tbody>
              {[
                { g: "A", band: "≥ 80" },
                { g: "B", band: "≥ 65" },
                { g: "C", band: "≥ 50" },
                { g: "D", band: "≥ 35" },
                { g: "F", band: "< 35" },
              ].map(({ g, band }) => (
                <tr
                  key={g}
                  style={{ borderBottom: "1px solid var(--color-rule-soft)" }}
                >
                  <td className="py-1 pr-4 font-bold">{g}</td>
                  <td className="py-1">{band}</td>
                </tr>
              ))}
            </tbody>
          </table></ResponsiveTable>
        </div>
      </details>
    </section>
  );
}
