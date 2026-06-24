"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  interactive?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

/** OJDS taxonomy chip (beats / topics / filters). Square corners, hairline border.
 *  `interactive` adds hover affordance; `removable` adds a × button. Use Badge for
 *  status (pill), Tag for taxonomy (square). */
const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, interactive = false, removable = false, onRemove, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none border px-2 py-0.5 align-middle text-xs",
        interactive && "cursor-pointer transition-colors hover:bg-[color:var(--color-ink-50)]",
        className,
      )}
      style={{
        fontFamily: "var(--font-ui)",
        borderColor: "var(--color-rule)",
        color: "var(--color-fg-secondary)",
        background: "var(--color-paper-card)",
      }}
      {...props}
    >
      {children}
      {removable && (
        <button
          type="button"
          aria-label="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="leading-none"
          style={{ color: "var(--color-fg-tertiary)" }}
        >
          ×
        </button>
      )}
    </span>
  ),
);
Tag.displayName = "Tag";

export { Tag };
