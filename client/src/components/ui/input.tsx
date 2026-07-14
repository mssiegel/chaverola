import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Text input matching the chat composer's field styling (grape focus ring on a
 * card surface). `aria-invalid` switches the ring to destructive — the form
 * pages set it from their validation state.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-[15px] text-foreground shadow-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-brand-grape focus-visible:ring-2 focus-visible:ring-brand-grape/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/15",
        className
      )}
      {...props}
    />
  );
}

export { Input };
