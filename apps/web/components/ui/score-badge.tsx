import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Quality-score band (0-100, higher = better). Thresholds match the existing
 * scores UI (app/[locale]/scores/page.tsx). For urgency/heat labels (e.g. the
 * Potential page, where higher = more urgent) use a dedicated component — this
 * badge is for quality/composite scores only.
 */
export function scoreBand(score: number): "HIGH" | "MEDIUM" | "LOW" {
  if (score >= 75) return "HIGH";
  if (score >= 50) return "MEDIUM";
  return "LOW";
}

// Band → design tokens (brand / amber / urgent). Replaces the off-system hex
// the pages hardcode today (#16a34a / #2563eb / #b45309).
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-semibold rounded-none border align-middle",
  {
    variants: {
      band: {
        HIGH: "bg-[color:var(--color-brand-bg)] text-[color:var(--color-brand-dark)] border-[color:var(--color-brand)]",
        MEDIUM:
          "bg-[color:var(--color-amber-100)] text-[color:var(--color-amber-600)] border-[color:var(--color-amber-600)]",
        LOW: "bg-[color:var(--color-urgent-bg)] text-[color:var(--color-urgent)] border-[color:var(--color-urgent)]",
      },
      size: {
        sm: "px-1.5 py-0.5 text-xs",
        md: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export interface ScoreBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    Pick<VariantProps<typeof badgeVariants>, "size"> {
  score: number;
  /** Override the band word; omit to show the band (HIGH/MEDIUM/LOW). */
  label?: string;
  /** Hide the word entirely (number-only chip, e.g. the D·N·S sub-scores). */
  showLabel?: boolean;
}

export function ScoreBadge({
  score,
  label,
  showLabel = true,
  size,
  className,
  ...props
}: ScoreBadgeProps) {
  const band = scoreBand(score);
  const word = label ?? band;
  return (
    <span
      className={cn(badgeVariants({ band, size }), className)}
      style={{ fontFamily: "var(--font-ui)" }}
      {...props}
    >
      <span style={{ fontFamily: "var(--font-display)" }}>{Math.round(score)}</span>
      {showLabel ? (
        <span className="uppercase tracking-wide opacity-80">{word}</span>
      ) : null}
    </span>
  );
}
