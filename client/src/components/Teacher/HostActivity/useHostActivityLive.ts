import { useEffect, useRef, useState } from "react";

import type {
  ActivitySettings,
  ChatSnapshot,
  LobbyConnectionState,
  QueueEntry,
} from "@chaverola/shared";

import { createLobbySocket, type LobbySocket } from "@/lib/socket";
import { useLatestRef } from "@/lib/useLatestRef";

import type { HostEngine } from "./hostEngine";
import type { HostedChat, WaitingStudent } from "./hostWorld";

/*
  The teacher's live engine: one Socket.IO connection per mounted host page
  (auth `{ role: "teacher", hostKey }`). Queue truth comes from the server's
  `queue:snapshot` broadcasts and chat truth from `chats:snapshot` — the
  matching commands (chat:start, match:pair-everyone, chat:remove,
  settings:update) emit over the same socket. Deliberately imports nothing
  from hostWorld.ts beyond types — tickWorld runs the SIMULATION's
  auto-match and must never see a real student. Ending/pausing stay inert
  (endingEnabled: false) until the messaging feature makes them real.

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

/** Server truth → the chat shape the dashboard renders. The wire's
 *  `character` is the SERVER roster's copy, which withCurrentCharacters
 *  keeps as the fallback when a local edit dropped the character. */
function toHostedChat(snapshot: ChatSnapshot): HostedChat {
  return {
    id: snapshot.id,
    participants: snapshot.participants.map((p) => ({
      id: p.id,
      realName: p.name,
      character: p.character,
    })),
    inactiveStudentIds: snapshot.inactiveStudentIds,
    // Messaging isn't wired yet — the card renders its empty-transcript
    // hint until the messaging feature fills this in.
    messages: [],
    status: snapshot.status,
    endReason: snapshot.endReason,
    autoEndSecondsLeft: null,
    reconnectingStudentIds: snapshot.reconnectingStudentIds,
    elapsedSeconds: snapshot.elapsedSeconds,
  };
}

/** The members still actually in the room. A local copy of hostWorld's
 *  activeChatMembers on purpose — the tripwire above forbids importing
 *  simulation code here. */
function activeParticipantsOf(chat: HostedChat) {
  return chat.participants.filter(
    (p) => !chat.inactiveStudentIds.includes(p.id)
  );
}

const noop = () => {};

/**
 * Live presence + matching for the host page. Mount only for REAL
 * activities — the `1234` demo renders through useHostActivityDemo and
 * stays zero-network.
 *
 * `connection` goes "reconnecting" the moment the socket drops; socket.io
 * auto-reconnects (plus a hidden→visible fast path for a laptop waking
 * mid-class), and the on-join snapshots restore fresh truth.
 *
 * `onActivityGone` fires from the socket's callbacks when the server says
 * the activity no longer exists (a wipe/restart mid-class) — the page
 * reacts by falling back to its friendly not-found.
 *
 * `onSettingsSync` fires when ANOTHER of the teacher's devices edits the
 * settings (`settings:changed` excludes the sender) — the page folds the
 * server's copy into its local activity state.
 */
export function useHostActivityLive({
  hostKey,
  onActivityGone,
  onSettingsSync,
}: {
  hostKey: string;
  onActivityGone: () => void;
  onSettingsSync: (settings: ActivitySettings) => void;
}): HostEngine {
  const [waiting, setWaiting] = useState<WaitingStudent[]>([]);
  const [chats, setChats] = useState<HostedChat[]>([]);
  const [leftoverStudentId, setLeftoverStudentId] = useState<string | null>(
    null
  );
  const [connection, setConnection] =
    useState<LobbyConnectionState>("connected");
  const socketRef = useRef<LobbySocket | null>(null);
  const onActivityGoneRef = useLatestRef(onActivityGone);
  const onSettingsSyncRef = useLatestRef(onSettingsSync);

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
    socket.on("chats:snapshot", (payload) => {
      setChats(payload.chats.map(toHostedChat));
      setLeftoverStudentId(payload.leftoverStudentId);
    });
    socket.on("settings:changed", ({ settings }) => {
      onSettingsSyncRef.current(settings);
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
      setChats([]);
      setLeftoverStudentId(null);
      setConnection("connected");
    };
  }, [hostKey, onActivityGoneRef, onSettingsSyncRef]);

  // The local 1s tick between snapshots: the server stamps waitSeconds and
  // elapsedSeconds at emit time; this keeps the clocks moving so rows and
  // cards never look frozen. Never through scaledMs — real classroom time
  // is never compressed.
  useEffect(() => {
    const interval = setInterval(() => {
      setWaiting((prev) =>
        prev.length === 0
          ? prev
          : prev.map((s) => ({ ...s, waitSeconds: s.waitSeconds + 1 }))
      );
      setChats((prev) =>
        prev.some((c) => c.status === "active")
          ? prev.map((c) =>
              c.status === "active" && c.elapsedSeconds !== undefined
                ? { ...c, elapsedSeconds: c.elapsedSeconds + 1 }
                : c
            )
          : prev
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const removeFromQueue = (studentId: string) => {
    socketRef.current?.emit("queue:remove", { studentId });
  };
  const startChat = (studentIds: string[]) => {
    socketRef.current?.emit("chat:start", { studentIds });
  };
  const pairEveryone = () => {
    socketRef.current?.emit("match:pair-everyone");
  };
  const removeFromChat = (chatId: string, studentId: string) => {
    socketRef.current?.emit("chat:remove", { chatId, studentId });
  };
  const updateSettings = (settings: ActivitySettings) => {
    socketRef.current?.emit("settings:update", { settings });
  };

  const chatsInProgress = chats.filter((c) => c.status === "active");
  const completedChats = chats.filter((c) => c.status === "ended");
  const characterIdsInUse = new Set(
    chatsInProgress.flatMap((c) =>
      activeParticipantsOf(c).map((p) => p.character.id)
    )
  );

  return {
    waiting,
    chatsInProgress,
    completedChats,
    studentsChattingCount: chatsInProgress.reduce(
      (sum, c) => sum + activeParticipantsOf(c).length,
      0
    ),
    characterIdsInUse,
    leftoverStudentId,
    // No rematch memory server-side this feature: chats effectively never
    // end, so exactness is structurally impossible (see the plan/DECISIONS).
    rematchNotice: null,
    dismissRematchNotice: noop,
    isExactRematch: () => false,
    startChat,
    pairEveryone,
    // Ending/pausing stay placeholders until messaging ships.
    endChat: noop,
    endAllChats: noop,
    paused: false,
    pauseAllChats: noop,
    resumeAllChats: noop,
    removeFromQueue,
    removeFromChat,
    updateSettings,
    endingEnabled: false,
    connection,
  };
}
