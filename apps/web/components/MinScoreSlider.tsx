"use client";
import { useState } from "react";

// Range input whose label tracks the drag (the page is otherwise
// server-rendered; this is the one stateful control).
export function MinScoreSlider({ defaultValue }: { defaultValue: number }) {
  const [v, setV] = useState(defaultValue);
  return (
    <label className="flex flex-col gap-1">
      <span className="ds-label">Minimum score · {v}</span>
      <input
        type="range"
        name="min"
        min={0}
        max={100}
        value={v}
        onChange={(e) => setV(Number(e.target.value))}
        className="w-44"
      />
    </label>
  );
}
