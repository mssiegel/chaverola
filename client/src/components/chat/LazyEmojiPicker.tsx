import { lazy, Suspense } from "react";
import type { EmojiClickData } from "emoji-picker-react";

import type { EmojiPickerVariant } from "./EmojiPickerBody";

// Code-split the (heavy) emoji picker — only loaded when opened. Kept in its
// own module (not EmojiPickerBody.tsx) so the split point survives.
const EmojiPickerBody = lazy(() => import("./EmojiPickerBody"));

/**
 * Start downloading the picker before anyone asks for it — the composer calls
 * this when the field takes focus, so the first tap on the smile button opens
 * a populated grid instead of an empty box. Same specifier as the `lazy()`
 * above, so it resolves to the same chunk and the same promise.
 */
export function prefetchEmojiPicker(): void {
  void import("./EmojiPickerBody");
}

interface LazyEmojiPickerProps {
  variant: EmojiPickerVariant;
  onPick: (data: EmojiClickData) => void;
  autoFocusSearch?: boolean;
}

/**
 * The lazy picker plus its loading placeholder. Deliberately size-agnostic:
 * every caller gives the picker a sized container and the picker fills it, so
 * a fixed fallback would flash a small grey island inside a full-width dock.
 * Policy-free — whether picking closes the surface is the caller's call.
 */
export function LazyEmojiPicker({
  variant,
  onPick,
  autoFocusSearch,
}: LazyEmojiPickerProps) {
  return (
    <Suspense
      fallback={
        <div className="grid size-full place-items-center text-sm text-muted-foreground">
          Loading emojis…
        </div>
      }
    >
      <EmojiPickerBody
        variant={variant}
        onPick={onPick}
        autoFocusSearch={autoFocusSearch}
      />
    </Suspense>
  );
}
