// Pure SVG sparkline (ported from the OnlineJourno Redesign mockup's shared kit).
export default function Sparkline({
  data,
  width = 290,
  height = 34,
  color = "var(--color-fg-secondary)",
  area = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  area?: boolean;
}) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return [x, y] as const;
  });
  const d = "M " + pts.map((p) => p.join(",")).join(" L ");
  const areaD = `${d} L ${width},${height} L 0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden>
      {area && <path d={areaD} fill={color} opacity="0.10" />}
      <path d={d} fill="none" stroke={color} strokeWidth="1.25" />
      <circle cx={last[0]} cy={last[1]} r="1.6" fill={color} />
    </svg>
  );
}
