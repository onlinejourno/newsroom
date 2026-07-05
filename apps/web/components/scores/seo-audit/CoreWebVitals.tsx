import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches cwv.py grade_cwv() / page_experience() output exactly.

export interface CwvMetrics {
  performance_score: number;
  lcp_ms: number;
  cls_score: number;
  tbt_ms: number;
  fcp_ms: number;
}

export type CwvData =
  | { available: false; reason?: string }
  | {
      available: true;
      performance_score: number;
      grade: string;
      metrics: CwvMetrics;
      recommendations: string[];
    };

export interface CoreWebVitalsProps {
  cwv: CwvData;
}

// ── Google CWV thresholds (mirrored from cwv.py) ──────────────────────────────

type CwvStatus = "good" | "needs-improvement" | "poor";

function lcpStatus(ms: number): CwvStatus {
  if (ms <= 2500) return "good";
  if (ms > 4000) return "poor";
  return "needs-improvement";
}

function clsStatus(score: number): CwvStatus {
  if (score <= 0.1) return "good";
  if (score > 0.25) return "poor";
  return "needs-improvement";
}

function tbtStatus(ms: number): CwvStatus {
  if (ms <= 200) return "good";
  if (ms > 600) return "poor";
  return "needs-improvement";
}

function fcpStatus(ms: number): CwvStatus {
  if (ms <= 1800) return "good";
  if (ms > 3000) return "poor";
  return "needs-improvement";
}

// ── Color tokens per status ───────────────────────────────────────────────────

function statusColors(s: CwvStatus): { fg: string; bg: string; border: string } {
  if (s === "good")
    return {
      fg: "var(--color-brand-dark)",
      bg: "var(--color-brand-bg)",
      border: "var(--color-brand)",
    };
  if (s === "needs-improvement")
    return {
      fg: "var(--color-amber-600)",
      bg: "var(--color-amber-100)",
      border: "var(--color-amber-600)",
    };
  return {
    fg: "var(--color-urgent)",
    bg: "var(--color-urgent-bg)",
    border: "var(--color-urgent)",
  };
}

function gradeColors(grade: string): { fg: string; bg: string; border: string } {
  if (grade === "A" || grade === "B")
    return {
      fg: "var(--color-brand-dark)",
      bg: "var(--color-brand-bg)",
      border: "var(--color-brand)",
    };
  if (grade === "C")
    return {
      fg: "var(--color-amber-600)",
      bg: "var(--color-amber-100)",
      border: "var(--color-amber-600)",
    };
  return {
    fg: "var(--color-urgent)",
    bg: "var(--color-urgent-bg)",
    border: "var(--color-urgent)",
  };
}

// ── Metric tile ───────────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: string;
  status: CwvStatus;
}

function MetricTile({ label, value, status }: MetricTileProps) {
  const colors = statusColors(status);
  return (
    <div
      className="ds-panel px-3 py-2 flex flex-col gap-0.5"
      style={{ borderTop: `3px solid ${colors.border}`, minWidth: 0 }}
    >
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: "var(--color-fg-tertiary)", fontFamily: "var(--font-ui)" }}
      >
        {label}
      </span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: colors.fg, fontFamily: "var(--font-mono)" }}
      >
        {value}
      </span>
      <span
        className="text-xs font-semibold"
        style={{ color: colors.fg, textTransform: "capitalize" }}
      >
        {status.replace("-", " ")}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CoreWebVitals({ cwv }: CoreWebVitalsProps) {
  if (!cwv.available) {
    return (
      <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
        <div className="ds-bar mb-4">
          <span className="ds-bar-swatch" />
          <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
            Core Web Vitals (Page Experience)
          </h2>
        </div>
        <div
          className="ds-panel px-4 py-3 flex items-start gap-3"
          style={{ borderLeft: "4px solid var(--color-border)" }}
        >
          <span
            className="text-xs"
            style={{ color: "var(--color-fg-tertiary)", fontStyle: "italic" }}
          >
            Core Web Vitals unavailable — set PAGESPEED_API_KEY
            {cwv.reason ? ` (${cwv.reason})` : ""}
          </span>
        </div>
      </section>
    );
  }

  const { performance_score, grade, metrics, recommendations } = cwv;
  const gColors = gradeColors(grade);

  const tiles: { label: string; value: string; status: CwvStatus }[] = [
    {
      label: "LCP",
      value: `${Math.round(metrics.lcp_ms)} ms`,
      status: lcpStatus(metrics.lcp_ms),
    },
    {
      label: "CLS",
      value: metrics.cls_score.toFixed(3),
      status: clsStatus(metrics.cls_score),
    },
    {
      label: "TBT (INP proxy)",
      value: `${Math.round(metrics.tbt_ms)} ms`,
      status: tbtStatus(metrics.tbt_ms),
    },
    {
      label: "FCP",
      value: `${Math.round(metrics.fcp_ms)} ms`,
      status: fcpStatus(metrics.fcp_ms),
    },
    {
      label: "Performance",
      value: `${Math.round(metrics.performance_score)}`,
      status:
        metrics.performance_score >= 80
          ? "good"
          : metrics.performance_score >= 50
            ? "needs-improvement"
            : "poor",
    },
  ];

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Core Web Vitals (Page Experience)
        </h2>
      </div>

      {/* Grade header */}
      <div
        className="ds-panel px-4 py-3 mb-4 flex items-center gap-4"
        style={{ borderLeft: `3px solid ${gColors.border}` }}
      >
        <span
          className="inline-flex items-center px-3 py-1 text-xl font-bold uppercase tracking-widest"
          style={{
            background: gColors.bg,
            color: gColors.fg,
            border: `1px solid ${gColors.border}`,
          }}
          title={`CWV grade: ${grade}`}
        >
          {grade}
        </span>
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm font-semibold"
            style={{ color: "var(--color-fg-primary)" }}
          >
            Performance score: {Math.round(performance_score)}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-fg-secondary)" }}
          >
            Mobile · Google PageSpeed Insights v5
          </span>
        </div>
      </div>

      {/* Metric tiles */}
      <div
        className="grid gap-2 mb-4"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}
      >
        {tiles.map((t) => (
          <MetricTile key={t.label} label={t.label} value={t.value} status={t.status} />
        ))}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <div
              key={i}
              className="ds-panel px-4 py-3 flex items-start gap-3"
              style={{
                borderLeft: "4px solid var(--color-amber-600)",
                background: "var(--color-amber-100)",
              }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "var(--color-amber-600)", whiteSpace: "nowrap" }}
              >
                Fix
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--color-fg-secondary)", fontFamily: "var(--font-ui)" }}
              >
                {rec}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
