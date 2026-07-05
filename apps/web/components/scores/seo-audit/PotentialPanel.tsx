import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────
// Matches audit.py `result["potential"]` exactly:
//   { score: number, label: string, components: { trend_momentum, content_alignment,
//     domain_authority, freshness } }

export interface PotentialComponents {
  trend_momentum?: number;
  content_alignment?: number;
  domain_authority?: number;
  freshness?: number;
  [key: string]: number | undefined;
}

export interface PotentialData {
  score: number;
  label: string;
  components: PotentialComponents;
}

export interface PotentialPanelProps {
  potential: PotentialData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** snake_case → Title Case */
function humanizeKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function scoreColors(score: number): { fg: string; bg: string; border: string } {
  if (score >= 70)
    return {
      fg: "var(--color-brand-dark)",
      bg: "var(--color-brand-bg)",
      border: "var(--color-brand)",
    };
  if (score >= 40)
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

// ── Sub-component ─────────────────────────────────────────────────────────────

interface ComponentTileProps {
  label: string;
  value: number;
}

function ComponentTile({ label, value }: ComponentTileProps) {
  const rounded = Math.round(value);
  const pct = Math.min(100, Math.max(0, value));
  const barColor =
    pct >= 70
      ? "var(--color-brand)"
      : pct >= 40
        ? "var(--color-amber-600)"
        : "var(--color-urgent)";

  return (
    <div className="ds-panel px-3 py-2 flex flex-col gap-1" style={{ minWidth: 0 }}>
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-xs font-bold uppercase tracking-wide"
          style={{ color: "var(--color-fg-tertiary)", fontFamily: "var(--font-ui)" }}
        >
          {label}
        </span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: "var(--color-fg-primary)", fontFamily: "var(--font-mono)" }}
        >
          {rounded}
        </span>
      </div>
      {/* Progress bar */}
      <div
        className="h-1 w-full overflow-hidden"
        style={{ background: "var(--color-border)" }}
        title={`${rounded}/100`}
      >
        <div
          style={{ width: `${Math.round(pct)}%`, background: barColor, height: "100%" }}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PotentialPanel({ potential }: PotentialPanelProps) {
  const { score, label, components } = potential;
  const colors = scoreColors(score);

  // Render whatever numeric component fields exist (defensive)
  const componentEntries = Object.entries(components).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Discover Potential
        </h2>
      </div>

      {/* Composite score */}
      <div
        className="ds-panel px-4 py-3 mb-4 flex items-center gap-4"
        style={{ borderLeft: `3px solid ${colors.border}` }}
      >
        <span
          className="ds-stat text-xl leading-none"
          style={{ color: colors.fg }}
          title={`Potential score: ${Math.round(score)}/100`}
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
          className="inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
          style={{
            background: colors.bg,
            color: colors.fg,
            border: `1px solid ${colors.border}`,
          }}
        >
          {label}
        </span>
      </div>

      {/* Component sub-scores */}
      {componentEntries.length > 0 && (
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
        >
          {componentEntries.map(([key, val]) => (
            <ComponentTile key={key} label={humanizeKey(key)} value={val} />
          ))}
        </div>
      )}
    </section>
  );
}
