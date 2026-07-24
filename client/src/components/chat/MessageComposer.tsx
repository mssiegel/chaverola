import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { Keyboard, SendHorizontal, Smile } from "lucide-react";

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
  /**
   * Where emoji picking happens on a phone. `"dock"` is the strip that takes
   * the on-screen keyboard's place, and it is only correct where the chat
   * fills the screen — the feed has to have height to give up. `"popover"`
   * (the default) keeps the floating picker at every width, which is what the
   * homepage hero needs: its card is a hard 380px, and a dock would leave it
   * no feed at all. Desktop always gets the popover.
   */
  emojiPanel?: "popover" | "dock";
}

/**
 * The student's message input. Single row with the send button inside on the
 * right; when the text wraps to a second line the field grows and the buttons
 * settle to the bottom (same button size). Hard-blocks at 75 characters and
 * shows a counter only past 60. Emoji-only picker — no stickers/GIFs.
 *
 * On a phone with `emojiPanel="dock"`, the smile button swaps the keyboard for
 * an emoji strip in the keyboard's own rectangle and turns into a keyboard
 * button (see DECISIONS.md → "On a phone the emoji panel takes the keyboard's
 * place"). The ordering in the handlers below is the whole feature — read the
 * comments before rearranging any of it.
 */
export function MessageComposer({
  onSend,
  onTyping,
  selfCharacterLabel,
  disabled = false,
  disabledPlaceholder = "Paused. Hang tight…",
  releaseKeyboardOnSend = false,
  emojiPanel = "popover",
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dockOpen, setDockOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Where the caret was when the field last had it. The dock deliberately
   *  blurs the field, and a blurred textarea's DOM selection collapses to the
   *  end the moment its controlled value changes — so while the dock is open
   *  this is the only trustworthy caret. */
  const caretRef = useRef<number | null>(null);

  // One expression drives both the panel and the attribute the world's chrome
  // keys off, so they can never disagree. No reset effect when `disabled`
  // flips: `react-hooks/set-state-in-effect` is an error here, and the panel
  // simply coming back when the pause lifts is fine.
  const dockShown = dockOpen && !disabled;

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

  // The dock is not a Radix DismissableLayer, so it brings no Escape and no
  // outside-tap of its own. Without these the only ways out are the keyboard
  // button and the field itself — and on the demo surface the steering panel
  // stays hidden behind a dock the student can't find the exit to.
  useEffect(() => {
    if (!dockShown) return;
    const closeOnOutside = (event: PointerEvent) => {
      const root = rootRef.current;
      if (root && event.target instanceof Node && root.contains(event.target)) {
        return;
      }
      setDockOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDockOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [dockShown]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = clampChars(event.target.value, MAX_CHARS);
    setValue(next);
    // Non-empty only — clearing a draft isn't typing. A disabled textarea
    // fires no change events, so pause-suppression comes free.
    if (next.length > 0) onTyping?.();
  };

  const insertEmoji = ({ emoji }: EmojiClickData) => {
    const el = textareaRef.current;
    const start = dockOpen
      ? (caretRef.current ?? value.length)
      : (el?.selectionStart ?? value.length);
    const end = dockOpen ? start : (el?.selectionEnd ?? value.length);
    const candidate = value.slice(0, start) + emoji + value.slice(end);
    if (charCount(candidate) > MAX_CHARS) return; // no room; ignore
    setValue(candidate);
    onTyping?.(); // emoji are first-class input here
    const caret = start + emoji.length;
    caretRef.current = caret;
    // With the dock open the field is deliberately blurred and the keyboard is
    // gone; refocusing here would summon it straight back over the panel. That
    // rAF refocus is also the flicker the founder saw — it un-fired and
    // re-fired the chrome-collapse rules twice per tap. The dock's wrapper
    // cancels mousedown so focus never leaves in the first place, and the
    // keyboard button restores the caret on the way back.
    if (dockOpen) return;
    requestAnimationFrame(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.focus();
      node.setSelectionRange(caret, caret);
    });
  };

  /**
   * The smile button. On the dock path it owns the whole interaction and
   * suppresses Radix's composed `onOpenToggle` with preventDefault; on every
   * other path it does nothing and Radix's trigger behaves exactly as before.
   */
  const toggleEmojiPicker = (event: React.MouseEvent<HTMLButtonElement>) => {
    const el = textareaRef.current;

    if (dockOpen) {
      event.preventDefault();
      // Synchronous, first thing, still inside the trusted gesture: iOS raises
      // the keyboard only for a focus() the user's tap is still paying for. A
      // rAF or a setTimeout here is a different task and the keys never come.
      el?.focus();
      const caret = caretRef.current;
      if (el && caret !== null) el.setSelectionRange(caret, caret);
      setDockOpen(false);
      return;
    }
    if (pickerOpen) return; // desktop popover: let Radix close it
    if (emojiPanel !== "dock" || !isPhoneWidth()) return; // …and open it

    event.preventDefault();
    if (el) caretRef.current = el.selectionStart;
    // State first, blur second. `data-emoji-panel` rides this render, so the
    // chrome stays collapsed through the swap; blurring before it would leave
    // a frame where neither signal matches and the whole card jumps 72px.
    setDockOpen(true);
    el?.blur();
  };

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    caretRef.current = 0;
    setPickerOpen(false);
    // The dock outlives a send — that's messaging-app behavior, and there is
    // no keyboard to hand back while the dock is standing in for one.
    if (dockOpen) return;
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
    <div
      ref={rootRef}
      // The second signal the world's phone chrome stands down for, beside
      // `textarea:focus` (see StudentWorldLayout): the dock is open with the
      // field deliberately blurred, so focus alone can no longer describe
      // "the student is composing". It is derived from state set
      // synchronously in the tap handler on purpose — landing a commit later
      // would paint one frame of un-collapsed chrome on every open.
      data-emoji-panel={dockShown || undefined}
      className="shrink-0 border-t border-border bg-card/70"
    >
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
                The three prevented Radix defaults keep the popover path's focus
                behavior: opening must not move focus into the picker's search
                box, inserting (which refocuses the textarea) must not count as
                focus-outside and dismiss the picker mid-multi-insert, and
                closing must not yank focus back onto the smile button. The dock
                path needs none of them — it is not a portalled layer. */}
            <Popover
              open={pickerOpen && !disabled}
              onOpenChange={setPickerOpen}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={dockShown ? "Show the keyboard" : "Add emoji"}
                  disabled={disabled}
                  // Blink focuses buttons on mousedown, before any handler
                  // runs — and that focus hop is what blurred the field and
                  // started the keyboard retracting at OPEN time. onMouseDown
                  // rather than onPointerDown: cancelling pointerdown in
                  // Chrome can also cancel panning, which would kill scrolling
                  // inside the emoji grid.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={toggleEmojiPicker}
                  className={cn(
                    "grid size-9 shrink-0 place-items-center self-end rounded-full transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground",
                    (pickerOpen || dockShown) && !disabled
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {dockShown ? (
                    <Keyboard className="size-5" />
                  ) : (
                    <Smile className="size-5" />
                  )}
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
              // This tap is about to raise the keyboard, so the dock has to go
              // in the same gesture — otherwise the card loses the keyboard's
              // height while a same-height panel is still mounted and the feed
              // gets crushed.
              onPointerDown={() => setDockOpen(false)}
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

      {dockShown && (
        // The strip that stands in for the keyboard. A plain block inside the
        // chat card, never fixed or portalled: the Conversation feed is the
        // frame's only grower, so a shrink-0 sibling makes the feed give up
        // exactly this height and the page never grows.
        //
        // The height is a constant, not a measurement of the real keyboard.
        // Android keyboards cluster at 42-46% of the viewport, so the composer
        // settles within a few dozen pixels during the keys' own slide-out.
        // Tracking visualViewport deltas would make it exact and is the known
        // follow-up if that settle ever reads as a jump.
        //
        // sm:hidden because rotating a phone to landscape crosses 640px, where
        // the card becomes a hard sm:h-[min(70dvh,620px)] and a mounted dock
        // would be clipped over a zero-height feed.
        <div
          className="h-[clamp(240px,42dvh,336px)] shrink-0 overflow-hidden border-t border-border bg-card pb-[env(safe-area-inset-bottom)] sm:hidden"
          // Every emoji cell is a real <button> and the browser focuses it on
          // mousedown; the picker registers its own listeners `{ passive: true
          // }`, so it cannot stop that from the inside. Cancelling here keeps
          // focus exactly where the composer left it — the delegated click
          // still fires, so picking works.
          onMouseDown={(event) => event.preventDefault()}
        >
          <LazyEmojiPicker variant="dock" onPick={insertEmoji} />
        </div>
      )}
    </div>
  );
}
