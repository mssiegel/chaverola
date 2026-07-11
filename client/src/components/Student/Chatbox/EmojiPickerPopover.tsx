import EmojiPicker, {
  EmojiStyle,
  Theme,
  type EmojiClickData,
} from "emoji-picker-react";

interface EmojiPickerPopoverProps {
  onPick: (data: EmojiClickData) => void;
}

/**
 * Emoji-only picker (no stickers, no GIFs — teachers must be able to read chats
 * at a glance). Kept in its own module so `emoji-picker-react` is code-split and
 * only downloaded when the student actually opens the picker.
 */
export default function EmojiPickerPopover({
  onPick,
}: EmojiPickerPopoverProps) {
  return (
    <EmojiPicker
      onEmojiClick={onPick}
      emojiStyle={EmojiStyle.NATIVE}
      theme={Theme.LIGHT}
      lazyLoadEmojis
      skinTonesDisabled
      previewConfig={{ showPreview: false }}
      height={340}
      width={300}
    />
  );
}
