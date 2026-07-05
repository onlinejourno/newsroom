import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RecirculationData {
  score: number;
  metrics: Record<string, number | boolean>;
  recommendations: string[];
}

export interface RecirculationProps {
  recirculation: RecirculationData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** snake_case → Title Case: "internal_links_count" → "Internal Links Count" */
function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatMetricValue(value: number | boolean): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  // Round floats to 2 dp
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function scoreColors(score: number): { fg: string; bg: string; border: string } {
  if (score >= 80)
    return {
      fg: "var(--color-brand-dark)",
      bg: "var(--color-brand-bg)",
      border: "var(--color-brand)",
    };
  if (score >= 50)
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

// ── Sub-components ────────────────────────────────────────────────────────────

interface MetricTileProps {
  label: string;
  value: number | boolean;
}

function MetricTile({ label, value }: MetricTileProps) {
  const isBool = typeof value === "boolean";
  const boolColor =
    isBool
      ? value
        ? "var(--color-brand-dark)"
        : "var(--color-urgent)"
      : "var(--color-fg-primary)";

  return (
    <div
      className="ds-panel px-3 py-2 flex flex-col gap-0.5"
      style={{ minWidth: 0 }}
    >
      <span
        className="text-xs font-bold uppercase tracking-wide"
        style={{ color: "var(--color-fg-tertiary)", fontFamily: "var(--font-ui)" }}
      >
        {label}
      </span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{
          color: isBool ? boolColor : "var(--color-fg-primary)",
          fontFamily: isBool ? "var(--font-ui)" : "var(--font-mono)",
        }}
      >
        {formatMetricValue(value)}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Recirculation({ recirculation }: RecirculationProps) {
  const { score, metrics, recommendations } = recirculation;
  const colors = scoreColors(score);
  const metricEntries = Object.entries(metrics);

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Internal Link Quality (Recirculation)
        </h2>
      </div>

      {/* Score */}
      <div
        className="ds-panel px-4 py-3 mb-4 flex items-center gap-4"
        style={{ borderLeft: `3px solid ${colors.border}` }}
      >
        <span
          className="ds-stat text-xl leading-none"
          style={{ color: colors.fg }}
          title={`Recirculation score: ${Math.round(score)}/100`}
        >
          {Math.round(score)}
          <span
            className="text-xs font-semibold ml-0.5"
            style={{ color: "var(--color-fg-secondary)" }}
          >
            /100
          </span>
        </span>
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: colors.fg }}
        >
          Recirculation score
        </span>
      </div>

      {/* Metric tiles */}
      {metricEntries.length > 0 && (
        <div
          className="grid gap-2 mb-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
        >
          {metricEntries.map(([key, val]) => (
            <MetricTile key={key} label={humanizeKey(key)} value={val} />
          ))}
        </div>
      )}

      {/* Recommendations — amber advisory boxes */}
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
                Improve
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
