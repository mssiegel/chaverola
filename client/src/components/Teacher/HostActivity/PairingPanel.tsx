import { Check, Repeat2, Sparkles, UsersRound, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatWaitShort } from "@/lib/time";
import { cn } from "@/lib/utils";

import { EmptyState } from "./EmptyState";
import type { WaitingStudent } from "./useHostActivityDemo";

export interface PairingPanelProps {
  waiting: WaitingStudent[];
  selectedIds: string[];
  onToggleSelect: (studentId: string) => void;
  /** min(4, characters on the roster) — how big a selection can get. */
  maxGroupSize: number;
  onStartChat: () => void;
  onPairEveryone: () => void;
  onRequestRemove: (student: WaitingStudent) => void;
  /** Selection-time rematch heads-up (never blocks anything). */
  rematchWarning: string | null;
  /** Pair-everyone's forced-repeat note, dismissible. */
  rematchNotice: string | null;
  onDismissRematchNotice: () => void;
  /** Pair-everyone's odd one out, highlighted as first in line. */
  leftoverStudentId: string | null;
  autoMatchOn: boolean;
  autoMatchSeconds: number;
}

/**
 * The waiting queue and everything the teacher does with it. Students render
 * in join order — new joiners append at the bottom, so the longest-waiting
 * sit on top and the list never reshuffles under the teacher's cursor.
 * Pairing is tap-to-select; characters are assigned randomly when the chat
 * starts (no assignment step). Each row's remove control is separate from
 * the select target so the two taps never collide. See DECISIONS.md.
 */
export function PairingPanel({
  waiting,
  selectedIds,
  onToggleSelect,
  maxGroupSize,
  onStartChat,
  onPairEveryone,
  onRequestRemove,
  rematchWarning,
  rematchNotice,
  onDismissRematchNotice,
  leftoverStudentId,
  autoMatchOn,
  autoMatchSeconds,
}: PairingPanelProps) {
  const selectionFull = selectedIds.length >= maxGroupSize;

  return (
    <div className="flex flex-col gap-4">
      {waiting.length === 0 ? (
        <EmptyState className="py-8">
          <p className="text-2xl" aria-hidden>
            🎉
          </p>
          <p className="mt-1 font-semibold text-foreground">
            Everyone's chatting
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Students come back here once their chats end.
          </p>
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <Button
              onClick={onStartChat}
              disabled={selectedIds.length < 2}
              className="w-full"
            >
              <Sparkles aria-hidden />
              Start their chat
              {selectedIds.length >= 2 ? ` (${selectedIds.length})` : ""}
            </Button>
            <Button
              variant="outline"
              onClick={onPairEveryone}
              disabled={waiting.length < 2}
              className="w-full"
            >
              <UsersRound aria-hidden />
              Pair everyone 1:1
            </Button>
            <p className="text-xs text-muted-foreground">
              Tap two students to pair them
              {maxGroupSize > 2 ? `, or up to ${maxGroupSize} for a group` : ""}
              . Characters get dealt out randomly.
            </p>
          </div>

          {rematchWarning && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
            >
              <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span>{rematchWarning}</span>
            </div>
          )}

          {rematchNotice && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
            >
              <Repeat2 aria-hidden className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 flex-1">{rematchNotice}</span>
              <button
                type="button"
                onClick={onDismissRematchNotice}
                aria-label="Dismiss"
                className="grid size-6 shrink-0 place-items-center rounded-full text-amber-700 transition-colors hover:bg-amber-100"
              >
                <X className="size-3.5" />
              </button>
            </div>
          )}

          <ul className="flex flex-col gap-1.5">
            {waiting.map((student) => {
              const selected = selectedIds.includes(student.id);
              const isLeftover = student.id === leftoverStudentId;
              return (
                <li
                  key={student.id}
                  className={cn(
                    "flex items-center gap-0.5 rounded-xl border p-1 transition-colors",
                    selected
                      ? "border-brand-grape/50 bg-brand-grape-soft/60"
                      : "border-border bg-card",
                    isLeftover && !selected && "border-amber-300 bg-amber-50"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onToggleSelect(student.id)}
                    aria-pressed={selected}
                    disabled={!selected && selectionFull}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                        selected
                          ? "border-brand-grape bg-brand-grape text-white"
                          : "border-input bg-background"
                      )}
                    >
                      {selected && <Check className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                      {student.realName}
                    </span>
                    {isLeftover && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        first in line
                      </span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatWaitShort(student.waitSeconds)}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestRemove(student)}
                    aria-label={`Remove ${student.realName} from the activity`}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {autoMatchOn && (
        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Zap
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0 text-brand-mint"
          />
          Auto-match is on: students pair up on their own after waiting{" "}
          {autoMatchSeconds} seconds.
        </p>
      )}
    </div>
  );
}
