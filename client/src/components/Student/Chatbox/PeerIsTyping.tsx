import { TypingDots } from "@/components/chat/TypingDots";

interface PeerIsTypingProps {
  /** Character name of the peer who is typing, or null when nobody is. */
  characterName: string | null;
  /** In group chats (3–4 people) we hide who it is and say "someone". */
  isGroup: boolean;
}

/**
 * The live "X is typing…" line shown at the bottom of the conversation. In a
 * group chat it becomes "someone is typing…" so a single peer isn't singled out.
 */
export function PeerIsTyping({ characterName, isGroup }: PeerIsTypingProps) {
  if (!characterName) return null;

  const label = isGroup ? "someone" : characterName;

  return (
    <div
      className="flex items-center gap-2 pt-1 text-sm text-muted-foreground"
      aria-live="polite"
    >
      <TypingDots dotClassName="bg-brand-grape/70" />
      <span className="italic">
        <span className="font-medium not-italic">{label}</span> is typing…
      </span>
    </div>
  );
}
