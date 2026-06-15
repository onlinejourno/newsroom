import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches advisory.py `premium_distribution_advice()` return exactly:
//   { urgency: "HIGH"|"MEDIUM"|"LOW", note: string,
//     options: { rank, title, rationale, effort, impact }[] }

export interface AdvisoryOption {
  rank: number;
  title: string;
  rationale: string;
  effort: string;
  impact: string;
}

export interface AdvisoryData {
  urgency: string;
  note: string;
  options: AdvisoryOption[];
}

export interface PremiumDistributionAdvisoryProps {
  advisory: AdvisoryData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urgencyColors(urgency: string): { fg: string; bg: string; border: string } {
  const u = urgency.toUpperCase();
  if (u === "HIGH")
    return {
      fg: "var(--color-urgent)",
      bg: "var(--color-urgent-bg)",
      border: "var(--color-urgent)",
    };
  if (u === "MEDIUM")
    return {
      fg: "var(--color-amber-600)",
      bg: "var(--color-amber-100)",
      border: "var(--color-amber-600)",
    };
  return {
    fg: "var(--color-fg-tertiary)",
    bg: "var(--color-bg-subtle, var(--color-bg))",
    border: "var(--color-border)",
  };
}

function impactColors(impact: string): { fg: string; bg: string; border: string } {
  const i = impact.toUpperCase();
  if (i === "HIGH")
    return {
      fg: "var(--color-brand-dark)",
      bg: "var(--color-brand-bg)",
      border: "var(--color-brand)",
    };
  if (i === "MEDIUM")
    return {
      fg: "var(--color-amber-600)",
      bg: "var(--color-amber-100)",
      border: "var(--color-amber-600)",
    };
  return {
    fg: "var(--color-fg-tertiary)",
    bg: "transparent",
    border: "var(--color-border)",
  };
}

function effortColors(effort: string): { fg: string; bg: string; border: string } {
  const e = effort.toLowerCase();
  if (e.startsWith("low"))
    return {
      fg: "var(--color-brand-dark)",
      bg: "var(--color-brand-bg)",
      border: "var(--color-brand)",
    };
  if (e.startsWith("medium"))
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

interface ChipProps {
  label: string;
  colors: { fg: string; bg: string; border: string };
}

function Chip({ label, colors }: ChipProps) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
      style={{
        background: colors.bg,
        color: colors.fg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {label}
    </span>
  );
}

interface OptionCardProps {
  option: AdvisoryOption;
}

function OptionCard({ option }: OptionCardProps) {
  const effortC = effortColors(option.effort);
  const impactC = impactColors(option.impact);

  return (
    <div
      className="ds-panel px-4 py-3 flex flex-col gap-2"
    >
      {/* Rank + title */}
      <div className="flex items-start gap-3">
        <span
          className="text-xs font-bold tabular-nums"
          style={{
            color: "var(--color-fg-tertiary)",
            fontFamily: "var(--font-mono)",
            minWidth: "1.25rem",
          }}
          aria-label={`Option ${option.rank}`}
        >
          #{option.rank}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-fg-primary)", fontFamily: "var(--font-ui)" }}
        >
          {option.title}
        </span>
      </div>

      {/* Rationale */}
      <p
        className="text-xs"
        style={{
          color: "var(--color-fg-secondary)",
          fontFamily: "var(--font-ui)",
          paddingLeft: "1.5rem",
        }}
      >
        {option.rationale}
      </p>

      {/* Effort + Impact chips */}
      <div className="flex items-center gap-2" style={{ paddingLeft: "1.5rem" }}>
        <span
          className="text-xs"
          style={{ color: "var(--color-fg-tertiary)" }}
        >
          Effort:
        </span>
        <Chip label={option.effort} colors={effortC} />
        <span
          className="text-xs ml-1"
          style={{ color: "var(--color-fg-tertiary)" }}
        >
          Impact:
        </span>
        <Chip label={option.impact} colors={impactC} />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PremiumDistributionAdvisory({
  advisory,
}: PremiumDistributionAdvisoryProps) {
  const { urgency, note, options } = advisory;
  const uColors = urgencyColors(urgency);

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Premium Distribution Advisory
        </h2>
      </div>

      {/* Urgency chip + note */}
      <div
        className="ds-panel px-4 py-3 mb-4 flex flex-col gap-2"
        style={{ borderLeft: `4px solid ${uColors.border}` }}
      >
        <div className="flex items-center gap-3">
          <Chip label={urgency} colors={uColors} />
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: uColors.fg }}
          >
            urgency
          </span>
        </div>
        {note && (
          <p
            className="text-xs"
            style={{
              color: "var(--color-fg-secondary)",
              fontFamily: "var(--font-ui)",
            }}
          >
            {note}
          </p>
        )}
      </div>

      {/* Ranked options */}
      {options.length > 0 && (
        <div className="space-y-2">
          {options.map((opt, i) => (
            <OptionCard key={`${opt.rank}-${i}`} option={opt} />
          ))}
        </div>
      )}
    </section>
  );
}
