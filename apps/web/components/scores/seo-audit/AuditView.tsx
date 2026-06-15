import * as React from "react";

import type { SeoAudit } from "@/lib/seoAudit";
import { AuditScorecard } from "./AuditScorecard";
import { ChannelCards } from "./ChannelCards";
import type { SurfaceEntry, CompositeEntry } from "./ChannelCards";
import { PeriodicTable } from "./PeriodicTable";
import type { PeriodicCheck } from "./PeriodicTable";
import { SignalRadar } from "./SignalRadar";
import type { RadarAxis } from "./SignalRadar";
import { SqegPanel } from "./SqegPanel";
import type { SqegData, SqegYmyl, SqegPageQuality, SqegNeedsMet, SqegPqSignal } from "./SqegPanel";
import { Recirculation } from "./Recirculation";
import type { RecirculationData } from "./Recirculation";
import { Taxonomy } from "./Taxonomy";
import type { TaxonomyData } from "./Taxonomy";
import { CoreWebVitals } from "./CoreWebVitals";
import type { CwvData, CwvMetrics } from "./CoreWebVitals";
import { PotentialPanel } from "./PotentialPanel";
import type { PotentialData } from "./PotentialPanel";
import { PremiumDistributionAdvisory } from "./PremiumDistributionAdvisory";
import type { AdvisoryData, AdvisoryOption } from "./PremiumDistributionAdvisory";

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

// ── Narrowing: sqeg ───────────────────────────────────────────────────────────

function narrowPqSignal(v: unknown): SqegPqSignal | null {
  if (!isRecord(v)) return null;
  if (typeof v.name !== "string") return null;
  if (typeof v.points !== "number") return null;
  if (typeof v.max !== "number") return null;
  return {
    name: v.name,
    points: v.points,
    max: v.max,
    ref: typeof v.ref === "string" ? v.ref : "",
    note: typeof v.note === "string" ? v.note : "",
  };
}

function narrowPqSignals(v: unknown): SqegPqSignal[] {
  if (!Array.isArray(v)) return [];
  const out: SqegPqSignal[] = [];
  for (const item of v) {
    const s = narrowPqSignal(item);
    if (s) out.push(s);
  }
  return out;
}

function narrowStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v) {
    if (typeof item === "string") out.push(item);
  }
  return out;
}

function narrowSqegYmyl(v: unknown): SqegYmyl | null {
  if (!isRecord(v)) return null;
  if (typeof v.is_ymyl !== "boolean") return null;
  if (typeof v.level !== "string") return null;
  return {
    is_ymyl: v.is_ymyl,
    level: v.level,
    requirements: narrowStringArray(v.requirements),
  };
}

function narrowSqegPq(v: unknown): SqegPageQuality | null {
  if (!isRecord(v)) return null;
  if (typeof v.score !== "number") return null;
  if (typeof v.grade !== "string") return null;
  return {
    score: v.score,
    grade: v.grade,
    signals: narrowPqSignals(v.signals),
    risk_flags: narrowStringArray(v.risk_flags),
  };
}

function narrowSqegNeedsMet(v: unknown): SqegNeedsMet | null {
  if (!isRecord(v)) return null;
  if (typeof v.needs_met !== "string") return null;
  if (typeof v.query_intent !== "string") return null;
  return {
    needs_met: v.needs_met,
    query_intent: v.query_intent,
    alignment_ratio: typeof v.alignment_ratio === "number" ? v.alignment_ratio : 0,
  };
}

function narrowSqeg(v: unknown): SqegData | null {
  if (!isRecord(v)) return null;
  const ymyl = narrowSqegYmyl(v.ymyl);
  const page_quality = narrowSqegPq(v.page_quality);
  const needs_met = narrowSqegNeedsMet(v.needs_met);
  if (!ymyl || !page_quality || !needs_met) return null;
  return { ymyl, page_quality, needs_met };
}

// ── Narrowing: recirculation ──────────────────────────────────────────────────

function narrowMetrics(v: unknown): Record<string, number | boolean> {
  if (!isRecord(v)) return {};
  const out: Record<string, number | boolean> = {};
  for (const [key, val] of Object.entries(v)) {
    if (typeof val === "number" || typeof val === "boolean") {
      out[key] = val;
    }
  }
  return out;
}

function narrowRecirculation(v: unknown): RecirculationData | null {
  if (!isRecord(v)) return null;
  if (typeof v.score !== "number") return null;
  return {
    score: v.score,
    metrics: narrowMetrics(v.metrics),
    recommendations: narrowStringArray(v.recommendations),
  };
}

// ── Narrowing: taxonomy ───────────────────────────────────────────────────────

function narrowTaxonomy(v: unknown): TaxonomyData | null {
  if (!isRecord(v)) return null;
  return {
    section_path: typeof v.section_path === "string" ? v.section_path : "",
    topic: typeof v.topic === "string" ? v.topic : "",
    tags: narrowStringArray(v.tags),
  };
}

