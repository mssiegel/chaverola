import { Timer } from "lucide-react";

import { formatSecondsAsClock } from "@/lib/time";

/** The chip waits out a chat's first minute — fresh cards start clean and
 *  the clock fades in once there's something worth glancing at (founder
 *  call, 2026-07-20; see DECISIONS.md). */
const SHOW_FROM_SECONDS = 60;

/**
 * How long a live chat has been going — the count-up twin of
 * AutoEndCountdown, worn in the same header spot on the teacher's live
 * cards (the demo shows the countdown instead; real chats have no auto-end
 * clock yet). Quiet on purpose: no finale, no pulse, just m:ss ticking up.
 * The digits stay out of the accessibility tree like the countdown's do.
 */
export function ElapsedClock({ seconds }: { seconds: number }) {
  if (seconds < SHOW_FROM_SECONDS) return null;
  return (
    <span className="flex items-center rounded-full bg-card px-2.5 py-1 shadow-sm">
      <span
        aria-hidden
        className="inline-flex animate-in items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums duration-500 fade-in motion-reduce:animate-none"
      >
        <Timer className="size-3.5 shrink-0" />
        {formatSecondsAsClock(seconds)}
      </span>
    </span>
  );
}
