"use client";

// Lean Plotly wrapper (ADR 0061): react-plotly.js bound to the minified dist
// bundle, so we don't pull the full plotly.js source build. Browser-only —
// always import this via `next/dynamic` with `{ ssr: false }`, never directly.
import type { ComponentType } from "react";
import type { PlotParams } from "react-plotly.js";
// @ts-expect-error - plotly.js-dist-min ships no type declarations
import Plotly from "plotly.js-dist-min";
import createPlotlyComponent from "react-plotly.js/factory";

const Plot = createPlotlyComponent(Plotly) as ComponentType<PlotParams>;

export default Plot;
