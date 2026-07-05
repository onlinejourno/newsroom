"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabItem = string | { value: string; label: string; count?: number };

export interface TabsProps {
  tabs: TabItem[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
}

const norm = (t: TabItem) => (typeof t === "string" ? { value: t, label: t } : t);

/** OJDS underline tab bar: vermilion active underline + semibold; optional mono
 *  count pill. Controlled (`value`/`onChange`) or uncontrolled (`defaultValue`). */
function Tabs({ tabs, value, defaultValue, onChange, className }: TabsProps) {
  const items = tabs.map(norm);
  const [internal, setInternal] = React.useState(defaultValue ?? items[0]?.value);
  const active = value ?? internal;
  const select = (v: string) => {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  };
  return (
    <div
      className={cn("flex items-center gap-6 border-b", className)}
      style={{ borderColor: "var(--color-rule)" }}
    >
      {items.map((t) => {
        const on = t.value === active;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => select(t.value)}
            className="-mb-px flex cursor-pointer items-center gap-2 py-2.5"
            style={{
              fontFamily: "var(--font-ui)",
              fontWeight: on ? 600 : 500,
              fontSize: 14,
              color: on ? "var(--color-fg-primary)" : "var(--color-fg-secondary)",
              borderBottom: `2px solid ${on ? "var(--color-urgent)" : "transparent"}`,
              background: "none",
            }}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span
                className="px-1.5 text-xs"
                style={{
                  fontFamily: "var(--font-mono)",
                  background: "var(--color-ink-100)",
                  color: "var(--color-fg-secondary)",
                  borderRadius: "var(--radius-pill)",
                }}
              >
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export { Tabs };
