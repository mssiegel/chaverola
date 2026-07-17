import { useEffect, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { SendHorizontal, Smile } from "lucide-react";

import { LazyEmojiPicker } from "@/components/chat/LazyEmojiPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { charCount, clampChars } from "@/lib/text";
import { cn } from "@/lib/utils";

const MAX_CHARS = 75;
const COUNTER_VISIBLE_AT = 60;

interface MessageComposerProps {
  onSend: (text: string) => void;
  /** Used to build a playful placeholder, e.g. "Talk as Cleopatra 👑…". */
  selfCharacterLabel?: string;
  /**
   * The teacher paused the class: typing, sending, and the emoji picker all
   * lock, and the placeholder says why. The draft text is kept — it comes
   * back untouched on resume.
   */
  disabled?: boolean;
}

/**
 * The student's message input. Single row with the send button inside on the
 * right; when the text wraps to a second line the field grows and the buttons
 * settle to the bottom (same button size). Hard-blocks at 75 characters and
 * shows a counter only past 60. Emoji-only picker — no stickers/GIFs.
 */
export function MessageComposer({
  onSend,
  selfCharacterLabel,
  disabled = false,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const count = charCount(value);
  const showCounter = count > COUNTER_VISIBLE_AT;
  const atLimit = count >= MAX_CHARS;

  // Auto-grow up to two lines, then scroll internally.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const style = getComputedStyle(el);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const padding =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const maxHeight = lineHeight * 2 + padding + 2;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(clampChars(event.target.value, MAX_CHARS));
  };

  const insertEmoji = ({ emoji }: EmojiClickData) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const candidate = value.slice(0, start) + emoji + value.slice(end);
    if (charCount(candidate) > MAX_CHARS) return; // no room; ignore
    setValue(candidate);
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      const caret = start + emoji.length;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    setPickerOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-border bg-card/70 px-3 py-2.5 sm:px-4">
      <div className="relative">
        {showCounter && (
          <div
            className={cn(
              "absolute -top-5 right-1 text-xs font-semibold tabular-nums transition-colors",
              atLimit ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {count}/{MAX_CHARS}
          </div>
        )}

        <div
          className={cn(
            "flex items-end gap-1.5 rounded-2xl border border-input bg-card px-1.5 py-1.5 shadow-sm transition-colors",
            disabled
              ? "opacity-60"
              : "focus-within:border-brand-grape focus-within:ring-2 focus-within:ring-brand-grape/20"
          )}
        >
          {/* Controlled so handleSend can close the picker programmatically.
              The three prevented Radix defaults keep today's focus behavior:
              opening must not move focus into the picker's search box,
              inserting (which refocuses the textarea) must not count as
              focus-outside and dismiss the picker mid-multi-insert, and
              closing must not yank focus back onto the smile button. */}
          <Popover open={pickerOpen && !disabled} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Add emoji"
                disabled={disabled}
                className={cn(
                  "grid size-9 shrink-0 place-items-center self-end rounded-full transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
                  pickerOpen && !disabled
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Smile className="size-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="start"
              sideOffset={8}
              collisionPadding={8}
              className="w-auto overflow-hidden p-0"
              onOpenAutoFocus={(event) => event.preventDefault()}
              onFocusOutside={(event) => event.preventDefault()}
              onCloseAutoFocus={(event) => event.preventDefault()}
            >
              <LazyEmojiPicker onPick={insertEmoji} />
            </PopoverContent>
          </Popover>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={
              disabled
                ? "Paused. Hang tight…"
                : selfCharacterLabel
                  ? `Talk as ${selfCharacterLabel}…`
                  : "Type a message…"
            }
            className="max-h-16 flex-1 resize-none border-0 bg-transparent py-1.5 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            aria-label="Send message"
            className="grid size-10 shrink-0 place-items-center self-end rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-brand-grape-strong active:scale-95 disabled:opacity-40 disabled:hover:bg-primary"
          >
            <SendHorizontal className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
