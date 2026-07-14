import { cn } from "@/lib/utils";

interface StudentIdentityBarProps {
  /** The real name the student signed in with. */
  name: string;
  /** Where the student is right now, e.g. "Waiting in lobby". */
  stageLabel?: string;
  /** Show a pulsing "live" dot next to the stage label. */
  stageLive?: boolean;
  className?: string;
}

/**
 * The "you're signed in" strip for the student flow: avatar initial + name
 * on the left and the current stage on the right on desktop; just the name,
 * centered, on phones. Deliberately NOT shown in the waiting lobby — a name
 * bar there reads like a lobby roster (see DECISIONS.md).
 */
export function StudentIdentityBar({
  name,
  stageLabel,
  stageLive = false,
  className,
}: StudentIdentityBarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <div
      className={cn(
        "flex w-full items-center justify-center rounded-full border border-border bg-card px-4 py-2 shadow-sm sm:justify-between",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-grape text-sm font-semibold text-white"
        >
          {initial}
        </span>
        <span className="truncate font-semibold text-foreground">{name}</span>
      </div>

      {stageLabel && (
        <div className="hidden shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground sm:flex">
          {stageLive && (
            <span
              aria-hidden
              className="size-2 rounded-full bg-brand-mint motion-safe:animate-pulse"
            />
          )}
          {stageLabel}
        </div>
      )}
    </div>
  );
}
