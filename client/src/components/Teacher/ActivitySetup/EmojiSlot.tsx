import { lazy, Suspense, useState } from "react";
import { SmilePlus } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Code-split the (heavy) emoji picker — only loaded when a slot is opened.
const EmojiPickerPopover = lazy(
  () => import("@/components/chat/EmojiPickerPopover")
);

interface EmojiSlotProps {
  emoji?: string;
  /** For the accessible labels; may still be empty while the row is unnamed. */
  characterName: string;
  /** `undefined` clears the emoji — a character without one is valid. */
  onChange: (emoji: string | undefined) => void;
}

/**
 * The optional-emoji slot leading each character row, styled as the
 * character's round avatar (same shape students see in the lobby roster).
 * Empty by default; picking sets or replaces the row's single emoji, and a
 * set emoji can be removed again (see DECISIONS.md → "A character's emoji is
 * optional").
 */
export function EmojiSlot({ emoji, characterName, onChange }: EmojiSlotProps) {
  const [open, setOpen] = useState(false);
  const who = characterName || "this character";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={
            emoji ? `Change the emoji for ${who}` : `Pick an emoji for ${who}`
          }
          className={cn(
            "grid size-12 shrink-0 place-items-center rounded-full border transition-colors",
            emoji
              ? "border-transparent bg-secondary text-2xl shadow-xs hover:border-brand-grape/40"
              : "border-dashed border-input bg-muted/40 text-muted-foreground hover:border-brand-grape/60 hover:bg-brand-grape-soft/60 hover:text-brand-grape"
          )}
        >
          {emoji ? (
            <span aria-hidden>{emoji}</span>
          ) : (
            <SmilePlus className="size-5" aria-hidden />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="w-auto overflow-hidden p-0"
      >
        <Suspense
          fallback={
            <div className="grid h-[340px] w-[300px] place-items-center text-sm text-muted-foreground">
              Loading emojis…
            </div>
          }
        >
          <EmojiPickerPopover
            onPick={({ emoji: picked }) => {
              onChange(picked);
              setOpen(false);
            }}
          />
        </Suspense>
        {emoji && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
            className="w-full border-t border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Remove the emoji
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
