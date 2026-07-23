import { stuckInLineNotice } from "@chaverola/shared";

import {
  activitySettingsSchema,
  teacherEmailUpdateSchema,
} from "../../schemas/activity";
import { sendTranscriptEmail } from "../../email/sendTranscript";
import { getByHostKey, removeActivity } from "../../store/activityStore";
import { armAutoMatch, clearAutoMatch, releaseAutoMatch } from "../autoMatch";
import { room } from "../lobbyContext";
import type {
  LobbyContext,
  LobbySocket,
  TeacherSocketData,
} from "../lobbyContext";
import {
  createChat,
  endChat,
  markInactive,
  matchedStudentIds,
  pauseChats,
  planPairEveryone,
  resumeChats,
} from "../matching";
import { removeSeat } from "../seats";

/** While a teacher socket is connected, refresh the activity's TTL this
 *  often (getByHostKey is the refresh path). Student sockets never refresh
 *  — enumeration must not keep activities alive. */
const TEACHER_KEEPALIVE_MS = 5 * 60 * 1000;

/** Everything a teacher socket does: join the room, take initial snapshots,
 *  hold the TTL open, and serve the teacher commands. Registered on teacher
 *  sockets only — the structural boundary that makes a student emitting
 *  queue:remove / chat:start / ... a silent no-op. */
export function registerTeacherHandlers(
  ctx: LobbyContext,
  socket: LobbySocket,
  data: TeacherSocketData
): void {
  const {
    io,
    log,
    mailer,
    queuePayload,
    chatsPayload,
    broadcastState,
    settleMembershipChange,
    sendChatStarted,
    sendActivityPaused,
  } = ctx;

  socket.join(room(data.joinCode));
  const record = getByHostKey(data.hostKey);
  // Vanishing between middleware and here means the store expired it —
  // onActivityRemoved has already disconnected us.
  if (!record) return;
  log.info({ joinCode: data.joinCode }, "teacher connected");
  // Auto-match runs only while a teacher is connected (founder call);
  // the matching disconnect handler below releases this.
  armAutoMatch(ctx, data.joinCode);
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
    // A manual pairing clears any stale pair-everyone rematch notice: the
    // teacher moved on (mirrors the demo's startChat).
    current.rematchNotice = null;
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
    // An exact pair/trio the plan couldn't repair stays in line — the rail
    // notice explains the visible skip (names resolved off the seats). Cleared
    // by a manual chat:start or the notice's X.
    current.rematchNotice =
      plan.stuckStudentIds.length > 0
        ? stuckInLineNotice(
            plan.stuckStudentIds.map(
              (id) => current.seats.byId.get(id)?.name ?? ""
            )
          )
        : null;
    log.info(
      { joinCode: data.joinCode, groups: plan.groups.length },
      "paired everyone"
    );
    broadcastState(current);
  });

  socket.on("match:dismiss-rematch-notice", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (current.rematchNotice === null) return; // idempotent — nothing to clear
    // Server-side so the next broadcastState can't resurrect it and a second
    // host device stays coherent.
    current.rematchNotice = null;
    log.info({ joinCode: data.joinCode }, "rematch notice dismissed");
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

  socket.on("chat:end", (payload) => {
    if (typeof payload?.chatId !== "string") return;
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    const result = endChat(current, payload.chatId);
    if (!result) return; // idempotent — already ended or unknown
    log.info(
      { joinCode: data.joinCode, chatId: result.chat.id },
      "chat ended by teacher"
    );
    settleMembershipChange(current, result);
    broadcastState(current);
  });

  socket.on("chats:end-all", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    // Each student is in at most one active chat, so settling per chat
    // inside the loop is order-independent; one broadcast at the end.
    let endedCount = 0;
    for (const chat of current.chats) {
      const result = endChat(current, chat.id);
      if (!result) continue; // already-ended chats in the list
      endedCount += 1;
      settleMembershipChange(current, result);
    }
    // The round-closer also clears a pause — the next round starts
    // unpaused. Through resumeChats, not a bare null: the waiting
    // students' frozen wait clocks have to shift or they'd jump.
    const resumed = resumeChats(current, Date.now());
    if (endedCount === 0 && !resumed) return; // a visible no-op
    log.info(
      { joinCode: data.joinCode, chats: endedCount, resumed },
      "all chats ended by teacher"
    );
    if (resumed) sendActivityPaused(current, false);
    broadcastState(current);
  });

  socket.on("chats:pause-all", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (!pauseChats(current, Date.now())) return; // already paused
    log.info({ joinCode: data.joinCode }, "chats paused by teacher");
    sendActivityPaused(current, true);
    broadcastState(current);
  });

  socket.on("chats:resume-all", () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (!resumeChats(current, Date.now())) return; // not paused
    log.info({ joinCode: data.joinCode }, "chats resumed by teacher");
    sendActivityPaused(current, false);
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

  socket.on("activity:update-email", (payload) => {
    const parsed = teacherEmailUpdateSchema.safeParse(payload?.teacherEmail);
    if (!parsed.success) {
      log.warn({ joinCode: data.joinCode }, "invalid activity:update-email");
      return;
    }
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (parsed.data === null) {
      delete current.teacherEmail;
    } else {
      current.teacherEmail = parsed.data;
    }
    // No echo back: unlike settings, the email lives on one form field the
    // teacher is looking at, so last write wins. The address itself stays
    // out of the log — it's the teacher's, and the boolean is what we'd
    // actually debug with.
    log.info(
      { joinCode: data.joinCode, set: parsed.data !== null },
      "transcript email updated by teacher"
    );
  });

  // The terminal wrap-up: end every chat, mail the transcript, remove the
  // activity. Async because the send is awaited so the outcome can be reported
  // back before teardown. A repeat while a send is in flight is dropped by the
  // send-once guard's "sending" state (set synchronously inside
  // sendTranscriptEmail before its first await), so a double-click or a second
  // host device produces exactly one email.
  socket.on("activity:end", async () => {
    const current = getByHostKey(data.hostKey);
    if (!current) return;
    if (current.transcriptEmail?.state === "sending") return;
    // Stop auto-match outright, whatever the teacher refcount — otherwise a
    // second host device would leave the tick armed, and it could pair the
    // students we just freed into fresh chats during the send await.
    clearAutoMatch(data.joinCode);
    // Flip every active chat to ended before the await so the transcript is
    // frozen for the send. No settleMembershipChange: removal (step below)
    // boots the students wholesale, and settling here would flash a second
    // ended screen first.
    for (const chat of current.chats) endChat(current, chat.id);
    const result = await sendTranscriptEmail(current, mailer, log);
    // To the clicking socket only — the room never hears it. If the teacher
    // already vanished this emit goes nowhere and removal still runs.
    socket.emit("activity:end-result", { email: result });
    log.info(
      { joinCode: data.joinCode, chats: current.chats.length },
      "activity ended by teacher"
    );
    // onActivityRemoved does the whole teardown: seat timers cleared, every
    // student sent activity:ended, all sockets (this one included) dropped.
    removeActivity(current);
  });

  socket.on("disconnect", (reason) => {
    clearInterval(keepAlive);
    releaseAutoMatch(data.joinCode);
    log.info({ joinCode: data.joinCode, reason }, "teacher disconnected");
  });
}
