import { Minus, Plus } from "lucide-react";

import type { StepperBounds } from "@/lib/activitySetup";
import { cn } from "@/lib/utils";

const STEP_BUTTON_CLASS =
  "grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

interface NumberStepperProps {
  value: number;
  bounds: StepperBounds;
  /**
   * Stays rendered while its parent toggle is off — the teacher can see what
   * turning it on will do, and nothing jumps around.
   */
  disabled?: boolean;
  /** Renders the value with its unit, e.g. `(v) => \`${v} minutes\`` */
  format: (value: number) => string;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (value: number) => void;
}

/** A − / value / + control for a toggle's sub-setting. */
export function NumberStepper({
  value,
  bounds,
  disabled,
  format,
  decreaseLabel,
  increaseLabel,
  onChange,
}: NumberStepperProps) {
  const stepBy = (direction: 1 | -1) => {
    const next = Math.min(
      bounds.max,
      Math.max(bounds.min, value + direction * bounds.step)
    );
    if (next !== value) onChange(next);
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border bg-card p-1 shadow-xs transition-opacity",
        disabled && "opacity-50"
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= bounds.min}
        onClick={() => stepBy(-1)}
        aria-label={decreaseLabel}
        className={STEP_BUTTON_CLASS}
      >
        <Minus className="size-4" />
      </button>
      <span
        aria-live="polite"
        className={cn(
          "min-w-24 text-center text-sm font-semibold tabular-nums",
          disabled ? "text-muted-foreground" : "text-foreground"
        )}
      >
        {format(value)}
      </span>
      <button
        type="button"
        disabled={disabled || value >= bounds.max}
        onClick={() => stepBy(1)}
        aria-label={increaseLabel}
        className={STEP_BUTTON_CLASS}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
