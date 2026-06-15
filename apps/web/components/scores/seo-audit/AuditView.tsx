import * as React from "react";

import type { SeoAudit } from "@/lib/seoAudit";
import { AuditScorecard } from "./AuditScorecard";
import { ChannelCards } from "./ChannelCards";
import type { SurfaceEntry, CompositeEntry } from "./ChannelCards";
import { PeriodicTable } from "./PeriodicTable";
import type { PeriodicCheck } from "./PeriodicTable";
import { SignalRadar } from "./SignalRadar";
import type { RadarAxis } from "./SignalRadar";

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

// ── Narrowing: surfaces ───────────────────────────────────────────────────────

function narrowSignal(v: unknown): { name: string; value: number; max: number; note: string } | null {
  if (!isRecord(v)) return null;
  if (typeof v.name !== "string") return null;
  if (typeof v.value !== "number") return null;
  if (typeof v.max !== "number") return null;
  return {
    name: v.name,
    value: v.value,
    max: v.max,
    note: typeof v.note === "string" ? v.note : "",
  };
}

function narrowSurfaceEntry(v: unknown): SurfaceEntry | null {
  if (!isRecord(v)) return null;
  if (typeof v.score !== "number") return null;
  if (typeof v.grade !== "string") return null;
  const rawSignals = Array.isArray(v.signals) ? v.signals : [];
  const signals: SurfaceEntry["signals"] = [];
  for (const s of rawSignals) {
    const sig = narrowSignal(s);
    if (sig) signals.push(sig);
  }
  return { score: v.score, grade: v.grade, signals };
}

function narrowSurfaces(v: unknown): Record<string, SurfaceEntry> {
  if (!isRecord(v)) return {};
  const out: Record<string, SurfaceEntry> = {};
  for (const [key, val] of Object.entries(v)) {
    const entry = narrowSurfaceEntry(val);
    if (entry) out[key] = entry;
  }
  return out;
}

// ── Narrowing: composite ──────────────────────────────────────────────────────

function narrowComposite(v: unknown): CompositeEntry | null {
  if (!isRecord(v)) return null;
  if (typeof v.composite !== "number") return null;
  const priority_surfaces: string[] = [];
  if (Array.isArray(v.priority_surfaces)) {
    for (const s of v.priority_surfaces) {
      if (typeof s === "string") priority_surfaces.push(s);
    }
  }
  return {
    composite: v.composite,
    priority_surfaces,
    top_fix: typeof v.top_fix === "string" ? v.top_fix : null,
  };
}

// ── Narrowing: radar ──────────────────────────────────────────────────────────

function narrowRadarAxis(v: unknown): RadarAxis | null {
  if (!isRecord(v)) return null;
  if (typeof v.axis !== "string") return null;
  if (typeof v.value !== "number") return null;
  return { axis: v.axis, value: v.value };
}

function narrowRadar(v: unknown): RadarAxis[] {
  if (!Array.isArray(v)) return [];
  const out: RadarAxis[] = [];
  for (const item of v) {
    const a = narrowRadarAxis(item);
    if (a) out.push(a);
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
  const surfaces = narrowSurfaces(audit.surfaces);
  const composite = narrowComposite(audit.composite);
  const radarAxes = narrowRadar(audit.radar);

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

      {/* Channel distribution cards — T16 */}
      {Object.keys(surfaces).length > 0 ? (
        <ChannelCards
          surfaces={surfaces}
          composite={composite ?? undefined}
        />
      ) : null}

      {/* E-E-A-T signal radar — T16 */}
      {radarAxes.length >= 3 ? <SignalRadar axes={radarAxes} /> : null}

      {/* SEJ signal checks — periodic table */}
      <PeriodicTable checks={checks} />

      {/* SQEG / quality signals — T17 */}

      {/* Recirculation + potential — T18 */}

      {/* CWV / advisory / AI-overview / YouTube — T19 */}
    </div>
  );
}
