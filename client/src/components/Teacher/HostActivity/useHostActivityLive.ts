import { useEffect, useRef, useState } from "react";

import type { LobbyConnectionState, QueueEntry } from "@chaverola/shared";

import { createLobbySocket, type LobbySocket } from "@/lib/socket";
import { useLatestRef } from "@/lib/useLatestRef";

import type { HostEngine } from "./hostEngine";
import type { HostedChat, WaitingStudent } from "./hostWorld";

/*
  The teacher's live engine: one Socket.IO connection per mounted host page
  (auth `{ role: "teacher", hostKey }`), queue truth from the server's
  `queue:snapshot` broadcasts, remove via `queue:remove`. Deliberately
  imports nothing from hostWorld.ts beyond types — tickWorld runs the
  SIMULATION's auto-match (on by default!) and must never see a real
  student. The matching-era members are inert stubs until feature 3.

  The server refreshes the activity's TTL while this socket is connected
  (the teacher socket is the keep-alive), so an open host page keeps its
  class alive with no client-side work here.
*/

/** Server truth → the row shape the dashboard renders. */
function toWaitingStudent(entry: QueueEntry): WaitingStudent {
  return {
    id: entry.id,
    realName: entry.name,
    waitSeconds: entry.waitSeconds,
    connection: entry.connection,
  };
}

const noop = () => {};
const NO_CHATS: HostedChat[] = [];
const NO_CHARACTER_IDS: ReadonlySet<string> = new Set();

/**
 * Live queue presence for the host page. Mount only for REAL activities —
 * the `1234` demo renders through useHostActivityDemo and stays
 * zero-network.
 *
 * `connection` goes "reconnecting" the moment the socket drops; socket.io
 * auto-reconnects (plus a hidden→visible fast path for a laptop waking
 * mid-class), and the on-join snapshot restores fresh truth.
 *
 * `onActivityGone` fires from the socket's callbacks when the server says
 * the activity no longer exists (a wipe/restart mid-class) — the page
 * reacts by falling back to its friendly not-found.
 */
export function useHostActivityLive({
  hostKey,
  onActivityGone,
}: {
  hostKey: string;
  onActivityGone: () => void;
}): HostEngine {
  const [waiting, setWaiting] = useState<WaitingStudent[]>([]);
  const [connection, setConnection] =
    useState<LobbyConnectionState>("connected");
  const socketRef = useRef<LobbySocket | null>(null);
  const onActivityGoneRef = useLatestRef(onActivityGone);

  useEffect(() => {
    const socket = createLobbySocket(() => ({ role: "teacher", hostKey }));
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnection("connected");
    });
    socket.on("disconnect", () => {
      setConnection("reconnecting");
    });
    socket.on("queue:snapshot", ({ students }) => {
      setWaiting(students.map(toWaitingStudent));
    });
    socket.on("connect_error", (error) => {
      // "invalid" is structurally unreachable (the page validated the
      // hostKey pattern before mounting us), but if it ever fires, gone is
      // more honest than an amber banner that can never clear.
      if (error.message === "activity_gone" || error.message === "invalid") {
        onActivityGoneRef.current();
      } else {
        // Network-level failure — socket.io keeps retrying on its own.
        setConnection("reconnecting");
      }
    });

    // A teacher laptop that slept through a discussion wakes mid-backoff;
    // hidden→visible while disconnected skips the throttled timer and
    // connects right now — same fast path as the student lobby.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      const current = socketRef.current;
      if (current && !current.connected) current.connect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    socket.connect();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socketRef.current = null;
      socket.disconnect();
      socket.removeAllListeners();
      setWaiting([]);
      setConnection("connected");
    };
  }, [hostKey, onActivityGoneRef]);

  // The local 1s tick between snapshots: the server stamps waitSeconds at
  // emit time; this keeps the clocks moving so rows never look frozen.
  // Never through scaledMs — real classroom time is never compressed.
  useEffect(() => {
    const interval = setInterval(() => {
      setWaiting((prev) =>
        prev.length === 0
          ? prev
          : prev.map((s) => ({ ...s, waitSeconds: s.waitSeconds + 1 }))
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const removeFromQueue = (studentId: string) => {
    socketRef.current?.emit("queue:remove", { studentId });
  };

  return {
    waiting,
    // Matching-era stubs — feature 3 replaces these with the real thing.
    chatsInProgress: NO_CHATS,
    completedChats: NO_CHATS,
    studentsChattingCount: 0,
    characterIdsInUse: NO_CHARACTER_IDS,
    leftoverStudentId: null,
    rematchNotice: null,
    dismissRematchNotice: noop,
    isExactRematch: () => false,
    startChat: noop,
    pairEveryone: noop,
    endChat: noop,
    endAllChats: noop,
    paused: false,
    pauseAllChats: noop,
    resumeAllChats: noop,
    removeFromQueue,
    removeFromChat: noop,
    connection,
  };
}
