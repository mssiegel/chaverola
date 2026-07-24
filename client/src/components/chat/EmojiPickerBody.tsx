import type { CSSProperties } from "react";
import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";

/** A self-contained box that owns its own chrome — the desktop popover and
 *  the teacher's bottom sheet. The only variant now that the phone dock is
 *  gone; kept as a named prop so both call sites read explicitly. */
export type EmojiPickerVariant = "box";

interface EmojiPickerBodyProps {
  variant: EmojiPickerVariant;
  onPick: (data: EmojiClickData) => void;
  /**
   * Let the search field take focus when the picker opens. Off by default,
   * and only ever safe where nothing else is holding focus and no phone
   * keyboard is being deliberately kept away — in practice, the teacher's
   * desktop popover. The library's own default is `true`, which is what put a
   * keyboard on top of the picker on every phone.
   */
  autoFocusSearch?: boolean;
}

/*
  The objects below are module constants on purpose. EmojiPicker is memoized
  behind a config comparison that checks `style` by REFERENCE, so an inline
  literal re-renders every visible emoji on every parent render — in the
  composer's case, on every keystroke. (React Compiler does the memoizing here;
  per AGENTS.md we never hand-write useMemo.)

  They go through `style` rather than className because the picker injects its
  stylesheet inline and UNLAYERED, while Tailwind's utilities live in @layer —
  so a Tailwind class loses to it whatever its specificity.
*/

/** Load-bearing for focus stability, not just for the 70px it saves: with a
 *  preview showing, the picker focuses emoji buttons on `mouseover`, which
 *  touch devices emulate. */
const NO_PREVIEW = { showPreview: false };

const BOX_STYLE = {
  // The container owns the chrome on every surface.
  border: "none",
  borderRadius: 0,
  // The picker root ships `transition: height 0.3s`, which turns any container
  // resize into a third of a second of animated relayout — and, inside the
  // chat card, into a burst of Conversation ResizeObserver scroll jumps.
  transition: "none",
  // The column count is measured on the full-width <ul>, but the emoji are
  // laid out in a grid carrying `margin: 0 10px` — so the picker can believe
  // it fits one more column than it does, underestimate the category's height,
  // and let the last row spill into the next category's label. Zeroing the
  // gutter makes the measured box and the layout box the same width.
  "--epr-category-padding": "0",
} as CSSProperties;

/**
 * Emoji-only picker (no stickers, no GIFs — teachers must be able to read
 * chats at a glance). Shared by the student composer's desktop popover and the
 * teacher's character-emoji sheet. Kept in its own module so
 * `emoji-picker-react` stays code-split: the chunk is ~300 KB raw / 74 KB
 * gzipped, almost all of it the emoji dataset.
 *
 * The container always supplies the box; the picker fills it. `height` and
 * `width` are constant strings deliberately — a *changing* height prop
 * re-merges the config, which mints a fresh `customEmojis: []` identity,
 * invalidates the data memo, and deep-clones 197 KB of emoji JSON on the main
 * thread.
 */
export default function EmojiPickerBody({
  onPick,
  autoFocusSearch = false,
}: EmojiPickerBodyProps) {
  return (
    <EmojiPicker
      onEmojiClick={onPick}
      emojiStyle={EmojiStyle.NATIVE}
      theme={Theme.LIGHT}
      skinTonesDisabled
      previewConfig={NO_PREVIEW}
      autoFocusSearch={autoFocusSearch}
      style={BOX_STYLE}
      height="100%"
      width="100%"
    />
  );
}
