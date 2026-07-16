import { Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { LiveDot } from "@/components/ui/live-dot";
import {
  MAX_CHARACTERS,
  MIN_CHARACTERS,
  NAME_COUNTER_FROM,
  NAME_MAX_CHARS,
  type CharacterDraft,
  type SetupField,
} from "@/lib/activitySetup";
import { charCount, clampChars } from "@/lib/text";

import { EmojiSlot } from "./EmojiSlot";
import { FieldError, LimitCounter } from "./FieldFeedback";

/** A character row in form state: a draft plus a stable key for React. */
export interface CharacterRowState extends CharacterDraft {
  id: string;
}

/** Placeholder ideas, one per row — same cast as the Rome demo activity. */
const ROW_PLACEHOLDERS = [
  "Caesar's ghost",
  "Brutus",
  "Cleopatra",
  "Marc Antony",
];

interface CharacterRowsFieldProps {
  rows: CharacterRowState[];
  onUpdate: (id: string, changes: Partial<CharacterDraft>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  problemFor: (field: SetupField) => string | undefined;
  registerField: (field: SetupField) => (el: HTMLElement | null) => void;
  /**
   * Live host page only: why a removable row can't be removed right now
   * (e.g. its character is in a live chat). A returned string replaces the
   * remove button with the live-chat dot and shows as a short hint under
   * the row; null/undefined keeps the row removable. Only called for
   * rows 3–4.
   */
  removeGuard?: (row: CharacterRowState) => string | null | undefined;
}

/**
 * The 2–4 character rows. Each reads like a cast-list entry: the round emoji
 * avatar leads (tap it to pick; it's optional), then the name input
 * (hard-capped at 30 characters — names prefix every chat line). The first
 * two rows are permanent (an activity needs two characters anyway); rows 3–4
 * get a remove button, no confirmation — retyping a name is cheap.
 */
export function CharacterRowsField({
  rows,
  onUpdate,
  onAdd,
  onRemove,
  problemFor,
  registerField,
  removeGuard,
}: CharacterRowsFieldProps) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, index) => {
        const error = problemFor(`character-${index}`);
        const count = charCount(row.name);
        const removable = index >= MIN_CHARACTERS;
        const guardMessage = removable ? removeGuard?.(row) : undefined;
        return (
          <div key={row.id} className="flex items-start gap-3">
            <EmojiSlot
              emoji={row.emoji}
              characterName={row.name.trim()}
              onChange={(emoji) => onUpdate(row.id, { emoji })}
            />

            <div className="min-w-0 flex-1">
              <Input
                ref={registerField(`character-${index}`)}
                value={row.name}
                onChange={(event) =>
                  onUpdate(row.id, {
                    name: clampChars(event.target.value, NAME_MAX_CHARS),
                  })
                }
                placeholder={ROW_PLACEHOLDERS[index] ?? "Another character"}
                aria-label={`Character ${index + 1} name`}
                aria-invalid={error ? true : undefined}
                className="h-12"
              />
              {(error || guardMessage || count >= NAME_COUNTER_FROM) && (
                <div className="mt-1.5 flex items-baseline justify-between gap-3">
                  {error ? (
                    <FieldError message={error} />
                  ) : guardMessage ? (
                    <p className="text-xs text-muted-foreground">
                      {guardMessage}
                    </p>
                  ) : (
                    <span aria-hidden />
                  )}
                  <LimitCounter
                    count={count}
                    max={NAME_MAX_CHARS}
                    showFrom={NAME_COUNTER_FROM}
                  />
                </div>
              )}
            </div>

            {guardMessage ? (
              // The chat cards' pulsing "Live" dot stands in for the remove
              // button — the row is locked by the same running chat the dot
              // marks below. The named hint under the input explains.
              <span
                className="mt-2 grid size-8 shrink-0 place-items-center"
                aria-hidden
              >
                <LiveDot />
              </span>
            ) : removable ? (
              <button
                type="button"
                onClick={() => onRemove(row.id)}
                aria-label={`Remove character ${index + 1}`}
                className="mt-2 grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            ) : (
              // Spacer where rows 3–4 show their remove button, so every
              // name input ends on the same line.
              <div className="w-8 shrink-0" aria-hidden />
            )}
          </div>
        );
      })}

      {rows.length < MAX_CHARACTERS && (
        <button
          type="button"
          onClick={onAdd}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm font-semibold text-muted-foreground transition-colors hover:border-brand-grape/60 hover:bg-brand-grape-soft/40 hover:text-brand-grape"
        >
          <Plus className="size-4" aria-hidden />
          Add a character
        </button>
      )}
    </div>
  );
}
