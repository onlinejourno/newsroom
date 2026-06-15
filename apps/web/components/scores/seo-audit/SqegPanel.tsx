import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SqegYmyl {
  is_ymyl: boolean;
  level: string;
  requirements: string[];
}

export interface SqegPqSignal {
  name: string;
  points: number;
  max: number;
  ref: string;
  note: string;
}

export interface SqegPageQuality {
  score: number;
  grade: string;
  signals: SqegPqSignal[];
  risk_flags: string[];
}

export interface SqegNeedsMet {
  needs_met: string;
  query_intent: string;
  alignment_ratio: number;
}

export interface SqegData {
  ymyl: SqegYmyl;
  page_quality: SqegPageQuality;
  needs_met: SqegNeedsMet;
}

export interface SqegPanelProps {
  sqeg: SqegData;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

/** YMYL level severity — "high" / "medium" / "low" → color token */
function ymylLevelColors(level: string): { fg: string; border: string; bg: string } {
  const l = level.toLowerCase();
  if (l === "high")
    return {
      fg: "var(--color-urgent)",
      border: "var(--color-urgent)",
      bg: "var(--color-urgent-bg)",
    };
  if (l === "medium")
    return {
      fg: "var(--color-amber-600)",
      border: "var(--color-amber-600)",
      bg: "var(--color-amber-100)",
    };
  return {
    fg: "var(--color-brand-dark)",
    border: "var(--color-brand)",
    bg: "var(--color-brand-bg)",
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface PqSignalRowProps {
  signal: SqegPqSignal;
}

function PqSignalRow({ signal }: PqSignalRowProps) {
  const pct = signal.max > 0 ? signal.points / signal.max : 0;
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
          {signal.points}/{signal.max}
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="h-1 w-full overflow-hidden"
        style={{ background: "var(--color-border)" }}
        title={`${signal.points} of ${signal.max}`}
      >
        <div
          style={{ width: `${Math.round(pct * 100)}%`, background: barColor, height: "100%" }}
        />
      </div>

      {/* SQEG ref — muted */}
      {signal.ref && (
        <span
          className="text-xs"
          style={{ color: "var(--color-fg-tertiary)", fontFamily: "var(--font-mono)" }}
        >
          {signal.ref}
        </span>
      )}

      {/* Explanatory note */}
      {signal.note && (
        <p
          className="text-xs"
          style={{ color: "var(--color-fg-secondary)", fontStyle: "italic", fontFamily: "var(--font-ui)" }}
        >
          {signal.note}
        </p>
      )}
    </li>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SqegPanel({ sqeg }: SqegPanelProps) {
  const { ymyl, page_quality, needs_met } = sqeg;
  const pqColors = gradeColors(page_quality.grade);
  const ymylColors = ymylLevelColors(ymyl.level);

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      {/* Section heading */}
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          Search Quality Evaluator Guidelines (SQEG)
        </h2>
      </div>

      {/* 3-up header strip */}
      <div
        className="ds-panel mb-4 grid"
        style={{ gridTemplateColumns: "1fr 1fr 1fr" }}
      >
        {/* YMYL Classification */}
        <div
          className="flex flex-col gap-1 px-4 py-3 border-r"
          style={{ borderColor: "var(--color-rule-soft)" }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            YMYL Classification
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: ymylColors.fg }}
          >
            {ymyl.level}
          </span>
          {ymyl.is_ymyl && (
            <span
              className="text-xs"
              style={{ color: "var(--color-amber-600)", fontStyle: "italic" }}
            >
              Sensitive topic — higher PQ bar applies
            </span>
          )}
        </div>

        {/* Page Quality */}
        <div
          className="flex flex-col gap-1 px-4 py-3 border-r"
          style={{ borderColor: "var(--color-rule-soft)" }}
        >
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            Page Quality
          </span>
          <div className="flex items-baseline gap-2">
            <span
              className="ds-stat text-lg leading-none"
              style={{ color: pqColors.fg }}
              title={`Page Quality score: ${Math.round(page_quality.score)}/100`}
            >
              {Math.round(page_quality.score)}
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
                background: pqColors.bg,
                color: pqColors.fg,
                border: `1px solid ${pqColors.border}`,
              }}
            >
              {page_quality.grade}
            </span>
          </div>
        </div>

        {/* Needs Met */}
        <div className="flex flex-col gap-1 px-4 py-3">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            Needs Met
          </span>
          <span
            className="text-sm font-bold"
            style={{ color: "var(--color-fg-primary)" }}
          >
            {needs_met.needs_met}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-fg-secondary)", fontStyle: "italic" }}
          >
            {needs_met.query_intent}
          </span>
        </div>
      </div>

      {/* YMYL requirements checklist */}
      {ymyl.requirements.length > 0 && (
        <div className="ds-panel px-4 py-3 mb-3">
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2"
            style={{ color: "var(--color-fg-tertiary)" }}
          >
            YMYL Requirements
          </p>
          <ul className="space-y-1">
            {ymyl.requirements.map((req, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-xs"
                style={{ color: "var(--color-fg-secondary)", fontFamily: "var(--font-ui)" }}
              >
                <span
                  aria-hidden
                  style={{
                    display: "inline-block",
                    marginTop: 3,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    border: `1.5px solid ${ymylColors.border}`,
                    background: ymyl.is_ymyl ? ymylColors.bg : "transparent",
                    flexShrink: 0,
                  }}
                />
                {req}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* PQ signal bars */}
      {page_quality.signals.length > 0 && (
        <details className="ds-panel mb-3">
          <summary
            className="px-4 py-3 cursor-pointer select-none text-xs font-semibold"
            style={{
              color: "var(--color-fg-tertiary)",
              borderBottom: "1px solid var(--color-rule-soft)",
              listStyle: "none",
            }}
          >
            Page Quality signals ({page_quality.signals.length})
          </summary>
          <ul className="px-4 pb-2">
            {page_quality.signals.map((sig, i) => (
              <PqSignalRow key={`${sig.name}-${i}`} signal={sig} />
            ))}
          </ul>
        </details>
      )}

      {/* Risk flags — "Lowest Quality" red boxes */}
      {page_quality.risk_flags.length > 0 && (
        <div className="space-y-2">
          {page_quality.risk_flags.map((flag, i) => (
            <div
              key={i}
              className="ds-panel px-4 py-3 flex items-start gap-3"
              style={{
                borderLeft: "4px solid var(--color-urgent)",
                background: "var(--color-urgent-bg)",
              }}
            >
              <span
                className="text-xs font-bold uppercase tracking-wide"
                style={{ color: "var(--color-urgent)", whiteSpace: "nowrap" }}
              >
                Lowest Quality risk
              </span>
              <span
                className="text-xs"
                style={{ color: "var(--color-fg-secondary)", fontFamily: "var(--font-ui)" }}
              >
                {flag}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