// ── Narrowing: CWV ────────────────────────────────────────────────────────────

function narrowCwvMetrics(v: unknown): CwvMetrics | null {
  if (!isRecord(v)) return null;
  if (typeof v.performance_score !== "number") return null;
  if (typeof v.lcp_ms !== "number") return null;
  if (typeof v.cls_score !== "number") return null;
  if (typeof v.tbt_ms !== "number") return null;
  if (typeof v.fcp_ms !== "number") return null;
  return {
    performance_score: v.performance_score,
    lcp_ms: v.lcp_ms,
    cls_score: v.cls_score,
    tbt_ms: v.tbt_ms,
    fcp_ms: v.fcp_ms,
  };
}

function narrowCwv(v: unknown): CwvData | null {
  if (!isRecord(v)) return null;
  if (typeof v.available !== "boolean") return null;
  if (!v.available) {
    return {
      available: false,
      reason: typeof v.reason === "string" ? v.reason : undefined,
    };
  }
  // available = true
  if (typeof v.performance_score !== "number") return null;
  if (typeof v.grade !== "string") return null;
  const metrics = narrowCwvMetrics(v.metrics);
  if (!metrics) return null;
  return {
    available: true,
    performance_score: v.performance_score,
    grade: v.grade,
    metrics,
    recommendations: narrowStringArray(v.recommendations),
  };
}

// ── Narrowing: potential ──────────────────────────────────────────────────────

function narrowPotential(v: unknown): PotentialData | null {
  if (!isRecord(v)) return null;
  if (typeof v.score !== "number") return null;
  if (typeof v.label !== "string") return null;
  // components: defensive — pick numeric fields from whatever's there
  const components: PotentialData["components"] = {};
  if (isRecord(v.components)) {
    for (const [key, val] of Object.entries(v.components)) {
      if (typeof val === "number") {
        components[key] = val;
      }
    }
  }
  return { score: v.score, label: v.label, components };
}

// ── Narrowing: advisory ───────────────────────────────────────────────────────

function narrowAdvisoryOption(v: unknown): AdvisoryOption | null {
  if (!isRecord(v)) return null;
  if (typeof v.rank !== "number") return null;
  if (typeof v.title !== "string") return null;
  if (typeof v.rationale !== "string") return null;
  if (typeof v.effort !== "string") return null;
  if (typeof v.impact !== "string") return null;
  return {
    rank: v.rank,
    title: v.title,
    rationale: v.rationale,
    effort: v.effort,
    impact: v.impact,
  };
}

function narrowAdvisory(v: unknown): AdvisoryData | null {
  if (!isRecord(v)) return null;
  if (typeof v.urgency !== "string") return null;
  if (typeof v.note !== "string") return null;
  const options: AdvisoryOption[] = [];
  if (Array.isArray(v.options)) {
    for (const item of v.options) {
      const opt = narrowAdvisoryOption(item);
      if (opt) options.push(opt);
    }
  }
  return { urgency: v.urgency, note: v.note, options };
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
  const sqeg = narrowSqeg(audit.sqeg);
  const recirculation = narrowRecirculation(audit.recirculation);
  const taxonomy = narrowTaxonomy(audit.taxonomy);
  const cwv = narrowCwv(audit.cwv);
  const potential = narrowPotential(audit.potential);
  const advisory = narrowAdvisory(audit.advisory);

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

      {/* Discover Potential — T18 (near scorecard / composite) */}
      {potential ? <PotentialPanel potential={potential} /> : null}

      {/* Taxonomy context strip — T17 (right after scorecard for orientation) */}
      {taxonomy ? <Taxonomy taxonomy={taxonomy} /> : null}

      {/* Channel distribution cards — T16 */}
      {Object.keys(surfaces).length > 0 ? (
        <ChannelCards
          surfaces={surfaces}
          composite={composite ?? undefined}
        />
      ) : null}

      {/* E-E-A-T signal radar — T16 */}
      {radarAxes.length >= 3 ? <SignalRadar axes={radarAxes} /> : null}

      {/* Core Web Vitals — T18 (technical area, after radar) */}
      {cwv ? <CoreWebVitals cwv={cwv} /> : null}

      {/* SQEG / quality signals — T17 */}
      {sqeg ? <SqegPanel sqeg={sqeg} /> : null}

      {/* SEJ signal checks — periodic table */}
      <PeriodicTable checks={checks} />

      {/* Recirculation + internal link quality — T17 */}
      {recirculation ? <Recirculation recirculation={recirculation} /> : null}

      {/* Premium Distribution Advisory — T18 (only when paywalled) */}
      {advisory ? <PremiumDistributionAdvisory advisory={advisory} /> : null}
    </div>
  );
}
