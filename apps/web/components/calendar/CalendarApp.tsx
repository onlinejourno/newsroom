"use client";

// CalendarApp — the Predictive Editorial Calendar surface (ADR 0057), ported
// from the "Journalism Agentic" design handoff onto the live calendar_event
// data. IOJ broadsheet voice: warm off-white, thick black frames, Playfair
// display, IOJ green system accent, Hindu red for urgency / past-due.
//
// Four views (Forward Calendar Gantt · Event Feed · Past-due · Pipeline), a
// filter strip (beat · horizon · confidence · search) and a slide-in event
// drawer. All date maths use ISO 'YYYY-MM-DD' strings against `todayISO` (IST),
// matching the design and the unit-tested calendar engine.

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";

export type CalEvent = {
  id: string;
  who: string;
  what: string;
  deadline: string | null; // target_date, ISO
  dateClaimed: string | null;
  sourceName: string;
  sourceUrl: string | null;
  originalText: string | null;
  confidence: number;
  beat: string; // beat id (lowercased topic)
  beatLabel: string;
  location: string | null;
  outcome: "delivered" | "broken" | "dropped" | null;
};

export type Beat = { id: string; label: string; color: string };

const C = {
  bg: "#f0ece4",
  surface: "#ffffff",
  ink: "#111111",
  ink2: "#444444",
  ink3: "#888888",
  rule: "#d4cfc6",
  ruleSoft: "#e6e0d4",
  iojGreen: "#2D7A4F",
  hinduRed: "#D32B2B",
  amber: "#b35d00",
} as const;

const SERIF = "'Playfair Display', Georgia, serif";
const BODY = "'Noto Serif', Georgia, serif";
const UI = "'Source Sans 3', 'Helvetica Neue', Arial, sans-serif";

const LEAD_TIMES = [90, 60, 30, 14, 7, 1];

