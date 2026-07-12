import { useEffect, useRef } from "react";

import { ConversationLines } from "@/components/chat/ConversationLines";
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
 * The scrolling conversation feed for the student view: the shared message
 * lines (see ConversationLines) plus the reconnect banner and the typing
 * indicator. Auto-scrolls to the newest message.
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
    <div className="scroll-soft relative flex-1 overflow-y-auto px-3 py-3 text-[15px] leading-6 sm:px-4">
      {peerState !== "connected" && (
        <div className="sticky top-0 z-10 -mx-3 mb-2 flex justify-center px-3 sm:-mx-4 sm:px-4">
          <PeerReconnectBanner peerState={peerState} peerName={offlineName} />
        </div>
      )}

      <ConversationLines
        participants={participants}
        messages={messages}
        characterColors={characterColors}
        selfId={selfId}
      />

      <PeerIsTyping characterName={typingName} isGroup={isGroup} />

      <div ref={bottomRef} className="h-0" />
    </div>
  );
}
