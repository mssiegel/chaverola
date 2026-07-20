import { useEffect, useRef, useState } from "react";

import type { ChatPeer, StudentAuth } from "@chaverola/shared";

import { createLobbySocket, type LobbySocket } from "@/lib/socket";
import { mintNonce, type StudentSession } from "@/lib/studentSession";
import { useLatestRef } from "@/lib/useLatestRef";

/*
  The student's live seat in a real activity. Owns the socket for the whole
  seated life — lobby, chatting, and the chat-ended screen — of real
  activities only; the demo (1234) never activates it, so demo surfaces stay
  structurally zero-network.

  Exit semantics matter here: leaving the seated stages through React
  (browser back-as-reset, the removed flow) runs the effect cleanup, which
  emits lobby:leave — an intentional exit, immediate seat removal, and
  mid-chat also the intentional leave-the-chat path. A refresh or pagehide
  never runs React cleanup, so the socket just dies and the server gives the
  seat its grace window (none while matched — a matched seat waits for its
  student until the activity dies). That asymmetry is the design, not an
  accident (see docs/plans/feature-2-live-lobby.md).
*/

export type LobbyPresence =
  "connected" | "reconnecting" | "removed" | "ended" | "full";

/** States a reconnect can't fix — the server told us how this ends. */
function isTerminal(presence: LobbyPresence): boolean {
  return presence === "removed" || presence === "ended" || presence === "full";
}

/** How long the socket outlives its cleanup so the lobby:leave flushes in
 *  its own segment before the close (see the cleanup comment). Real time,
 *  never scaled — live socket timing is never compressed. */
const LEAVE_FLUSH_MS = 300;

function buildStudentAuth(
  joinCode: string,
  session: StudentSession | null
): StudentAuth {
  const auth: StudentAuth = { role: "student", joinCode };
  if (session?.name) auth.name = session.name;
  if (session?.nonce) auth.nonce = session.nonce;
  if (session?.studentId) auth.studentId = session.studentId;
  if (session?.token) auth.token = session.token;
  return auth;
}

/**
 * Live lobby presence for the student side.
 *
 * `active` must be true only while a REAL activity's lobby stage is on
 * screen. While active, one socket connects with an auth callback that
 * re-reads the freshest session on every attempt (auto-reconnects
 * included), persists `lobby:welcome`'s seat credentials, and maps the
 * server's events and rejection codes onto a single presence state the
 * page can render truthfully.
 *
 * `retry` re-attempts the connection after a "full" rejection (socket.io
 * doesn't auto-retry middleware rejections); `retrying` is true until that
 * attempt settles.
 *
 * `onRemoved` / `onEnded` fire from the socket's own callbacks (the remove
 * event or a tombstoned-token rejection; the ended event or an
 * activity_gone rejection) — the page reacts there, where reacting with
 * setState is the subscription pattern the hooks lint asks for. The chat
 * callbacks work the same way: `onChatStarted` is both the match and every
 * resume into it (refresh, wifi recovery, duplicate-tab takeover),
 * `onChatUpdate` is a membership change, `onChatEnded` the below-2 ending —
 * re-sent on resume while the seat is wrapping up.
 *
 * `returnToLobby` is the ended screen's Back tap: it asks the server to
 * return the wrapping-up seat to the queue with a fresh wait clock.
 */
