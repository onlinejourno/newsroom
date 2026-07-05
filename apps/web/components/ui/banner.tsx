"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export type BannerTone = "info" | "critical" | "warning" | "positive";

const TONE: Record<BannerTone, { rule: string; bg: string }> = {
  info: { rule: "var(--color-info)", bg: "var(--color-info-bg)" },
  critical: { rule: "var(--color-urgent)", bg: "var(--color-urgent-bg)" },
  warning: { rule: "var(--color-amber-600)", bg: "var(--color-amber-100)" },
  positive: { rule: "var(--color-ioj-green-600)", bg: "var(--color-ioj-green-100)" },
};

export interface BannerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  tone?: BannerTone;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
}

/** OJDS inline alert: coloured left rule + tinted bg, optional title/icon/action/
 *  dismiss. For contextual in-page messages — not transient toasts. */
function Banner({
  className,
  tone = "info",
  title,
  icon,
  action,
  onDismiss,
  children,
  ...props
}: BannerProps) {
  const [hidden, setHidden] = React.useState(false);
  if (hidden) return null;
  const t = TONE[tone];
  return (
    <div
      className={cn("flex items-start gap-3 px-4 py-3", className)}
      style={{ background: t.bg, borderLeft: `3px solid ${t.rule}` }}
      {...props}
    >
      {icon && (
        <span className="mt-0.5 shrink-0" style={{ color: t.rule }}>
          {icon}
        </span>
      )}
      <div
        className="min-w-0 flex-1"
        style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--color-fg-primary)" }}
      >
        {title && <div className="mb-0.5 font-semibold">{title}</div>}
        {children && <div style={{ color: "var(--color-fg-secondary)" }}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            setHidden(true);
            onDismiss();
          }}
          className="shrink-0 leading-none"
          style={{ color: "var(--color-fg-tertiary)" }}
        >
          ×
        </button>
      )}
    </div>
  );
}

export { Banner };
