import type { Logger } from "pino";
import type { Server, Socket } from "socket.io";

import type {
  ChatSnapshot,
  ClientToServerEvents,
  QueueEntry,
  ServerToClientEvents,
} from "@chaverola/shared";

import type { StoredActivity } from "../store/activityStore";
import {
  graceSecondsLeft,
  toChatEnded,
  toChatSnapshot,
  toChatStarted,
  toChatUpdate,
  toPeerConnection,
  toRematchPartners,
} from "../store/projections";
import {
  activeMembers,
  findActiveChatOf,
  markInactive,
  matchedStudentIds,
} from "./matching";
import type { StoredChat } from "./matching";
import {
  armDisconnectTimers,
  clearSeatTimers,
  markWrappingUp,
  reapSeat,
  toQueueEntries,
} from "./seats";
import type { Seat } from "./seats";
import { timing } from "./timing";

/*
  The socket-facing shared state: the io server, the child logger, and the
  broadcast/timer helpers every handler module leans on — built once by
  attachLobby (createLobbyContext) and threaded to the auth middleware, the
  auto-match timer, and the teacher/student handlers. The helpers are the
  same mutually-referencing closures they were inside attachLobby; keeping
  them in one factory preserves that (armSeatTimers ↔ settleMembershipChange
  recur, and broadcastState composes the two payload builders).
*/

interface TeacherSocketData {
  role: "teacher";
  joinCode: string;
  hostKey: string;
}
interface StudentSocketData {
  role: "student";
  joinCode: string;
  studentId: string;
}
export type SocketData = TeacherSocketData | StudentSocketData;
export type { TeacherSocketData, StudentSocketData };

export type LobbyServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<never, never>,
  SocketData
>;

export type LobbySocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<never, never>,
  SocketData
>;

export function room(joinCode: string): string {
  return `lobby:${joinCode}`;
}

export interface LobbyContext {
  io: LobbyServer;
  log: Logger;
  queuePayload(record: StoredActivity, now: number): { students: QueueEntry[] };
  chatsPayload(
    record: StoredActivity,
    now: number
  ): {
    chats: ChatSnapshot[];
    leftoverStudentId: string | null;
    paused: boolean;
    lastPartners: Record<string, string[]>;
  };
  broadcastState(record: StoredActivity): void;
  sendPeerConnection(
    record: StoredActivity,
    chat: StoredChat,
    studentId: string,
    state: "dropped" | "returned",
    secondsLeft: number | null
  ): void;
  sendChatStarted(record: StoredActivity, chat: StoredChat): void;
  sendActivityPaused(record: StoredActivity, paused: boolean): void;
  settleMembershipChange(
    record: StoredActivity,
    result: { ended: boolean; chat: StoredChat }
  ): void;
  armSeatTimers(record: StoredActivity, seat: Seat, graceMs: number): void;
}