const TABS = [
  { id: "calendar", label: "Forward Calendar", sub: "Gantt" },
  { id: "list", label: "Event Feed", sub: "List" },
  { id: "pastdue", label: "Past-due", sub: "Accountability" },
  { id: "pipeline", label: "Pipeline", sub: "How it's built" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const PHASE_BUCKETS = [
  { id: "imminent", label: "Commission now", sub: "7 days or less", min: 0, max: 7, color: "#b01e1e", strip: "#fdeaea" },
  { id: "soon", label: "In the lead-time window", sub: "8 – 14 days", min: 8, max: 14, color: "#b35d00", strip: "#f7ecd9" },
  { id: "month", label: "This month", sub: "15 – 30 days", min: 15, max: 30, color: "#7a4f00", strip: "#f3eddd" },
  { id: "quarter", label: "Foreseeable horizon", sub: "31 – 90 days", min: 31, max: 90, color: "#2D7A4F", strip: "#eaf0ea" },
  { id: "beyond", label: "Beyond horizon", sub: "90+ days", min: 91, max: 99999, color: "#666", strip: "#efece4" },
];
type Bucket = (typeof PHASE_BUCKETS)[number];

function bucketFor(daysOut: number): Bucket {
  return PHASE_BUCKETS.find((p) => daysOut >= p.min && daysOut <= p.max) ?? PHASE_BUCKETS[PHASE_BUCKETS.length - 1];
}

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00+05:30`);
  const b = new Date(`${bISO}T00:00:00+05:30`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00+05:30`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fmt(iso: string): string {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtShort(iso: string): string {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function weekday(iso: string): string {
  return new Date(`${iso}T00:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "long" });
}

function daysOutLabel(d: number): string {
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d < 14) return `in ${d} days`;
  if (d < 60) return `in ${Math.round(d / 7)} weeks`;
  return `in ${Math.round(d / 30)} months`;
}

function leadTimeMarkers(deadline: string, todayISO: string) {
  return LEAD_TIMES.map((d) => {
    const date = addDays(deadline, -d);
    return { days: d, date, passed: daysBetween(todayISO, date) < 0 };
  });
}

function resolveBeat(beats: Beat[], id: string): Beat {
  return beats.find((b) => b.id === id) ?? { id, label: id || "General", color: "#666" };
}

// ─────────────────────────── small parts ───────────────────────────

function ConfidenceDots({ value }: { value: number }) {
  const filled = Math.round(value * 5);
  return (
    <span style={{ display: "inline-flex", gap: 2, verticalAlign: "middle" }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          style={{ width: 5, height: 5, borderRadius: "50%", background: i < filled ? C.ink : C.rule, display: "inline-block" }}
        />
      ))}
    </span>
  );
}

function BeatTag({ beats, beat }: { beats: Beat[]; beat: string }) {
  const b = resolveBeat(beats, beat);
  return (
    <span
      style={{
        fontFamily: UI,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: ".14em",
        textTransform: "uppercase",
        color: b.color,
        borderLeft: `2px solid ${b.color}`,
        paddingLeft: 6,
      }}
    >
      {b.label}
    </span>
  );
}

// ─────────────────────────── timeline (Forward Calendar) ───────────────────────────

function TimelineRow({
  event,
  horizon,
  beats,
  todayISO,
  onSelect,
}: {
  event: CalEvent;
  horizon: number;
  beats: Beat[];
  todayISO: string;
  onSelect: (e: CalEvent) => void;
}) {
  const dToDeadline = daysBetween(todayISO, event.deadline!);
  const bucket = bucketFor(dToDeadline);
  const px = (d: number) => Math.min(100, Math.max(0, (d / horizon) * 100));
  const bandLeft = px(Math.max(0, dToDeadline - 90));
  const bandRight = px(Math.min(horizon, dToDeadline));
  const bandWidth = Math.max(0.4, bandRight - bandLeft);
  const tailClipped = dToDeadline - 90 < 0;
  const headClipped = dToDeadline > horizon;
  const markers = [60, 30, 14, 7, 1].map((m) => ({ m, day: dToDeadline - m })).filter((x) => x.day >= 0 && x.day <= horizon);

  return (
    <button
      onClick={() => onSelect(event)}
      style={{
        display: "grid",
        gridTemplateColumns: "180px 1fr 230px",
        gap: 16,
        background: "none",
        border: "none",
        borderTop: `1px solid ${C.ruleSoft}`,
        padding: "14px 0",
        textAlign: "left",
        cursor: "pointer",
        width: "100%",
      }}
    >
      <div style={{ paddingRight: 8 }}>
        <BeatTag beats={beats} beat={event.beat} />
        <div style={{ fontFamily: UI, fontSize: 12, fontWeight: 600, color: C.ink, marginTop: 5, lineHeight: 1.3 }}>
          {event.who.split(",")[0] || "—"}
        </div>
        <div style={{ fontFamily: UI, fontSize: 10, color: C.ink3, marginTop: 1, lineHeight: 1.3 }}>
          {event.who.split(",").slice(1).join(",").trim() || event.location || ""}
        </div>
      </div>

      <div style={{ position: "relative", height: 58, alignSelf: "center" }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 26, height: 6, background: "#efece4", borderTop: `1px solid ${C.ruleSoft}`, borderBottom: `1px solid ${C.ruleSoft}` }} />
        <div
          style={{
            position: "absolute",
            left: `${bandLeft}%`,
            width: `${bandWidth}%`,
            top: 18,
            height: 22,
            background: bucket.strip,
            border: `1px solid ${bucket.color}`,
            borderLeft: tailClipped ? `1px dashed ${bucket.color}` : `1px solid ${bucket.color}`,
            borderRight: headClipped ? `1px dashed ${bucket.color}` : `1px solid ${bucket.color}`,
          }}
        />
        {markers.map(({ m, day }) => (
          <div key={m} style={{ position: "absolute", left: `${px(day)}%`, top: 16, width: 0, transform: "translateX(-50%)" }}>
            <div style={{ width: 1, height: 26, background: C.ink3, opacity: 0.6 }} />
            <div style={{ fontSize: 9, color: "#666", fontFamily: UI, fontWeight: 600, marginTop: 2, whiteSpace: "nowrap", transform: "translateX(-50%)" }}>
              {m}d
            </div>
          </div>
        ))}
        {!headClipped && (
          <div style={{ position: "absolute", left: `${px(dToDeadline)}%`, top: 8, transform: "translateX(-50%)" }}>
            <div style={{ width: 0, height: 0, marginLeft: -1, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: `8px solid ${bucket.color}` }} />
            <div style={{ width: 2, height: 30, background: bucket.color, margin: "0 auto", marginTop: -1 }} />
            <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, color: bucket.color, whiteSpace: "nowrap", transform: "translateX(-50%)", marginTop: 2 }}>
              {fmtShort(event.deadline!)}
            </div>
          </div>
        )}
        {headClipped && (
          <div style={{ position: "absolute", right: 0, top: 20, height: 18, fontSize: 10, color: bucket.color, fontWeight: 700, fontFamily: UI, lineHeight: "18px" }}>
            {fmtShort(event.deadline!)} ▶
          </div>
        )}
      </div>

      <div style={{ paddingLeft: 8, borderLeft: `1px solid ${C.ruleSoft}` }}>
        <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: C.ink, lineHeight: 1.3, marginBottom: 4 }}>{event.what}</div>
        <div style={{ fontFamily: UI, fontSize: 11, color: "#666", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: bucket.color, fontWeight: 700 }}>{daysOutLabel(dToDeadline)}</span>
          <span style={{ color: C.rule }}>·</span>
          <ConfidenceDots value={event.confidence} />
          <span>{Math.round(event.confidence * 100)}%</span>
          <span style={{ color: C.rule }}>·</span>
          <span>{event.sourceName}</span>
        </div>
      </div>
    </button>
  );
}

function TimeAxis({ horizon, todayISO }: { horizon: number; todayISO: string }) {
  const ticks = [0, 7, 14, 30, 60, 90, 120, 150, 180].filter((t) => t <= horizon);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 230px", gap: 16, padding: "12px 0 6px", borderBottom: `2px solid ${C.ink}`, background: C.surface, position: "sticky", top: 0, zIndex: 5 }}>
      <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Who promised</div>
      <div style={{ position: "relative", height: 22 }}>
        {ticks.map((t) => (
          <div
            key={t}
            style={{
              position: "absolute",
              left: `${(t / horizon) * 100}%`,
              top: 0,
              transform: t === 0 ? "translateX(0)" : t === horizon ? "translateX(-100%)" : "translateX(-50%)",
              fontFamily: UI,
              fontSize: 10,
              fontWeight: 700,
              color: t === 0 ? C.hinduRed : "#666",
            }}
          >
            <div style={{ letterSpacing: ".05em" }}>{t === 0 ? "TODAY" : `+${t}d`}</div>
            <div style={{ fontWeight: 500, color: C.ink3, marginTop: 1 }}>{fmtShort(addDays(todayISO, t))}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3, paddingLeft: 8, borderLeft: `1px solid ${C.ruleSoft}` }}>
        Promise &amp; lead-time
      </div>
    </div>
  );
}

function TimelineView({ events, horizon, beats, todayISO, onSelect }: ViewProps) {
  const grouped = PHASE_BUCKETS.map((b) => ({
    bucket: b,
    items: events
      .filter((e) => {
        const d = daysBetween(todayISO, e.deadline!);
        return d >= b.min && d <= b.max;
      })
      .sort((a, z) => daysBetween(todayISO, a.deadline!) - daysBetween(todayISO, z.deadline!)),
  }));

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.ink}`, padding: "0 24px 20px", position: "relative" }}>
      <TimeAxis horizon={horizon} todayISO={todayISO} />
      <div style={{ position: "absolute", left: "calc(180px + 16px + 24px)", right: "calc(230px + 16px + 24px)", top: 40, bottom: 0, pointerEvents: "none", zIndex: 1 }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 2, background: C.hinduRed, opacity: 0.95 }} />
      </div>
      <div style={{ position: "relative", zIndex: 2 }}>
        {grouped.map(({ bucket, items }) =>
          items.length === 0 ? null : (
            <section key={bucket.id} style={{ marginBottom: 26 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "12px 0 6px", borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ width: 8, height: 8, background: bucket.color, marginRight: 2 }} />
                <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 800, color: C.ink }}>{bucket.label}</div>
                <div style={{ fontFamily: UI, fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: bucket.color }}>{bucket.sub}</div>
                <div style={{ fontFamily: UI, fontSize: 11, color: C.ink3, marginLeft: "auto" }}>
                  {items.length} {items.length === 1 ? "event" : "events"}
                </div>
              </div>
              {items.map((e) => (
                <TimelineRow key={e.id} event={e} horizon={horizon} beats={beats} todayISO={todayISO} onSelect={onSelect} />
              ))}
            </section>
          ),
        )}
        {events.length === 0 && <EmptyRow />}
      </div>
    </div>
  );
}

