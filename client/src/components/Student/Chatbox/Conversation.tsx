import { useEffect, useRef } from "react";

import type {
  ChatMessage,
  Participant,
  PeerConnectionState,
} from "@/types/chat";

import { PeerIsTyping } from "./PeerIsTyping";
import { PeerReconnectBanner } from "./PeerReconnectBanner";

interface ConversationProps {
  participants: Participant[];
  selfId: string;
  messages: ChatMessage[];
  typingPeerId: string | null;
  peerState: PeerConnectionState;
  offlinePeerId: string | null;
  /** Distinct color (CSS var) per character id in this room. */
  characterColors: Map<string, string>;
}

/**
 * The scrolling conversation feed. Follows the shared chatbox conventions:
 * `characterName: message` on one line, 0px between consecutive lines from the
 * same speaker and +4px when the speaker changes — a smooth, game-like flow.
 * Auto-scrolls to the newest message.
 */
export function Conversation({
  participants,
  selfId,
  messages,
  typingPeerId,
  peerState,
  offlinePeerId,
  characterColors,
}: ConversationProps) {
  const byId = new Map<string, Participant>();
  for (const p of participants) byId.set(p.id, p);

  const isGroup = participants.length > 2;
  const bottomRef = useRef<HTMLDivElement>(null);

  // Stick to the newest message / typing indicator.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, typingPeerId]);

  const typingName = typingPeerId
    ? (byId.get(typingPeerId)?.character.name ?? null)
    : null;
  const offlineName = offlinePeerId
    ? (byId.get(offlinePeerId)?.character.name ?? null)
    : null;

  return (
    <div className="scroll-soft relative flex-1 overflow-y-auto px-3 py-3 sm:px-4">
      {peerState !== "connected" && (
        <div className="sticky top-0 z-10 -mx-3 mb-2 flex justify-center px-3 sm:-mx-4 sm:px-4">
          <PeerReconnectBanner peerState={peerState} peerName={offlineName} />
        </div>
      )}

      <div className="flex flex-col">
        {messages.map((message, index) => {
          const sender = byId.get(message.senderId);
          if (!sender) return null;

          const prev = messages[index - 1];
          const speakerChanged = !prev || prev.senderId !== message.senderId;
          const marginTop = index === 0 ? 0 : speakerChanged ? 4 : 0;
          const isSelf = message.senderId === selfId;

          return (
            <div
              key={message.id}
              style={{ marginTop }}
              className="text-[15px] leading-6 [overflow-wrap:anywhere]"
            >
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

      <PeerIsTyping characterName={typingName} isGroup={isGroup} />

      <div ref={bottomRef} className="h-0" />
    </div>
  );
}
