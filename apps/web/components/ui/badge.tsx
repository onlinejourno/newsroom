import * as React from "react";

import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "ink" | "critical" | "warning" | "info" | "positive";

const TONE: Record<BadgeTone, { fg: string; bg: string }> = {
  neutral: { fg: "var(--color-fg-secondary)", bg: "var(--color-ink-100)" },
  ink: { fg: "var(--color-fg-primary)", bg: "var(--color-ink-100)" },
  critical: { fg: "var(--color-urgent)", bg: "var(--color-urgent-bg)" },
  warning: { fg: "var(--color-amber-600)", bg: "var(--color-amber-100)" },
  info: { fg: "var(--color-info)", bg: "var(--color-info-bg)" },
  positive: { fg: "var(--color-ioj-green-600)", bg: "var(--color-ioj-green-100)" },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  solid?: boolean;
  dot?: boolean;
}

/** OJDS status pill. Soft tint by default; `solid` fills with the tone colour;
 *  `dot` adds a leading status dot. Green is functional (positive). Use Tag for
 *  taxonomy (square), Badge for status (pill). */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, tone = "neutral", solid = false, dot = false, children, ...props }, ref) => {
    const t = TONE[tone];
    const style: React.CSSProperties = solid
      ? { background: t.fg, color: "var(--color-text-inverse)" }
      : { background: t.bg, color: t.fg };
    return (
      <span
        ref={ref}
        className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-semibold", className)}
        style={{ fontFamily: "var(--font-ui)", borderRadius: "var(--radius-pill)", ...style }}
        {...props}
      >
        {dot && (
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ background: solid ? "currentColor" : t.fg }}
          />
        )}
        {children}
      </span>
    );
  },
);
Badge.displayName = "Badge";

export { Badge };
