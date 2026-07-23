import { useEffect, useState } from "react";

import { LOBBY_GRACE_SECONDS } from "@chaverola/shared";

import { Chatbox } from "@/components/Student/Chatbox";
import { useBackGuard } from "@/lib/useBackGuard";
import type { ChatMessage, ChatRoomState, Participant } from "@/types/chat";

interface LiveChatStageProps {
  /** The student's own seat in the room (realName from the session). */
  self: Participant;
  /** Peers still in the room. Characters only during the chat — realName is
   *  "" until the reveal stamps it at end time (when revealNames is on). */
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
  /** Why the chat ended (chat:ended's payload): "student" is the student's
   *  own End chat (the 🎬 wrap-up) and "self-left" their own Leave from a
   *  group that kept going (the 👋 one), "peer" is a partner's leave — the
   *  🎭 wrap-up naming their character — "peer-timeout" a 1:1 partner's
   *  expired grace (the 🔌 wrap-up), "self-timeout" the student's own (the
   *  📶 wrap-up on their return), "teacher" everything else. Null while the
   *  chat is going. */
  endReason:
    | "teacher"
    | "student"
    | "peer"
    | "self-left"
    | "peer-timeout"
    | "self-timeout"
    | null;
  /** Who ended it — the leaver's characterId, riding chat:ended only with
   *  reason "peer" (null otherwise; also null from an older server, which
   *  falls back to the generic "Your partner" copy). */
  endedByPeerId: string | null;
  /** Whether this ended chat revealed real names — true only when the
   *  teacher's "Reveal names when a chat ends" setting was on at end time.
   *  The names ride chat:ended and are already stamped onto `everPeers`; this
   *  flag flips the ended screen from the secret box to the reveal card. */
  revealNames: boolean;
  /** The teacher's activity-wide pause (activity:paused / lobby:welcome).
   *  Chatbox freezes the room: banner, locked composer. Ended wins. */
  isPaused: boolean;
  /** Sends a real message over the seat's socket (chat:send). */
  onSend: (text: string) => void;
  /** A keystroke happened — the hook throttles it into chat:typing
   *  heartbeats. */
  onTyping: () => void;
  /**
   * The confirmed mid-chat exit — End chat in a duo, Leave in a group, one
   * callback because the server re-reads the room's size and decides which
   * it was (chat:leave). The seat survives it: the wrap-up screen arrives as
   * a chat:ended, and the lobby is a tap away, not a sign-out.
   */
  onEndChat: () => void;
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
 * The ending tells the truth as well — chat:ended's reason renders the 🎭
 * wrap-up naming the leaver's character when a partner ended it, the 🔌 one
 * when a 1:1 partner's grace ran out (and the 📶 one when it was this
 * student's own, replayed on their return), not the teacher's 🎓. The
 * name reveal is real too (feature 10): when the teacher's "Reveal names when
 * a chat ends" setting is on, chat:ended carries each peer's real name and the
 * ended screen names who the student was really with — otherwise the neutral
 * secret box holds. And the exit keeps the seat (chat:leave): whoever taps it
 * gets their own wrap-up screen — 🎬 for ending a duo, 👋 for stepping out of
 * a group — reveal included, and returns to the lobby by their own tap like
 * everyone else. Which is why the confirm needs no live-only copy: Chatbox's
 * own "head back to the lobby whenever you're ready" is now the truth here.
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
  endedByPeerId,
  revealNames,
  isPaused,
  onSend,
  onTyping,
  onEndChat,
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
  // banner, and the honest end reason included. The "teacher" fallback keeps
  // the derivation total if the ended flag ever lands without a reason.
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
    isEnded,
    isPaused,
    endReason: isEnded ? (endReason ?? "teacher") : null,
    endedByPeerId: isEnded ? endedByPeerId : null,
  };

  return (
    // Phones: fill the world edge-to-edge (~8px margins) so the composer sits
    // on the keyboard (self-stretch without a width lets -mx-2 widen the box);
    // sm+: today's fixed centered card.
    <div className="-mx-2 flex min-h-[min(70dvh,620px)] flex-1 animate-in flex-col self-stretch duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:mx-0 sm:h-[min(70dvh,620px)] sm:flex-none">
      <Chatbox
        chat={chat}
        revealNames={revealNames}
        onSend={onSend}
        onTyping={onTyping}
        onEndChat={onEndChat}
        onLeaveChat={onEndChat}
        onBackToLobby={onBackToLobby}
        endConfirmOpen={confirmOpen}
        onEndConfirmOpenChange={setConfirmOpen}
        endedSecretLine="Names stay secret. That's the whole game."
      />
    </div>
  );
}
