import { useEffect, useRef, useState } from "react";

import { characterLabel } from "@/lib/characterLabel";
import { nextId, randomFrom } from "@/lib/random";
import { useLatestRef } from "@/lib/useLatestRef";
import { useSecondCountdown } from "@/lib/useSecondCountdown";
import { NOTICE_SENDER_ID } from "@/types/chat";
import type {
  ChatEndReason,
  ChatMessage,
  ChatRoomActions,
  ChatRoomState,
  ChatScenario,
  ChatStatus,
  Participant,
  PeerConnectionState,
  ScriptedLine,
} from "@/types/chat";

/**
 * Everything `useChatDemo` hands back: the shared room contract
 * (ChatRoomState + ChatRoomActions from types/chat — everything the views
 * are allowed to depend on) plus dev-only triggers for events a real
 * backend will push. Exported so a parent can own the hook and fan its chat
 * out to more than one view (the homepage feeds the same live chat to the
 * student hero box and the teacher preview card).
 */
export interface ChatDemo extends ChatRoomState, ChatRoomActions {
  peerEndsChat: () => void;
  disconnectPeer: () => void;
  reconnectPeer: () => void;
  skipReconnectWait: () => void;
  skipAutoEndWait: () => void;
  nudgePeer: () => void;
}

export interface ChatDemoOptions {
  /**
   * The activity's auto-end clock for this chat, in seconds. Omit (or pass
   * null) for no clock — the homepage hero chat must never time out under a
   * visitor mid-read.
   */
  autoEndSeconds?: number | null;
}

/**
 * How long a disconnected peer has to come back before the room moves on:
 * a 1:1 chat ends, a group drops them and keeps going (see DECISIONS.md).
 */
export const RECONNECT_WINDOW_SECONDS = 120;

/** Where "skip the wait" jumps the countdown to, so the timeout is testable. */
const SKIP_WAIT_SECONDS = 3;

/**
 * The auto-end fast-forward is staged: the first press jumps just above the
 * final minute (to show the clock's finale state), a second press jumps to
 * the last few seconds (to show the expiry itself). Shared with the host
 * page's engine so both fast-forwards behave the same.
 */
export const SKIP_AUTO_END_TO_FINALE_SECONDS = 63;
export const SKIP_AUTO_END_TO_EXPIRY_SECONDS = 5;

/**
 * The demo chat "engine". With no backend, this simulates a live room: the
 * peer(s) send scripted opening lines, keep chatting with ambient banter, react
 * to what the student sends, and it exposes dev controls to trigger
 * disconnect / reconnect / end-chat events. A disconnected peer gets a
 * reconnect window with a live countdown; if it runs out, a 1:1 chat ends
 * ("peer-timeout") while a group chat drops the peer and keeps going.
 */
