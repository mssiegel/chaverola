import { useId, useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

import {
  AccentIconChip,
  type SectionAccent,
} from "@/components/Teacher/ActivitySetup/FormSection";
import { cn } from "@/lib/utils";

/** The little count badge after a section title (e.g. chats in progress). */
export function CountPill({ count }: { count: number }) {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground tabular-nums">
      {count}
    </span>
  );
}

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  /** Same accent-chip idiom as the setup form's sections. */
  accent: SectionAccent;
  /** Shown as a pill after the title (e.g. the number of chats). */
  count?: number;
  /** One line under the title that earns the collapsed state its keep. */
  collapsedHint?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * The host page's shared minimizable section: every stacked block (joining
 * instructions, live settings, pairing, chats) is one of these, so the whole
 * page collapses the same way. Content stays mounted while collapsed (the
 * settings panel keeps its draft; animation stays smooth) but goes `inert`
 * so it leaves the tab order.
 */
export function CollapsibleSection({
  title,
  icon: Icon,
  accent,
  count,
  collapsedHint,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section className="rounded-2xl border border-border bg-card shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-3 rounded-2xl p-5 text-left sm:p-6"
        >
          <AccentIconChip accent={accent} icon={Icon} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="min-w-0">{title}</span>
              {count !== undefined && <CountPill count={count} />}
            </span>
            {!open && collapsedHint && (
              <span className="mt-0.5 block text-sm font-normal text-muted-foreground">
                {collapsedHint}
              </span>
            )}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "size-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
        </button>
      </h2>

      <div
        id={contentId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div inert={!open} className="px-5 pb-5 sm:px-6 sm:pb-6">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
