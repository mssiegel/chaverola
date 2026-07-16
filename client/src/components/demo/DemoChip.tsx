import { ArrowRight } from "lucide-react";

import { LocaleLink } from "@/components/layout/LocaleLink";

/**
 * The small "you're looking at the demo" pill, shown only when a surface is
 * running the demo activity (join code 1234) — never on a teacher's own
 * activity. The default theme sits on app pages and carries the quiet
 * start-your-own nudge; `onWorld` is the glass theme for the purple student
 * world, label only — no teacher nudges inside the student experience.
 */
export function DemoChip({ onWorld = false }: { onWorld?: boolean }) {
  if (onWorld) {
    return (
      <p className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white/85 backdrop-blur-sm">
        This is the demo. The other students are pretend.
      </p>
    );
  }
  return (
    <p className="inline-flex flex-wrap items-center justify-center gap-x-2 rounded-full border border-brand-sun/60 bg-brand-sun/15 px-3 py-1 text-xs font-medium text-foreground/80">
      This is the demo class. The students are pretend.
      <LocaleLink
        to="/activity/create"
        className="inline-flex items-center gap-0.5 font-semibold text-brand-grape underline-offset-2 hover:underline"
      >
        Start your own
        <ArrowRight className="size-3" />
      </LocaleLink>
    </p>
  );
}