export function useChatDemo(
  scenario: ChatScenario,
  options?: ChatDemoOptions
): ChatDemo {
  const autoEndSeconds = options?.autoEndSeconds ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingPeerId, setTypingPeerId] = useState<string | null>(null);
  const [peerState, setPeerState] = useState<PeerConnectionState>("connected");
  const [offlinePeerId, setOfflinePeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>("active");
  const [endReason, setEndReason] = useState<ChatEndReason | null>(null);
  /** Who ended the chat, when endReason is "peer". */
  const [endedByPeerId, setEndedByPeerId] = useState<string | null>(null);
  /** Peers removed from the room after their reconnect window ran out. */
  const [droppedPeerIds, setDroppedPeerIds] = useState<ReadonlySet<string>>(
    () => new Set()
  );

  // Refs so timer callbacks always read the latest state; some spots also
  // write them eagerly so a same-tick timer can't act on a stale value.
  const statusRef = useLatestRef(status);
  const peerStateRef = useLatestRef(peerState);
  const droppedPeerIdsRef = useLatestRef(droppedPeerIds);

  // The reconnect window's clock. At zero the room moves on — a 1:1 chat
  // ends (nobody is left to talk to), a group chat drops the peer with a
  // notice and keeps going. Dropping is NOT ending: see DECISIONS.md →
  // "A group chat drops a timed-out peer instead of ending".
  const [reconnectSecondsLeft, setReconnectSecondsLeft] = useSecondCountdown(
    null,
    status === "active",
    () => {
      const offline = scenario.peers.find((p) => p.id === offlinePeerId);
      const remaining = scenario.peers.filter(
        (p) => !droppedPeerIds.has(p.id) && p.id !== offlinePeerId
      );
      if (!offline || remaining.length === 0) {
        endChat("peer-timeout");
        return;
      }
      setDroppedPeerIds((prev) => new Set(prev).add(offline.id));
      droppedPeerIdsRef.current = new Set(droppedPeerIds).add(offline.id);
      setPeerState("connected");
      setOfflinePeerId(null);
      setMessages((prev) => [
        ...prev,
        {
          id: nextId("m"),
          senderId: NOTICE_SENDER_ID,
          kind: "notice",
          text: `${characterLabel(offline)} couldn't get back in and left the chat`,
        },
      ]);
    }
  );

  // The activity's per-chat auto-end clock. At zero the chat ends for
  // everyone with reason "timer" (the ⏰ "Time's up!" wrap-up copy). See
  // DECISIONS.md. (endChat is declared below; the callback only runs later.)
  const [autoEndSecondsLeft, setAutoEndSecondsLeft] = useSecondCountdown(
    autoEndSeconds,
    status === "active",
    () => endChat("timer")
  );

  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const later = (fn: () => void, ms: number) => {
    const handle = setTimeout(() => {
      timers.current.delete(handle);
      fn();
    }, ms);
    timers.current.add(handle);
    return handle;
  };

  const clearAllTimers = () => {
    timers.current.forEach((handle) => clearTimeout(handle));
    timers.current.clear();
    typingTimer.current = null;
  };

  const appendMessage = (senderId: string, text: string) => {
    setMessages((prev) => [...prev, { id: nextId("m"), senderId, text }]);
  };

  /** The peers still in the room, per the freshest dropped set (timer-safe). */
  const activePeersNow = () =>
    scenario.peers.filter((p) => !droppedPeerIdsRef.current.has(p.id));

  const randomActivePeer = (): Participant | undefined => {
    const active = activePeersNow();
    return active.length > 0 ? randomFrom(active) : undefined;
  };

  /** Show a typing indicator for `senderId`, then post their message. */
  const peerSpeak = (senderId: string, text: string, typeMs = 1200) => {
    if (statusRef.current !== "active") return;
    setTypingPeerId(senderId);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = later(() => {
      typingTimer.current = null;
      setTypingPeerId(null);
      if (statusRef.current === "active") appendMessage(senderId, text);
    }, typeMs);
  };

  // Boot / re-boot the scenario. Re-runs if the scenario changes (demo toggle).
  useEffect(() => {
    clearAllTimers();
    setMessages(
      scenario.seedMessages.map((m) => ({ id: nextId("seed"), ...m }))
    );
    setTypingPeerId(null);
    setPeerState("connected");
    setOfflinePeerId(null);
    setStatus("active");
    setEndReason(null);
    setEndedByPeerId(null);
    setDroppedPeerIds(new Set());
    setReconnectSecondsLeft(null);
    setAutoEndSecondsLeft(autoEndSeconds);
    statusRef.current = "active";
    peerStateRef.current = "connected";
    droppedPeerIdsRef.current = new Set();

    const runScriptedLine = (line: ScriptedLine) => {
      if (statusRef.current !== "active") return;
      // A dropped peer's lines die with them.
      if (droppedPeerIdsRef.current.has(line.senderId)) return;
      // If the peer is offline when a line is due, retry shortly.
      if (peerStateRef.current !== "connected") {
        later(() => runScriptedLine(line), 1500);
        return;
      }
      peerSpeak(line.senderId, line.text);
    };

    const scheduleAmbient = () => {
      const delay = 12000 + Math.random() * 6000;
      later(() => {
        if (
          statusRef.current === "active" &&
          peerStateRef.current === "connected" &&
          !typingTimer.current
        ) {
          const speaker = randomActivePeer();
          if (speaker) peerSpeak(speaker.id, randomFrom(scenario.ambientLines));
        }
        if (statusRef.current === "active") scheduleAmbient();
      }, delay);
    };

    let cumulative = 0;
    scenario.script.forEach((line) => {
      cumulative += line.delayMs;
      later(() => runScriptedLine(line), cumulative);
    });
    // An empty ambient pool means the room goes quiet once the script ends
    // (the homepage hero does this on purpose — see DECISIONS.md).
    if (scenario.ambientLines.length > 0) {
      later(scheduleAmbient, cumulative + 6000);
    }

    return clearAllTimers;
    // Re-boot only when the scenario changes; the compiler keeps the helper
    // functions referentially stable, so they don't belong in the dep array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario]);

  // ---- Student actions ------------------------------------------------------

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || statusRef.current !== "active") return;
    appendMessage(scenario.self.id, trimmed);
    later(
      () => {
        if (
          statusRef.current !== "active" ||
          peerStateRef.current !== "connected"
        ) {
          return;
        }
        const speaker = randomActivePeer();
        if (speaker) peerSpeak(speaker.id, randomFrom(scenario.replyLines));
      },
      800 + Math.random() * 900
    );
  };

  // ---- Dev/demo event triggers ---------------------------------------------

  const disconnectPeer = () => {
    if (statusRef.current !== "active") return;
    const target = activePeersNow()[0];
    if (!target) return;
    setOfflinePeerId(target.id);
    setPeerState("disconnected");
    setTypingPeerId(null);
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
    // Their reconnect window starts now.
    setReconnectSecondsLeft(RECONNECT_WINDOW_SECONDS);
  };

  const reconnectPeer = () => {
    // Made it back in time — the countdown clears right away.
    setReconnectSecondsLeft(null);
    setPeerState("reconnecting");
    later(() => {
      setPeerState("reconnected");
      later(() => {
        setPeerState((s) => (s === "reconnected" ? "connected" : s));
        setOfflinePeerId(null);
      }, 2200);
    }, 1600);
  };

  /** Dev-only: fast-forward the reconnect window to its last few seconds. */
  const skipReconnectWait = () => {
    setReconnectSecondsLeft((s) =>
      s === null ? s : Math.min(s, SKIP_WAIT_SECONDS)
    );
  };

  /**
   * Dev-only: fast-forward the auto-end clock. First press lands just above
   * the final minute (the finale state), pressing again lands on the expiry.
   */
  const skipAutoEndWait = () => {
    setAutoEndSecondsLeft((s) => {
      if (s === null) return s;
      return s > SKIP_AUTO_END_TO_FINALE_SECONDS
        ? SKIP_AUTO_END_TO_FINALE_SECONDS
        : Math.min(s, SKIP_AUTO_END_TO_EXPIRY_SECONDS);
    });
  };

  const nudgePeer = () => {
    if (
      statusRef.current !== "active" ||
      peerStateRef.current !== "connected"
    ) {
      return;
    }
    const speaker = randomActivePeer();
    if (!speaker) return;
    peerSpeak(
      speaker.id,
      randomFrom([...scenario.ambientLines, ...scenario.replyLines])
    );
  };

  const endChat = (reason: ChatEndReason) => {
    setStatus("ended");
    statusRef.current = "ended";
    setEndReason(reason);
    setTypingPeerId(null);
    setReconnectSecondsLeft(null);
    clearAllTimers();
  };

  /** Another student in the room taps End chat — it ends for everyone. */
  const peerEndsChat = () => {
    if (statusRef.current !== "active") return;
    // Prefer a peer who's actually online; someone offline can't tap anything.
    const active = activePeersNow();
    const ender = active.find((p) => p.id !== offlinePeerId) ?? active[0];
    if (!ender) return;
    setEndedByPeerId(ender.id);
    endChat("peer");
  };

  /** Everyone still in the room (a group may have dropped someone). */
  const activePeers = scenario.peers.filter((p) => !droppedPeerIds.has(p.id));
  /** Everyone who was ever in the room — message lines and colors need them. */
  const participants = [scenario.self, ...scenario.peers];

  return {
    self: scenario.self,
    peers: activePeers,
    participants,
    messages,
    typingPeerId,
    peerState,
    offlinePeerId,
    reconnectSecondsLeft,
    autoEndSecondsLeft,
    isEnded: status === "ended",
    endReason,
    endedByPeerId,
    send,
    endChat,
    peerEndsChat,
    disconnectPeer,
    reconnectPeer,
    skipReconnectWait,
    skipAutoEndWait,
    nudgePeer,
  };
}
