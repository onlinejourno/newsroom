"use client";

// Topic Momentum Score — horizontal bar chart (ADR 0061; replicates the
// discover-dashboard / localhost:8501 "Topic Momentum Score" view, #107).
// Bars = momentum 0–100 per topic, coloured by trend direction, with a
// "50 = avg" reference line and a hover card (signal · trajectory · mentions).

import dynamic from "next/dynamic";
import type { Config, Data, Layout } from "plotly.js";

const Plot = dynamic(() => import("@/components/charts/Plotly"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 320,
        display: "grid",
        placeItems: "center",
        fontFamily: "var(--font-ui)",
        color: "var(--color-fg-tertiary)",
      }}
    >
      Loading chart…
    </div>
  ),
});

export type MomentumDatum = {
  topic: string;
  momentum: number;
  signal: string; // momentumLabel() — e.g. "🔥 Breaking surge"
  trajectory: string; // predictTrajectory() — direction/prediction
  recent: number;
  prior: number;
};

// Concrete hex mirrors the OJDS tokens (ADR 0063) — Plotly renders colours as
// SVG attributes and cannot resolve CSS `var(--…)`, so the values are inlined.
const C = {
  green: "#2e7d46",
  red: "#c0392b",
  amber: "#9a6a14",
  ink: "#181610",
  fg2: "#514a3c",
  rule: "#c5bda9",
  grey: "#6f6757",
} as const;

function colorFor(trajectory: string): string {
  const t = trajectory.toLowerCase();
  if (t.includes("building") || t.includes("rising")) return C.green;
  if (t.includes("fading") || t.includes("cooling")) return C.red;
  if (t.includes("no signal")) return C.grey;
  return C.amber; // holding steady / near peak / at peak
}

export default function MomentumBar({ data }: { data: MomentumDatum[] }) {
  // Plotly draws horizontal bars bottom→top; reverse so the highest momentum
  // sits at the top of the chart.
  const rows = [...data].reverse();

  const trace = {
    type: "bar",
    orientation: "h",
    x: rows.map((r) => r.momentum),
    y: rows.map((r) => r.topic),
    marker: { color: rows.map((r) => colorFor(r.trajectory)) },
    customdata: rows.map((r) => [r.signal, r.trajectory, r.recent, r.prior]),
    hovertemplate:
      "<b>%{y}</b><br>Momentum %{x}/100<br>%{customdata[0]}<br>" +
      "%{customdata[1]}<br>%{customdata[2]} recent · %{customdata[3]} prior" +
      "<extra></extra>",
  } as Data;

  const layout: Partial<Layout> = {
    height: Math.max(280, rows.length * 34 + 80),
    margin: { l: 130, r: 24, t: 16, b: 40 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Source Sans 3, Helvetica Neue, Arial, sans-serif", color: C.ink, size: 12 },
    bargap: 0.35,
    xaxis: {
      range: [0, 100],
      title: { text: "Momentum (0–100)" },
      gridcolor: C.rule,
      zeroline: false,
    },
    yaxis: { automargin: true },
    shapes: [
      {
        type: "line",
        x0: 50,
        x1: 50,
        yref: "paper",
        y0: 0,
        y1: 1,
        line: { color: C.fg2, width: 1, dash: "dash" },
      },
    ],
    annotations: [
      {
        x: 50,
        y: 1,
        yref: "paper",
        yanchor: "bottom",
        text: "50 = avg",
        showarrow: false,
        font: { size: 10, color: C.fg2 },
      },
    ],
  };

  const config: Partial<Config> = {
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
  };

  return (
    <Plot
      data={[trace]}
      layout={layout}
      config={config}
      style={{ width: "100%" }}
      useResizeHandler
    />
  );
}
