import { CHAT_MESSAGE_MAX_CHARS, TYPING_HEARTBEAT_MS } from "@chaverola/shared";

import { getByJoinCode } from "../../store/activityStore";
import {
  toChatLine,
  toChatTranscriptLine,
  toPeerTyping,
} from "../../store/projections";
import { room } from "../lobbyContext";
import type {
  LobbyContext,
  LobbySocket,
  StudentSocketData,
} from "../lobbyContext";
import { activeMembers, appendLine, findActiveChatOf } from "../matching";

/** chat:send's sliding window: 10 messages per 10 seconds per socket —
 *  loose enough that chained one-word messages never trip it, tight enough
 *  that a script gets nowhere. The first unbounded student→server event in
 *  the system; Express's limiters provably don't reach sockets. */
const CHAT_SEND_WINDOW_MS = 10_000;
const CHAT_SEND_WINDOW_LIMIT = 10;

/** chat:typing's floor between relays: half the client's heartbeat, so
 *  timer jitter can never drop a legitimate heartbeat, while a hostile
 *  emit-loop relays (and looks up) at most once a second. A sliding window
 *  would be machinery for nothing — heartbeats are ~1 per 2s by design. */
const TYPING_RELAY_MIN_INTERVAL_MS = TYPING_HEARTBEAT_MS / 2;

/** The two per-socket rate-limited student events. The send budget and the
 *  typing floor live in this function's closure — one per connection, dying
 *  with the socket, so there is no map to clean up and no way to leak one
 *  student's budget into another's. */
export function registerStudentChatHandlers(
  ctx: LobbyContext,
  socket: LobbySocket,
  data: StudentSocketData
): void {
  const { io } = ctx;

  // The send budget lives in the connection closure, not on socket.data:
  // it dies with the socket, so there is no map to clean up and no way to
  // leak one student's budget into another's.
  const sendTimes: number[] = [];
  // Same rationale for the typing relay's floor.
  let lastTypingRelayAt = 0;

  socket.on("chat:send", (payload) => {
    if (typeof payload?.text !== "string") return;
    const text = payload.text.trim();
    if (text.length === 0) return;
    // Counted by code points — matching the composer's charCount, so a
    // multi-unit emoji is one character on both sides of the wire.
    if (Array.from(text).length > CHAT_MESSAGE_MAX_CHARS) return;
    const now = Date.now();
    while (sendTimes.length > 0 && now - sendTimes[0]! > CHAT_SEND_WINDOW_MS)
      sendTimes.shift();
    if (sendTimes.length >= CHAT_SEND_WINDOW_LIMIT) return;
    const current = getByJoinCode(data.joinCode);
    if (!current) return;
    // Paused means paused — the server-side belt under the disabled
    // composer. Silent like every rejection; the composer is the UX.
    if (current.pausedAt !== null) return;
    const chat = findActiveChatOf(current, data.studentId);
    if (!chat) return;
    const result = appendLine(current, chat.id, data.studentId, text, now);
    if (!result) return;
    sendTimes.push(now);
    // One projection for every student — the line is character-only.
    const line = toChatLine(result.chat, result.line);
    for (const member of activeMembers(result.chat)) {
      const seat = current.seats.byId.get(member.studentId);
      if (!seat?.connected) continue;
      io.sockets.sockets
        .get(seat.currentSocketId)
        ?.emit("chat:line", { chatId: result.chat.id, line });
    }
    // The teacher room gets the same stored line with the real name
    // attached — the one delta on the teacher wire (a snapshot per
    // message would be far too fat); a dropped delta heals on the next
    // chats:snapshot, which also carries the transcript.
    io.to(room(data.joinCode)).emit("chat:transcript-line", {
      chatId: result.chat.id,
      line: toChatTranscriptLine(result.chat, result.line),
    });
  });

  socket.on("chat:typing", () => {
    // Consume the floor BEFORE the lookups: a hostile emit-loop is capped
    // at one store lookup per interval, not one per packet.
    const now = Date.now();
    if (now - lastTypingRelayAt < TYPING_RELAY_MIN_INTERVAL_MS) return;
    lastTypingRelayAt = now;
    const current = getByJoinCode(data.joinCode);
    if (!current) return;
    if (current.pausedAt !== null) return; // no ghost dots in a frozen room
    const chat = findActiveChatOf(current, data.studentId);
    if (!chat) return;
    // No store touch, no teacher emit: typing is never a stored fact, and
    // the teacher deliberately never sees it (DECISIONS.md).
    const payload = toPeerTyping(chat, data.studentId);
    for (const member of activeMembers(chat)) {
      if (member.studentId === data.studentId) continue; // never the sender
      const seat = current.seats.byId.get(member.studentId);
      if (!seat?.connected) continue;
      // volatile: a heartbeat that can't go out now must die, not queue —
      // a buffered heartbeat flushing after a blip is the one way a ghost
      // indicator could outlive its moment.
      io.sockets.sockets
        .get(seat.currentSocketId)
        ?.volatile.emit("chat:peer-typing", payload);
    }
  });
}
