import type http from "node:http";

import type { Logger } from "pino";
import { Server } from "socket.io";

import type { Config } from "../config";
import type { Mailer } from "../email/mailer";
import { onActivityRemoved } from "../store/activityStore";
import { clearAutoMatch } from "./autoMatch";
import { createAuthMiddleware } from "./auth";
import { registerStudentSession } from "./handlers/studentSession";
import { registerTeacherHandlers } from "./handlers/teacher";
import { createLobbyContext } from "./lobbyContext";
import type { LobbyServer } from "./lobbyContext";
import { clearAllSeatTimers } from "./seats";
import { applyTimeScale, timing } from "./timing";

/*
  The Socket.IO layer, assembled here as a composition root. engine.io
  intercepts /socket.io/ on the http.Server BEFORE Express runs, so nothing
  in app.ts applies here: Express cors() never sees the handshake (the
  Server's own cors option does), pino-http logs nothing (we log through the
  shared pino logger), and Express's rate limiters never see socket traffic —
  the socket layer carries its own abuse guards: the seat cap
  (MAX_STUDENTS_PER_ACTIVITY), the per-socket chat:send rate limit, the
  per-message character cap, and the per-socket chat:typing relay floor.

  attachLobby only wires the pieces; each concern lives in its own module:
  - lobbyContext.ts — the io/log/broadcast/timer helpers every handler shares.
  - auth.ts — the connection gate (io.use), including student seating, so
    every rejection ("activity_gone" / "removed" / "full" / "invalid") rides
    connect_error before the socket ever connects.
  - autoMatch.ts — the per-activity auto-match interval, module-scoped so a
    teacher reconnect re-arms rather than double-arms.
  - handlers/teacher.ts — the teacher-socket commands, registered on teacher
    sockets only (the structural boundary — a student emitting them is a
    silent no-op).
  - handlers/studentSession.ts + studentChat.ts — the student socket's
    welcome/resume replay, leave/back taps, chat send/typing, and disconnect
    grace.

  Teachers join a per-activity room and get snapshots; students only ever get
  targeted emits (occupancy stays a mystery to them — a product rule).
*/

export function attachLobby(
  httpServer: http.Server,
  config: Config,
  logger: Logger,
  mailer: Mailer
): LobbyServer {
  const log = logger.child({ module: "lobby" });
  // First thing: every timing.* read below (and in projections.ts) must see
  // this config's scale.
  applyTimeScale(config.timeScale);
  const io: LobbyServer = new Server(httpServer, {
    cors: { origin: config.corsOrigins, credentials: false },
    serveClient: false,
    // engine.io's own defaults, routed through timing so dead-connection
    // detection (~45s unscaled) compresses with everything else.
    pingInterval: timing.pingIntervalMs,
    pingTimeout: timing.pingTimeoutMs,
  });

  const ctx = createLobbyContext(io, log, mailer);

  io.use(createAuthMiddleware(io, log));

  io.on("connection", (socket) => {
    const data = socket.data;
    if (data.role === "teacher") {
      registerTeacherHandlers(ctx, socket, data);
      return;
    }
    registerStudentSession(ctx, socket, data);
  });

  // Activity death (sweep or lazy expiry) reaches the lobby through the
  // store's hook: clear timers, tell the students honestly, drop everyone.
  onActivityRemoved((record) => {
    clearAllSeatTimers(record);
    clearAutoMatch(record.joinCode);
    for (const socket of io.sockets.sockets.values()) {
      if (socket.data.joinCode !== record.joinCode) continue;
      if (socket.data.role === "student") socket.emit("activity:ended");
      socket.disconnect(true);
    }
  });

  return io;
}
