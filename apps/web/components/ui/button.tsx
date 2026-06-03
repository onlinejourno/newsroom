import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-[color:var(--color-brand)] text-white hover:bg-[color:var(--color-brand-dark)] focus-visible:ring-[color:var(--color-brand)]",
        secondary:
          "bg-[color:var(--color-paper-card)] text-[color:var(--color-fg-primary)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-ink-50)] focus-visible:ring-[color:var(--color-brand)]",
        urgent:
          "bg-[color:var(--color-urgent)] text-white hover:bg-[color:var(--color-red-700)] focus-visible:ring-[color:var(--color-urgent)]",
        ghost:
          "bg-transparent text-[color:var(--color-fg-primary)] hover:bg-[color:var(--color-ink-100)] focus-visible:ring-[color:var(--color-brand)]",
        link: "text-[color:var(--color-link)] underline-offset-4 hover:underline focus-visible:ring-[color:var(--color-brand)]",
      },
      size: {
        sm: "h-8 px-3 text-sm rounded-[var(--radius-md)]",
        md: "h-10 px-4 text-base rounded-[var(--radius-md)]",
        lg: "h-12 px-6 text-lg rounded-[var(--radius-md)]",
        pill: "h-8 px-4 text-sm rounded-[var(--radius-pill)]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
