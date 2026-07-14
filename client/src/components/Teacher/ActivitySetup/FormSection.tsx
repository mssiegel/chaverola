import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Each section owns one brand accent (grape, coral, sky, mint) so the form
 * reads as a friendly sequence of stops rather than a wall of white boxes.
 * The accent only tints the small icon chip — the cards themselves stay calm.
 */
const ACCENT_CHIP: Record<SectionAccent, string> = {
  grape: "bg-brand-grape-soft text-brand-grape-strong",
  coral: "bg-brand-coral/15 text-brand-coral",
  sky: "bg-brand-sky/15 text-brand-sky",
  mint: "bg-brand-mint/15 text-brand-mint",
};

export type SectionAccent = "grape" | "coral" | "sky" | "mint";

interface FormSectionProps {
  title: string;
  icon: LucideIcon;
  accent: SectionAccent;
  /** Tags the title with a muted "optional". */
  optional?: boolean;
  hint?: string;
  /**
   * Quieter card treatment (muted, no shadow) — used by the settings block,
   * whose defaults are already the recommended state and shouldn't compete
   * with the fields the teacher actually has to fill.
   */
  quiet?: boolean;
  children: ReactNode;
}

/** One visual group of the single-scrolling setup form. */
export function FormSection({
  title,
  icon: Icon,
  accent,
  optional,
  hint,
  quiet,
  children,
}: FormSectionProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border p-5 sm:p-6",
        quiet
          ? "border-border/60 bg-muted/50"
          : "border-border bg-card shadow-sm"
      )}
    >
      <div className="mb-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              ACCENT_CHIP[accent]
            )}
          >
            <Icon className="size-4.5" />
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            {title}
            {optional && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                optional
              </span>
            )}
          </h2>
        </div>
        {hint && (
          <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}
