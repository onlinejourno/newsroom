"use client";

// Interest Trajectory — multi-line chart of per-topic signal interest over time,
// with the outlet's Google-News (blue) / Discover (gold) appearance markers
// (#107, ADR 0061; replicates the discover-dashboard / localhost:8501 view).
// Platform-native: "interest" = our own enriched-signal corpus, NOT Google
// Trends (see lib/trends.ts). Vendor-neutral — the outlet label is passed in.

import dynamic from "next/dynamic";
import type { Config, Data, Layout } from "plotly.js";

const Plot = dynamic(() => import("@/components/charts/Plotly"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 360,
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

export type TrajPoint = { topic: string; d: string; n: number };
export type ChannelMarker = { channel: string; d: string; n: number };

// Concrete hex mirrors the OJDS tokens (ADR 0063) — Plotly renders colours as SVG
// attributes and cannot resolve CSS `var(--…)`.
const INK = "#181610";
const RULE = "#c5bda9";
const NEWS = "#2b5fb0"; // Google News marker (blue)
const DISCOVER = "#9a6a14"; // Discover marker (gold)
const LINES = [
  "#2e7d46", "#2b5fb0", "#c0392b", "#8e2c8c",
  "#9a6a14", "#0e8a7e", "#6f6757", "#d97f0c",
];

export default function InterestTrajectory({
  series,
  markers,
  outletLabel,
}: {
  series: TrajPoint[];
  markers: ChannelMarker[];
  outletLabel: string;
}) {
  const days = [...new Set(series.map((p) => p.d))].sort();

  // Pivot the flat (topic, day, n) rows into one line trace per topic.
  const byTopic = new Map<string, Map<string, number>>();
  for (const p of series) {
    const m = byTopic.get(p.topic) ?? new Map<string, number>();
    m.set(p.d, p.n);
    byTopic.set(p.topic, m);
  }
  const lineTraces = [...byTopic.entries()].map(
    ([topic, m], i) =>
      ({
        type: "scatter",
        mode: "lines+markers",
        name: topic,
        x: days,
        y: days.map((d) => m.get(d) ?? 0),
        line: { color: LINES[i % LINES.length], width: 2 },
        marker: { size: 5 },
      }) as Data,
  );

  // Outlet channel appearances as a marker "rug" along the baseline (y=0), sized
  // by how many times that day. Toggle via the legend (Plotly's multiselect).
  const channelTrace = (name: string, color: string, key: string): Data => {
    const m = new Map(
      markers.filter((x) => x.channel === key).map((x) => [x.d, x.n] as const),
    );
    const xs = [...m.keys()].sort();
    return {
      type: "scatter",
      mode: "markers",
      name,
      x: xs,
      y: xs.map(() => 0),
      marker: {
        color,
        symbol: "diamond",
        size: xs.map((d) => 9 + Math.min(12, (m.get(d) ?? 1) * 2)),
        line: { color: "#ffffff", width: 1 },
      },
      hovertext: xs.map((d) => `${name} ×${m.get(d) ?? 0}`),
      hoverinfo: "text",
    } as Data;
  };
  const markerTraces = [
    channelTrace(`${outletLabel} · Google News`, NEWS, "google_news"),
    channelTrace(`${outletLabel} · Discover`, DISCOVER, "discover"),
  ].filter((t) => {
    const xs = (t as { x?: unknown[] }).x;
    return Array.isArray(xs) && xs.length > 0;
  });

  const layout: Partial<Layout> = {
    height: 380,
    margin: { l: 48, r: 16, t: 16, b: 56 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "Source Sans 3, Helvetica Neue, Arial, sans-serif", color: INK, size: 12 },
    xaxis: { type: "category", gridcolor: RULE },
    yaxis: { title: { text: "Signals / day" }, gridcolor: RULE, rangemode: "tozero" },
    legend: { orientation: "h", y: -0.25, font: { size: 11 } },
    hovermode: "closest",
  };
  const config: Partial<Config> = {
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ["lasso2d", "select2d"],
  };

  return (
    <Plot
      data={[...lineTraces, ...markerTraces]}
      layout={layout}
      config={config}
      style={{ width: "100%" }}
      useResizeHandler
    />
  );
}
