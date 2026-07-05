"use client";

import { addSurfaceAction } from "./actions";

const CATEGORIES = [
  "discover",
  "search",
  "news",
  "ai",
  "subscription",
  "direct",
  "social",
  "custom",
];

const fieldCls = "w-full px-3 py-2 text-sm border rounded-sm bg-transparent";
const fieldStyle = {
  borderColor: "var(--color-border)",
  color: "var(--color-fg-primary)",
} as const;
const labelCls = "block text-xs font-semibold mb-1";
const labelStyle = { color: "var(--color-fg-tertiary)" } as const;

export default function SurfaceForm({ locale }: { locale: string }) {
  return (
    <form action={addSurfaceAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Surface name *
        </span>
        <input
          name="name"
          required
          placeholder="e.g. Apple News, a regional aggregator"
          className={fieldCls}
          style={fieldStyle}
        />
      </label>

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Category
        </span>
        <select name="category" className={fieldCls} style={fieldStyle}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <label className="block md:col-span-2">
        <span className={labelCls} style={labelStyle}>
          Readiness signals (optional — JSON or notes)
        </span>
        <textarea
          name="signals"
          rows={2}
          placeholder='{"checks":["answer-shaped passages","citation-worthiness"]}'
          className={fieldCls}
          style={fieldStyle}
        />
      </label>

      <div className="md:col-span-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold rounded-sm text-white"
          style={{ background: "var(--color-brand)" }}
        >
          Add surface
        </button>
      </div>
    </form>
  );
}
