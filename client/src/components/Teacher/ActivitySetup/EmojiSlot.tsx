import { useRef, useState } from "react";
import { SmilePlus } from "lucide-react";

import { LazyEmojiPicker } from "@/components/chat/LazyEmojiPicker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
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
 *
 * On a phone the picker is a bottom sheet, not a popover (see DECISIONS.md →
 * "On a phone, picking a character's emoji is a bottom sheet"): a 300px
 * popover anchored to a size-12 avatar flips up over the section header, hangs
 * past the card's edge, and gets clipped once the row list is long. The sheet
 * is full-width, docks to the bottom, and can't do any of that. Desktop keeps
 * the popover, where an anchored picker is exactly right. The width is read at
 * tap time — the same line the rest of the app draws `sm` at — so a rotation
 * is free and only one container is ever mounted.
 */
export function EmojiSlot({ emoji, characterName, onChange }: EmojiSlotProps) {
  const [open, setOpen] = useState(false);
  const [asSheet, setAsSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const who = characterName || "this character";

  const openPicker = () => {
    setAsSheet(!window.matchMedia("(min-width: 640px)").matches);
    setOpen(true);
  };

  const trigger = (
    <button
      type="button"
      onClick={openPicker}
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
  );

  const pick = (picked: string) => {
    onChange(picked);
    setOpen(false);
  };

  const removeButton = emoji ? (
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
  ) : null;

  return (
    <>
      {/* Anchor, not Trigger: the button opens the picker itself (openPicker
          decides sheet vs popover), so the popover must not also toggle on
          click. Gated on !asSheet so a phone tap opens the sheet instead. */}
      <Popover
        open={open && !asSheet}
        onOpenChange={(next) => !next && setOpen(false)}
      >
        <PopoverAnchor asChild>{trigger}</PopoverAnchor>
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
              // No textarea to protect and no phone keyboard to keep away
              // (phones get the sheet), so landing in the search box is the
              // fastest path to a specific emoji.
              autoFocusSearch
              onPick={({ emoji: picked }) => pick(picked)}
            />
          </div>
          {removeButton}
        </PopoverContent>
      </Popover>

      <Dialog
        open={open && asSheet}
        onOpenChange={(next) => !next && setOpen(false)}
      >
        <DialogContent
          ref={sheetRef}
          tabIndex={-1}
          variant="bottom-sheet"
          className="flex max-h-[80dvh] flex-col gap-0"
          // Radix focuses the first tabbable, which would be the picker's
          // search box — a keyboard opening over a form nobody asked to type
          // in. Park focus on the sheet so the trap and Escape still have an
          // anchor. (autoFocusSearch is left off below for the same reason;
          // both are needed, since React applies the input's own autoFocus at
          // commitMount, after this event.)
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            sheetRef.current?.focus();
          }}
        >
          <DialogHeader className="px-4 pt-4 pb-2 text-left">
            <DialogTitle className="text-base">
              {emoji ? `Change ${who}'s emoji` : `Pick an emoji for ${who}`}
            </DialogTitle>
          </DialogHeader>
          <div className="h-[min(22rem,45dvh)]">
            <LazyEmojiPicker
              variant="box"
              onPick={({ emoji: picked }) => pick(picked)}
            />
          </div>
          {removeButton}
        </DialogContent>
      </Dialog>
    </>
  );
}
