import type { Activity } from "@/types/activity";

interface WaitingLobbyProps {
  activity: Activity;
  /** The real name the student signed in with. */
  studentName: string;
}

/**
 * The waiting-room stage of the student flow: the student is in, and the
 * teacher hasn't matched them with a partner yet. Bouncy and a little loud on
 * purpose — this screen's job is to build excitement for the chat.
 */
export function WaitingLobby({ activity, studentName }: WaitingLobbyProps) {
  return (
    <section className="flex w-full flex-col items-center gap-6 text-center duration-500 animate-in fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
      <div className="space-y-2 pt-2">
        <h1 className="text-3xl font-semibold text-foreground">
          You're in, {studentName}! 🎉
        </h1>
        <p className="text-muted-foreground">
          {activity.hostName} is picking who chats with who. When it's your
          turn, the chat opens right here.
        </p>
      </div>

      <div
        className="flex items-center gap-2.5 rounded-full border border-brand-grape/25 bg-brand-grape-soft px-4 py-2 text-sm font-semibold text-brand-grape-strong"
        aria-live="polite"
      >
        Waiting for your match
        <span className="flex items-center gap-1" aria-hidden>
          <WaitingDot delay="0ms" />
          <WaitingDot delay="150ms" />
          <WaitingDot delay="300ms" />
        </span>
      </div>

      <div className="w-full space-y-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm">
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Hosted by
          </p>
          <p className="mt-0.5 font-medium text-foreground">
            {activity.hostName}
          </p>
        </div>

        {activity.scenario && (
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              The scene
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-foreground">
              {activity.scenario}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Characters in this activity
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {activity.characters.map((character) => (
              <li
                key={character.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground"
              >
                <span aria-hidden>{character.emoji}</span>
                {character.name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function WaitingDot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1.5 animate-bounce rounded-full bg-brand-mint"
      style={{ animationDelay: delay }}
    />
  );
}
