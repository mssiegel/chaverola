import type http from "node:http";

import type { Logger } from "pino";
import { Server } from "socket.io";
import { z } from "zod";

import {
  AUTO_MATCH_GAP_SECONDS,
  DEMO_JOIN_CODE,
  HOST_KEY_PATTERN,
  JOIN_CODE_PATTERN,
  LOBBY_DISCONNECT_BROADCAST_DELAY_MS,
  LOBBY_GRACE_SECONDS,
  STUDENT_NAME_MAX_CHARS,
} from "@chaverola/shared";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  StudentAuth,
  TeacherAuth,
} from "@chaverola/shared";

import type { Config } from "../config";
import { activitySettingsSchema } from "../schemas/activity";
import {
  getByHostKey,
  getByJoinCode,
  onActivityRemoved,
} from "../store/activityStore";
import type { StoredActivity } from "../store/activityStore";
import {
  toChatEnded,
  toChatSnapshot,
  toChatStarted,
  toChatUpdate,
  toLobbyWelcome,
} from "../store/projections";
import {
  activeMembers,
  createChat,
  findAutoMatchPair,
  markInactive,
  matchedStudentIds,
  planPairEveryone,
} from "./matching";
import type { StoredChat } from "./matching";
import {
  armDisconnectTimers,
  clearAllSeatTimers,
  clearSeatTimers,
  leaveSeat,
  markDisconnected,
  markWrappingUp,
  reapSeat,
  removeSeat,
  returnToQueue,
  seatStudent,
  toQueueEntries,
} from "./seats";
import type { Seat } from "./seats";

/*
  The Socket.IO layer. engine.io intercepts /socket.io/ on the http.Server
  BEFORE Express runs, so nothing in app.ts applies here: Express cors()
  never sees the handshake (the Server's own cors option does), pino-http
  logs nothing (we log through the shared pino logger), and the rate
  limiters never fire (MAX_STUDENTS_PER_ACTIVITY is the abuse guard).

  Auth lives in the middleware — including student seating, so every
  rejection ("activity_gone" / "removed" / "full" / "invalid") rides
  connect_error before the socket ever connects. Teachers join a
  per-activity room and get snapshots; students only ever get targeted
  emits (occupancy stays a mystery to them — a product rule). Teacher
  commands are registered on teacher sockets only — the structural boundary.
*/

/** While a teacher socket is connected, refresh the activity's TTL this
 *  often (getByHostKey is the refresh path). Student sockets never refresh
 *  — enumeration must not keep activities alive. */
const TEACHER_KEEPALIVE_MS = 5 * 60 * 1000;

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
type SocketData = TeacherSocketData | StudentSocketData;

type LobbyServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<never, never>,
  SocketData
>;

/*
  Shape-validation only ("invalid"); the pattern guards below give malformed
  keys/codes the same "activity_gone" a missing record gets — mirroring the
  REST routes, where a malformed key is indistinguishable from an unknown
  one. The `satisfies` lines pin the schemas to the shared wire types.
*/
const teacherAuthSchema = z.object({
  role: z.literal("teacher"),
  hostKey: z.string(),
}) satisfies z.ZodType<TeacherAuth>;

const studentAuthSchema = z.object({
  role: z.literal("student"),
  joinCode: z.string(),
  name: z.string().trim().min(1).max(STUDENT_NAME_MAX_CHARS).optional(),
  nonce: z.string().min(1).max(200).optional(),
  studentId: z.string().min(1).max(200).optional(),
  token: z.string().min(1).max(200).optional(),
}) satisfies z.ZodType<StudentAuth>;

function room(joinCode: string): string {
  return `lobby:${joinCode}`;
}

/** The chat a student is actively seated in right now, if any. */
function findActiveChatOf(
  record: StoredActivity,
  studentId: string
): StoredChat | undefined {
  return record.chats.find(
    (chat) =>
      chat.status === "active" &&
      activeMembers(chat).some((m) => m.studentId === studentId)
  );
}

