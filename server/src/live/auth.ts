import type { Logger } from "pino";
import type { ExtendedError } from "socket.io";
import { z } from "zod";

import {
  DEMO_JOIN_CODE,
  HOST_KEY_PATTERN,
  JOIN_CODE_PATTERN,
  STUDENT_NAME_MAX_CHARS,
} from "@chaverola/shared";
import type { StudentAuth, TeacherAuth } from "@chaverola/shared";

import { getByHostKey, getByJoinCode } from "../store/activityStore";
import type { LobbyServer, LobbySocket } from "./lobbyContext";
import { seatStudent } from "./seats";

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

/** The connection gate. Runs before any socket connects, so every rejection
 *  ("activity_gone" / "removed" / "full" / "invalid") rides connect_error.
 *  Student seating happens here too — the seat is taken in the middleware so
 *  a rejection never reaches the connection handler. Needs `io` for the
 *  duplicate-tab eviction (the newer socket takes the seat, the older goes). */
export function createAuthMiddleware(io: LobbyServer, log: Logger) {
  return (socket: LobbySocket, next: (err?: ExtendedError) => void): void => {
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
  };
}
