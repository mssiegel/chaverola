import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * The dashed "nothing here right now" box the host page's sections share.
 * Content varies per section; the shell reads the same everywhere.
 */
export function EmptyState({
  className,
  children,
}: {
  /** Vertical padding and any text styles the content needs (e.g. "py-6"). */
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-border bg-muted/40 px-4 text-center",
        className
      )}
    >
      {children}
    </div>
  );
}