/** A wrappingUp seat's ended chat — the most recent one that ended around
 *  them (they're still an active member of it; only leavers go inactive). */
function findEndedChatOf(
  record: StoredActivity,
  studentId: string
): StoredChat | undefined {
  return [...record.chats]
    .reverse()
    .find(
      (chat) =>
        chat.status === "ended" &&
        activeMembers(chat).some((m) => m.studentId === studentId)
    );
}

/** joinCode → the auto-match interval. Armed on an activity's 0→1st teacher
 *  socket, cleared on its last teacher disconnect and on activity removal —
 *  auto-match runs only while a teacher is connected (founder call: a
 *  closed laptop shouldn't keep pairing students). Everything else — the
 *  record, settings, eligibility, the pairing gap — is read inside the
 *  tick, so settings edits, seat changes, and manual pairing never touch
 *  the timer itself. */
const autoMatchTimers = new Map<
  string,
  { timer: NodeJS.Timeout; teacherCount: number; nextAt: number }
>();

export function attachLobby(
  httpServer: http.Server,
  config: Config,
  logger: Logger
): LobbyServer {
  const log = logger.child({ module: "lobby" });
  const io: LobbyServer = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: false },
    serveClient: false,
  });

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

  function armSeatTimers(
    record: StoredActivity,
    seat: Seat,
    graceMs: number | null
  ): void {
    armDisconnectTimers(seat, graceMs, LOBBY_DISCONNECT_BROADCAST_DELAY_MS, {
      // The delay gates only the teacher-facing state; the room learns of
      // the drop 4s in (a refresh reconnects faster).
      onBroadcastDelay: () => broadcastState(record),
      onGraceExpiry: () => {
        log.info(
          { joinCode: record.joinCode, studentId: seat.studentId },
          "seat reaped after grace"
        );
        reapSeat(record, seat);
        broadcastState(record);
      },
    });
  }

  /** Targeted chat:started to every seated member (all connected at
   *  creation — eligibility requires it — but guard anyway). */
  function sendChatStarted(record: StoredActivity, chat: StoredChat): void {
    for (const member of activeMembers(chat)) {
      const seat = record.seats.byId.get(member.studentId);
      if (!seat?.connected) continue;
      io.sockets.sockets
        .get(seat.currentSocketId)
        ?.emit("chat:started", toChatStarted(chat, member.studentId));
    }
  }

  /** After markInactive: tell the remaining members what happened. A chat
   *  that ended puts them on the ended screen (wrappingUp — the return to
   *  the queue is THEIR tap, never automatic); one that continues gets a
   *  peers update. A disconnected remaining member's matched-seat rule just
   *  expired with the chat, so a fresh 120s grace starts now — otherwise
   *  that seat would live untimed until activity death. */
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
          armSeatTimers(record, seat, LOBBY_GRACE_SECONDS * 1000);
        }
      } else if (seat.connected) {
        io.sockets.sockets
          .get(seat.currentSocketId)
          ?.emit("chat:update", toChatUpdate(chat, member.studentId));
      }
    }
  }

  function autoMatchTick(joinCode: string): void {
    const state = autoMatchTimers.get(joinCode);
    if (!state) return;
    const record = getByJoinCode(joinCode); // never refreshes the TTL
    if (!record || !record.settings.autoMatch) return;
    const now = Date.now();
    if (now < state.nextAt) return;
    const pair = findAutoMatchPair(
      record,
      record.settings.autoMatchSeconds,
      now
    );
    if (!pair) return;
    const chat = createChat(record, pair, now);
    if (!chat) return;
    log.info({ joinCode, chatId: chat.id }, "auto-matched a pair");
    // One pair per firing, with a breather — pairs land one at a time.
    state.nextAt = now + AUTO_MATCH_GAP_SECONDS * 1000;
    sendChatStarted(record, chat);
    broadcastState(record);
  }

  /** Arm on the 0→1st teacher socket: a 1s tick that reads everything else
   *  fresh each firing. */
  function armAutoMatch(joinCode: string): void {
    const state = autoMatchTimers.get(joinCode);
    if (state) {
      state.teacherCount += 1;
      return;
    }
    const timer = setInterval(() => autoMatchTick(joinCode), 1000);
    timer.unref();
    autoMatchTimers.set(joinCode, { timer, teacherCount: 1, nextAt: 0 });
  }

  /** The last teacher disconnecting stops the timer (reconnect re-arms). */
  function releaseAutoMatch(joinCode: string): void {
    const state = autoMatchTimers.get(joinCode);
    if (!state) return;
    state.teacherCount -= 1;
    if (state.teacherCount > 0) return;
    clearInterval(state.timer);
    autoMatchTimers.delete(joinCode);
  }

  // NOT ARMED YET (feature 3, Prompt 1): auto-match must not start chats
  // against deployed student clients that can't render them. Prompt 3 adds
  // the one-line armAutoMatch/releaseAutoMatch calls in the teacher
  // connect/disconnect handlers below once the student client has shipped.
  // The voids keep noUnusedLocals quiet until then.
  void armAutoMatch;
  void releaseAutoMatch;

  io.use((socket, next) => {
    const auth: unknown = socket.handshake.auth;
    const role =
      typeof auth === "object" && auth !== null && "role" in auth
        ? auth.role
        : undefined;

    if (role === "teacher") {
      const parsed = teacherAuthSchema.safeParse(auth);
      if (!parsed.success) return next(new Error("invalid"));
      const { hostKey } = parsed.data;
      if (!HOST_KEY_PATTERN.test(hostKey)) {
        return next(new Error("activity_gone"));
      }
      const record = getByHostKey(hostKey); // refreshes the TTL
      if (!record) return next(new Error("activity_gone"));
      socket.data = { role: "teacher", joinCode: record.joinCode, hostKey };
      return next();
    }

    if (role === "student") {
      const parsed = studentAuthSchema.safeParse(auth);
      if (!parsed.success) return next(new Error("invalid"));
      const studentAuth = parsed.data;
      if (
        !JOIN_CODE_PATTERN.test(studentAuth.joinCode) ||
        studentAuth.joinCode === DEMO_JOIN_CODE // the server never knows the demo
      ) {
        return next(new Error("activity_gone"));
      }
      const record = getByJoinCode(studentAuth.joinCode); // no TTL refresh
      if (!record) return next(new Error("activity_gone"));

      const result = seatStudent(record, studentAuth, socket.id, Date.now());
      if (result.kind === "rejected") {
        log.info(
          { joinCode: record.joinCode, code: result.code },
          "student rejected"
        );
        return next(new Error(result.code));
      }
      // Duplicate tab: the newer socket takes the seat, the older one goes.
      if (result.evictSocketId !== undefined) {
        io.sockets.sockets.get(result.evictSocketId)?.disconnect(true);
      }
      socket.data = {
        role: "student",
        joinCode: record.joinCode,
        studentId: result.seat.studentId,
      };
      return next();
    }

    return next(new Error("invalid"));
  });

  io.on("connection", (socket) => {
    const data = socket.data;
    if (data.role === "teacher") {
      socket.join(room(data.joinCode));
      const record = getByHostKey(data.hostKey);
      // Vanishing between middleware and here means the store expired it —
      // onActivityRemoved has already disconnected us.
      if (!record) return;
      log.info({ joinCode: data.joinCode }, "teacher connected");
      const now = Date.now();
      socket.emit("queue:snapshot", queuePayload(record, now));
      socket.emit("chats:snapshot", chatsPayload(record, now));

      const keepAlive = setInterval(() => {
        getByHostKey(data.hostKey);
      }, TEACHER_KEEPALIVE_MS);
      keepAlive.unref();

      socket.on("queue:remove", (payload) => {
        if (typeof payload?.studentId !== "string") return;
        const current = getByHostKey(data.hostKey);
        if (!current) return;
        // A stale queue:remove must never tombstone a chat member without
        // the chat bookkeeping — chat:remove is that path.
        if (matchedStudentIds(current).has(payload.studentId)) return;
        const seat = removeSeat(current, payload.studentId);
        if (!seat) return; // idempotent — the seat already left
        log.info(
          { joinCode: data.joinCode, studentId: seat.studentId },
          "student removed by teacher"
        );
        if (seat.connected) {
          const target = io.sockets.sockets.get(seat.currentSocketId);
          target?.emit("lobby:removed");
          target?.disconnect(true);
        }
        broadcastState(current);
      });

      socket.on("chat:start", (payload) => {
        const ids = payload?.studentIds;
        if (
          !Array.isArray(ids) ||
          ids.length < 1 ||
          ids.length > 8 ||
          !ids.every((id) => typeof id === "string" && id.length <= 200)
        ) {
          return;
        }
        const current = getByHostKey(data.hostKey);
        if (!current) return;
        const chat = createChat(current, ids, Date.now());
        if (!chat) return; // fewer than 2 eligible — a visible no-op
        log.info(
          {
            joinCode: data.joinCode,
            chatId: chat.id,
            size: chat.members.length,
          },
          "chat started by teacher"
        );
        sendChatStarted(current, chat);
        broadcastState(current);
      });

      socket.on("match:pair-everyone", () => {
        const current = getByHostKey(data.hostKey);
        if (!current) return;
        const plan = planPairEveryone(current);
        if (!plan) return; // under 2 eligible — a visible no-op
        const now = Date.now();
        for (const group of plan.groups) {
          const chat = createChat(current, group, now);
          if (chat) sendChatStarted(current, chat);
        }
        current.leftoverStudentId = plan.leftoverStudentId;
        log.info(
          { joinCode: data.joinCode, groups: plan.groups.length },
          "paired everyone"
        );
        broadcastState(current);
      });

      socket.on("chat:remove", (payload) => {
        if (
          typeof payload?.chatId !== "string" ||
          typeof payload?.studentId !== "string"
        ) {
          return;
        }
        const current = getByHostKey(data.hostKey);
        if (!current) return;
        const result = markInactive(current, payload.chatId, payload.studentId);
        if (!result) return; // idempotent — not an active member of that chat
        log.info(
          {
            joinCode: data.joinCode,
            chatId: payload.chatId,
            studentId: payload.studentId,
            ended: result.ended,
          },
          "student removed from chat by teacher"
        );
        // The quiet exit drops the seat exactly like a queue remove:
        // tombstone + lobby:removed + disconnect.
        const seat = removeSeat(current, payload.studentId);
        if (seat?.connected) {
          const target = io.sockets.sockets.get(seat.currentSocketId);
          target?.emit("lobby:removed");
          target?.disconnect(true);
        }
        settleMembershipChange(current, result);
        broadcastState(current);
      });

      socket.on("settings:update", (payload) => {
        const parsed = activitySettingsSchema.safeParse(payload?.settings);
        if (!parsed.success) {
          log.warn({ joinCode: data.joinCode }, "invalid settings:update");
          return;
        }
        const current = getByHostKey(data.hostKey);
        if (!current) return;
        current.settings = parsed.data;
        // The teacher's OTHER devices — the room minus the sender.
        // (Students never join the room; their lobbies keep the copy they
        // fetched, same as before.)
        socket.to(room(data.joinCode)).emit("settings:changed", {
          settings: parsed.data,
        });
      });

      socket.on("disconnect", (reason) => {
        clearInterval(keepAlive);
        log.info({ joinCode: data.joinCode, reason }, "teacher disconnected");
      });
      return;
    }

    // Student. The seat was taken in the middleware; welcome + tell the room.
    const record = getByJoinCode(data.joinCode);
    if (!record) return;
    const seat = record.seats.byId.get(data.studentId);
    if (!seat) return; // removed in the same tick — rejection already sent
    log.info(
      { joinCode: data.joinCode, studentId: data.studentId },
      "student connected"
    );
    socket.emit("lobby:welcome", toLobbyWelcome(seat));
    // Resume-into-chat: refresh, wifi recovery, and duplicate-tab takeover
    // all land here — an active chat member gets their room back, a
    // wrappingUp seat gets its ended screen back.
    const activeChat = findActiveChatOf(record, data.studentId);
    if (activeChat) {
      socket.emit("chat:started", toChatStarted(activeChat, data.studentId));
    } else if (seat.wrappingUp) {
      const endedChat = findEndedChatOf(record, data.studentId);
      socket.emit(
        "chat:ended",
        endedChat ? toChatEnded(endedChat) : { reason: "teacher" }
      );
    }
    broadcastState(record);

    // A student socket deliberately gets NO teacher handlers — a student
    // emitting queue:remove / chat:start / chat:remove / settings:update is
    // simply ignored (the boundary test pins this).
    socket.on("lobby:leave", () => {
      const current = getByJoinCode(data.joinCode);
      if (!current) return;
      // Mid-chat, leaving means leaving the activity: drop chat membership
      // first — the peer's emits are exactly chat:remove's, minus the
      // tombstone.
      const chat = findActiveChatOf(current, data.studentId);
      if (chat) {
        const result = markInactive(current, chat.id, data.studentId);
        if (result) settleMembershipChange(current, result);
      }
      const left = leaveSeat(current, socket.id);
      if (left) {
        log.info(
          { joinCode: data.joinCode, studentId: left.studentId },
          "student left"
        );
      }
      if (left || chat) broadcastState(current);
    });

    socket.on("lobby:back", () => {
      const current = getByJoinCode(data.joinCode);
      if (!current) return;
      const own = current.seats.byId.get(data.studentId);
      if (!own?.wrappingUp) return; // only the ended screen's back tap
      returnToQueue(own, Date.now());
      log.info(
        { joinCode: data.joinCode, studentId: data.studentId },
        "student back in the queue"
      );
      broadcastState(current);
    });

    socket.on("disconnect", (reason) => {
      const current = getByJoinCode(data.joinCode);
      if (!current) return;
      // No-ops when another socket already resumed the seat (the
      // currentSocketId guard) — a stale disconnect must never arm timers.
      const dropped = markDisconnected(current, socket.id, Date.now());
      if (!dropped) return;
      // The reason tells an intentional close ("client namespace
      // disconnect") from a died transport ("transport close" / ping
      // timeout) — load-bearing when diagnosing leaves that never arrived.
      log.info(
        { joinCode: data.joinCode, studentId: dropped.studentId, reason },
        "student connection lost"
      );
      // A matched seat's disconnect arms NO grace timer — the student can
      // resume into their chat until the activity dies (founder call).
      const matched = matchedStudentIds(current).has(dropped.studentId);
      armSeatTimers(
        current,
        dropped,
        matched ? null : LOBBY_GRACE_SECONDS * 1000
      );
    });
  });

  // Activity death (sweep or lazy expiry) reaches the lobby through the
  // store's hook: clear timers, tell the students honestly, drop everyone.
  onActivityRemoved((record) => {
    clearAllSeatTimers(record);
    const autoMatch = autoMatchTimers.get(record.joinCode);
    if (autoMatch) {
      clearInterval(autoMatch.timer);
      autoMatchTimers.delete(record.joinCode);
    }
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.joinCode !== record.joinCode) continue;
      if (socket.data.role === "student") socket.emit("activity:ended");
      socket.disconnect(true);
    }
  });

  return io;
}
