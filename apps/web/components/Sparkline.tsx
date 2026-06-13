// Inline-SVG sparkline + mini bar row — the chart primitives for snapshots
// (IOJ competitive-intelligence design language). Server-rendered, no deps.

export function Sparkline({
  points,
  labels,
  width = 280,
  height = 72,
  color = "var(--color-brand)",
  fill = true,
}: {
  points: number[];
  labels?: string[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (points.length < 2) return null;
  const padB = 16; // room for x-labels + the value dots
  const padT = 12; // room for the peak value label
  const max = Math.max(1, ...points);
  const min = Math.min(0, ...points);
  const span = max - min || 1;
  const dx = width / (points.length - 1);
  const y = (v: number) => padT + (1 - (v - min) / span) * (height - padT - padB);
  const pt = (v: number, i: number) => `${(i * dx).toFixed(1)},${y(v).toFixed(1)}`;
  const line = `M${points.map(pt).join(" L")}`;
  const area = `${line} L${width},${height - padB} L0,${height - padB} Z`;
  const peak = Math.max(...points);
  const peakX = points.indexOf(peak) * dx;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {/* baseline + a faint mid gridline */}
      <line x1={0} y1={height - padB} x2={width} y2={height - padB} stroke="var(--color-border)" />
      <line
        x1={0}
        y1={y((max + min) / 2)}
        x2={width}
        y2={y((max + min) / 2)}
        stroke="var(--color-border)"
        strokeDasharray="2 3"
        opacity={0.6}
      />
      {fill ? <path d={area} fill={color} opacity={0.12} /> : null}
      <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {points.map((v, i) => (
        <circle key={i} cx={i * dx} cy={y(v)} r={2} fill={color} opacity={0.5} />
      ))}
      {/* peak value label */}
      <text
        x={Math.min(Math.max(peakX, 10), width - 10)}
        y={y(peak) - 4}
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill={color}
      >
        {peak}
      </text>
      {labels
        ? labels.map((lab, i) =>
            i === 0 || i === labels.length - 1 ? (
              <text
                key={i}
                x={i === 0 ? 0 : width}
                y={height - 3}
                textAnchor={i === 0 ? "start" : "end"}
                fontSize="9"
                fill="var(--color-fg-tertiary)"
              >
                {lab}
              </text>
            ) : null,
          )
        : null}
    </svg>
  );
}

// A labelled horizontal stat bar (0–max), e.g. surface scores or shares.
export function StatBar({
  value,
  max = 100,
  color = "var(--color-brand)",
  width = 140,
}: {
  value: number;
  max?: number;
  color?: string;
  width?: number;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <span
      className="inline-block h-2 rounded-full overflow-hidden align-middle"
      style={{ width, background: "var(--color-border)" }}
    >
      <span style={{ display: "block", width: `${pct}%`, height: "100%", background: color }} />
    </span>
  );
}
