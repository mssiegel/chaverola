import { EyeOff, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Participant } from "@/types/chat";

interface ChatEndedSectionProps {
  peers: Participant[];
  /** When the teacher's "reveal names" setting is on, show real names. */
  revealNames: boolean;
  /** Distinct color (CSS var) per character id in this room. */
  characterColors: Map<string, string>;
  onBackToLobby: () => void;
}

/**
 * Shown once the chat ends. Celebrates the roleplay, optionally reveals who the
 * student was really talking to, and invites them back to the lobby for a
 * rematch. The student only leaves when they tap the button.
 */
export function ChatEndedSection({
  peers,
  revealNames,
  characterColors,
  onBackToLobby,
}: ChatEndedSectionProps) {
  return (
    <div className="border-t border-border bg-gradient-to-b from-brand-grape-soft/60 to-card px-4 py-6 text-center">
      <div className="mx-auto flex max-w-md flex-col items-center gap-4">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-3xl">
          🎭
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-semibold text-foreground">
            Great roleplay!
          </h3>
          <p className="text-sm text-muted-foreground">
            That chat has ended. Nicely played. 👏
          </p>
        </div>

        {revealNames ? (
          <div className="w-full rounded-xl border border-border bg-card p-3 text-left shadow-sm">
            <p className="mb-2 text-center text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              You were really chatting with
            </p>
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
                    {peer.character.name} {peer.character.emoji}
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
