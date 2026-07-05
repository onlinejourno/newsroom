import * as React from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RadarAxis {
  axis: string;
  value: number; // 0..100
}

export interface SignalRadarProps {
  axes: RadarAxis[];
}

// ── SVG geometry helpers ──────────────────────────────────────────────────────

/** Convert polar (angle in radians, radius) → Cartesian from a given centre. */
function polar(cx: number, cy: number, r: number, angleRad: number): [number, number] {
  return [cx + r * Math.cos(angleRad), cy + r * Math.sin(angleRad)];
}

/**
 * Build an SVG polygon `points` string for `n` equally spaced vertices
 * at radius `r` from centre `(cx, cy)`.  Starts at the top (−π/2).
 */
function polygonPoints(cx: number, cy: number, r: number, n: number): string {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const [x, y] = polar(cx, cy, r, angle);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

// ── Constants ─────────────────────────────────────────────────────────────────

const VIEW_W = 360;
const VIEW_H = 320;
const CX = VIEW_W / 2;   // 180
const CY = 160;          // vertical centre — leaves room for labels
const MAX_R = 110;       // radius for value = 100
const RINGS = [20, 40, 60, 80, 100] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export function SignalRadar({ axes }: SignalRadarProps) {
  const n = axes.length;
  if (n < 3) return null; // degenerate — skip render

  // Pre-compute spoke angles and value-polygon points
  const angles = Array.from({ length: n }, (_, i) => (2 * Math.PI * i) / n - Math.PI / 2);

  const valuePolygonPoints = axes
    .map(({ value }, i) => {
      const r = Math.max(0, Math.min(100, value)) / 100 * MAX_R;
      const [x, y] = polar(CX, CY, r, angles[i]!);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Label placement: push outward a bit beyond MAX_R
  const LABEL_R = MAX_R + 22;

  return (
    <section className="mb-6" style={{ fontFamily: "var(--font-ui)" }}>
      <div className="ds-bar mb-4">
        <span className="ds-bar-swatch" />
        <h2 className="ds-h2" style={{ fontSize: "1.1rem" }}>
          E-E-A-T Signal Radar
        </h2>
      </div>

      <div
        className="ds-panel p-4 flex justify-center"
        style={{ overflow: "visible" }}
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Signal radar chart"
          role="img"
          style={{ width: "100%", height: "auto", maxWidth: 420, display: "block" }}
        >
          <title>E-E-A-T Signal Radar</title>

          {/* ── Grid rings ─────────────────────────────────────────────── */}
          {RINGS.map((pct) => {
            const r = (pct / 100) * MAX_R;
            return (
              <polygon
                key={pct}
                points={polygonPoints(CX, CY, r, n)}
                fill="none"
                stroke="var(--color-border)"
                strokeWidth={pct === 100 ? 1.5 : 1}
                opacity={0.7}
              />
            );
          })}

          {/* Ring value labels (right side of outermost ring) */}
          {RINGS.map((pct) => {
            const r = (pct / 100) * MAX_R;
            return (
              <text
                key={`lbl-${pct}`}
                x={CX + r + 3}
                y={CY + 4}
                fontSize={8}
                fill="var(--color-fg-tertiary)"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {pct}
              </text>
            );
          })}

          {/* ── Spokes ─────────────────────────────────────────────────── */}
          {angles.map((angle, i) => {
            const [x, y] = polar(CX, CY, MAX_R, angle);
            return (
              <line
                key={`spoke-${i}`}
                x1={CX}
                y1={CY}
                x2={x.toFixed(2)}
                y2={y.toFixed(2)}
                stroke="var(--color-border)"
                strokeWidth={1}
                opacity={0.8}
              />
            );
          })}

          {/* ── Filled value polygon ────────────────────────────────────── */}
          <polygon
            points={valuePolygonPoints}
            fill="var(--color-brand)"
            fillOpacity={0.18}
            stroke="var(--color-brand)"
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Value dot on each spoke tip */}
          {axes.map(({ value }, i) => {
            const r = Math.max(0, Math.min(100, value)) / 100 * MAX_R;
            const [x, y] = polar(CX, CY, r, angles[i]!);
            return (
              <circle
                key={`dot-${i}`}
                cx={x.toFixed(2)}
                cy={y.toFixed(2)}
                r={3.5}
                fill="var(--color-brand)"
                stroke="var(--color-bg)"
                strokeWidth={1.5}
              />
            );
          })}

          {/* ── Axis labels ─────────────────────────────────────────────── */}
          {axes.map(({ axis, value }, i) => {
            const angle = angles[i]!;
            const [lx, ly] = polar(CX, CY, LABEL_R, angle);

            // Anchor: left of centre → end, right → start, near centre → middle
            const cosA = Math.cos(angle);
            const anchor =
              cosA > 0.1 ? "start" : cosA < -0.1 ? "end" : "middle";

            // Vertical shift: pull top labels up a touch, bottom labels down
            const sinA = Math.sin(angle);
            const dyBase = sinA < -0.1 ? -6 : sinA > 0.1 ? 14 : 4;

            return (
              <g key={`axis-${i}`}>
                <text
                  x={lx.toFixed(2)}
                  y={(ly + dyBase - 10).toFixed(2)}
                  textAnchor={anchor}
                  fontSize={10}
                  fontWeight="600"
                  fill="var(--color-fg-primary)"
                  style={{ fontFamily: "var(--font-ui)" }}
                >
                  {axis}
                </text>
                <text
                  x={lx.toFixed(2)}
                  y={(ly + dyBase + 2).toFixed(2)}
                  textAnchor={anchor}
                  fontSize={9}
                  fill="var(--color-fg-tertiary)"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {Math.round(value)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