// ─────────────────────────── Event Feed (list) ───────────────────────────

function ListView({ events, beats, todayISO, onSelect, undated }: ViewProps & { undated: CalEvent[] }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.ink}`, padding: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "120px 110px 1fr 100px 120px", gap: 14, padding: "12px 24px", borderBottom: `2px solid ${C.ink}`, fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>
        <span>Deadline</span>
        <span>Lead-time</span>
        <span>Promise</span>
        <span>Confidence</span>
        <span>Source</span>
      </div>
      {events.map((e) => {
        const d = daysBetween(todayISO, e.deadline!);
        const bucket = bucketFor(d);
        return (
          <button
            key={e.id}
            onClick={() => onSelect(e)}
            style={{ display: "grid", gridTemplateColumns: "120px 110px 1fr 100px 120px", gap: 14, padding: "14px 24px", borderBottom: `1px solid ${C.ruleSoft}`, background: "none", textAlign: "left", cursor: "pointer", width: "100%", alignItems: "start" }}
          >
            <div>
              <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 800, color: C.ink, lineHeight: 1.1 }}>{fmtShort(e.deadline!)}</div>
              <div style={{ fontFamily: UI, fontSize: 11, color: C.ink3, marginTop: 2 }}>{weekday(e.deadline!)}</div>
            </div>
            <div>
              <div style={{ fontFamily: UI, fontSize: 12, fontWeight: 700, color: bucket.color }}>{daysOutLabel(d)}</div>
              <div style={{ fontFamily: UI, fontSize: 10, color: bucket.color, letterSpacing: ".06em", textTransform: "uppercase", fontWeight: 600, marginTop: 2 }}>{bucket.sub}</div>
            </div>
            <div>
              <BeatTag beats={beats} beat={e.beat} />
              <div style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: C.ink, marginTop: 4, lineHeight: 1.35 }}>{e.what}</div>
              <div style={{ fontFamily: UI, fontSize: 11, color: "#666", marginTop: 3 }}>{e.who}</div>
            </div>
            <div>
              <ConfidenceDots value={e.confidence} />
              <div style={{ fontFamily: UI, fontSize: 11, color: C.ink, fontWeight: 700, marginTop: 4 }}>{Math.round(e.confidence * 100)}%</div>
            </div>
            <div style={{ fontFamily: UI, fontSize: 11, color: "#666" }}>
              <div style={{ fontWeight: 600 }}>{e.sourceName}</div>
              {e.dateClaimed && <div style={{ color: C.ink3, marginTop: 2 }}>claimed {fmtShort(e.dateClaimed)}</div>}
            </div>
          </button>
        );
      })}
      {events.length === 0 && <EmptyRow />}

      {undated.length > 0 && (
        <div style={{ borderTop: `2px solid ${C.ink}` }}>
          <div style={{ padding: "10px 24px", background: "#efece4", fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.amber }}>
            Undated promises · {undated.length} · a deadline was claimed but couldn&#39;t be resolved to a date
          </div>
          {undated.map((e) => (
            <button key={e.id} onClick={() => onSelect(e)} style={{ display: "block", padding: "12px 24px", borderBottom: `1px solid ${C.ruleSoft}`, background: "none", textAlign: "left", cursor: "pointer", width: "100%" }}>
              <BeatTag beats={beats} beat={e.beat} />
              <span style={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: C.ink, marginLeft: 8 }}>{e.what}</span>
              <span style={{ fontFamily: UI, fontSize: 11, color: "#666", marginLeft: 8 }}>
                {e.who} · &ldquo;{e.deadline === null ? "" : ""}
                {(e.originalText ?? "").slice(0, 80)}…&rdquo;
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Past-due (accountability) ───────────────────────────

function deliveredOf(e: CalEvent): "overdue" | "unverified" {
  return e.outcome === "broken" || e.outcome === "dropped" ? "overdue" : "unverified";
}

function PastDueView({ events, beats, todayISO, onSelect }: ViewProps) {
  const items = [...events].sort((a, z) => daysBetween(todayISO, a.deadline!) - daysBetween(todayISO, z.deadline!));
  const overdue = items.filter((i) => deliveredOf(i) === "overdue").length;
  const unverified = items.filter((i) => deliveredOf(i) === "unverified").length;

  return (
    <div>
      <div style={{ background: "#fdeaea", border: `1px solid ${C.hinduRed}`, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ background: C.hinduRed, color: "#fff", padding: "4px 10px", fontFamily: UI, fontSize: 10, fontWeight: 800, letterSpacing: ".12em" }}>ACCOUNTABILITY</div>
        <div style={{ fontFamily: BODY, fontSize: 14, color: "#1A1A1A", fontStyle: "italic" }}>
          Promised by someone — delivered? These have crossed their deadline. Assign a reporter to verify.
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
          <Counter n={overdue} label="overdue" color={C.hinduRed} />
          <Counter n={unverified} label="unverified" color="#666" />
        </div>
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.ink}` }}>
        {items.length === 0 && <EmptyRow text="Nothing past-due. Every tracked promise is still ahead of its deadline." />}
        {items.map((e) => {
          const over = Math.abs(daysBetween(todayISO, e.deadline!));
          const stat = deliveredOf(e) === "overdue" ? { color: C.hinduRed, label: "Overdue · investigate" } : { color: "#666", label: "Status not verified" };
          return (
            <button key={e.id} onClick={() => onSelect(e)} style={{ display: "grid", gridTemplateColumns: "140px 1fr 200px", gap: 16, padding: "16px 24px", borderBottom: `1px solid ${C.ruleSoft}`, background: "none", width: "100%", textAlign: "left", cursor: "pointer" }}>
              <div>
                <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.hinduRed }}>{over}d past-due</div>
                <div style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 800, color: C.ink, marginTop: 4, lineHeight: 1.1 }}>{fmtShort(e.deadline!)}</div>
                <div style={{ fontFamily: UI, fontSize: 10, color: C.ink3, marginTop: 1 }}>was due</div>
              </div>
              <div>
                <BeatTag beats={beats} beat={e.beat} />
                <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 4, lineHeight: 1.3 }}>{e.what}</div>
                <div style={{ fontFamily: UI, fontSize: 12, color: "#666", marginTop: 4 }}>{e.who}</div>
                {e.originalText && (
                  <div style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 12, color: C.ink2, marginTop: 6, lineHeight: 1.5, borderLeft: `2px solid ${C.rule}`, paddingLeft: 10 }}>
                    &ldquo;{e.originalText.slice(0, 160)}…&rdquo;
                  </div>
                )}
              </div>
              <div style={{ paddingLeft: 12, borderLeft: `1px solid ${C.ruleSoft}` }}>
                <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: stat.color }}>{stat.label}</div>
                {e.dateClaimed && <div style={{ fontFamily: UI, fontSize: 11, color: "#666", marginTop: 6 }}>Claimed {fmt(e.dateClaimed)}<br />Source: {e.sourceName}</div>}
                <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center", fontFamily: UI, fontSize: 11, fontWeight: 700, color: "#fff", background: C.ink, padding: "4px 10px", width: "fit-content" }}>Assign reporter →</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Counter({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <div style={{ fontFamily: UI, fontSize: 11, color: "#666", textAlign: "right" }}>
      <span style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color, marginRight: 4, verticalAlign: "middle" }}>{n}</span>
      {label}
    </div>
  );
}

