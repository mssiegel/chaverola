import { Loader2, Pause } from "lucide-react";

import type { LobbyConnectionState } from "@chaverola/shared";

import { TypingDots } from "@/components/chat/TypingDots";
import { SectionLabel } from "@/components/ui/section-label";
import type { Activity } from "@/types/activity";

interface WaitingLobbyProps {
  activity: Activity;
  /** The real name the student signed in with. */
  studentName: string;
  /** The teacher paused the class: matching is on hold and the pill says so. */
  isPaused?: boolean;
  /** The lobby's live connection; "reconnecting" swaps the pill to amber. */
  connection?: LobbyConnectionState;
}

/**
 * The waiting-room stage of the student flow: the student is in, and the
 * teacher hasn't matched them with a partner yet. Bouncy and a little loud on
 * purpose — this screen's job is to build excitement for the chat.
 */
export function WaitingLobby({
  activity,
  studentName,
  isPaused = false,
  connection = "connected",
}: WaitingLobbyProps) {
  return (
    <section className="flex w-full animate-in flex-col items-center gap-6 text-center duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
      <div className="space-y-2 pt-2">
        <h1 className="text-3xl font-semibold text-foreground">
          You're in, {studentName}! 🎉
        </h1>
        <p className="text-muted-foreground">
          {isPaused
            ? "Your teacher hit pause for a moment. When things start back up, your chat opens right here."
            : `${activity.hostName} is picking who chats with who. When it's your turn, the chat opens right here.`}
        </p>
      </div>

      {/* Connection trouble outranks the pause pill: while the socket is
          down, "paused" is a claim this screen can't back up. */}
      {connection === "reconnecting" ? (
        <div
          className="flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
          aria-live="polite"
        >
          <Loader2
            aria-hidden
            className="size-4 animate-spin motion-reduce:animate-none"
          />
          Reconnecting you…
        </div>
      ) : isPaused ? (
        <div
          className="flex items-center gap-2.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800"
          aria-live="polite"
        >
          <Pause aria-hidden className="size-4" />
          Class is paused
        </div>
      ) : (
        <div
          className="flex items-center gap-2.5 rounded-full border border-brand-grape/25 bg-brand-grape-soft px-4 py-2 text-sm font-semibold text-brand-grape-strong"
          aria-live="polite"
        >
          Waiting for your match
          <TypingDots dotClassName="bg-brand-mint" aria-hidden />
        </div>
      )}

      <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
        <div>
          <SectionLabel>Hosted by</SectionLabel>
          <p className="mt-0.5 font-medium text-foreground">
            {activity.hostName}
          </p>
        </div>

        {activity.scenario && (
          <div>
            <SectionLabel>The scene</SectionLabel>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground">
              {activity.scenario}
            </p>
          </div>
        )}

        <div>
          <SectionLabel>Characters in this activity</SectionLabel>
          <ul className="mt-2 flex flex-wrap gap-2">
            {activity.characters.map((character) => (
              <li
                key={character.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
              >
                {character.emoji && <span aria-hidden>{character.emoji}</span>}
                {character.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
