import * as React from "react";

export interface PeriodicCheck {
  element: string;
  signal: string;
  severity: "critical" | "warning" | "ok";
  finding: string;
  recommendation: string;
}

export interface PeriodicTableProps {
  checks: PeriodicCheck[];
}

// SEJ element code → human group label
const ELEMENT_LABELS: Record<string, string> = {
  Ti: "Title",
  Hd: "Headlines & Headings",
  Au: "Authority / Author",
  Cn: "Content Depth",
  Sd: "Structured Data",
  Sc: "Security",
  Mm: "Multimedia",
  Ds: "Description / Meta",
  El: "Engagement & Links",
  Fr: "Freshness",
  Sh: "Site Health",
  Ar: "Architecture",
  Il: "Internal Linking",
  Tr: "Trust Signals",
  Ac: "Accessibility",
};

function elementLabel(code: string): string {
  return ELEMENT_LABELS[code] ?? code;
}

/** Worst severity among a list — critical > warning > ok */
function worstSeverity(
  checks: PeriodicCheck[],
): "critical" | "warning" | "ok" {
  if (checks.some((c) => c.severity === "critical")) return "critical";
  if (checks.some((c) => c.severity === "warning")) return "warning";
  return "ok";
}

interface SeverityChipProps {
  severity: "critical" | "warning" | "ok";
}

function SeverityChip({ severity }: SeverityChipProps) {
  const styles: Record<
    "critical" | "warning" | "ok",
    { bg: string; fg: string; label: string }
  > = {
    critical: {
      bg: "var(--color-urgent-bg)",
      fg: "var(--color-urgent)",
      label: "CRITICAL",
    },
    warning: {
      bg: "var(--color-amber-100)",
      fg: "var(--color-amber-600)",
      label: "WARNING",
    },
    ok: {
      bg: "var(--color-brand-bg)",
      fg: "var(--color-brand-dark)",
      label: "OK",
    },
  };
  const s = styles[severity];
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide"
      style={{
        background: s.bg,
        color: s.fg,
        fontFamily: "var(--font-ui)",
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}

/** Small dot for the group header — colour matches worst severity. */
function SeverityDot({ severity }: SeverityChipProps) {
  const color =
    severity === "critical"
      ? "var(--color-urgent)"
      : severity === "warning"
        ? "var(--color-amber-600)"
        : "var(--color-brand)";
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

export function PeriodicTable({ checks }: PeriodicTableProps) {
  if (checks.length === 0) {
    return (
      <p
        className="text-sm mb-6"
        style={{ color: "var(--color-fg-tertiary)", fontFamily: "var(--font-ui)" }}
      >
        No signal checks in this audit.
      </p>
    );
  }

  // Group checks by element code, preserving first-seen order
  const groupOrder: string[] = [];
  const grouped: Record<string, PeriodicCheck[]> = {};
  for (const check of checks) {
    if (!grouped[check.element]) {
      groupOrder.push(check.element);
      grouped[check.element] = [];
    }
    grouped[check.element].push(check);
  }

  return (
    <section className="mb-6">
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          SEJ Signal Checks
        </h2>
        <span className="ds-meta ml-auto">{checks.length} checks</span>
      </div>

      <div className="space-y-2">
        {groupOrder.map((code) => {
          const groupChecks = grouped[code]!;
          const worst = worstSeverity(groupChecks);
          const hasCritical = worst === "critical";

          return (
            <details
              key={code}
              open={hasCritical}
              className="ds-panel"
              style={{ fontFamily: "var(--font-ui)" }}
            >
              {/* Group header */}
              <summary
                className="flex items-center gap-2 px-4 py-3 cursor-pointer select-none"
                style={{
                  borderBottom: "1px solid var(--color-rule-soft)",
                  listStyle: "none",
                }}
              >
                <SeverityDot severity={worst} />
                <span
                  className="font-bold text-sm flex-1"
                  style={{ color: "var(--color-fg-primary)" }}
                >
                  <span
                    className="font-mono text-xs mr-2 px-1"
                    style={{
                      background: "var(--color-border)",
                      color: "var(--color-fg-secondary)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {code}
                  </span>
                  {elementLabel(code)}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--color-fg-tertiary)" }}
                >
                  {groupChecks.length} check{groupChecks.length !== 1 ? "s" : ""}
                </span>
              </summary>

              {/* Per-check rows */}
              <ul>
                {groupChecks.map((check, i) => (
                  <li
                    key={`${check.signal}-${i}`}
                    className="px-4 py-3 border-b last:border-b-0"
                    style={{
                      borderColor: "var(--color-rule-soft)",
                      background:
                        check.severity === "critical"
                          ? "color-mix(in srgb, var(--color-urgent-bg) 40%, transparent)"
                          : check.severity === "warning"
                            ? "color-mix(in srgb, var(--color-amber-100) 30%, transparent)"
                            : "transparent",
                    }}
                  >
                    {/* Signal + chip row */}
                    <div className="flex items-start gap-2 mb-1">
                      <SeverityChip severity={check.severity} />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--color-fg-primary)" }}
                      >
                        {check.signal}
                      </span>
                    </div>

                    {/* Finding */}
                    <p
                      className="text-sm ml-0 mb-1"
                      style={{ color: "var(--color-fg-secondary)" }}
                    >
                      {check.finding}
                    </p>

                    {/* Recommendation — indented fix */}
                    {check.recommendation && (
                      <p
                        className="text-xs pl-4 border-l"
                        style={{
                          borderColor: "var(--color-rule)",
                          color: "var(--color-fg-tertiary)",
                          fontStyle: "italic",
                        }}
                      >
                        Fix: {check.recommendation}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
