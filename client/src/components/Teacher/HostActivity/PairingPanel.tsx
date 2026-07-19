import { useId } from "react";
import { Check, Repeat2, Sparkles, UsersRound, X, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatWaitShort } from "@/lib/time";
import { cn } from "@/lib/utils";

import { EmptyState } from "./EmptyState";
import type { WaitingStudent } from "./hostWorld";

export interface PairingPanelProps {
  waiting: WaitingStudent[];
  /**
   * Whether pairing exists here at all. The demo's simulated classroom says
   * true and gets the full panel; a real activity says false until matching
   * ships — rows keep exactly two affordances (the name+clock display and
   * Remove), and a short note says matching is on the way.
   */
  pairing: boolean;
  /** Nobody has joined at all — a fresh real activity, not a busy round. */
  noStudentsYet: boolean;
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
  /** The activity-wide pause: matching is on hold, and the row says so. */
  paused?: boolean;
  /** Flips the real activity setting — the same one Edit activity settings shows. */
  onAutoMatchChange: (on: boolean) => void;
  /** Post-End-all hold banner — only when End-all itself turned auto-match off. */
  showHoldNotice: boolean;
  onDismissHoldNotice: () => void;
}

/**
 * The waiting queue and everything the teacher does with it. Students render
 * in join order — new joiners append at the bottom, so the longest-waiting
 * sit on top and the list never reshuffles under the teacher's cursor.
 * Pairing is tap-to-select; characters are assigned randomly when the chat
 * starts (no assignment step). Each row's remove control is separate from
 * the select target so the two taps never collide. See DECISIONS.md.
 *
 * A student marked "reconnecting" renders dimmed with a lost-connection tag:
 * their seat is riding out its grace window, the wait clock keeps ticking,
 * and the only thing a teacher can do with them is Remove.
 */
