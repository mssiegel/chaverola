import { useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
   * The teacher paused the class: sending and the emoji picker lock, typing
   * signals stop, the box dims, and the placeholder says why. The field
   * itself stays live — no `disabled`, no `readOnly` — because a focused
   * textarea that goes disabled is blurred by the browser, which closes the
   * phone keyboard and collapses the world's chrome back open under the
   * student's thumb (see DECISIONS.md → "A pause locks the composer without
   * stealing focus or the keyboard"). Editing during a pause is drafting,
   * which is fine; only sending is refused.
   */
  locked?: boolean;
  /**
   * What the locked field says when it's empty. Defaults to the pause copy,
   * the only locked state a room has today — see the `t` fallback below
   * rather than a default parameter, since the copy comes from the catalog.
   */
  lockedPlaceholder?: string;
  /**
   * Sending lets go of the field instead of holding it, closing the keyboard.
   * The demo passes it: on a phone the steering panel below the composer is
   * hidden while this field has focus, and send is the natural moment to give
   * it back (see DECISIONS.md → "While a student types on a phone, the
   * world's chrome gets out of the way"). Live rooms don't — nothing is
   * hidden below them, so the keyboard stays for the next message.
   */
  releaseKeyboardOnSend?: boolean;
  /**
   * Seconds until messages held by the send window go out (null when
   * nothing is waiting). Typing and sending stay open the whole time — the
   * held messages are already in the feed and will send themselves; this
   * only explains the delay so the wait doesn't read as a bug.
   */
  holdSeconds?: number | null;
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
  locked = false,
  lockedPlaceholder,
  releaseKeyboardOnSend = false,
  holdSeconds = null,
}: MessageComposerProps) {
  const { t } = useTranslation("chat");
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
    // Non-empty only — clearing a draft isn't typing. The `!locked` is
    // explicit because the paused field stays enabled and keeps firing change
    // events; the server dropping paused heartbeats is the belt under it.
    if (next.length > 0 && !locked) onTyping?.();
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
    // The only thing standing between a pause and a sent message: the field
    // is live, so Enter and the send tap both arrive and both stop here.
    if (!trimmed || locked) return;
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
        {holdSeconds !== null && (
          <div className="mb-1.5 px-1 text-xs font-medium text-muted-foreground">
            {t("composer.hold", { seconds: holdSeconds })}
          </div>
        )}
        <div className="relative">
          {showCounter && (
            <div
              // dir="ltr": "62/75" is two digit runs around a neutral slash,
              // which an RTL line would otherwise render as "75/62".
              dir="ltr"
              className={cn(
                "absolute end-1 -top-5 text-xs font-semibold tabular-nums transition-colors",
                atLimit ? "text-destructive" : "text-muted-foreground"
              )}
            >
              {count}/{MAX_CHARS}
            </div>
          )}

          <div
            className={cn(
              "flex items-end gap-1.5 rounded-2xl border border-input bg-card px-1.5 py-1.5 shadow-sm transition-colors",
              locked
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
            <Popover open={pickerOpen && !locked} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={t("composer.addEmoji")}
                  // Safe as a real `disabled` where the textarea isn't: the
                  // caret lives in the field, not here (the mousedown below
                  // sees to that), so locking this button blurs nothing.
                  disabled={locked}
                  // Blink focuses a button on mousedown, before any handler —
                  // preventing it keeps the caret in the textarea so an
                  // inserted emoji lands where the student left off.
                  onMouseDown={(event) => event.preventDefault()}
                  className={cn(
                    // pointer-coarse:hidden — on a touch device the on-screen
                    // keyboard has its own emoji picker, so a second one here
                    // is redundant. A desktop's fine pointer (no native emoji
                    // key) keeps it.
                    "grid size-9 shrink-0 place-items-center self-end rounded-full transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground pointer-coarse:hidden",
                    pickerOpen && !locked
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
                <LazyEmojiPicker onPick={insertEmoji} />
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
              // No `disabled` and no `readOnly` while locked, deliberately —
              // both would blur a focused field. The placeholder only paints
              // on an empty box, so a draft stays visible and editable
              // through the pause for free.
              placeholder={
                locked
                  ? (lockedPlaceholder ?? t("composer.pausedPlaceholder"))
                  : selfCharacterLabel
                    ? t("composer.talkAs", { name: selfCharacterLabel })
                    : t("composer.placeholder")
              }
              // Keep phone input text at 16px so Safari needn't zoom on focus.
              className="max-h-16 flex-1 resize-none border-0 bg-transparent py-1.5 text-base leading-6 text-foreground outline-none placeholder:text-muted-foreground sm:text-[15px]"
            />

            <button
              type="button"
              onClick={handleSend}
              // A tap on a live button takes focus off the textarea, and a
              // locked one has nothing to hand it back — that blur closes the
              // keyboard as surely as disabling the field would. Same
              // preventDefault the emoji button uses, for the same reason.
              // Unlocked, handleSend's own refocus covers it.
              onMouseDown={(event) => {
                if (locked) event.preventDefault();
              }}
              // aria-disabled rather than disabled for the lock: it dims and
              // announces the same way without putting a disabled control
              // beside a field the pause is trying not to disturb. handleSend
              // is what actually refuses.
              disabled={!value.trim()}
              aria-disabled={locked}
              aria-label={t("composer.send")}
              className="grid size-10 shrink-0 place-items-center self-end rounded-full bg-primary text-primary-foreground shadow-sm transition-all hover:bg-brand-grape-strong active:scale-95 disabled:opacity-40 disabled:hover:bg-primary aria-disabled:opacity-40 aria-disabled:hover:bg-primary"
            >
              {/* flip-rtl: a paper plane flies the way the sentence runs. */}
              <SendHorizontal className="flip-rtl size-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
