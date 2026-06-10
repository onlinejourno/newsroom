import type { SignalRow } from "@/lib/db";

// User Needs Model (ADR 0049) — the reader need a signal serves, colour-coded.
const NEED_META: Record<string, { label: string; color: string }> = {
  know: { label: "Know", color: "#2563eb" },
  understand: { label: "Understand", color: "#7c3aed" },
  feel: { label: "Feel", color: "#ea580c" },
  do: { label: "Do", color: "#16a34a" },
};

const CHIP = "text-xs px-2 py-0.5 rounded-full whitespace-nowrap";

// PEJ frame groups (m-framing-pej), colour-coded by narrative family.
const FRAME_GROUP_COLOR: Record<string, string> = {
  combative: "#dc2626",
  explanatory: "#0d9488",
  straight: "#6b7280",
  policy: "#4f46e5",
  other: "#a16207",
};

/** Enrichment chip row: user-need badge, beat, place, top entities. */
export function SignalChips({ signal }: { signal: SignalRow }) {
  const e = signal.enrichment ?? {};
  const need = e.classify?.user_need ?? null;
  const nm = need ? NEED_META[need] : null;
  const beat = signal.beat ?? e.classify?.beat ?? null;
  const place = signal.district || signal.region || null;
  const entities = (e.analyse?.entities ?? []).slice(0, 5);
  const frame = e.framing?.frame ?? null;
  const frameColor =
    FRAME_GROUP_COLOR[e.framing?.frame_group ?? ""] ?? FRAME_GROUP_COLOR.other;
  if (!nm && !beat && !place && !frame && entities.length === 0) return null;
  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2"
      style={{ fontFamily: "var(--font-ui)" }}
    >
      {nm ? (
        <span
          className={`${CHIP} font-semibold`}
          title={`Reader need: ${nm.label}`}
          style={{ color: nm.color, border: `1px solid ${nm.color}` }}
        >
          {nm.label}
        </span>
      ) : null}
      {frame ? (
        <span
          className={CHIP}
          title={e.framing?.rationale ?? `PEJ frame: ${frame}`}
          style={{ color: frameColor, border: `1px dashed ${frameColor}` }}
        >
          {frame}
        </span>
      ) : null}
      {beat ? (
        <span
          className={CHIP}
          style={{
            color: "var(--color-fg-secondary)",
            border: "1px solid var(--color-fg-tertiary)",
          }}
        >
          {beat}
        </span>
      ) : null}
      {place ? (
        <span
          className={CHIP}
          style={{
            color: "var(--color-fg-secondary)",
            border: "1px solid var(--color-fg-tertiary)",
          }}
        >
          📍 {place}
        </span>
      ) : null}
      {entities.map((ent) => (
        <span
          key={ent}
          className="text-xs"
          style={{ color: "var(--color-fg-tertiary)" }}
        >
          {ent}
        </span>
      ))}
    </div>
  );
}
