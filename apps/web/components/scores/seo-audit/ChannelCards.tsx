import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditSignal {
  name: string;
  value: number;
  max: number;
  note: string;
}

export interface SurfaceEntry {
  score: number;
  grade: string;
  signals: AuditSignal[];
}

export interface CompositeEntry {
  composite: number;
  priority_surfaces: string[];
  top_fix: string | null;
}

export interface ChannelCardsProps {
  surfaces: Record<string, SurfaceEntry>;
  composite?: CompositeEntry;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SURFACE_LABELS: Record<string, string> = {
  discover: "Google Discover",
  google_news: "Google News",
  google_search: "Google Search",
  aio: "AI Overviews",
};

function surfaceLabel(key: string): string {
  if (key in SURFACE_LABELS) return SURFACE_LABELS[key]!;
  // title-case fallback: "my_surface" → "My Surface"
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function gradeColors(grade: string): { bg: string; fg: string; border: string } {
  if (grade === "A" || grade === "B")
    return {
      bg: "var(--color-brand-bg)",
      fg: "var(--color-brand-dark)",
      border: "var(--color-brand)",
    };
  if (grade === "C")
    return {
      bg: "var(--color-amber-100)",
      fg: "var(--color-amber-600)",
      border: "var(--color-amber-600)",
    };
  return {
    bg: "var(--color-urgent-bg)",
    fg: "var(--color-urgent)",
    border: "var(--color-urgent)",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface GradeChipProps {
  grade: string;
}

function GradeChip({ grade }: GradeChipProps) {
  const c = gradeColors(grade);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-widest"
      style={{
        background: c.bg,
        color: c.fg,
        border: `1px solid ${c.border}`,
        fontFamily: "var(--font-ui)",
      }}
    >
      {grade}
    </span>
  );
}

interface SignalRowProps {
  signal: AuditSignal;
}

function SignalRow({ signal }: SignalRowProps) {
  const pct = signal.max > 0 ? signal.value / signal.max : 0;
  const barColor =
    pct >= 0.8
      ? "var(--color-brand)"
      : pct >= 0.5
        ? "var(--color-amber-600)"
        : "var(--color-urgent)";

  return (
    <li
      className="flex flex-col gap-1 py-2 border-b last:border-b-0"
      style={{ borderColor: "var(--color-rule-soft)" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="text-xs font-semibold flex-1"
          style={{ color: "var(--color-fg-primary)", fontFamily: "var(--font-ui)" }}
        >
          {signal.name}
        </span>
        <span
          className="text-xs font-mono tabular-nums"
          style={{ color: "var(--color-fg-secondary)", fontFamily: "var(--font-mono)" }}
        >
          {signal.value}/{signal.max}
        </span>
      </div>

      {/* Mini progress bar */}
      <div
        className="h-1 w-full overflow-hidden"
        style={{ background: "var(--color-border)" }}
        title={`${signal.value} of ${signal.max}`}
      >
        <div
          style={{ width: `${Math.round(pct * 100)}%`, background: barColor, height: "100%" }}
        />
      </div>

      {signal.note && (
        <p
          className="text-xs"
          style={{ color: "var(--color-fg-tertiary)", fontStyle: "italic", fontFamily: "var(--font-ui)" }}
        >
          {signal.note}
        </p>
      )}
    </li>
  );
}

interface SurfaceCardProps {
  surfaceKey: string;
  entry: SurfaceEntry;
}

function SurfaceCard({ surfaceKey, entry }: SurfaceCardProps) {
  const label = surfaceLabel(surfaceKey);
  const colors = gradeColors(entry.grade);

  return (
    <div
      className="ds-panel"
      style={{
        borderLeft: `3px solid ${colors.border}`,
        fontFamily: "var(--font-ui)",
        minWidth: 0,
      }}
    >
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span
          className="text-sm font-bold flex-1"
          style={{ color: "var(--color-fg-primary)" }}
        >
          {label}
        </span>
        <span
          className="ds-stat text-lg leading-none"
          style={{ color: colors.fg }}
          title={`${label} score: ${Math.round(entry.score)}/100`}
        >
          {Math.round(entry.score)}
          <span
            className="text-xs font-semibold ml-0.5"
            style={{ color: "var(--color-fg-secondary)" }}
          >
            /100
          </span>
        </span>
        <GradeChip grade={entry.grade} />
      </div>

      {/* Expandable signal breakdown */}
      {entry.signals.length > 0 && (
        <details style={{ borderTop: "1px solid var(--color-rule-soft)" }}>
          <summary
            className="px-4 py-2 cursor-pointer select-none text-xs font-semibold"
            style={{ color: "var(--color-fg-tertiary)", listStyle: "none" }}
          >
            Signal breakdown ({entry.signals.length})
          </summary>
          <ul className="px-4 pb-2">
            {entry.signals.map((sig, i) => (
              <SignalRow key={`${sig.name}-${i}`} signal={sig} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChannelCards({ surfaces, composite }: ChannelCardsProps) {
  const keys = Object.keys(surfaces);

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Channel Distribution Scores
        </h2>
        <span className="ds-meta ml-auto">{keys.length} surface{keys.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Composite summary row */}
      {composite && (
        <div
          className="ds-panel px-4 py-3 mb-4 flex flex-wrap items-start gap-x-6 gap-y-2"
          style={{
            background: "var(--color-brand-bg)",
            borderLeft: "3px solid var(--color-brand)",
          }}
        >
          <div className="flex items-baseline gap-2">
            <span
              className="ds-stat text-xl leading-none"
              style={{ color: "var(--color-brand-dark)" }}
              title="Need-weighted composite score"
            >
              {Math.round(composite.composite)}
              <span
                className="text-xs font-semibold ml-0.5"
                style={{ color: "var(--color-fg-secondary)" }}
              >
                /100
              </span>
            </span>
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: "var(--color-brand-dark)" }}
            >
              Composite
            </span>
          </div>

          {composite.priority_surfaces.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: "var(--color-fg-secondary)" }}>
                Priority:
              </span>
              {composite.priority_surfaces.map((s) => (
                <span
                  key={s}
                  className="text-xs px-1.5 py-0.5 font-semibold"
                  style={{
                    background: "var(--color-border)",
                    color: "var(--color-fg-primary)",
                  }}
                >
                  {surfaceLabel(s)}
                </span>
              ))}
            </div>
          )}

          {composite.top_fix && (
            <p
              className="w-full text-xs"
              style={{ color: "var(--color-fg-secondary)", fontStyle: "italic" }}
            >
              Top fix: {composite.top_fix}
            </p>
          )}
        </div>
      )}

      {/* Per-surface cards */}
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
        {keys.map((key) => (
          <SurfaceCard key={key} surfaceKey={key} entry={surfaces[key]!} />
        ))}
      </div>
    </section>
  );
}
