import type { ReactNode } from "react";
import { Joystick } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  The "you're driving this demo" kit: the dashed panel plus the small controls
  the demo surfaces share. `onWorld` renders the white/glass theme for panels
  sitting on the purple student world (StudentWorldLayout); the default theme
  is for regular app pages. The panels are permanent furniture on the DEMO
  flows — they're how a visitor (or the founder, mid-pitch) steers the story.
  Once a real backend exists they disappear from real activities only; see
  DECISIONS.md → "The demo control panels are teacher-facing and permanent".
*/

export function DemoControlsPanel({
  onWorld = false,
  caption,
  children,
}: {
  /** True when the panel sits on the purple student world. */
  onWorld?: boolean;
  /** One short line under the title explaining why these buttons exist. */
  caption?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "w-full rounded-2xl border border-dashed p-4",
        onWorld ? "border-white/30 bg-white/10" : "border-border bg-muted/40"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-sm font-semibold",
          caption ? "mb-1" : "mb-3",
          onWorld ? "text-white/80" : "text-muted-foreground"
        )}
      >
        <Joystick className="size-4" />
        You're driving this demo
      </div>
      {caption && (
        <p
          className={cn(
            "mb-3 text-xs",
            onWorld ? "text-white/70" : "text-muted-foreground"
          )}
        >
          {caption}
        </p>
      )}
      {children}
    </section>
  );
}

/** A "trigger this mock event" button. */
export function EventButton({
  onClick,
  disabled,
  icon,
  onWorld = false,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
  /** True when the button sits on the purple student world. */
  onWorld?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        onWorld
          ? "border-white/25 bg-white/15 text-white hover:bg-white/25"
          : "border-border bg-card text-foreground shadow-sm hover:bg-accent disabled:hover:bg-card"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/**
 * Hand-rolled on purpose: ShadCN's Switch would pull in another Radix package
 * and different metrics for a dev-only control that isn't worth pixel-matching.
 */
export function DemoToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full transition-colors",
        checked ? "bg-primary" : "bg-input"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform",
          checked && "translate-x-5"
        )}
      />
    </button>
  );
}
