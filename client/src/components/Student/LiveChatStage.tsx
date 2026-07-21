import { useState } from "react";

import { Chatbox } from "@/components/Student/Chatbox";
import { useBackGuard } from "@/lib/useBackGuard";
import type { ChatMessage, ChatRoomState, Participant } from "@/types/chat";

interface LiveChatStageProps {
  /** The student's own seat in the room (realName from the session). */
  self: Participant;
  /** Peers still in the room. Characters only — realName stays "". */
  peers: Participant[];
  /** Everyone ever in the room — keeps colors stable across a drop. */
  everPeers: Participant[];
  /** The transcript: real lines plus local notices ("X left the chat"). */
  messages: ChatMessage[];
  /** The peer typing right now (a characterId), or null — the page's one
   *  slot, fed by chat:peer-typing and expired on a TTL. */
  typingPeerId: string | null;
  isEnded: boolean;
  /** Sends a real message over the seat's socket (chat:send). */
  onSend: (text: string) => void;
  /** A keystroke happened — the hook throttles it into chat:typing
   *  heartbeats. */
  onTyping: () => void;
  /**
   * The confirmed mid-chat exit. Leaving a live chat means leaving the
   * activity (back-as-reset → lobby:leave); a duo partner's chat ends.
   */
  onLeaveActivity: () => void;
  /** The ended screen's CTA: re-queue with a fresh wait clock. */
  onBackToLobby: () => void;
}

/**
 * The chatting + chat-ended stages for a REAL activity: the same chatbox the
 * demo renders, driven by a room the page assembles from the wire
 * (chat:started / chat:line / chat:update / chat:ended) instead of a demo
 * engine. Deliberately a component split beside ChatStage — never a
 * conditional hook. Messaging is real: the composer sends over the socket
 * and the transcript is the wire's. Typing is real too (chat:typing →
 * chat:peer-typing, feature 5). Still quiet on the rest, on purpose: no
 * clocks, no peer-drop UI (the student wire carries no peer connection
 * state — those are their own later features). Exits are honest too:
 * walking out mid-chat leaves the whole activity, and the confirm says so.
 */
export function LiveChatStage({
  self,
  peers,
  everPeers,
  messages,
  typingPeerId,
  isEnded,
  onSend,
  onTyping,
  onLeaveActivity,
  onBackToLobby,
}: LiveChatStageProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Same guard as the demo stage: a stray back-swipe must never silently
  // dump a student out of a live chat — it opens the exit confirm instead.
  useBackGuard(!isEnded, () => setConfirmOpen(true));

  // The room, live messages and typing included. What a demo engine would
  // animate beyond them stays pinned to its quiet value: nobody visibly
  // drops and no clock runs — ChatPeer is allowlist-pinned to characterId,
  // so peer connection state has no slot on the student wire. "teacher" is
  // the only reachable end reason this feature (the below-2 rule).
  const chat: ChatRoomState = {
    self,
    peers,
    participants: [self, ...everPeers],
    messages,
    typingPeerId,
    peerState: "connected",
    offlinePeerId: null,
    reconnectSecondsLeft: null,
    autoEndSecondsLeft: null,
    isEnded,
    isPaused: false,
    endReason: isEnded ? "teacher" : null,
    endedByPeerId: null,
  };

  return (
    <div className="h-[min(70dvh,620px)] w-full animate-in duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none">
      <Chatbox
        chat={chat}
        revealNames={false}
        onSend={onSend}
        onTyping={onTyping}
        onEndChat={onLeaveActivity}
        onLeaveChat={onLeaveActivity}
        onBackToLobby={onBackToLobby}
        endConfirmOpen={confirmOpen}
        onEndConfirmOpenChange={setConfirmOpen}
        exitDescriptions={{
          duo: "This ends the chat for both of you and signs you out of the activity. You can join again with the code.",
          group:
            "The chat keeps going without you, and you're signed out of the activity. You can join again with the code.",
        }}
        endedSecretLine="Names stay secret. That's the whole game."
      />
    </div>
  );
}
