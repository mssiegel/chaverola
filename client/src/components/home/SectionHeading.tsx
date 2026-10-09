import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  The homepage's deliberately plain section text bits — see DECISIONS.md →
  "The hero looks hand-made and never mentions AI".
*/

/** The small uppercase kicker above a section heading. Positive tracking and
 *  `uppercase` both survive RTL untouched — the spacing helps Hebrew too, and
 *  Hebrew has no case for `uppercase` to act on. */
export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-bold tracking-[0.14em] text-brand-grape uppercase">
      {children}
    </p>
  );
}

/** A homepage section's h2. (The hero's h1 keeps its own, larger classes.) */
export function SectionHeading({
  children,
  weight = "bold",
}: {
  children: ReactNode;
  weight?: "normal" | "bold";
}) {
  return (
    <h2
      className={cn(
        "text-3xl leading-[1.15] tracking-tight text-balance text-foreground sm:text-4xl rtl:tracking-normal",
        weight === "normal" ? "font-normal" : "font-bold"
      )}
    >
      {children}
    </h2>
  );
}
