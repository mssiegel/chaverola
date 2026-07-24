import { useLayoutEffect, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { SendHorizontal, Smile } from "lucide-react";

import { CHAT_MESSAGE_MAX_CHARS } from "@chaverola/shared";

import {
  LazyEmojiPicker,
  prefetchEmojiPicker,
} from "@/components/chat/LazyEmojiPicker";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { charCount, clampChars } from "@/lib/text";
import { cn } from "@/lib/utils";

/** The shared wire cap — the server's chat:send guard reads the same
 *  constant, so the composer can't accept what the server rejects. */
const MAX_CHARS = CHAT_MESSAGE_MAX_CHARS;
const COUNTER_VISIBLE_AT = 60;

/** Phone-vs-desktop, drawn where `max-sm` draws it and read at tap time so a
 *  rotation is free. Same line and reading style as JoinGateCard. */
const isPhoneWidth = () => !window.matchMedia("(min-width: 640px)").matches;

interface MessageComposerProps {
  onSend: (text: string) => void;
  /** Fired on input that leaves a non-empty draft (typed or emoji-picked)
   *  — clearing a draft isn't typing. Callers own any throttling. */
  onTyping?: () => void;
  /** Used to build a playful placeholder, e.g. "Talk as Cleopatra 👑…". */
  selfCharacterLabel?: string;
  /**
   * The teacher paused the class: typing, sending, and the emoji picker all
   * lock, and the placeholder says why. The draft text is kept — it comes
   * back untouched on resume.
   */
  disabled?: boolean;
  /**
   * What the locked field says while `disabled`. Defaults to the pause
   * copy, the only locked state a room has today.
   */
  disabledPlaceholder?: string;
  /**
   * Sending lets go of the field instead of holding it, closing the keyboard.
   * The demo passes it: on a phone the steering panel below the composer is
   * hidden while this field has focus, and send is the natural moment to give
   * it back (see DECISIONS.md → "While a student types on a phone, the
   * world's chrome gets out of the way"). Live rooms don't — nothing is
   * hidden below them, so the keyboard stays for the next message.
   */
  releaseKeyboardOnSend?: boolean;
}

/**
 * The student's message input. Single row with the send button inside on the
 * right; when the text wraps to a second line the field grows and the buttons
 * settle to the bottom (same button size). Hard-blocks at 75 characters and
 * shows a counter only past 60. Emoji-only picker — no stickers/GIFs.
 *
 * The emoji button is a desktop affordance only: it is hidden on touch devices
 * (`pointer-coarse:hidden`), whose on-screen keyboard already carries a native
 * emoji picker one tap away, which is the redundancy this removes (see
 * DECISIONS.md → "On a phone, the student's message box has no emoji button").
 */
export function MessageComposer({
  onSend,
  onTyping,
  selfCharacterLabel,
  disabled = false,
  disabledPlaceholder = "Paused. Hang tight…",
  releaseKeyboardOnSend = false,
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const count = charCount(value);
  const showCounter = count > COUNTER_VISIBLE_AT;
  const atLimit = count >= MAX_CHARS;

  // Auto-grow up to two lines, then scroll internally. Layout, not passive:
  // after an insert the field would otherwise paint one frame at its old
  // height, which moves the emoji button the tap just landed on.
  useLayoutEffect(() => {
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
    const next = clampChars(event.target.value, MAX_CHARS);
    setValue(next);
    // Non-empty only — clearing a draft isn't typing. A disabled textarea
    // fires no change events, so pause-suppression comes free.
    if (next.length > 0) onTyping?.();
  };

  const insertEmoji = ({ emoji }: EmojiClickData) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const candidate = value.slice(0, start) + emoji + value.slice(end);
    if (charCount(candidate) > MAX_CHARS) return; // no room; ignore
    setValue(candidate);
    onTyping?.(); // emoji are first-class input here
    const caret = start + emoji.length;
    // Return focus to the field and drop the caret after the inserted emoji.
    // Without it, focus is stranded on the emoji button and the picker's key
    // handler redirects the next keystroke into its own search box.
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
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
    // Only phones hand the keyboard back: `max-sm` IS `not (min-width:
    // 640px)`, so this is the same line the chrome-collapse rules draw, read
    // the way JoinGateCard already reads it. At send time, so rotating works.
    const release = releaseKeyboardOnSend && isPhoneWidth();
    requestAnimationFrame(() =>
      release ? textareaRef.current?.blur() : textareaRef.current?.focus()
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    // shrink-0 for the same reason the header carries it: the feed is
    // `h-0 flex-auto`, so it absorbs none of an overflow and the composer
    // would be the thing that gets crushed.
    <div className="shrink-0 border-t border-border bg-card/70">
      <div className="px-2 py-2 sm:px-4 sm:py-2.5">
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
                The three prevented Radix defaults keep the picker's focus
                behavior: opening must not move focus into the search box,
                inserting (which refocuses the textarea) must not count as
                focus-outside and dismiss the picker mid-multi-insert, and
                closing must not yank focus back onto the smile button. */}
            <Popover
              open={pickerOpen && !disabled}
              onOpenChange={setPickerOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Add emoji"
                  disabled={disabled}
                  // Blink focuses a button on mousedown, before any handler —
                  // preventing it keeps the caret in the textarea so an
                  // inserted emoji lands where the student left off.
                  onMouseDown={(event) => event.preventDefault()}
                  className={cn(
                    // pointer-coarse:hidden — on a touch device the on-screen
                    // keyboard has its own emoji picker, so a second one here
                    // is redundant. A desktop's fine pointer (no native emoji
                    // key) keeps it.
                    "grid size-9 shrink-0 place-items-center self-end rounded-full transition-colors pointer-coarse:hidden hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
                    pickerOpen && !disabled
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <Smile className="size-5" />
                </button>
              </PopoverTrigger>
              {/* Radix has published --radix-popper-available-height all along
                  and nothing here ever read it, which is why the picker used to
                  overflow a keyboard-shrunk viewport with no way to scroll. A
                  definite height also gives the picker's own height="100%"
                  something to resolve against. */}
              <PopoverContent
                side="top"
                align="start"
                sideOffset={8}
                collisionPadding={8}
                className="h-[min(21rem,var(--radix-popper-available-height))] w-[min(20rem,calc(100vw-2rem))] overflow-hidden p-0"
                onOpenAutoFocus={(event) => event.preventDefault()}
                onFocusOutside={(event) => event.preventDefault()}
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                <LazyEmojiPicker variant="box" onPick={insertEmoji} />
              </PopoverContent>
            </Popover>

            <textarea
              ref={textareaRef}
              rows={1}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              // Warm the picker's chunk while the student is still typing, so
              // the first tap on the smile button opens a populated grid.
              onFocus={prefetchEmojiPicker}
              disabled={disabled}
              placeholder={
                disabled
                  ? disabledPlaceholder
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
    </div>
  );
}
