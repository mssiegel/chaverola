import type http from "node:http";

import type { Logger } from "pino";
import { Server } from "socket.io";
import { z } from "zod";

import {
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
import {
  getByHostKey,
  getByJoinCode,
  onActivityRemoved,
} from "../store/activityStore";
import type { StoredActivity } from "../store/activityStore";
import { toLobbyWelcome } from "../store/projections";
import {
  armDisconnectTimers,
  clearAllSeatTimers,
  leaveSeat,
  markDisconnected,
  reapSeat,
  removeSeat,
  seatStudent,
  toQueueEntries,
} from "./seats";

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
  emits (occupancy stays a mystery to them — a product rule).
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

  function broadcastQueue(record: StoredActivity): void {
    io.to(room(record.joinCode)).emit("queue:snapshot", {
      students: toQueueEntries(record, Date.now()),
    });
  }

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
      socket.emit("queue:snapshot", {
        students: toQueueEntries(record, Date.now()),
      });

      const keepAlive = setInterval(() => {
        getByHostKey(data.hostKey);
      }, TEACHER_KEEPALIVE_MS);
      keepAlive.unref();

      socket.on("queue:remove", (payload) => {
        if (typeof payload?.studentId !== "string") return;
        const current = getByHostKey(data.hostKey);
        if (!current) return;
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
        broadcastQueue(current);
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
    broadcastQueue(record);

    // A student socket deliberately gets NO queue:remove handler — a
    // student emitting it is simply ignored (the boundary test pins this).
    socket.on("lobby:leave", () => {
      const current = getByJoinCode(data.joinCode);
      if (!current) return;
      const left = leaveSeat(current, socket.id);
      if (left) {
        log.info(
          { joinCode: data.joinCode, studentId: left.studentId },
          "student left"
        );
        broadcastQueue(current);
      }
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
      armDisconnectTimers(
        dropped,
        LOBBY_GRACE_SECONDS * 1000,
        LOBBY_DISCONNECT_BROADCAST_DELAY_MS,
        {
          // The delay gates only the teacher-facing row state; the room
          // learns of the drop 4s in (a refresh reconnects faster).
          onBroadcastDelay: () => broadcastQueue(current),
          onGraceExpiry: () => {
            log.info(
              { joinCode: data.joinCode, studentId: dropped.studentId },
              "seat reaped after grace"
            );
            reapSeat(current, dropped);
            broadcastQueue(current);
          },
        }
      );
    });
  });

  // Activity death (sweep or lazy expiry) reaches the lobby through the
  // store's hook: clear timers, tell the students honestly, drop everyone.
  onActivityRemoved((record) => {
    clearAllSeatTimers(record);
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.joinCode !== record.joinCode) continue;
      if (socket.data.role === "student") socket.emit("activity:ended");
      socket.disconnect(true);
    }
  });

  return io;
}
