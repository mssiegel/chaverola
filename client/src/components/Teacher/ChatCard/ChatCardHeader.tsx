import { CheckCircle2 } from "lucide-react";

import { characterLabel } from "@/lib/characterLabel";
import type { Participant } from "@/types/chat";

interface ChatCardHeaderProps {
  participants: Participant[];
  /** Distinct color (CSS var) per character id in this chat. */
  characterColors: Map<string, string>;
  isEnded: boolean;
}

/**
 * Who's in this chat: each student's real name next to the character they're
 * playing (the teacher always sees real names), plus a live/ended badge.
 */
export function ChatCardHeader({
  participants,
  characterColors,
  isEnded,
}: ChatCardHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-border bg-brand-grape-soft/50 px-3 py-2.5 sm:px-4">
      <ul className="min-w-0 space-y-0.5 text-sm leading-snug">
        {participants.map((participant) => (
          <li key={participant.id} className="truncate">
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
          </li>
        ))}
      </ul>

      {isEnded ? (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-sm">
          <CheckCircle2 className="size-3.5" />
          Ended
        </span>
      ) : (
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-card px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-brand-mint" />
          </span>
          Live
        </span>
      )}
    </header>
  );
}
