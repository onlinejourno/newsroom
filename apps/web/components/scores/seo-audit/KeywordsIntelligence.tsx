import * as React from "react";
import ResponsiveTable from "@/components/ui/ResponsiveTable";

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches keywords_everywhere.py `ranking_keywords()` return:
//   { available: true,
//     keywords: { keyword: string, vol?: number, cpc?: number,
//                 competition?: number, position?: number }[],
//     traffic: Record<string, unknown> }
//   { available: false, reason?: string, keywords: [], traffic: {} }

export interface KeywordRow {
  keyword: string;
  vol?: number;
  cpc?: number;
  competition?: number;
  position?: number;
}

export interface KeywordsData {
  available: boolean;
  keywords?: KeywordRow[];
  traffic?: Record<string, unknown>;
  reason?: string;
}

export interface KeywordsIntelligenceProps {
  keywords: KeywordsData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtVol(v: number | undefined): string {
  if (v === undefined) return "—";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(v);
}

function fmtCpc(v: number | undefined): string {
  if (v === undefined) return "—";
  return `$${v.toFixed(2)}`;
}

function fmtCompetition(v: number | undefined): string {
  if (v === undefined) return "—";
  // KE returns 0..1
  const pct = Math.round(v * 100);
  return `${pct}%`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function KeywordsIntelligence({ keywords }: KeywordsIntelligenceProps) {
  if (!keywords.available) return null;

  const rows = keywords.keywords ?? [];
  if (rows.length === 0) return null;

  const thStyle: React.CSSProperties = {
    padding: "6px 10px",
    textAlign: "left",
    fontSize: "0.7rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--color-fg-tertiary)",
    fontFamily: "var(--font-ui)",
    borderBottom: "1px solid var(--color-border)",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "6px 10px",
    fontSize: "0.75rem",
    color: "var(--color-fg-primary)",
    fontFamily: "var(--font-ui)",
    borderBottom: "1px solid var(--color-border)",
    verticalAlign: "top",
  };

  const tdNumStyle: React.CSSProperties = {
    ...tdStyle,
    fontFamily: "var(--font-mono)",
    textAlign: "right",
    color: "var(--color-fg-secondary)",
  };

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Keywords Intelligence
        </h2>
      </div>

      <div className="ds-panel overflow-x-auto">
        <ResponsiveTable><table
          style={{ width: "100%", borderCollapse: "collapse" }}
          aria-label="Ranking keywords"
        >
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Keyword</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Volume</th>
              <th style={{ ...thStyle, textAlign: "right" }}>CPC</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Competition</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Position</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                style={
                  i % 2 === 1
                    ? { background: "var(--color-bg-subtle, var(--color-bg))" }
                    : undefined
                }
              >
                <td style={{ ...tdNumStyle, color: "var(--color-fg-tertiary)" }}>
                  {i + 1}
                </td>
                <td style={tdStyle}>{row.keyword}</td>
                <td style={tdNumStyle}>{fmtVol(row.vol)}</td>
                <td style={tdNumStyle}>{fmtCpc(row.cpc)}</td>
                <td style={tdNumStyle}>{fmtCompetition(row.competition)}</td>
                <td style={tdNumStyle}>
                  {row.position !== undefined ? row.position : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table></ResponsiveTable>
      </div>
    </section>
  );
}
