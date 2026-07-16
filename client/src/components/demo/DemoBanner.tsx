import { ArrowRight } from "lucide-react";

import { LocaleLink } from "@/components/layout/LocaleLink";

/**
 * The "you're looking at the demo" notice, shown only when a surface is
 * running the demo activity (join code 1234) — never on a teacher's own
 * activity. Loud on purpose: it started as a small pill, and founder feedback
 * (2026-07-16) was that it's too easy to miss — see DECISIONS.md → "The demo
 * notice is a banner you can't miss".
 *
 * Default theme: a full-width golden bar for the teacher host page. It sticks
 * just below the navbar (top offsets match AppLayout's h-14/h-16 header) so
 * it never scrolls away, and slims down from `lg` up so it clears the
 * pairing rail pinned at top-24. HostHeader's condensed waiting bar stands
 * down on the demo so the two never fight over this band.
 *
 * `onWorld`: a golden card for the purple student world, label only — no
 * teacher nudges inside the student experience. It pins too: `top-20` equals
 * the world column's `pt-20` (StudentWorldLayout), so the card sticks exactly
 * where it first renders — below the corner pills — and the stages scroll
 * underneath it.
 */
export function DemoBanner({ onWorld = false }: { onWorld?: boolean }) {
  if (onWorld) {
    return (
      <p className="sticky top-20 z-10 w-full rounded-2xl bg-brand-sun px-4 py-2.5 text-center text-sm font-semibold text-brand-grape-strong shadow-lg sm:text-base">
        This is the demo. The other students are pretend.
      </p>
    );
  }
  return (
    <div className="sticky top-14 z-20 border-b border-foreground/10 bg-brand-sun sm:top-16">
      <p className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-x-2 px-4 py-1.5 text-center text-sm font-semibold text-foreground lg:py-1">
        This is the demo class. The students are pretend.
        <LocaleLink
          to="/activity/create"
          className="inline-flex items-center gap-1 font-bold text-brand-grape-strong underline underline-offset-2 hover:text-brand-grape"
        >
          Start your own
          <ArrowRight className="size-3.5" />
        </LocaleLink>
      </p>
    </div>
  );
}
