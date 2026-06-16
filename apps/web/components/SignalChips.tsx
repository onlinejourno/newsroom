import type { SignalRow } from "@/lib/db";

// User Needs Model (ADR 0049) — the reader need a signal serves. Each chip
// shows a plain-language label and explains itself on hover so the desk
// knows exactly what it means. `gloss` is the explicit definition.
export const NEED_META: Record<
  string,
  { label: string; color: string; gloss: string }
> = {
  know: {
    label: "Know · the facts",
    color: "#2563eb",
    gloss: "Know — the reader wants the facts, fast: what happened, who, when. Breaking news and updates.",
  },
  understand: {
    label: "Understand · the why",
    color: "#7c3aed",
    gloss: "Understand — the reader wants context and explanation: why it matters, how it works, what's behind it.",
  },
  feel: {
    label: "Feel · the human story",
    color: "#ea580c",
    gloss: "Feel — the reader wants emotional connection: human stories, voices, the lived experience.",
  },
  do: {
    label: "Do · act on it",
    color: "#16a34a",
    gloss: "Do — the reader wants to act: a service, a how-to, something useful they can use or decide on.",
  },
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

// Editorial display names for PEJ frames whose codebook label reads loaded
// next to a live story. The stored coding keeps the formal goldset
// vocabulary; only the chip text softens (formal name stays in the tooltip).
const FRAME_DISPLAY: Record<string, string> = {
  "Horse Race": "Standings",
  "Wrongdoing Exposed": "Accountability",
  Conjecture: "What's next",
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
          title={nm.gloss}
          style={{ color: nm.color, border: `1px solid ${nm.color}` }}
        >
          {nm.label}
        </span>
      ) : null}
      {frame ? (
        <span
          className={CHIP}
          title={`PEJ frame: ${frame}${e.framing?.rationale ? ` — ${e.framing.rationale}` : ""}`}
          style={{ color: frameColor, border: `1px dashed ${frameColor}` }}
        >
          {FRAME_DISPLAY[frame] ?? frame}
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

// A persistent, collapsible glossary so the desk knows exactly what every tag
// means — the reader-need model and the PEJ frame families.
export function TagLegend() {
  return (
    <details
      className="rounded-sm border p-3 mb-6 text-sm"
      style={{
        borderColor: "var(--color-border)",
        background: "var(--color-bg-card)",
        fontFamily: "var(--font-ui)",
      }}
    >
      <summary className="cursor-pointer font-semibold" style={{ color: "var(--color-brand)" }}>
        What the tags mean
      </summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <p className="ds-label mb-1">Reader need (why someone reads it)</p>
          <ul className="space-y-1 text-xs" style={{ color: "var(--color-fg-secondary)" }}>
            {Object.values(NEED_META).map((n) => (
              <li key={n.label}>
                <span className="font-semibold" style={{ color: n.color }}>
                  {n.label.split(" · ")[0]}
                </span>{" "}
                — {n.gloss.split(" — ")[1]}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="ds-label mb-1">Narrative frame (how it&rsquo;s told · PEJ)</p>
          <ul className="space-y-1 text-xs" style={{ color: "var(--color-fg-secondary)" }}>
            <li><span className="font-semibold" style={{ color: "#dc2626" }}>Combative</span> — conflict, standings, wrongdoing, scrutiny of an institution.</li>
            <li><span className="font-semibold" style={{ color: "#0d9488" }}>Explanatory</span> — process, trends, historical context.</li>
            <li><span className="font-semibold" style={{ color: "#6b7280" }}>Straight</span> — just the facts, no interpretive lens.</li>
            <li><span className="font-semibold" style={{ color: "#4f46e5" }}>Policy</span> — the substance of a policy examined.</li>
            <li><span className="font-semibold" style={{ color: "#a16207" }}>Other</span> — reaction, consensus, conjecture, profile.</li>
          </ul>
        </div>
      </div>
    </details>
  );
}
