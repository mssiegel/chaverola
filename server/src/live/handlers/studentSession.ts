import { getByJoinCode } from "../../store/activityStore";
import {
  toChatEnded,
  toChatStarted,
  toLobbyWelcome,
} from "../../store/projections";
import type {
  LobbyContext,
  LobbySocket,
  StudentSocketData,
} from "../lobbyContext";
import {
  activeMembers,
  endChat,
  findActiveChatOf,
  findEndedChatOf,
  markInactive,
} from "../matching";
import {
  leaveSeat,
  markDisconnected,
  markWrappingUp,
  returnToQueue,
} from "../seats";
import { timing } from "../timing";
import { registerStudentChatHandlers } from "./studentChat";

/** Everything a student socket does after the middleware seated it: the
 *  welcome + resume replay, the lobby:leave / lobby:back taps, the two
 *  rate-limited chat handlers, and the disconnect grace. A student socket
 *  deliberately gets NO teacher handlers — the structural boundary. */
export function registerStudentSession(
  ctx: LobbyContext,
  socket: LobbySocket,
  data: StudentSocketData
): void {
  const {
    log,
    broadcastState,
    sendPeerConnection,
    settleMembershipChange,
    armSeatTimers,
  } = ctx;

  // Student. The seat was taken in the middleware; welcome + tell the room.
  const record = getByJoinCode(data.joinCode);
  if (!record) return;
  const seat = record.seats.byId.get(data.studentId);
  if (!seat) return; // removed in the same tick — rejection already sent
  log.info(
    { joinCode: data.joinCode, studentId: data.studentId },
    "student connected"
  );
  socket.emit("lobby:welcome", toLobbyWelcome(seat, record));
  // Resume-into-chat: refresh, wifi recovery, and duplicate-tab takeover
  // all land here — an active chat member gets their room back, a
  // wrappingUp seat gets its ended screen back.
  const activeChat = findActiveChatOf(record, data.studentId);
  if (activeChat) {
    // The re-delivery carries both healing backlogs: the transcript AND
    // the offline peers — this resumer may have missed a partner's
    // "dropped" emit entirely (fan-outs skip disconnected seats).
    socket.emit(
      "chat:started",
      toChatStarted(activeChat, record, data.studentId, Date.now())
    );
    // EVERY resume announces the return — by now the middleware's resume
    // has cleared disconnectedAt, so the server can't know whether the
    // 4s drop notice ever fired. Receivers ignore a return for a peer
    // they don't have marked offline, which keeps sub-4s blips,
    // duplicate-tab takeovers, and StrictMode double-mounts invisible.
    sendPeerConnection(record, activeChat, data.studentId, "returned", null);
  } else if (seat.wrappingUp) {
    const reaped = seat.reapedFromChat;
    if (reaped) {
      // A reaped-from-chat returner: replay the chat they were reaped out
      // of — transcript first, then the ending — through the OLD
      // membership studentId (the seat's new id is in no chat). The
      // reason is per-recipient, never toChatEnded's stored one: the 1:1
      // record says "peer-timeout" (the survivor's side), and a group's
      // chat may still be active. No fan-out fires — the survivors
      // already saw this member leave, and hear nothing on their return.
      log.info(
        {
          joinCode: data.joinCode,
          studentId: data.studentId,
          chatId: reaped.chatId,
        },
        "reaped student returned to their ended chat"
      );
      const chat = record.chats.find((c) => c.id === reaped.chatId);
      if (chat) {
        socket.emit(
          "chat:started",
          toChatStarted(chat, record, reaped.studentId, Date.now())
        );
      }
      socket.emit(
        "chat:ended",
        // The reveal rides along when the setting is on — the returner learns
        // who they were really with too. `chat` can be gone (record swept);
        // then there's nothing to reveal. The reason stays the per-recipient
        // "self-timeout", never toChatEnded's stored one.
        chat
          ? {
              ...toChatEnded(chat, record, reaped.studentId),
              reason: "self-timeout",
            }
          : { reason: "self-timeout" }
      );
    } else {
      const endedChat = findEndedChatOf(record, data.studentId);
      // A group leaver resolves no ended chat — they're an INACTIVE member,
      // and the room they stepped out of may well still be going. Without
      // this their 👋 screen would flip to the teacher's 🎓 on a reconnect.
      // Only they can reach it: every other inactive member's seat is gone
      // by now (left, removed, or reaped into the branch above).
      const leftChat =
        endedChat === undefined &&
        record.chats.some((chat) =>
          chat.inactiveStudentIds.includes(data.studentId)
        );
      socket.emit(
        "chat:ended",
        endedChat
          ? toChatEnded(endedChat, record, data.studentId)
          : { reason: leftChat ? "self-left" : "teacher" }
      );
    }
  }
  broadcastState(record);

  // A student socket deliberately gets NO teacher handlers — a student
  // emitting queue:remove / chat:start / chat:remove / chat:end /
  // chats:end-all / chats:pause-all / chats:resume-all / settings:update
  // is simply ignored (the boundary test pins this).
  socket.on("lobby:leave", () => {
    const current = getByJoinCode(data.joinCode);
    if (!current) return;
    // Mid-chat, leaving means leaving the activity: drop chat membership
    // first — like chat:remove minus the tombstone, except a below-2
    // ending records "peer" plus who, so the survivor's screen names the
    // leaver instead of blaming the teacher.
    const chat = findActiveChatOf(current, data.studentId);
    if (chat) {
      const result = markInactive(current, chat.id, data.studentId, "peer");
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

  // The chat room's own exit, and the only one that keeps the seat: the
  // student lands on the ended screen wrappingUp and rejoins the queue by
  // their own lobby:back tap. Which branch is decided HERE, from the room's
  // current size — the client picks its End-vs-Leave button the same way,
  // but the server's count at this instant is the one that rules.
  socket.on("chat:leave", () => {
    const current = getByJoinCode(data.joinCode);
    if (!current) return;
    const chat = findActiveChatOf(current, data.studentId);
    const own = current.seats.byId.get(data.studentId);
    if (!chat || !own) return; // not in a chat: a no-op, like every other event
    const others = activeMembers(chat).filter(
      (member) => member.studentId !== data.studentId
    );
    log.info(
      {
        joinCode: data.joinCode,
        studentId: data.studentId,
        chatId: chat.id,
        others: others.length,
      },
      "student left their chat"
    );
    if (others.length < 2) {
      // Nobody left to talk to, so this ends the room for everyone — the
      // same act as the teacher's chat:end, and modelled as one: membership
      // stays intact, so both seats go wrappingUp and both stay resumable
      // members of the ended chat. settleMembershipChange sends each of
      // them their own projection, and toChatEnded turns the stored "peer"
      // into "student" for the one who tapped.
      const result = endChat(current, chat.id, "peer", data.studentId);
      if (result) settleMembershipChange(current, result);
    } else {
      // The room keeps going without them: drop the membership (the others
      // get chat:update), then wrap up this seat alone. The payload is bare
      // — that chat is still live, so there is nothing to reveal.
      const result = markInactive(current, chat.id, data.studentId, "peer");
      if (result) settleMembershipChange(current, result);
      markWrappingUp(own);
      socket.emit("chat:ended", { reason: "self-left" });
    }
    broadcastState(current);
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

  registerStudentChatHandlers(ctx, socket, data);

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
    // Every seat gets the same grace, matched or waiting. Matched seats
    // used to arm no timer at all so a student could always resume into
    // their chat — but that made a dropped student indistinguishable from
    // one who left and whose `lobby:leave` never arrived, and it stranded
    // their partner in a dead room until the activity died (found on a
    // real handset, 2026-07-20). 120s is long enough to walk back into
    // your chat after a lift or a lock screen, and short enough that
    // nobody waits on someone who is never coming back.
    armSeatTimers(current, dropped, timing.graceMs);
  });
}
