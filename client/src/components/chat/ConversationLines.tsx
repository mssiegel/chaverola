import type { ChatMessage, Participant } from "@/types/chat";

interface ConversationLinesProps {
  participants: Participant[];
  messages: ChatMessage[];
  /** Distinct color (CSS var) per character id in this room. */
  characterColors: Map<string, string>;
  /** Student view: marks this participant's lines with "(you)". */
  selfId?: string;
  /** Teacher view: prefix each line with the sender's real name. */
  showRealNames?: boolean;
}

/**
 * The message lines themselves, shared by the student and teacher chatboxes.
 * Follows the shared chatbox conventions: `characterName: message` on one line
 * (the teacher view prepends `(realName) `), 0px between consecutive lines from
 * the same speaker and +4px when the speaker changes — a smooth, game-like
 * flow. Text size/leading is inherited so each view can set its own density.
 */
export function ConversationLines({
  participants,
  messages,
  characterColors,
  selfId,
  showRealNames = false,
}: ConversationLinesProps) {
  const byId = new Map<string, Participant>();
  for (const p of participants) byId.set(p.id, p);

  return (
    <div className="flex flex-col">
      {messages.map((message, index) => {
        const sender = byId.get(message.senderId);
        if (!sender) return null;

        const prev = messages[index - 1];
        const speakerChanged = !prev || prev.senderId !== message.senderId;
        const marginTop = index === 0 ? 0 : speakerChanged ? 4 : 0;
        const isSelf = selfId != null && message.senderId === selfId;

        return (
          <div
            key={message.id}
            style={{ marginTop }}
            className="[overflow-wrap:anywhere]"
          >
            {showRealNames && (
              <span className="text-muted-foreground">
                ({sender.realName}){" "}
              </span>
            )}
            <span
              className="font-semibold"
              style={{ color: characterColors.get(sender.character.id) }}
            >
              {sender.character.name} {sender.character.emoji}
              {isSelf && (
                <span className="ml-1 align-middle text-[11px] font-medium text-muted-foreground">
                  (you)
                </span>
              )}
              <span className="text-foreground">: </span>
            </span>
            <span className="text-foreground/90">{message.text}</span>
          </div>
        );
      })}
    </div>
  );
}
