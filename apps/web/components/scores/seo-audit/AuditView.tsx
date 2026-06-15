import * as React from "react";

import type { SeoAudit } from "@/lib/seoAudit";
import { AuditScorecard } from "./AuditScorecard";
import { PeriodicTable } from "./PeriodicTable";
import type { PeriodicCheck } from "./PeriodicTable";

// ── Local narrow types ────────────────────────────────────────────────────────
// SeoAudit is Record<string, unknown> so we narrow each slice with guards
// rather than casts — no `any`, no forced assertions.

interface AuditOverall {
  score: number;
  grade: "A" | "B" | "C" | "D" | "F";
  counts: { critical: number; warning: number; ok: number };
}

// ── Type guards ───────────────────────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isSeverity(v: unknown): v is "critical" | "warning" | "ok" {
  return v === "critical" || v === "warning" || v === "ok";
}

function isGrade(v: unknown): v is "A" | "B" | "C" | "D" | "F" {
  return (
    v === "A" || v === "B" || v === "C" || v === "D" || v === "F"
  );
}

function narrowCounts(
  v: unknown,
): { critical: number; warning: number; ok: number } {
  if (!isRecord(v)) return { critical: 0, warning: 0, ok: 0 };
  return {
    critical: typeof v.critical === "number" ? v.critical : 0,
    warning: typeof v.warning === "number" ? v.warning : 0,
    ok: typeof v.ok === "number" ? v.ok : 0,
  };
}

function narrowOverall(v: unknown): AuditOverall | null {
  if (!isRecord(v)) return null;
  if (typeof v.score !== "number") return null;
  if (!isGrade(v.grade)) return null;
  return {
    score: v.score,
    grade: v.grade,
    counts: narrowCounts(v.counts),
  };
}

function narrowCheck(v: unknown): PeriodicCheck | null {
  if (!isRecord(v)) return null;
  if (typeof v.element !== "string") return null;
  if (typeof v.signal !== "string") return null;
  if (!isSeverity(v.severity)) return null;
  return {
    element: v.element,
    signal: v.signal,
    severity: v.severity,
    finding: typeof v.finding === "string" ? v.finding : "",
    recommendation:
      typeof v.recommendation === "string" ? v.recommendation : "",
  };
}

function narrowChecks(v: unknown): PeriodicCheck[] {
  if (!Array.isArray(v)) return [];
  const out: PeriodicCheck[] = [];
  for (const item of v) {
    const c = narrowCheck(item);
    if (c) out.push(c);
  }
  return out;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AuditViewProps {
  audit: SeoAudit;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AuditView({ audit }: AuditViewProps) {
  const overall = narrowOverall(audit.overall);
  const checks = narrowChecks(audit.checks);

  // `audit.warning` is the homepage-detection warning string (engine sets it
  // when the URL is a section front, not an article).
  const warningMsg =
    typeof audit.warning === "string" ? audit.warning : null;

  return (
    <div style={{ fontFamily: "var(--font-ui)" }}>
      {/* Hard error — engine returned an error string */}
      {audit.error ? (
        <div
          className="ds-panel px-4 py-3 mb-6 flex items-start gap-3"
          style={{ borderLeft: "4px solid var(--color-urgent)" }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: "var(--color-urgent)" }}
          >
            Audit error
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--color-fg-secondary)" }}
          >
            {audit.error}
          </span>
        </div>
      ) : null}

      {/* Amber homepage / section-front warning */}
      {warningMsg ? (
        <div
          className="ds-panel px-4 py-3 mb-6 flex items-start gap-3"
          style={{ borderLeft: "4px solid var(--color-amber-600)" }}
        >
          <span
            className="text-sm font-bold"
            style={{ color: "var(--color-amber-600)" }}
          >
            Notice
          </span>
          <span
            className="text-sm"
            style={{ color: "var(--color-fg-secondary)" }}
          >
            {warningMsg}
          </span>
        </div>
      ) : null}

      {/* Overall scorecard */}
      {overall ? (
        <AuditScorecard
          score={overall.score}
          grade={overall.grade}
          counts={overall.counts}
        />
      ) : null}

      {/* SEJ signal checks — periodic table */}
      <PeriodicTable checks={checks} />

      {/* ChannelCards — T16 */}

      {/* SQEG / quality signals — T17 */}

      {/* Recirculation + potential — T18 */}

      {/* CWV / advisory / AI-overview / YouTube — T19 */}
    </div>
  );
}
