import type { ReactNode } from "react";

/**
 * ResponsiveTable — makes a wide `<table>` usable on small screens.
 *
 * Wrap any data table in this component. On a phone-width viewport the table
 * scrolls **horizontally inside its own box** (with touch momentum) instead of
 * stretching the whole page and forcing the entire layout to scroll sideways.
 *
 * Usage:
 * ```tsx
 * import ResponsiveTable from "@/components/ui/ResponsiveTable";
 *
 * <ResponsiveTable>
 *   <table className="w-full text-sm">…</table>
 * </ResponsiveTable>
 * ```
 *
 * Notes for contributors:
 * - Keep the `<table>` itself unchanged — this only adds the scroll container.
 * - Styling is inline on purpose, so the component has no dependency on the
 *   global stylesheet and can be dropped into any page as-is.
 * - `maxWidth: 100%` is what confines the overflow to this box rather than the
 *   page; `overflowX: auto` shows a scrollbar only when the table is too wide.
 */
export default function ResponsiveTable({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        maxWidth: "100%",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch", // momentum scrolling on iOS
      }}
    >
      {children}
    </div>
  );
}
