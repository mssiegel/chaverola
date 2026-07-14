import { cn } from "@/lib/utils";

/**
 * Inline problem text under a field. Rendered only after the teacher taps
 * Host with something missing or invalid — never while they're still typing.
 */
export function FieldError({
  message,
  className,
}: {
  message?: string;
  className?: string;
}) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn("text-sm font-medium text-destructive", className)}
    >
      {message}
    </p>
  );
}

/**
 * The quiet cap counter ("26/30") — appears only near the limit, same spirit
 * as the chat composer's 75-char counter.
 */
export function LimitCounter({
  count,
  max,
  showFrom,
  unit,
  className,
}: {
  count: number;
  max: number;
  /** The counter stays hidden until `count` reaches this. */
  showFrom: number;
  /** e.g. "words" — character counts go unlabelled. */
  unit?: string;
  className?: string;
}) {
  if (count < showFrom) return null;
  return (
    <span
      className={cn(
        "shrink-0 text-xs font-semibold tabular-nums",
        count >= max ? "text-destructive" : "text-muted-foreground",
        className
      )}
    >
      {count}/{max}
      {unit ? ` ${unit}` : ""}
    </span>
  );
}
