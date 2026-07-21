import { useEffect, useState } from "react";

import { LOBBY_GRACE_SECONDS } from "@chaverola/shared";

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
  /** Peers currently dropped (characterId → reconnect-window deadline,
   *  epoch ms), fed by chat:peer-connection. The stage derives the banner
   *  and ticks the countdown off real time. */
  offlinePeers: Record<string, number>;
  /** The peer whose "X is back! 🎉" flash is showing, or null. The flash
   *  takes the banner slot; any remaining countdown resumes after. */
  returnedFlashId: string | null;
  isEnded: boolean;
  /** Why the chat ended (chat:ended's payload): "peer-timeout" is a 1:1
   *  partner's expired grace — the 🔌 wrap-up — "teacher" everything else.
   *  Null while the chat is going. */
  endReason: "teacher" | "peer-timeout" | null;
  /** The teacher's activity-wide pause (activity:paused / lobby:welcome).
   *  Chatbox freezes the room: banner, locked composer. Ended wins. */
  isPaused: boolean;
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
 * chat:peer-typing, feature 5), the teacher's pause is real (feature 7),
 * and so is the peer-drop banner (chat:peer-connection, feature 8): the
 * page hands this stage the offline map and the stage ticks the countdown.
 * The ending tells the truth as well — chat:ended's reason renders the 🔌
 * wrap-up when a 1:1 partner's grace ran out, not the teacher's 🎓. Still
 * quiet on the rest, on purpose: no auto-end clock and no name reveal
 * (their own later features). Exits are honest too: walking out mid-chat
 * leaves the whole activity, and the confirm says so.
 */
export function LiveChatStage({
  self,
  peers,
  everPeers,
  messages,
  typingPeerId,
  offlinePeers,
  returnedFlashId,
  isEnded,
  endReason,
  isPaused,
  onSend,
  onTyping,
  onLeaveActivity,
  onBackToLobby,
}: LiveChatStageProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Same guard as the demo stage: a stray back-swipe must never silently
  // dump a student out of a live chat — it opens the exit confirm instead.
  useBackGuard(!isEnded, () => setConfirmOpen(true));

  // The countdown's clock: plain real time, once a second, for the whole
  // live room (gating it on an open window would leave `now` minutes stale
  // at the moment a drop lands, and neither render nor an effect body may
  // call Date.now() under the compiler lints). NEVER
  // useSecondCountdown/scaledMs — live wire timing is never compressed.
  // Re-deriving from the stored deadline (rather than counting down)
  // self-corrects after background-tab throttling, the same trick as the
  // teacher's wait clocks.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (isEnded) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isEnded]);

  // The banner slot: a return's 🎉 flash wins it briefly; otherwise the
  // soonest-to-expire offline peer's countdown (founder call — the
  // first-dropped clock is the urgent one; when they resolve, the banner
  // switches to the other).
  let offlinePeerId: string | null = null;
  let minDeadline = Infinity;
  for (const [id, deadline] of Object.entries(offlinePeers)) {
    if (deadline < minDeadline) {
      minDeadline = deadline;
      offlinePeerId = id;
    }
  }
  // Clamped to the window: `now` can lag behind real time in a throttled
  // background tab, and at the low end the display holds at 0:00 until the
  // server's chat:update / chat:ended resolves it — the client never acts
  // on a local zero.
  const reconnectSecondsLeft =
    returnedFlashId === null && offlinePeerId !== null
      ? Math.min(
          LOBBY_GRACE_SECONDS,
          Math.max(0, Math.ceil((minDeadline - now) / 1000))
        )
      : null;

  // The room, live messages, typing, the teacher's pause, the peer-drop
  // banner, and the honest end reason included. What a demo engine would
  // animate beyond them stays pinned to its quiet value: no auto-end clock
  // runs server-side. The "teacher" fallback keeps the derivation total if
  // the ended flag ever lands without a reason.
  const chat: ChatRoomState = {
    self,
    peers,
    participants: [self, ...everPeers],
    messages,
    typingPeerId,
    peerState:
      returnedFlashId !== null
        ? "reconnected"
        : offlinePeerId !== null
          ? "disconnected"
          : "connected",
    offlinePeerId: returnedFlashId ?? offlinePeerId,
    reconnectSecondsLeft,
    autoEndSecondsLeft: null,
    isEnded,
    isPaused,
    endReason: isEnded ? (endReason ?? "teacher") : null,
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
