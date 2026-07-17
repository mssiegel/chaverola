import { useEffect, useRef } from "react";

import { ConversationLines } from "@/components/chat/ConversationLines";
import { characterLabel } from "@/lib/characterLabel";
import { participantsById } from "@/lib/participants";
import type {
  ChatMessage,
  Participant,
  PeerConnectionState,
} from "@/types/chat";

import { ChatPausedBanner } from "./ChatPausedBanner";
import { PeerIsTyping } from "./PeerIsTyping";
import { PeerReconnectBanner } from "./PeerReconnectBanner";

interface ConversationProps {
  participants: Participant[];
  selfId: string;
  messages: ChatMessage[];
  typingPeerId: string | null;
  peerState: PeerConnectionState;
  offlinePeerId: string | null;
  /** Seconds left in the offline peer's reconnect window (null: no window). */
  reconnectSecondsLeft?: number | null;
  /** The teacher's activity-wide pause: a banner floats over the feed. */
  isPaused?: boolean;
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
  reconnectSecondsLeft = null,
  isPaused = false,
  characterColors,
}: ConversationProps) {
  const byId = participantsById(participants);

  const isGroup = participants.length > 2;
  const feedRef = useRef<HTMLDivElement>(null);

  // Stick to the newest message / typing indicator. Scroll only the feed
  // itself — scrollIntoView would also scroll the page, which yanks the
  // viewport around when the chatbox is embedded mid-page (homepage hero).
  useEffect(() => {
    const el = feedRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, typingPeerId]);

  const typingName = typingPeerId
    ? (byId.get(typingPeerId)?.character.name ?? null)
    : null;
  // Full "name emoji" label: the banner is chat chrome, and the countdown
  // copy ("Brutus 🔪 lost connection…") should read like the header does.
  const offlinePeer = offlinePeerId ? byId.get(offlinePeerId) : undefined;
  const offlineName = offlinePeer ? characterLabel(offlinePeer) : null;

  return (
    <div
      ref={feedRef}
      className="scroll-soft relative flex-1 overflow-y-auto px-3 py-3 text-[15px] leading-6 sm:px-4"
    >
      {(isPaused || peerState !== "connected") && (
        <div className="sticky top-0 z-10 -mx-3 mb-2 flex flex-col items-center gap-1.5 px-3 sm:-mx-4 sm:px-4">
          {/* Pause on top of a frozen reconnect countdown: both can apply. */}
          {isPaused && <ChatPausedBanner />}
          <PeerReconnectBanner
            peerState={peerState}
            peerName={offlineName}
            reconnectSecondsLeft={reconnectSecondsLeft}
          />
        </div>
      )}

      <ConversationLines
        participants={participants}
        messages={messages}
        characterColors={characterColors}
        selfId={selfId}
      />

      <PeerIsTyping characterName={typingName} isGroup={isGroup} />
    </div>
  );
}
