import { useEffect, useRef, useState } from "react";

import {
  CHAT_TRANSCRIPT_MAX_LINES,
  activeMembersBy,
  isExactRematchIn,
} from "@chaverola/shared";
import type {
  ActivitySettings,
  ChatSnapshot,
  ChatTranscriptLine,
  LobbyConnectionState,
  QueueEntry,
} from "@chaverola/shared";

import { createLobbySocket, type LobbySocket } from "@/lib/socket";
import { useLatestRef } from "@/lib/useLatestRef";

import type { ChatMessage } from "@/types/chat";

import type { HostEngine } from "./hostEngine";
import type { HostedChat, WaitingStudent } from "./hostWorld";

/*
  The teacher's live engine: one Socket.IO connection per mounted host page
  (auth `{ role: "teacher", hostKey }`). Queue truth comes from the server's
  `queue:snapshot` broadcasts and chat truth from `chats:snapshot`, with
  per-message `chat:transcript-line` deltas keeping transcripts live
  between snapshots — the matching commands (chat:start,
  match:pair-everyone, chat:remove, chat:end, chats:end-all,
  chats:pause-all, chats:resume-all, settings:update) emit over the same
  socket. Ending and pausing are real: the emits are bare, and the flipped
  state arrives on the handler's own chats:snapshot — no local state to
  reconcile. Deliberately imports nothing from hostWorld.ts beyond types —
  tickWorld runs the SIMULATION's auto-match and must never see a real
  student.

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

/** Server truth → the card's message shape. `senderId` is the STUDENT id —
 *  what toHostedChat keys participants by — and `ChatSnapshot.participants`
 *  is everyone ever in the room, so a removed student's lines still resolve
 *  instead of silently disappearing from the card. */
function toTranscriptMessage(line: ChatTranscriptLine): ChatMessage {
  return {
    id: line.id,
    senderId: line.studentId,
    text: line.text,
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
    messages: snapshot.messages.map(toTranscriptMessage),
    status: snapshot.status,
    endReason: snapshot.endReason,
    autoEndSecondsLeft: null,
    reconnectingStudentIds: snapshot.reconnectingStudentIds,
    elapsedSeconds: snapshot.elapsedSeconds,
  };
}

/** The members still actually in the room — the shared rule, not a copy of
 *  hostWorld's simulation. It's `@chaverola/shared`, not `hostWorld.ts`, so
 *  the types-only tripwire above still holds. */
function activeParticipantsOf(chat: HostedChat) {
  return activeMembersBy(
    chat.participants,
    chat.inactiveStudentIds,
    (p) => p.id
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
  const [paused, setPaused] = useState(false);
  const [lastPartners, setLastPartners] = useState<Record<string, string[]>>(
    {}
  );
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
      // `=== true` / `?? {}` tolerate the deploy window where an older
      // server's snapshot has no paused / lastPartners field yet.
      setPaused(payload.paused === true);
      setLastPartners(payload.lastPartners ?? {});
    });
    socket.on("chat:transcript-line", ({ chatId, line }) => {
      // The one delta on the teacher wire (message lines only — a snapshot
      // per message would be far too fat). Safe because chats:snapshot also
      // carries the transcript: a dropped delta heals on the next seat
      // change or reconnect instead of wedging a card.
      setChats((prev) =>
        prev.map((chat) => {
          if (chat.id !== chatId) return chat;
          // Dedupe by line id — cheap insurance against an emit-order
          // change landing a line's snapshot before its delta.
          if (chat.messages.some((m) => m.id === line.id)) return chat;
          const messages = [...chat.messages, toTranscriptMessage(line)];
          // Mirror the server's transcript cap so a long-lived card never
          // outgrows stored truth between snapshots.
          if (messages.length > CHAT_TRANSCRIPT_MAX_LINES) {
            messages.splice(0, messages.length - CHAT_TRANSCRIPT_MAX_LINES);
          }
          return { ...chat, messages };
        })
      );
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
      setPaused(false);
      setLastPartners({});
    };
  }, [hostKey, onActivityGoneRef, onSettingsSyncRef]);

  // The local 1s tick between snapshots: the server stamps waitSeconds and
  // elapsedSeconds at emit time; this keeps the clocks moving so rows and
  // cards never look frozen. Never through scaledMs — real classroom time
  // is never compressed. While paused it stands down entirely: the server's
  // numbers are frozen at the pause anchor, and resume re-snapshots with
  // the clocks shifted, so nothing jumps.
  useEffect(() => {
    if (paused) return;
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
  }, [paused]);

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
  const endChat = (chatId: string) => {
    socketRef.current?.emit("chat:end", { chatId });
  };
  const endAllChats = () => {
    socketRef.current?.emit("chats:end-all");
  };
  const pauseAllChats = () => {
    socketRef.current?.emit("chats:pause-all");
  };
  const resumeAllChats = () => {
    socketRef.current?.emit("chats:resume-all");
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
    // rematchNotice / dismiss are still stubbed — Pair-everyone's notice
    // lands in feature 9 prompt 3. isExactRematch reads the server's
    // one-round lastPartners, projected on chats:snapshot.
    rematchNotice: null,
    dismissRematchNotice: noop,
    isExactRematch: (ids) => isExactRematchIn(lastPartners, ids),
    startChat,
    pairEveryone,
    endChat,
    endAllChats,
    paused,
    pauseAllChats,
    resumeAllChats,
    removeFromQueue,
    removeFromChat,
    updateSettings,
    connection,
  };
}
