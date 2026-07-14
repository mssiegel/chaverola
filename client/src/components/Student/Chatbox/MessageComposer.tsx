import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { SendHorizontal, Smile } from "lucide-react";

import { cn } from "@/lib/utils";

// Code-split the (heavy) emoji picker — only loaded when opened.
const EmojiPickerPopover = lazy(
  () => import("@/components/chat/EmojiPickerPopover")
);

const MAX_CHARS = 75;
const COUNTER_VISIBLE_AT = 60;

/** Count by code points so multi-unit emoji count as one character. */
const charCount = (text: string) => Array.from(text).length;

interface MessageComposerProps {
  onSend: (text: string) => void;
  /** Used to build a playful placeholder, e.g. "Talk as Cleopatra 👑…". */
  selfCharacterLabel?: string;
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
}: MessageComposerProps) {
  const [value, setValue] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerWrapRef = useRef<HTMLDivElement>(null);

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

  // Close the emoji picker on outside click / Escape.
  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!pickerWrapRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [pickerOpen]);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = event.target.value;
    const points = Array.from(raw);
    setValue(
      points.length > MAX_CHARS ? points.slice(0, MAX_CHARS).join("") : raw
    );
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
    if (!trimmed) return;
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

        <div className="flex items-end gap-1.5 rounded-2xl border border-input bg-card px-1.5 py-1.5 shadow-sm transition-colors focus-within:border-brand-grape focus-within:ring-2 focus-within:ring-brand-grape/20">
          <div className="relative" ref={pickerWrapRef}>
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-label="Add emoji"
              aria-expanded={pickerOpen}
              className={cn(
                "grid size-9 shrink-0 place-items-center self-end rounded-full transition-colors hover:bg-accent hover:text-foreground",
                pickerOpen
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Smile className="size-5" />
            </button>

            {pickerOpen && (
              <div className="absolute bottom-11 left-0 z-30 origin-bottom-left animate-in zoom-in-95 fade-in">
                <Suspense
                  fallback={
                    <div className="grid h-[340px] w-[300px] place-items-center rounded-lg border border-border bg-card text-sm text-muted-foreground shadow-lg">
                      Loading emojis…
                    </div>
                  }
                >
                  <EmojiPickerPopover onPick={insertEmoji} />
                </Suspense>
              </div>
            )}
          </div>

          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={
              selfCharacterLabel
                ? `Talk as ${selfCharacterLabel}…`
                : "Type a message…"
            }
            className="max-h-16 flex-1 resize-none border-0 bg-transparent py-1.5 text-[15px] leading-6 text-foreground outline-none placeholder:text-muted-foreground"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim()}
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