export function PairingPanel({
  waiting,
  pairing,
  noStudentsYet,
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
  paused = false,
  onAutoMatchChange,
  showHoldNotice,
  onDismissHoldNotice,
}: PairingPanelProps) {
  const selectionFull = selectedIds.length >= maxGroupSize;
  // The host page renders this panel twice (desktop rail + the phones'
  // collapsible section), so the switch id must be unique per instance.
  const autoMatchSwitchId = useId();

  return (
    <div className="flex flex-col gap-4">
      {/* The honest placeholder where the pairing controls will go — a real
          activity can't match anyone yet, and this page must not pretend
          otherwise (founder call, 2026-07-19). */}
      {!pairing && (
        <p className="rounded-xl bg-brand-grape-soft/50 px-3 py-2.5 text-sm text-muted-foreground">
          Matching comes in the next update. Until then, this is your live list
          of who's joined.
        </p>
      )}

      {/* Above the empty-state branch on purpose: right after End-all the
          queue is briefly empty while students wrap up, and this is exactly
          when the teacher needs to see the hold. The count is live — it
          climbs as students come back. */}
      {pairing && showHoldNotice && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
        >
          <div className="flex items-start gap-2">
            <Zap aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0 flex-1">
              {waiting.length === 0
                ? "Auto-match is off. Students land back here as their chats wrap up."
                : waiting.length === 1
                  ? "1 student is waiting, and auto-match is off."
                  : `${waiting.length} students are waiting, and auto-match is off.`}
            </span>
            <button
              type="button"
              onClick={onDismissHoldNotice}
              aria-label="Dismiss"
              className="grid size-6 shrink-0 place-items-center rounded-full text-amber-700 transition-colors hover:bg-amber-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onAutoMatchChange(true)}
            className="mt-2 w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100 hover:text-amber-900"
          >
            <Zap aria-hidden />
            Turn auto-match back on
          </Button>
        </div>
      )}

      {waiting.length === 0 ? (
        noStudentsYet ? (
          <EmptyState className="py-8">
            <p className="text-2xl" aria-hidden>
              📣
            </p>
            <p className="mt-1 font-semibold text-foreground">
              No students yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Read out the pin and they'll show up here as they join.
            </p>
          </EmptyState>
        ) : (
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
        )
      ) : (
        <>
          {pairing && (
            <>
              {/* lg: matches the host page's rail breakpoint — only the desktop
                  mount scrolls internally, so the CTAs pin there and nowhere else.
                  Order is deliberate: the confirm CTA sits second, adjacent to
                  the names the teacher just tapped. */}
              <div className="flex flex-col gap-2 lg:sticky lg:top-0 lg:z-10 lg:bg-card lg:pb-2">
                <Button
                  variant="outline"
                  onClick={onPairEveryone}
                  disabled={waiting.length < 2}
                  className="w-full"
                >
                  <UsersRound aria-hidden />
                  Pair everyone 1:1
                </Button>
                <Button
                  onClick={onStartChat}
                  disabled={selectedIds.length < 2}
                  className="w-full"
                >
                  <Sparkles aria-hidden />
                  Start their chat
                  {selectedIds.length >= 2 ? ` (${selectedIds.length})` : ""}
                </Button>
              </div>
              <p className="-mt-2 text-xs text-muted-foreground lg:-mt-4">
                Tap two students to pair them
                {maxGroupSize > 2
                  ? `, or up to ${maxGroupSize} for a group`
                  : ""}
                . Characters get dealt out randomly.
              </p>

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
            </>
          )}

          <ul className="flex flex-col gap-1.5">
            {waiting.map((student) => {
              const selected = pairing && selectedIds.includes(student.id);
              const isLeftover = student.id === leftoverStudentId;
              const dropped = student.connection === "reconnecting";
              // Both tags never show at once — a dropped student can't be
              // paired, so "first in line" would be an empty promise.
              const rowContent = (
                <>
                  {pairing && (
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
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {student.realName}
                  </span>
                  {isLeftover && !dropped && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      first in line
                    </span>
                  )}
                  {dropped && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                      lost connection
                    </span>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatWaitShort(student.waitSeconds)}
                  </span>
                </>
              );
              return (
                <li
                  key={student.id}
                  className={cn(
                    "flex items-center gap-0.5 rounded-xl border p-1 transition-colors lg:scroll-mt-24",
                    selected
                      ? "border-brand-grape/50 bg-brand-grape-soft/60"
                      : "border-border bg-card",
                    isLeftover &&
                      !selected &&
                      !dropped &&
                      "border-amber-300 bg-amber-50"
                  )}
                >
                  {pairing ? (
                    <button
                      type="button"
                      onClick={() => onToggleSelect(student.id)}
                      aria-pressed={selected}
                      // A dropped student is unmatchable while their seat
                      // rides out the grace window (founder call) — and the
                      // disabled dim doubles as the row's marking.
                      disabled={dropped || (!selected && selectionFull)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {rowContent}
                    </button>
                  ) : (
                    <div
                      className={cn(
                        "flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left",
                        dropped && "opacity-60"
                      )}
                    >
                      {rowContent}
                    </div>
                  )}
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

      {/* The matching control lives where the teacher watches the queue —
          it IS the activity setting, the same one Edit activity settings
          shows, so the two switches can never disagree. Demo only until
          matching ships: a real page must not offer a switch that promises
          auto-pairing. */}
      {pairing && (
        <div className="flex items-start gap-2 border-t border-border/70 pt-3">
          <Zap
            aria-hidden
            className={cn(
              "mt-0.5 size-3.5 shrink-0",
              autoMatchOn ? "text-brand-mint" : "text-muted-foreground/50"
            )}
          />
          <label
            htmlFor={autoMatchSwitchId}
            className="min-w-0 flex-1 cursor-pointer text-xs leading-relaxed text-muted-foreground"
          >
            {!autoMatchOn
              ? "Auto-match is off: students wait here until you pair them."
              : paused
                ? "Auto-match is on hold while chats are paused."
                : `Auto-match is on: students pair up on their own after waiting ${autoMatchSeconds} seconds.`}
          </label>
          <Switch
            id={autoMatchSwitchId}
            checked={autoMatchOn}
            onCheckedChange={onAutoMatchChange}
          />
        </div>
      )}
    </div>
  );
}
