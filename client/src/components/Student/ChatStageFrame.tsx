import type { ReactNode } from "react";

/**
 * The box the student's chatbox sits in, on both stages — the demo's
 * `ChatStage` and the live `LiveChatStage`. The two stages stay separate
 * components on purpose (never a conditional hook); this is only the frame
 * they agree on, so a sizing fix lands on both at once instead of on
 * whichever one someone remembered.
 *
 * Phones: fill the world edge-to-edge (~8px margins) so the composer sits on
 * the keyboard — `self-stretch` without a width is what lets `-mx-2` actually
 * widen the box. The min-h floor keeps the demo card from being crushed by
 * its sibling controls, but releases while typing so only the feed shrinks
 * above the keyboard. Its entrance animation must not move a focused input
 * outside that rectangle, and sizing itself never transitions. From `sm` up:
 * a fixed centered card.
 */
export function ChatStageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-2 flex min-h-[min(calc(var(--student-viewport-height,100dvh)*0.7),620px)] flex-1 animate-in flex-col self-stretch transition-none duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none max-sm:group-has-[textarea:focus]:min-h-0 max-sm:group-has-[textarea:focus]:animate-none sm:mx-0 sm:h-[min(70dvh,620px)] sm:flex-none">
      {children}
    </div>
  );
}
