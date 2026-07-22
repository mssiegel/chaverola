import { useRef, useState } from "react";

import { TYPING_INDICATOR_TTL_MS } from "@chaverola/shared";

import type { Activity } from "@/types/activity";
import type { StudentSession } from "@/lib/studentSession";
import type { ActivityChatScenarioKey } from "@/mockData";
import { useLobbyPresence } from "@/pages/student/useLobbyPresence";

import { RETURNED_FLASH_MS, type ActiveMatch } from "./stageTypes";
import {
  applyChatLine,
  applyChatStarted,
  applyChatUpdate,
  applyPeerDropped,
  applyPeerReturned,
  applyPeerTyping,
  clearReturnedFlash,
  clearTypingPeer,
} from "./liveMatchState";

/**
 * Owns the student's live/demo match state and drives the real seat.
 *
 * `match` / `chatEnded` / `liveEndReason` live here, fed by the demo triggers
 * (`startMatch`) and the socket (via `useLobbyPresence` below). The eight
 * socket callbacks are one-liners over the pure reducers in
 * `liveMatchState.ts`; what stays here is the state the reducers can't hold
 * — the typing-TTL and 🎉-flash timer refs, and the synchronous
 * `liveChatIdRef`.
 *
 * `onRemoved` / `onEnded` are caller-supplied because they touch page-level
 * state (sign-out, the name field, the activity-gone latch); this hook wraps
 * `onRemoved` to also clear its own match, and forwards `onEnded` untouched.
 */
