import { CheckCircle2, Pause, X } from "lucide-react";

import { AutoEndCountdown } from "@/components/chat/AutoEndCountdown";
import { LiveDot } from "@/components/ui/live-dot";
import { characterLabel } from "@/lib/characterLabel";
import { cn } from "@/lib/utils";
import type { Participant } from "@/types/chat";

import { ElapsedClock } from "./ElapsedClock";

interface ChatCardHeaderProps {
  participants: Participant[];
  /** Distinct color (CSS var) per character id in this chat. */
  characterColors: Map<string, string>;
  isEnded: boolean;
  /** The activity-wide pause: the badge and clock freeze. Ended wins. */
  isPaused?: boolean;
  /** Seconds left on the chat's auto-end clock (null/omitted: no clock). */
  autoEndSecondsLeft?: number | null;
  /** Seconds since the chat started (live cards) — the count-up chip. */
  elapsedSeconds?: number | null;
  /** Participants no longer in the room (removed mid-chat) render muted. */
  inactiveParticipantIds?: ReadonlySet<string>;
  /** Active members riding a dropped connection — dimmed with a
   *  lost-connection tag, same treatment as the queue rows. */
  reconnectingParticipantIds?: ReadonlySet<string>;
  /** When set, each active participant row gets a remove control. */
  onRemoveParticipant?: (participant: Participant) => void;
}

/**
 * Who's in this chat: each student's real name next to the character they're
 * playing (the teacher always sees real names), plus a live/ended badge, the
 * chat's remaining time when the activity auto-ends chats, and — on the live
 * host page — a per-participant remove control.
 */
export function ChatCardHeader({
  participants,
  characterColors,
  isEnded,
  isPaused = false,
  autoEndSecondsLeft = null,
  elapsedSeconds = null,
  inactiveParticipantIds,
  reconnectingParticipantIds,
  onRemoveParticipant,
}: ChatCardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-border bg-brand-grape-soft/50 px-3 py-2.5 sm:px-4">
      <ul className="min-w-0 flex-1 space-y-0.5 text-sm leading-snug">
        {participants.map((participant) => {
          const inactive = inactiveParticipantIds?.has(participant.id) ?? false;
          // A dropped member's seat is riding out the disconnect — mark it
          // like a queue row's lost-connection state. Inactive wins: someone
          // who LEFT the room isn't "reconnecting" to it.
          const dropped =
            !inactive &&
            !isEnded &&
            (reconnectingParticipantIds?.has(participant.id) ?? false);
          return (
            <li key={participant.id} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "min-w-0 truncate",
                  inactive && "opacity-55",
                  dropped && "opacity-60"
                )}
              >
                <span className="font-semibold text-foreground">
                  {participant.realName}
                </span>
                <span className="text-muted-foreground"> as </span>
                <span
                  className="font-semibold"
                  style={{
                    color: characterColors.get(participant.character.id),
                  }}
                >
                  {characterLabel(participant)}
                </span>
              </span>
              {dropped && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                  lost connection
                </span>
              )}
              {!isEnded && !inactive && onRemoveParticipant && (
                <button
                  type="button"
                  onClick={() => onRemoveParticipant(participant)}
                  aria-label={`Remove ${participant.realName} from this chat`}
                  className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {isEnded ? (
          <span className="flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
            <CheckCircle2 className="size-3.5" />
            Ended
          </span>
        ) : isPaused ? (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 shadow-sm">
            <Pause className="size-3.5" />
            Paused
          </span>
        ) : (
          <span className="flex items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
            <LiveDot />
            Live
          </span>
        )}
        {!isEnded && autoEndSecondsLeft !== null && (
          <span className="flex items-center rounded-full bg-card px-2.5 py-1 shadow-sm">
            <AutoEndCountdown
              secondsLeft={autoEndSecondsLeft}
              paused={isPaused}
              className="text-xs"
            />
          </span>
        )}
        {!isEnded && elapsedSeconds !== null && (
          <ElapsedClock seconds={elapsedSeconds} />
        )}
      </div>
    </header>
  );
}
