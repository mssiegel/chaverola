import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The pulsing mint dot that marks something as live right now — the chat
 * cards' "Live" badge and the character row locked by a running chat share
 * it, so both read as the same state.
 */
function LiveDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("relative flex size-2", className)} {...props}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-brand-mint" />
    </span>
  );
}

export { LiveDot };
