import * as React from "react";

import { cn } from "@/lib/utils";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  action?: React.ReactNode;
  footer?: React.ReactNode;
  accent?: boolean;
  padded?: boolean;
}

/** OJDS editorial card: white surface, hairline frame, square corners. Optional
 *  vermilion mono-kicker `eyebrow`, display-serif `title`, header `action`, and
 *  `footer`. `accent` adds a vermilion top rule; `padded={false}` for flush media. */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { className, eyebrow, title, action, footer, accent = false, padded = true, children, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn("rounded-none", className)}
      style={{
        background: "var(--color-paper-card)",
        border: "1px solid var(--color-rule)",
        ...(accent ? { borderTop: "2px solid var(--color-urgent)" } : {}),
      }}
      {...props}
    >
      {(eyebrow || title || action) && (
        <div className={cn("flex items-start justify-between gap-3", padded && "px-5 pt-4")}>
          <div className="min-w-0">
            {eyebrow && <div className="ds-label">{eyebrow}</div>}
            {title && (
              <h3
                className="m-0 text-xl leading-tight"
                style={{ fontFamily: "var(--font-display)", color: "var(--color-fg-primary)" }}
              >
                {title}
              </h3>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn(padded && "px-5 py-4")}>{children}</div>
      {footer && (
        <div className={cn(padded && "px-5 py-3")} style={{ borderTop: "1px solid var(--color-rule)" }}>
          {footer}
        </div>
      )}
    </div>
  ),
);
Card.displayName = "Card";

export { Card };