// ─────────────────────────── Pipeline (how it's built) ───────────────────────────

function PipelineView({ counts }: { counts: { total: number; forward: number; pastdue: number; undated: number } }) {
  const modules = [
    { name: "Sources", kind: "deterministic", info: "RSS · PIB · GDELT adapters" },
    { name: "Gate", kind: "deterministic", info: "temporal-cue pre-filter" },
    { name: "Claim Extractor", kind: "LLM agent", info: "the one judgment call" },
    { name: "Date Normaliser", kind: "deterministic", info: "24 unit tests" },
    { name: "Calendar Engine", kind: "deterministic", info: "pure lead-time maths" },
    { name: "Store", kind: "integration", info: "Postgres · calendar_event" },
    { name: "Pipeline Runner", kind: "glue", info: "cron 06:00 IST" },
    { name: "Web View", kind: "glue", info: "you are here" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24 }}>
      <div>
        <div style={{ background: C.surface, border: `1px solid ${C.ink}`, padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3, marginBottom: 4 }}>Tracked right now</div>
          <h2 style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: C.ink, marginBottom: 16, lineHeight: 1.15 }}>{counts.total} promises on the calendar</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 0 }}>
            {[
              { v: counts.forward, l: "ahead of deadline", s: "commission-ahead window" },
              { v: counts.pastdue, l: "past-due", s: "accountability queue" },
              { v: counts.undated, l: "undated", s: "deadline unresolved" },
            ].map((s) => (
              <div key={s.l} style={{ paddingRight: 18 }}>
                <div style={{ fontFamily: SERIF, fontSize: 28, fontWeight: 800, color: C.ink, lineHeight: 1, letterSpacing: "-.02em" }}>{s.v}</div>
                <div style={{ fontFamily: UI, fontSize: 11, fontWeight: 700, color: C.ink, marginTop: 4 }}>{s.l}</div>
                <div style={{ fontFamily: UI, fontSize: 10, color: C.ink3, marginTop: 2 }}>{s.s}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, padding: "10px 14px", background: "#eaf0ea", border: `1px solid ${C.iojGreen}`, fontFamily: BODY, fontStyle: "italic", fontSize: 13, color: "#1f5c38", lineHeight: 1.55 }}>
            The LLM agent runs only on items that pass the cheap temporal-cue Gate — not on every story. Everything else — fetching, date arithmetic, scheduling, storage — is plain Python.
          </div>
        </div>
      </div>
      <div>
        <div style={{ background: C.surface, border: `1px solid ${C.ink}`, padding: "20px 22px", marginBottom: 24 }}>
          <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3, marginBottom: 12 }}>Eight modules</div>
          {modules.map((m) => (
            <div key={m.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: `1px solid ${C.ruleSoft}` }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.iojGreen }} />
              <div style={{ fontFamily: UI, fontSize: 13, fontWeight: 700, color: C.ink, flex: 1 }}>{m.name}</div>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase", color: m.kind === "LLM agent" ? C.iojGreen : C.ink3 }}>{m.kind}</div>
            </div>
          ))}
        </div>
        <div style={{ background: C.ink, color: "#fff", padding: "18px 20px" }}>
          <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#a3a3a3" }}>Why it&#39;s cheap</div>
          <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: "#fff", lineHeight: 1.35, marginTop: 6 }}>One LLM where judgment is required. Plain code everywhere else.</div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────── drawer ───────────────────────────

