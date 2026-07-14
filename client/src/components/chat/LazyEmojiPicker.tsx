import { lazy, Suspense } from "react";
import type { EmojiClickData } from "emoji-picker-react";

// Code-split the (heavy) emoji picker — only loaded when opened. Kept in its
// own module (not EmojiPickerPopover.tsx) so the split point survives.
const EmojiPickerPopover = lazy(() => import("./EmojiPickerPopover"));

interface LazyEmojiPickerProps {
  onPick: (data: EmojiClickData) => void;
}

/**
 * The lazy picker plus its loading placeholder, sized to match the picker
 * itself (EmojiPickerPopover pins height 340 / width 300). Render inside a
 * PopoverContent — the popover supplies the chrome. Policy-free: whether
 * picking closes the popover is the caller's call.
 */
export function LazyEmojiPicker({ onPick }: LazyEmojiPickerProps) {
  return (
    <Suspense
      fallback={
        <div className="grid h-[340px] w-[300px] place-items-center text-sm text-muted-foreground">
          Loading emojis…
        </div>
      }
    >
      <EmojiPickerPopover onPick={onPick} />
    </Suspense>
  );
}
