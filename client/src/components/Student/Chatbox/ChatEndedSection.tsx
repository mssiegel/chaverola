import { EyeOff, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/section-label";
import { characterLabel } from "@/lib/characterLabel";
import type { ChatEndReason, Participant } from "@/types/chat";

interface ChatEndedSectionProps {
  peers: Participant[];
  /** When the teacher's "reveal names" setting is on, show real names. */
  revealNames: boolean;
  /** Distinct color (CSS var) per character id in this room. */
  characterColors: Map<string, string>;
  /** Why the chat ended — every reason gets its own wrap-up copy. */
  endReason?: ChatEndReason | null;
  /** Who ended it, when endReason is "peer" (an id from `peers`). */
  endedByPeerId?: string | null;
  /** Whether the room still had 2+ peers when it ended (scopes the copy). */
  endedInGroup?: boolean;
  onBackToLobby: () => void;
}

/**
 * The tile + title + body for each way a chat can end. A peer who ended it is
 * named by their character, never their real name — the mystery holds until
 * the reveal below. The default case is a safety net for a missing reason.
 */
function endedCopy(
  endReason: ChatEndReason | null,
  endedByLabel: string | null,
  endedInGroup: boolean
): { tile: string; title: string; body: string } {
  switch (endReason) {
    case "student":
      return {
        tile: "🎬",
        title: "And… scene!",
        body: endedInGroup
          ? "You ended this chat for the whole group. Nicely played! 👏"
          : "You ended this chat. Nicely played! 👏",
      };
    case "peer":
      return {
        tile: "🎭",
        title: `${endedByLabel ?? "Your partner"} ended the chat`,
        body: "That's a wrap for this one. Nicely played! 👏",
      };
    case "teacher":
      return {
        tile: "🎓",
        title: "Your teacher ended the chat",
        body: "Time for what's next in class. Nicely played! 👏",
      };
    case "timer":
      return {
        tile: "⏰",
        title: "Time's up!",
        body: "The chat timer ran out. Nicely played! 👏",
      };
    case "peer-timeout":
      return {
        tile: "🔌",
        title: "Your partner lost connection",
        body: "They couldn't get back in, so this chat ended. Not your fault!",
      };
    case "self-timeout":
      return {
        tile: "📶",
        title: "You lost connection",
        body: "You couldn't get back in time, so this chat ended for you. It happens!",
      };
    default:
      return {
        tile: "🎭",
        title: "Great roleplay!",
        body: "That chat has ended. Nicely played. 👏",
      };
  }
}

/**
 * Shown once the chat ends. The header tile explains what happened — who
 * ended it (you, a named character, your teacher), the activity timer, or a
 * lost connection — then optionally reveals who the student was really
 * talking to and invites them back to the lobby for a rematch. The student
 * only leaves when they tap the button.
 */
export function ChatEndedSection({
  peers,
  revealNames,
  characterColors,
  endReason = null,
  endedByPeerId = null,
  endedInGroup = false,
  onBackToLobby,
}: ChatEndedSectionProps) {
  const endedBy = endedByPeerId
    ? peers.find((p) => p.id === endedByPeerId)
    : undefined;
  const copy = endedCopy(
    endReason,
    endedBy ? characterLabel(endedBy) : null,
    endedInGroup
  );

  return (
    <div className="border-t border-border bg-gradient-to-b from-brand-grape-soft/60 to-card px-4 py-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-3xl">
          {copy.tile}
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">
            {copy.title}
          </h3>
          <p className="text-sm text-muted-foreground">{copy.body}</p>
        </div>

        {revealNames ? (
          <div className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm">
            <SectionLabel className="mb-2 text-center">
              You were really chatting with
            </SectionLabel>
            <ul className="space-y-1.5">
              {peers.map((peer) => (
                <li
                  key={peer.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span
                    className="font-semibold"
                    style={{ color: characterColors.get(peer.character.id) }}
                  >
                    {characterLabel(peer)}
                  </span>
                  <span className="font-medium text-foreground">
                    {peer.realName}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground">
            <EyeOff className="size-4" />
            <span>Names stay secret. Your teacher hasn't revealed them.</span>
          </div>
        )}

        <div className="w-full space-y-2 pt-1">
          <p className="text-sm font-medium text-foreground">
            Ready for another round? 🚀
          </p>
          <Button size="lg" className="w-full" onClick={onBackToLobby}>
            <RotateCcw className="size-4" />
            Back to the lobby
          </Button>
        </div>
      </div>
    </div>
  );
}
