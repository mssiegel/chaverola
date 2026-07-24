import { useState } from "react";
import { SmilePlus } from "lucide-react";

import { LazyEmojiPicker } from "@/components/chat/LazyEmojiPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

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
      {/* A definite height, capped by the space Radix says it actually has —
          the picker used to pin itself to 340px and overflow whatever was
          left. Remove is a pinned footer rather than a tail, so the popover
          no longer changes height (and therefore which side it flips to)
          depending on whether the row already has an emoji. */}
      <PopoverContent
        align="start"
        collisionPadding={8}
        className="flex h-[min(23rem,var(--radix-popper-available-height))] w-[min(20rem,calc(100vw-2rem))] flex-col overflow-hidden p-0"
      >
        <div className="min-h-0 flex-1">
          <LazyEmojiPicker
            variant="box"
            // No textarea to protect here and no phone keyboard to keep away
            // (phones get the sheet), so landing in the search box is the
            // fastest path to a specific emoji.
            autoFocusSearch
            onPick={({ emoji: picked }) => {
              onChange(picked);
              setOpen(false);
            }}
          />
        </div>
        {emoji && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setOpen(false);
            }}
            className="w-full shrink-0 border-t border-border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            Remove the emoji
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
