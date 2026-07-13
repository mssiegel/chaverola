import type { ReactNode } from "react";

/*
  The homepage's deliberately plain section text bits — see DECISIONS.md →
  "The hero looks hand-made and never mentions AI".
*/

/** The small uppercase kicker above a section heading. */
export function SectionEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-bold tracking-[0.14em] text-brand-grape uppercase">
      {children}
    </p>
  );
}

/** A homepage section's h2. (The hero's h1 keeps its own, larger classes.) */
export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-3xl leading-[1.15] font-bold tracking-tight text-balance text-foreground sm:text-4xl">
      {children}
    </h2>
  );
}

/** The hand-drawn yellow highlighter stroke behind a few key words. */
export function HighlightMark({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-block whitespace-nowrap">
      <span
        aria-hidden
        className="absolute inset-x-[-0.12em] bottom-[0.02em] h-[0.48em] -rotate-1 rounded-[0.15em] bg-brand-sun/60"
      />
      <span className="relative">{children}</span>
    </span>
  );
}