function EventDrawer({ event, beats, todayISO, locale, onClose }: { event: CalEvent; beats: Beat[]; todayISO: string; locale: string; onClose: () => void }) {
  const dated = event.deadline !== null;
  const d = dated ? daysBetween(todayISO, event.deadline!) : 0;
  const isPast = dated && d < 0;
  const bucket = bucketFor(Math.max(0, d));
  const markers = dated ? leadTimeMarkers(event.deadline!, todayISO) : [];

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(17,17,17,0.35)", zIndex: 50 }} />
      <aside style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 520, maxWidth: "90vw", background: "#fff", borderLeft: `1px solid ${C.ink}`, zIndex: 51, overflowY: "auto", boxShadow: "-10px 0 30px rgba(17,17,17,0.15)" }}>
        <div style={{ background: C.ink, color: "#fff", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: "#a3a3a3" }}>{isPast ? "Accountability follow-up" : "Calendar entry"}</div>
            <div style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 600, color: "#fff", marginTop: 4 }}>{event.beatLabel}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <BeatTag beats={beats} beat={event.beat} />
            <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: isPast ? C.hinduRed : bucket.color, padding: "3px 8px", background: isPast ? "#fdeaea" : bucket.strip, border: `1px solid ${isPast ? C.hinduRed : bucket.color}` }}>
              {!dated ? "UNDATED" : isPast ? `${Math.abs(d)}d past-due` : daysOutLabel(d).toUpperCase()}
            </div>
          </div>

          <h2 style={{ fontFamily: SERIF, fontSize: 24, fontWeight: 800, color: C.ink, lineHeight: 1.2, marginBottom: 10 }}>{event.what}</h2>

          <div style={{ fontFamily: UI, fontSize: 13, color: C.ink2, marginBottom: 4 }}>
            <span style={{ color: C.ink3, textTransform: "uppercase", letterSpacing: ".08em", fontSize: 10, fontWeight: 700 }}>Promised by</span>&nbsp;{event.who || "—"}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, border: `1px solid ${C.ink}`, margin: "16px 0 18px" }}>
            <div style={{ padding: "14px 18px", borderRight: `1px solid ${C.ruleSoft}` }}>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Deadline</div>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 3, lineHeight: 1 }}>{dated ? fmt(event.deadline!) : "—"}</div>
              <div style={{ fontFamily: UI, fontSize: 11, color: C.ink3, marginTop: 4 }}>{dated ? weekday(event.deadline!) : event.outcome === null ? "unresolved" : ""}</div>
            </div>
            <div style={{ padding: "14px 18px" }}>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Claim made</div>
              <div style={{ fontFamily: SERIF, fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 3, lineHeight: 1 }}>{event.dateClaimed ? fmt(event.dateClaimed) : "—"}</div>
              {dated && event.dateClaimed && <div style={{ fontFamily: UI, fontSize: 11, color: C.ink3, marginTop: 4 }}>{daysBetween(event.dateClaimed, event.deadline!)} days notice</div>}
            </div>
          </div>

          {dated && !isPast && (
            <div style={{ marginBottom: 22 }}>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3, marginBottom: 8 }}>Lead-time markers</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4 }}>
                {markers.map((m, i) => {
                  const prev = markers[i + 1]?.days ?? 0;
                  const isCurrent = m.days >= d && prev < d;
                  return (
                    <div key={m.days} style={{ padding: "8px 6px", textAlign: "center", background: m.passed ? "#efece4" : isCurrent ? bucket.strip : "#fff", border: `1px solid ${m.passed ? C.rule : isCurrent ? bucket.color : C.rule}`, opacity: m.passed ? 0.55 : 1 }}>
                      <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 800, color: m.passed ? C.ink3 : isCurrent ? bucket.color : C.ink, lineHeight: 1 }}>{m.days}d</div>
                      <div style={{ fontFamily: UI, fontSize: 9, color: C.ink3, marginTop: 3 }}>{fmtShort(m.date)}</div>
                      {m.passed && <div style={{ fontFamily: UI, fontSize: 8, color: C.ink3, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 2 }}>passed</div>}
                      {isCurrent && !m.passed && <div style={{ fontFamily: UI, fontSize: 8, color: bucket.color, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", marginTop: 2 }}>NOW</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {event.originalText && (
            <>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3, marginBottom: 6 }}>Original claim — extracted text</div>
              <blockquote style={{ fontFamily: BODY, fontSize: 15, lineHeight: 1.65, color: "#1A1A1A", fontStyle: "italic", borderLeft: `3px solid ${C.iojGreen}`, paddingLeft: 14, marginBottom: 18 }}>
                &ldquo;{event.originalText}&rdquo;
              </blockquote>
            </>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 14, padding: "12px 0", borderTop: `1px solid ${C.ruleSoft}`, borderBottom: `1px solid ${C.ruleSoft}`, marginBottom: 18 }}>
            <div>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Source</div>
              <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.ink, marginTop: 3 }}>{event.sourceName}</div>
              {event.sourceUrl && (
                <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ fontFamily: UI, fontSize: 11, color: "#2B3D8F", fontWeight: 600, textDecoration: "underline", wordBreak: "break-all", display: "inline-block", marginTop: 4 }}>
                  {event.sourceUrl}
                </a>
              )}
            </div>
            <div>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Extractor confidence</div>
              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <ConfidenceDots value={event.confidence} />
                <span style={{ fontFamily: SERIF, fontSize: 18, fontWeight: 800, color: C.ink }}>{Math.round(event.confidence * 100)}%</span>
              </div>
            </div>
          </div>

          {isPast && (
            <div style={{ marginBottom: 18, padding: "12px 14px", background: "#fdeaea", border: `1px solid ${C.hinduRed}` }}>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", color: C.hinduRed }}>Delivered?</div>
              <div style={{ fontFamily: BODY, fontStyle: "italic", fontSize: 14, color: "#1A1A1A", marginTop: 4, lineHeight: 1.55 }}>
                The deadline has passed. Assign a reporter to confirm whether it was delivered and write the accountability story.
              </div>
            </div>
          )}

          <a href={`/${locale}/newslist`} style={{ display: "block", textAlign: "center", fontFamily: UI, fontSize: 12, fontWeight: 700, background: C.ink, color: "#fff", textDecoration: "none", padding: "11px 0", cursor: "pointer", letterSpacing: ".04em" }}>
            {isPast ? "Open the Newslist to commission an accountability story →" : "Open the Newslist to commission this →"}
          </a>
        </div>
      </aside>
    </>
  );
}

