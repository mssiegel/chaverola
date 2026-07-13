import { useEffect, useRef, useState } from "react";

import type {
  ChatMessage,
  ChatScenario,
  ChatStatus,
  Participant,
  PeerConnectionState,
  ScriptedLine,
} from "@/types/chat";

/**
 * Everything `useChatDemo` hands back — state plus actions. Exported so a
 * parent can own the hook and fan its chat out to more than one view (the
 * homepage feeds the same live chat to the student hero box and the teacher
 * preview card).
 */
export type ChatDemo = ReturnType<typeof useChatDemo>;

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

function randomFrom<T>(items: readonly T[]): T {
  // Callers always pass non-empty arrays, and the index is < items.length.
  return items[Math.floor(Math.random() * items.length)]!;
}

/**
 * The demo chat "engine". With no backend, this simulates a live room: the
 * peer(s) send scripted opening lines, keep chatting with ambient banter, react
 * to what the student sends, and it exposes dev controls to trigger
 * disconnect / reconnect / end-chat events.
 */
export function useChatDemo(scenario: ChatScenario) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingPeerId, setTypingPeerId] = useState<string | null>(null);
  const [peerState, setPeerState] = useState<PeerConnectionState>("connected");
  const [offlinePeerId, setOfflinePeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<ChatStatus>("active");

  // Refs so timer callbacks always read the latest state. Synced in an effect
  // (not during render) so the React Compiler can optimize this hook — timers
  // fire asynchronously, after the commit, so the refs are current by then.
  const statusRef = useRef(status);
  const peerStateRef = useRef(peerState);
  useEffect(() => {
    statusRef.current = status;
    peerStateRef.current = peerState;
  });

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

  const randomPeer = (): Participant => randomFrom(scenario.peers);

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
    statusRef.current = "active";
    peerStateRef.current = "connected";

    const runScriptedLine = (line: ScriptedLine) => {
      if (statusRef.current !== "active") return;
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
          peerSpeak(randomPeer().id, randomFrom(scenario.ambientLines));
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
        peerSpeak(randomPeer().id, randomFrom(scenario.replyLines));
      },
      800 + Math.random() * 900
    );
  };

  // ---- Dev/demo event triggers ---------------------------------------------

  const disconnectPeer = () => {
    setOfflinePeerId(scenario.peers[0]?.id ?? null);
    setPeerState("disconnected");
    setTypingPeerId(null);
    if (typingTimer.current) {
      clearTimeout(typingTimer.current);
      typingTimer.current = null;
    }
  };

  const reconnectPeer = () => {
    setPeerState("reconnecting");
    later(() => {
      setPeerState("reconnected");
      later(() => {
        setPeerState((s) => (s === "reconnected" ? "connected" : s));
        setOfflinePeerId(null);
      }, 2200);
    }, 1600);
  };

  const nudgePeer = () => {
    if (
      statusRef.current !== "active" ||
      peerStateRef.current !== "connected"
    ) {
      return;
    }
    peerSpeak(
      randomPeer().id,
      randomFrom([...scenario.ambientLines, ...scenario.replyLines])
    );
  };

  const endChat = () => {
    setStatus("ended");
    statusRef.current = "ended";
    setTypingPeerId(null);
    clearAllTimers();
  };

  const participants = [scenario.self, ...scenario.peers];

  return {
    self: scenario.self,
    peers: scenario.peers,
    participants,
    messages,
    typingPeerId,
    peerState,
    offlinePeerId,
    isEnded: status === "ended",
    send,
    endChat,
    disconnectPeer,
    reconnectPeer,
    nudgePeer,
  };
}
