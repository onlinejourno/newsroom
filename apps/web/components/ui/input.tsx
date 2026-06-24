import * as React from "react";

import { cn } from "@/lib/utils";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> {
  label?: string;
  hint?: string;
  error?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  inputSize?: "sm" | "md" | "lg";
}

const SIZE = { sm: "h-8 text-sm", md: "h-10 text-base", lg: "h-12 text-lg" } as const;

/** OJDS labelled text field with hint/error states + optional prefix/suffix
 *  adornments. `error` (vermilion border + message) overrides `hint`. `inputSize`
 *  avoids clashing with the native `size` attribute. */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, prefix, suffix, inputSize = "md", id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-semibold"
            style={{ fontFamily: "var(--font-ui)", color: "var(--color-fg-primary)" }}
          >
            {label}
          </label>
        )}
        <div
          className={cn("flex items-center gap-2 rounded-none border px-3", SIZE[inputSize])}
          style={{
            background: "var(--color-paper-card)",
            borderColor: error ? "var(--color-urgent)" : "var(--color-border)",
          }}
        >
          {prefix && <span style={{ color: "var(--color-fg-tertiary)" }}>{prefix}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn("min-w-0 flex-1 bg-transparent outline-none", className)}
            style={{ color: "var(--color-fg-primary)", fontFamily: "var(--font-ui)" }}
            {...props}
          />
          {suffix && <span style={{ color: "var(--color-fg-tertiary)" }}>{suffix}</span>}
        </div>
        {(error || hint) && (
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-ui)",
              color: error ? "var(--color-urgent)" : "var(--color-fg-tertiary)",
            }}
          >
            {error ?? hint}
          </span>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
