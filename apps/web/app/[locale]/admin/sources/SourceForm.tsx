"use client";

import { useState } from "react";
import { addSourceAction } from "./actions";

const KINDS = ["rss", "api", "mcp", "scrape", "social"] as const;
const FAMILIES = [
  "government",
  "political",
  "international",
  "institutional",
  "wire",
  "social",
  "own",
];

const fieldCls =
  "w-full px-3 py-2 text-sm border rounded-sm bg-transparent";
const fieldStyle = {
  borderColor: "var(--color-border)",
  color: "var(--color-fg-primary)",
} as const;
const labelCls = "block text-xs font-semibold mb-1";
const labelStyle = { color: "var(--color-fg-tertiary)" } as const;

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className={labelCls} style={labelStyle}>
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        placeholder={placeholder}
        required={required}
        className={fieldCls}
        style={fieldStyle}
      />
    </label>
  );
}

export default function SourceForm({ locale }: { locale: string }) {
  const [kind, setKind] = useState<string>("rss");

  return (
    <form action={addSourceAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />

      <Field label="Name" name="name" placeholder="e.g. Central Bank releases" required />

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Ingest type *
        </span>
        <select
          name="kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={fieldCls}
          style={fieldStyle}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Family
        </span>
        <select name="family" className={fieldCls} style={fieldStyle}>
          <option value="">—</option>
          {FAMILIES.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Tier
        </span>
        <select name="tier" className={fieldCls} style={fieldStyle}>
          <option value="">—</option>
          {[1, 2, 3, 4].map((t) => (
            <option key={t} value={t}>
              Tier {t}
            </option>
          ))}
        </select>
      </label>

      <Field label="Endpoint URL" name="url" placeholder="https://…" required />
      <Field label="Sections fed (comma-sep)" name="sections_fed" placeholder="News/National, Business/Markets" />
      <Field label="Geo scope" name="geo" placeholder="country / region / district" />
      <Field label="Frequency" name="frequency" placeholder="hourly / daily" />

      {/* ── per-ingest_type fields ── */}
      {kind === "rss" && (
        <Field label="Feed URL" name="rss_url" placeholder="https://…/feed.xml" />
      )}

      {kind === "api" && (
        <>
          <label className="block">
            <span className={labelCls} style={labelStyle}>
              Auth method
            </span>
            <select name="auth_method" className={fieldCls} style={fieldStyle}>
              <option value="none">none</option>
              <option value="api_key">api_key</option>
              <option value="bearer">bearer</option>
              <option value="oauth">oauth</option>
            </select>
          </label>
          <Field
            label="Secret ref (env name, not the key)"
            name="auth_secret_ref"
            placeholder="NGX_API_KEY"
          />
          <Field label="Query params" name="param_query" placeholder="?since=…" />
          <Field label="Response path" name="param_response_path" placeholder="data.items" />
          <Field label="Rate limit" name="param_rate_limit" placeholder="60/min" />
        </>
      )}

      {kind === "mcp" && (
        <>
          <Field label="MCP server" name="param_server" placeholder="https://… or command" required />
          <Field label="Tool name" name="param_tool" placeholder="fetch_filings" />
          <Field label="Tool args (JSON)" name="param_args" placeholder='{"limit":20}' />
        </>
      )}

      {kind === "scrape" && (
        <>
          <Field label="Item selector" name="param_selector" placeholder=".story-list li a" />
          <Field label="Cloudflare-aware fetch" name="param_cf_fetch" placeholder="true / false" />
        </>
      )}

      {kind === "social" && (
        <>
          <Field label="Handle" name="param_handle" placeholder="@centralbank" />
          <Field label="Platform" name="param_platform" placeholder="x / mastodon" />
        </>
      )}

      <div className="md:col-span-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold rounded-sm text-white"
          style={{ background: "var(--color-brand)" }}
        >
          Add source
        </button>
      </div>
    </form>
  );
}
