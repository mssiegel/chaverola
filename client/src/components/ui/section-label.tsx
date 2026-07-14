import * as React from "react";

import { cn } from "@/lib/utils";

/** The small uppercase kicker above a block of info (lobby card, reveal). */
function SectionLabel({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-xs font-semibold tracking-wide text-muted-foreground uppercase",
        className
      )}
      {...props}
    />
  );
}

export { SectionLabel };
