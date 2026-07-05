"use client";

import { useMemo, useState } from "react";
import { CONNECTOR_CATALOG, categoryDef } from "@/lib/connectors-catalog";
import { addConnectorAction } from "./actions";

const fieldCls = "w-full px-3 py-2 text-sm border rounded-sm bg-transparent";
const fieldStyle = {
  borderColor: "var(--color-border)",
  color: "var(--color-fg-primary)",
} as const;
const labelCls = "block text-xs font-semibold mb-1";
const labelStyle = { color: "var(--color-fg-tertiary)" } as const;

export default function ConnectorForm({ locale }: { locale: string }) {
  const [categoryKey, setCategoryKey] = useState(CONNECTOR_CATALOG[0].key);
  const cat = useMemo(() => categoryDef(categoryKey), [categoryKey]);
  const [providerKey, setProviderKey] = useState(
    CONNECTOR_CATALOG[0].providers[0].key,
  );
  const provider = useMemo(
    () => cat?.providers.find((p) => p.key === providerKey) ?? cat?.providers[0],
    [cat, providerKey],
  );

  return (
    <form action={addConnectorAction} className="grid gap-4 md:grid-cols-2">
      <input type="hidden" name="locale" value={locale} />

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Category *
        </span>
        <select
          name="category"
          value={categoryKey}
          onChange={(e) => {
            const k = e.target.value;
            setCategoryKey(k);
            setProviderKey(categoryDef(k)?.providers[0].key ?? "");
          }}
          className={fieldCls}
          style={fieldStyle}
        >
          {CONNECTOR_CATALOG.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        {cat && (
          <span className="text-xs mt-1 block" style={labelStyle}>
            contract: <code>{cat.contract}</code>
          </span>
        )}
      </label>

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Provider *
        </span>
        <select
          name="provider"
          value={providerKey}
          onChange={(e) => setProviderKey(e.target.value)}
          className={fieldCls}
          style={fieldStyle}
        >
          {cat?.providers.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
              {p.oss ? " · open-source" : ""}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelCls} style={labelStyle}>
          Mode *
        </span>
        <select name="mode" className={fieldCls} style={fieldStyle}>
          {provider?.modes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      {provider?.fields.map((f) => (
        <label className="block" key={f.name}>
          <span className={labelCls} style={labelStyle}>
            {f.label}
          </span>
          <input
            name={f.secret ? "auth_secret_ref" : `config_${f.name}`}
            placeholder={f.placeholder}
            className={fieldCls}
            style={fieldStyle}
          />
        </label>
      ))}

      <div className="md:col-span-2">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold rounded-sm text-white"
          style={{ background: "var(--color-brand)" }}
        >
          Add connector
        </button>
      </div>
    </form>
  );
}
