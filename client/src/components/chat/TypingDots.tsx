import { cn } from "@/lib/utils";

/**
 * The three bouncing dots used for "is typing…" and "waiting…" states.
 * Color comes from the caller so the dots can match their surface.
 */
export function TypingDots({
  dotClassName,
  "aria-hidden": ariaHidden,
}: {
  /** Dot color class, e.g. "bg-brand-grape/70" or "bg-brand-mint". */
  dotClassName: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <span className="flex items-center gap-1" aria-hidden={ariaHidden}>
      {["0ms", "150ms", "300ms"].map((delay) => (
        <span
          key={delay}
          className={cn("size-1.5 animate-bounce rounded-full", dotClassName)}
          style={{ animationDelay: delay }}
        />
      ))}
    </span>
  );
}
