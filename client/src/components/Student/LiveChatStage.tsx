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
  /** The local membership notices ("X left the chat"). */
  notices: ChatMessage[];
  isEnded: boolean;
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
 * demo renders, driven by a static room the page assembles from the wire
 * (chat:started / chat:update / chat:ended) instead of a demo engine.
 * Deliberately a component split beside ChatStage — never a conditional
 * hook. Messaging hasn't shipped, so the room is honest about it: the
 * composer is locked with its own line, there's no typing indicator, no
 * clocks, and no peer-drop UI (students stay blind to peer drops until
 * messaging arrives). Exits are honest too: walking out mid-chat leaves the
 * whole activity, and the confirm says so.
 */
export function LiveChatStage({
  self,
  peers,
  everPeers,
  notices,
  isEnded,
  onLeaveActivity,
  onBackToLobby,
}: LiveChatStageProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Same guard as the demo stage: a stray back-swipe must never silently
  // dump a student out of a live chat — it opens the exit confirm instead.
  useBackGuard(!isEnded, () => setConfirmOpen(true));

  // The static room. Everything a demo engine would animate is pinned to
  // its quiet value: the only messages are the local membership notices,
  // nobody types, nobody visibly drops, and no clock runs. "teacher" is the
  // only reachable end reason this feature (the below-2 rule).
  const chat: ChatRoomState = {
    self,
    peers,
    participants: [self, ...everPeers],
    messages: notices,
    typingPeerId: null,
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
        onSend={() => {}}
        onEndChat={onLeaveActivity}
        onLeaveChat={onLeaveActivity}
        onBackToLobby={onBackToLobby}
        endConfirmOpen={confirmOpen}
        onEndConfirmOpenChange={setConfirmOpen}
        composerDisabled
        composerDisabledPlaceholder="No messages yet. We're still building this bit…"
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