export function useLobbyPresence({
  active,
  joinCode,
  session,
  updateSession,
  onRemoved,
  onEnded,
  onChatStarted,
  onChatUpdate,
  onChatEnded,
}: {
  active: boolean;
  joinCode: string | undefined;
  session: StudentSession | null;
  updateSession: (
    patch: Partial<Pick<StudentSession, "nonce" | "studentId" | "token">>
  ) => void;
  onRemoved?: () => void;
  onEnded?: () => void;
  onChatStarted?: (payload: {
    chatId: string;
    selfCharacterId: string;
    peers: ChatPeer[];
  }) => void;
  onChatUpdate?: (payload: { chatId: string; peers: ChatPeer[] }) => void;
  onChatEnded?: (payload: { reason: "teacher" }) => void;
}): {
  presence: LobbyPresence;
  retrying: boolean;
  retry: () => void;
  returnToLobby: () => void;
} {
  const [presence, setPresence] = useState<LobbyPresence>("connected");
  const [retrying, setRetrying] = useState(false);
  const socketRef = useRef<LobbySocket | null>(null);
  const sessionRef = useLatestRef(session);
  const updateSessionRef = useLatestRef(updateSession);
  const presenceRef = useLatestRef(presence);
  const onRemovedRef = useLatestRef(onRemoved);
  const onEndedRef = useLatestRef(onEnded);
  const onChatStartedRef = useLatestRef(onChatStarted);
  const onChatUpdateRef = useLatestRef(onChatUpdate);
  const onChatEndedRef = useLatestRef(onChatEnded);

  // Sessions from before the live lobby have no nonce — mint one before the
  // first connect so their fresh joins are idempotent too.
  const needsNonce = active && session !== null && session.nonce === undefined;
  useEffect(() => {
    if (needsNonce) updateSessionRef.current({ nonce: mintNonce() });
  }, [needsNonce, updateSessionRef]);

  const ready =
    active &&
    joinCode !== undefined &&
    session !== null &&
    session.nonce !== undefined;

  useEffect(() => {
    if (!ready || joinCode === undefined) return;

    const socket = createLobbySocket(() =>
      buildStudentAuth(joinCode, sessionRef.current)
    );
    socketRef.current = socket;
    // Presence starts (and, via the cleanup below, restarts) as
    // "connected" — optimistic, since the first attempt usually lands well
    // under a second; the first failure downgrades it honestly.

    socket.on("connect", () => {
      setRetrying(false);
      setPresence("connected");
    });
    socket.on("disconnect", () => {
      // Not after a terminal event — the server disconnects us right after
      // lobby:removed / activity:ended, and that must not read as a blip.
      setPresence((p) => (isTerminal(p) ? p : "reconnecting"));
    });
    socket.on("lobby:welcome", (payload) => {
      updateSessionRef.current(payload);
    });
    socket.on("lobby:removed", () => {
      setPresence("removed");
      onRemovedRef.current?.();
    });
    socket.on("activity:ended", () => {
      setPresence("ended");
      onEndedRef.current?.();
    });
    socket.on("chat:started", (payload) => {
      onChatStartedRef.current?.(payload);
    });
    socket.on("chat:update", (payload) => {
      onChatUpdateRef.current?.(payload);
    });
    socket.on("chat:ended", (payload) => {
      onChatEndedRef.current?.(payload);
    });
    socket.on("connect_error", (error) => {
      setRetrying(false);
      if (error.message === "activity_gone") {
        setPresence("ended");
        onEndedRef.current?.();
      } else if (error.message === "removed") {
        setPresence("removed");
        onRemovedRef.current?.();
      } else if (error.message === "full") {
        setPresence("full");
      } else {
        // Anything else is a network-level failure ("xhr poll error", a
        // timeout): socket.io keeps retrying on its own — just say so.
        setPresence((p) => (isTerminal(p) ? p : "reconnecting"));
      }
    });

    // THE dark-phone fast path: background tabs throttle timers, so a phone
    // waking mid-backoff would otherwise sit disconnected for seconds.
    // hidden→visible while disconnected skips the backoff and connects now.
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (isTerminal(presenceRef.current)) return;
      const current = socketRef.current;
      if (current && !current.connected) current.connect();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    socket.connect();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      socketRef.current = null;
      // Reached only through React (back-as-reset, removed, sign-out) —
      // the intentional exit, so the seat goes immediately. On an already
      // dead socket the emit is a harmless no-op.
      socket.emit("lobby:leave");
      socket.removeAllListeners();
      // The disconnect must NOT follow the emit in the same flush: the
      // socket.io server drops any packet it processes after the
      // disconnect, and over wifi the leave and close frames coalesce
      // into one read — the leave silently dies and the seat rides the
      // 2-minute grace (caught on a real phone, 2026-07-19). The gap puts
      // the leave in its own segment, well ahead of the close. If another
      // socket resumes the seat inside this window, the currentSocketId
      // guard makes the late leave a no-op.
      setTimeout(() => socket.disconnect(), LEAVE_FLUSH_MS);
      setPresence("connected");
      setRetrying(false);
    };
  }, [
    ready,
    joinCode,
    sessionRef,
    updateSessionRef,
    presenceRef,
    onRemovedRef,
    onEndedRef,
    onChatStartedRef,
    onChatUpdateRef,
    onChatEndedRef,
  ]);

  const retry = () => {
    const socket = socketRef.current;
    if (!socket || socket.connected) return;
    setRetrying(true);
    socket.connect();
  };

  // A no-op on anything but a wrapping-up seat, so a stray call is safe.
  const returnToLobby = () => {
    socketRef.current?.emit("lobby:back");
  };

  return { presence, retrying, retry, returnToLobby };
}
