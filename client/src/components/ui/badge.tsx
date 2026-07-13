import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Customized away from stock ShadCN: our badge IS the rounded "eyebrow pill"
 * used on demo pages and placeholders, not the bordered rounded-md chip.
 */
const badgeVariants = cva(
  "inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase",
  {
    variants: {
      variant: {
        secondary: "bg-secondary text-secondary-foreground",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