export function createLobbyContext(io: LobbyServer, log: Logger): LobbyContext {
  function queuePayload(record: StoredActivity, now: number) {
    // Matched and wrappingUp seats hold seats but aren't waiting — the
    // queue shows only the matchable(ish) pool.
    return { students: toQueueEntries(record, now, matchedStudentIds(record)) };
  }

  function chatsPayload(record: StoredActivity, now: number) {
    // The leftover highlight only makes sense while that student still
    // waits — lazily null it at snapshot build (same rule as the demo).
    if (record.leftoverStudentId !== null) {
      const seat = record.seats.byId.get(record.leftoverStudentId);
      if (
        !seat ||
        seat.wrappingUp ||
        matchedStudentIds(record).has(seat.studentId)
      ) {
        record.leftoverStudentId = null;
      }
    }
    return {
      chats: record.chats.map((chat) => toChatSnapshot(chat, record, now)),
      leftoverStudentId: record.leftoverStudentId,
      paused: record.pausedAt !== null,
      lastPartners: toRematchPartners(record),
    };
  }

  /** Every seat or chat change re-snapshots the teacher room — snapshots
   *  over deltas, so a missed emit can never wedge a card. */
  function broadcastState(record: StoredActivity): void {
    const now = Date.now();
    io.to(room(record.joinCode)).emit(
      "queue:snapshot",
      queuePayload(record, now)
    );
    io.to(room(record.joinCode)).emit(
      "chats:snapshot",
      chatsPayload(record, now)
    );
  }

  /** A member's connection change, fanned to the OTHER connected active
   *  members — never the affected seat, never the teacher room (its card
   *  already carries reconnectingStudentIds on the same gate). */
  function sendPeerConnection(
    record: StoredActivity,
    chat: StoredChat,
    studentId: string,
    state: "dropped" | "returned",
    secondsLeft: number | null
  ): void {
    const payload = toPeerConnection(chat, studentId, state, secondsLeft);
    for (const member of activeMembers(chat)) {
      if (member.studentId === studentId) continue; // never the affected seat
      const seat = record.seats.byId.get(member.studentId);
      if (!seat?.connected) continue;
      io.sockets.sockets
        .get(seat.currentSocketId)
        ?.emit("chat:peer-connection", payload);
    }
  }

  function armSeatTimers(
    record: StoredActivity,
    seat: Seat,
    graceMs: number
  ): void {
    armDisconnectTimers(seat, graceMs, timing.broadcastDelayMs, {
      // The delay gates every "lost connection" surface at once — the
      // teacher's reconnecting tag and, since feature 8, the partner's
      // banner flip together (a refresh reconnects faster and shows
      // neither).
      onBroadcastDelay: () => {
        broadcastState(record);
        // findActiveChatOf does double duty: it keeps the wrappingUp
        // re-arm path (settleMembershipChange) quiet — an ended chat's
        // members must not hear a ghost drop — and it guarantees
        // graceSecondsLeft is only computed for the seat whose own
        // disconnect armed this timer. Don't optimize it away.
        const chat = findActiveChatOf(record, seat.studentId);
        if (chat) {
          sendPeerConnection(
            record,
            chat,
            seat.studentId,
            "dropped",
            graceSecondsLeft(seat, Date.now())
          );
        }
      },
      onGraceExpiry: () => {
        log.info(
          { joinCode: record.joinCode, studentId: seat.studentId },
          "seat reaped after grace"
        );
        // A seat that ran out its grace inside a chat has to leave the chat
        // too, or the partner sits in a room with a member who no longer
        // exists. This is the backstop that makes a lost `lobby:leave`
        // survivable: whatever the client failed to say, the silence itself
        // eventually frees the peer.
        const chat = findActiveChatOf(record, seat.studentId);
        if (chat) {
          // The one "peer-timeout" call site: only an expired grace may
          // pin the honest reason on a below-2 ending.
          const result = markInactive(
            record,
            chat.id,
            seat.studentId,
            "peer-timeout"
          );
          if (result) settleMembershipChange(record, result);
        }
        // A chat seat's reap is remembered (the returning token replays the
        // ended chat as "self-timeout"); a waiting seat's stays silent.
        reapSeat(record, seat, chat?.id);
        broadcastState(record);
      },
    });
  }

  /** Targeted chat:started to every seated member (all connected at
   *  creation — eligibility requires it — but guard anyway, which is also
   *  why the reconnectingPeers backlog is empty here: nobody in a
   *  just-created chat is mid-drop). */
  function sendChatStarted(record: StoredActivity, chat: StoredChat): void {
    const now = Date.now();
    for (const member of activeMembers(chat)) {
      const seat = record.seats.byId.get(member.studentId);
      if (!seat?.connected) continue;
      io.sockets.sockets
        .get(seat.currentSocketId)
        ?.emit(
          "chat:started",
          toChatStarted(chat, record, member.studentId, now)
        );
    }
  }

  /** The pause is activity-wide, so every connected seat hears the flip —
   *  chat members, lobby waiters, and wrappingUp seats alike (the lobby
   *  shows its own paused pill). Connect-time state rides lobby:welcome. */
  function sendActivityPaused(record: StoredActivity, paused: boolean): void {
    for (const seat of record.seats.byId.values()) {
      if (!seat.connected) continue;
      io.sockets.sockets
        .get(seat.currentSocketId)
        ?.emit("activity:paused", { paused });
    }
  }

  /** After markInactive or endChat: tell the remaining members what
   *  happened. A chat that ended puts them on the ended screen (wrappingUp
   *  — the return to the queue is THEIR tap, never automatic); one that
   *  continues gets a peers update. A disconnected remaining member's
   *  matched-seat rule just expired with the chat, so a fresh 120s grace
   *  starts now — otherwise that seat would live untimed until activity
   *  death. */
  function settleMembershipChange(
    record: StoredActivity,
    result: { ended: boolean; chat: StoredChat }
  ): void {
    const { ended, chat } = result;
    for (const member of activeMembers(chat)) {
      const seat = record.seats.byId.get(member.studentId);
      if (!seat) continue;
      if (ended) {
        markWrappingUp(seat);
        if (seat.connected) {
          io.sockets.sockets
            .get(seat.currentSocketId)
            ?.emit("chat:ended", toChatEnded(chat));
        } else {
          clearSeatTimers(seat);
          armSeatTimers(record, seat, timing.graceMs);
        }
      } else if (seat.connected) {
        io.sockets.sockets
          .get(seat.currentSocketId)
          ?.emit("chat:update", toChatUpdate(chat, member.studentId));
      }
    }
  }

  return {
    io,
    log,
    queuePayload,
    chatsPayload,
    broadcastState,
    sendPeerConnection,
    sendChatStarted,
    sendActivityPaused,
    settleMembershipChange,
    armSeatTimers,
  };
}
