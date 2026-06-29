import * as React from "react";

/**
 * Pitch-weight pill (0–100 int). Colour bands mirror ScoreBadge thresholds:
 * ≥75 → HIGH (brand green), ≥50 → MEDIUM (amber), <50 → LOW (urgent red).
 * Uses the same OJDS CSS variables as ScoreBadge + Badge; no hex invented.
 * `title` is shown as a native tooltip (pitch_why from the scan).
 */

function band(value: number): "HIGH" | "MEDIUM" | "LOW" {
  if (value >= 75) return "HIGH";
  if (value >= 50) return "MEDIUM";
  return "LOW";
}

const BAND_STYLE: Record<"HIGH" | "MEDIUM" | "LOW", React.CSSProperties> = {
  HIGH: {
    background: "var(--color-brand-bg)",
    color: "var(--color-brand-dark)",
    border: "1px solid var(--color-brand)",
  },
  MEDIUM: {
    background: "var(--color-amber-100)",
    color: "var(--color-amber-600)",
    border: "1px solid var(--color-amber-600)",
  },
  LOW: {
    background: "var(--color-urgent-bg)",
    color: "var(--color-urgent)",
    border: "1px solid var(--color-urgent)",
  },
};

const NULL_STYLE: React.CSSProperties = {
  background: "var(--color-ink-100)",
  color: "var(--color-fg-tertiary)",
  border: "1px solid var(--color-rule)",
};

export interface WeightBadgeProps {
  value: number | null;
  title?: string;
}

export function WeightBadge({ value, title }: WeightBadgeProps) {
  const b = value != null ? band(value) : null;
  const style: React.CSSProperties = b ? BAND_STYLE[b] : NULL_STYLE;

  return (
    <span
      title={title}
      style={{
        ...style,
        fontFamily: "var(--font-ui)",
        borderRadius: "var(--radius-pill)",
        display: "inline-flex",
        alignItems: "center",
        padding: "0.125rem 0.5rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        lineHeight: 1.4,
        cursor: title ? "help" : undefined,
      }}
    >
      {value != null ? (
        <span style={{ fontFamily: "var(--font-display)" }}>{value}</span>
      ) : (
        <span style={{ opacity: 0.6 }}>—</span>
      )}
    </span>
  );
}