// ─────────────────────────── shared ───────────────────────────

type ViewProps = {
  events: CalEvent[];
  horizon: number;
  beats: Beat[];
  todayISO: string;
  onSelect: (e: CalEvent) => void;
};

function EmptyRow({ text = "No events match these filters." }: { text?: string }) {
  return <div style={{ padding: "60px 0", textAlign: "center", fontFamily: BODY, fontStyle: "italic", color: C.ink3 }}>{text}</div>;
}

// ─────────────────────────── shell + app ───────────────────────────

export default function CalendarApp({ events, beats, todayISO, locale }: { events: CalEvent[]; beats: Beat[]; todayISO: string; locale: string }) {
  const [tab, setTab] = useState<TabId>("calendar");
  const [beat, setBeat] = useState("all");
  const [horizon, setHorizon] = useState(90);
  const [minConfidence, setMinConfidence] = useState(0);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CalEvent | null>(null);

  const dated = events.filter((e) => e.deadline !== null);
  const undated = events.filter((e) => e.deadline === null && e.outcome === null);
  const upcomingAll = dated.filter((e) => daysBetween(todayISO, e.deadline!) >= 0);
  const pastDueAll = dated.filter((e) => daysBetween(todayISO, e.deadline!) < 0 && e.outcome !== "delivered");

  const passes = (e: CalEvent) =>
    (beat === "all" || e.beat === beat) &&
    e.confidence >= minConfidence &&
    (search.trim() === "" || `${e.who} ${e.what} ${e.originalText ?? ""}`.toLowerCase().includes(search.toLowerCase()));

  const upcoming = useMemo(
    () => upcomingAll.filter((e) => passes(e) && daysBetween(todayISO, e.deadline!) <= horizon),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, beat, horizon, minConfidence, search],
  );
  const pastDue = useMemo(() => pastDueAll.filter(passes), [events, beat, minConfidence, search]); // eslint-disable-line react-hooks/exhaustive-deps
  const undatedFiltered = useMemo(() => undated.filter(passes), [events, beat, minConfidence, search]); // eslint-disable-line react-hooks/exhaustive-deps

  const todayLabel = fmt(todayISO);
  const beatOpts = [{ id: "all", label: "All beats", color: C.ink } as Beat, ...beats];
  const chip = (active: boolean): CSSProperties => ({
    fontFamily: UI,
    fontSize: 12,
    fontWeight: 600,
    padding: "5px 11px",
    border: `1px solid ${active ? C.ink : C.rule}`,
    background: active ? C.ink : C.surface,
    color: active ? "#fff" : C.ink2,
    cursor: "pointer",
    borderRadius: 0,
  });

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: UI, color: C.ink }}>
      {/* header band */}
      <header style={{ background: C.surface, borderBottom: `2px solid ${C.ink}`, position: "sticky", top: 0, zIndex: 30 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px 8px", borderBottom: `1px solid ${C.ruleSoft}`, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: C.ink3, marginBottom: 2 }}>OnlineJourno · Tools</div>
            <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 800, color: C.ink, letterSpacing: "-.5px", lineHeight: 1.05 }}>Predictive Editorial Calendar</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Today · IST</div>
              <div style={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: C.ink }}>{todayLabel}</div>
            </div>
            <button onClick={() => setTab("pipeline")} style={{ fontFamily: UI, fontSize: 12, fontWeight: 700, background: C.ink, color: "#fff", border: "none", padding: "8px 16px", cursor: "pointer", letterSpacing: ".04em" }}>
              How it&#39;s built →
            </button>
          </div>
        </div>
        <nav style={{ display: "flex", padding: "0 28px", alignItems: "stretch", flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const active = t.id === tab;
            const n = t.id === "pastdue" ? pastDueAll.length : t.id === "calendar" || t.id === "list" ? upcomingAll.length : null;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ fontFamily: UI, background: "none", border: "none", cursor: "pointer", padding: "10px 18px 10px 0", marginRight: 18, borderBottom: active ? `3px solid ${C.ink}` : "3px solid transparent", marginBottom: -2, textAlign: "left", color: active ? C.ink : C.ink2 }}>
                <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" }}>
                  {t.label}
                  {n !== null ? <span style={{ color: C.ink3, fontWeight: 600 }}> · {n}</span> : null}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: active ? C.iojGreen : C.ink3, marginTop: 1 }}>{t.sub}</div>
              </button>
            );
          })}
        </nav>
      </header>

      {/* filter strip (hidden on pipeline) */}
      {tab !== "pipeline" && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.rule}`, padding: "12px 28px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3, marginRight: 4 }}>Beat</span>
            {beatOpts.map((b) => (
              <button key={b.id} style={chip(beat === b.id)} onClick={() => setBeat(b.id)}>{b.label}</button>
            ))}
          </div>
          {tab !== "pastdue" && (
            <>
              <div style={{ width: 1, height: 22, background: C.rule }} />
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Horizon</span>
                {[30, 60, 90, 180].map((dd) => (
                  <button key={dd} style={chip(horizon === dd)} onClick={() => setHorizon(dd)}>{dd}d</button>
                ))}
              </div>
            </>
          )}
          <div style={{ width: 1, height: 22, background: C.rule }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontFamily: UI, fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: C.ink3 }}>Min confidence</span>
            <input type="range" min={0} max={100} step={5} value={minConfidence * 100} onChange={(e) => setMinConfidence(Number(e.target.value) / 100)} style={{ width: 100, accentColor: C.iojGreen }} />
            <span style={{ fontFamily: UI, fontSize: 12, fontWeight: 700, color: C.ink, minWidth: 36, textAlign: "right" }}>{Math.round(minConfidence * 100)}%</span>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontFamily: UI, fontSize: 12, color: C.ink2 }}>
            <span style={{ fontWeight: 700, color: C.ink }}>{tab === "pastdue" ? pastDue.length : upcoming.length}</span>
            <span style={{ color: C.ink3 }}> of {tab === "pastdue" ? pastDueAll.length : upcomingAll.length} surfaced</span>
          </div>
          <input placeholder="Search promise, person, ministry…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ fontFamily: UI, fontSize: 12, padding: "6px 10px", width: 220, border: `1px solid ${C.rule}`, background: C.bg, outline: "none", color: C.ink }} />
        </div>
      )}

      {/* body */}
      <div style={{ padding: "24px 28px 80px", maxWidth: 1400, margin: "0 auto" }}>
        {tab === "calendar" && <TimelineView events={upcoming} horizon={horizon} beats={beats} todayISO={todayISO} onSelect={setSelected} />}
        {tab === "list" && <ListView events={upcoming} horizon={horizon} beats={beats} todayISO={todayISO} onSelect={setSelected} undated={undatedFiltered} />}
        {tab === "pastdue" && <PastDueView events={pastDue} horizon={horizon} beats={beats} todayISO={todayISO} onSelect={setSelected} />}
        {tab === "pipeline" && <PipelineView counts={{ total: events.length, forward: upcomingAll.length, pastdue: pastDueAll.length, undated: undated.length }} />}
      </div>

      {selected && <EventDrawer event={selected} beats={beats} todayISO={todayISO} locale={locale} onClose={() => setSelected(null)} />}
    </div>
  );
}
