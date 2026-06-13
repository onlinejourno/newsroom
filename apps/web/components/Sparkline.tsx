// Inline-SVG sparkline + mini bar row — the chart primitives for snapshots
// (IOJ competitive-intelligence design language). Server-rendered, no deps.

export function Sparkline({
  points,
  width = 120,
  height = 32,
  color = "var(--color-brand)",
  fill = true,
}: {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (points.length < 2) return null;
  const max = Math.max(1, ...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const dx = width / (points.length - 1);
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);
  const pts = points.map((v, i) => `${(i * dx).toFixed(1)},${y(v).toFixed(1)}`);
  const line = `M${pts.join(" L")}`;
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = points[points.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      {fill ? <path d={area} fill={color} opacity={0.12} /> : null}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={width} cy={y(last)} r={2.5} fill={color} />
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