export function useActiveMatch({
  activity,
  session,
  updateSession,
  seated,
  isRealActivity,
  activityGoneFromSocket,
  onRemoved,
  onEnded,
}: {
  activity: Activity | undefined;
  session: StudentSession | null;
  updateSession: (
    patch: Partial<Pick<StudentSession, "nonce" | "studentId" | "token">>
  ) => void;
  seated: boolean;
  isRealActivity: boolean;
  activityGoneFromSocket: boolean;
  onRemoved: () => void;
  onEnded: () => void;
}) {
  // Set by the lobby's demo match triggers (demo) or by the server's
  // chat:started (real activities, via the presence hook below).
  const [match, setMatch] = useState<ActiveMatch | null>(null);
  // Mirrors the chat engine's ended flag up here so the stage (and with it
  // the page title) can tell chatting from ended.
  const [chatEnded, setChatEnded] = useState(false);
  // Why the live chat ended, from chat:ended's payload — "peer-timeout" is
  // a 1:1 partner's expired grace (the 🔌 wrap-up), "self-timeout" the
  // student's own (the 📶 wrap-up, delivered on their return), "teacher"
  // everything else. Beside chatEnded rather than on the match state: it
  // describes the ending, and it resets on the same edges.
  const [liveEndReason, setLiveEndReason] = useState<
    "teacher" | "peer-timeout" | "self-timeout" | null
  >(null);

  // The typing indicator's TTL: re-armed on every relayed heartbeat, so it
  // runs from the LAST one. No cleanup effect on purpose: a stray
  // post-unmount fire is a guarded setMatch no-op.
  const typingExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The 🎉 flash's clear timer — same no-cleanup pattern: a stray
  // post-unmount fire is a guarded setMatch no-op.
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The chat this socket has been handed via chat:started, updated
  // SYNCHRONOUSLY (a ref, not state) so onChatEnded can trust it inside
  // the same event burst. Cleared wherever the match clears.
  const liveChatIdRef = useRef<string | null>(null);

  const startMatch = (scenarioKey: ActivityChatScenarioKey) => {
    setChatEnded(false);
    setMatch((prev) => ({
      kind: "demo",
      seq: (prev?.kind === "demo" ? prev.seq : 0) + 1,
      scenarioKey,
    }));
  };

  // Back to the queue: only ever by the student's own tap (see DECISIONS.md).
  const backToLobby = () => {
    liveChatIdRef.current = null;
    setMatch(null);
    setChatEnded(false);
    setLiveEndReason(null);
  };

  // The live seat. Active through the whole seated life of a real activity
  // — lobby, chatting, and the chat-ended screen — so a matched student's
  // socket lives on and a refresh resumes into the chat; the demo (1234)
  // keeps zero network by construction.
  // - onRemoved (the socket event, or a tombstoned token on a reconnect
  //   attempt) drives the same flow the demo button does; the caller clears
  //   the session and name, and this hook clears the match with the seat.
  // - onEnded latches the dead activity's code (caller), which flips the
  //   stage to the activity-gone screen.
  // - onChatStarted is both the match and every resume into it; the reducer
  //   merges the missed transcript backlog, reconciles peers, then rebuilds
  //   the offline map from the payload's reconnectingPeers backlog.
  // - onChatEnded keys off liveChatIdRef, not the render closure's match:
  //   the reaped-returner replay (chat:started + chat:ended in one burst)
  //   arrives before React re-renders, so the closure would still see null
  //   and bounce the 📶 screen back to the queue. No chat:started this
  //   connection means nothing to show — straight back to the queue.
  const {
    presence,
    paused,
    retrying,
    retry,
    returnToLobby,
    sendChatMessage,
    sendTyping,
  } = useLobbyPresence({
    active: seated && isRealActivity && !activityGoneFromSocket,
    joinCode: activity?.joinCode,
    session,
    updateSession,
    onRemoved: () => {
      onRemoved();
      liveChatIdRef.current = null;
      setMatch(null);
      setChatEnded(false);
    },
    onEnded,
    onChatStarted: (payload) => {
      if (!session) return;
      liveChatIdRef.current = payload.chatId;
      setChatEnded(false);
      // Any held reason is stale: for an active chat there's no ending to
      // name, and the reaped-returner replay's own chat:ended follows in
      // order and re-sets it.
      setLiveEndReason(null);
      setMatch((prev) =>
        applyChatStarted(
          prev,
          payload,
          activity?.characters ?? [],
          session.name
        )
      );
    },
    onChatLine: (payload) => {
      setMatch((prev) => applyChatLine(prev, payload));
    },
    onChatUpdate: (payload) => {
      setMatch((prev) => applyChatUpdate(prev, payload));
    },
    onPeerTyping: (payload) => {
      if (match?.kind !== "live" || match.chatId !== payload.chatId) return;
      setMatch((prev) => applyPeerTyping(prev, payload));
      // ALWAYS re-arm, churn skipped or not — the TTL runs from the last
      // heartbeat, not the first.
      if (typingExpiryRef.current !== null) {
        clearTimeout(typingExpiryRef.current);
      }
      typingExpiryRef.current = setTimeout(() => {
        typingExpiryRef.current = null;
        setMatch((prev) => clearTypingPeer(prev));
      }, TYPING_INDICATOR_TTL_MS);
    },
    onPeerConnection: (payload) => {
      if (payload.state === "dropped") {
        setMatch((prev) => applyPeerDropped(prev, payload));
        return;
      }
      // "returned" — the reducer's own guard keeps sub-4s blips,
      // duplicate-tab takeovers, and StrictMode double-mounts invisible.
      setMatch((prev) => applyPeerReturned(prev, payload));
      // Re-armed on every return (a no-op fire can only re-null a null) —
      // the flash runs RETURNED_FLASH_MS from the LAST return.
      if (flashTimerRef.current !== null) {
        clearTimeout(flashTimerRef.current);
      }
      flashTimerRef.current = setTimeout(() => {
        flashTimerRef.current = null;
        setMatch((prev) => clearReturnedFlash(prev));
      }, RETURNED_FLASH_MS);
    },
    onChatEnded: (payload) => {
      if (liveChatIdRef.current !== null) {
        setChatEnded(true);
        setLiveEndReason(payload.reason);
      } else {
        // No chat:started this connection (a survivor's cold refresh onto
        // a wrappingUp seat): there's no chat to show an ended screen for
        // — go straight back to the queue instead of pretending.
        returnToLobby();
      }
    },
  });

  return {
    match,
    chatEnded,
    setChatEnded,
    liveEndReason,
    startMatch,
    backToLobby,
    presence,
    paused,
    retrying,
    retry,
    returnToLobby,
    sendChatMessage,
    sendTyping,
  };
}
