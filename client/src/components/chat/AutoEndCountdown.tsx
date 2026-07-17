import { Pause, Timer } from "lucide-react";

import { formatSecondsAsClock } from "@/lib/time";
import { cn } from "@/lib/utils";

/** The countdown shifts color and pulses inside the final minute. */
const FINALE_FROM_SECONDS = 60;

interface AutoEndCountdownProps {
  /** Seconds left on the chat's auto-end clock. */
  secondsLeft: number;
  /** True on dark chrome (the student chat header's grape gradient). */
  onDark?: boolean;
  /**
   * The teacher paused the activity: the clock holds, so the frozen look
   * wins — muted tone, a pause glyph, and no finale pulse even under 60s.
   */
  paused?: boolean;
  className?: string;
}

/**
 * The per-chat auto-end clock, shared by the student chat header and the
 * teacher chat cards: a quiet m:ss most of the way, then a louder pulse in
 * the final minute so students wrap up their scene. The ticking digits stay
 * out of the accessibility tree (a clock read out every second is noise);
 * a status line announces once when the final minute starts.
 */
export function AutoEndCountdown({
  secondsLeft,
  onDark = false,
  paused = false,
  className,
}: AutoEndCountdownProps) {
  const finale = !paused && secondsLeft <= FINALE_FROM_SECONDS;
  const Icon = paused ? Pause : Timer;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
        onDark
          ? finale
            ? "font-semibold text-amber-300"
            : "text-white/75"
          : finale
            ? "font-semibold text-destructive"
            : "text-muted-foreground",
        finale && "animate-pulse motion-reduce:animate-none",
        className
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span aria-hidden>{formatSecondsAsClock(secondsLeft)}</span>
      <span role="status" className="sr-only">
        {paused
          ? "The chat clock is paused"
          : finale
            ? "Less than a minute left in this chat"
            : ""}
      </span>
    </span>
  );
}
