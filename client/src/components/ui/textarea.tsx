import * as React from "react";

import { cn } from "@/lib/utils";

/** Multi-line sibling of `Input` — same surface, focus, and invalid styling. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "w-full min-w-0 resize-none rounded-xl border border-input bg-card px-3.5 py-2.5 text-[15px] leading-6 text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand-grape focus-visible:ring-2 focus-visible:ring-brand-grape/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
