import { randomUUID } from "node:crypto";

import { CHAT_TRANSCRIPT_MAX_LINES } from "@chaverola/shared";

import type { StoredActivity } from "../store/activityStore";
import type { Seat } from "./seats";

/*
  The matching layer, pure and io-free (seats.ts's charter): every state
  transition on an activity's chats lives here, testable without a socket in
  sight. lobby.ts owns the io server, the emits, and the auto-match timer;
  this module owns the chat records and the pairing rules. The rules mirror
  hostWorld.ts's demo simulation (read, never import) minus rematch memory —
  chats end two ways (the teacher's endChat, and markInactive's below-2
  rule) and the whole class pauses as one switch (pauseChats/resumeChats),
  but the server still tracks no last-partners, so pairing stays greedy in
  queue order. Rematch memory is its own later feature.
*/

/** One stored transcript line. Deliberately lean: no characterId, no name
 *  — both live on `chat.members`, and `appendLine` refuses a non-member,
 *  so the projectors resolve through it. One truth, not a denormalized
 *  copy. */
export interface StoredChatLine {
  id: string; // randomUUID
  studentId: string;
  text: string;
  sentAt: number;
}

/** One chat as the server tracks it. Never on the wire — projections.ts
 *  decides what leaves (students get characterIds only). */
export interface StoredChat {
  id: string; // randomUUID
  /** Everyone ever in the room, seat order. `name` is captured at chat
   *  start, so a removed seat's card label survives. */
  members: { studentId: string; name: string; characterId: string }[];
  inactiveStudentIds: string[];
  /** The transcript, capped at CHAT_TRANSCRIPT_MAX_LINES (oldest drop).
   *  In memory like everything else — a deploy wipes it. */
  lines: StoredChatLine[];
  startedAt: number;
  status: "active" | "ended";
  endReason: "teacher" | null;
}

/** The members still actually in the room. */
export function activeMembers(chat: StoredChat): StoredChat["members"] {
  return chat.members.filter(
    (m) => !chat.inactiveStudentIds.includes(m.studentId)
  );
}

/** Active members of active chats — the seats a chat currently holds. */
export function matchedStudentIds(activity: StoredActivity): Set<string> {
  const ids = new Set<string>();
  for (const chat of activity.chats) {
    if (chat.status !== "active") continue;
    for (const member of activeMembers(chat)) ids.add(member.studentId);
  }
  return ids;
}

/**
 * The one matchable pool: seats not matched, not wrappingUp, connected, in
 * joinedAt order. This enforces unmatchable-while-reconnecting server-side.
 */
export function eligibleWaiting(activity: StoredActivity): Seat[] {
  const matched = matchedStudentIds(activity);
  return [...activity.seats.byId.values()]
    .filter(
      (seat) =>
        seat.connected && !seat.wrappingUp && !matched.has(seat.studentId)
    )
    .sort(
      (a, b) => a.joinedAt - b.joinedAt || (a.studentId < b.studentId ? -1 : 1)
    );
}

/**
 * Seat students on the activity's characters: a chat of N always uses the
 * roster's first N characters (the setup form's promise about characters 3
 * and 4), and WHO gets WHICH is random. A local Fisher–Yates — never import
 * client code for it.
 */
function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // Both indexes are within bounds by construction.
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/**
 * Start a chat: filter to eligible students, clamp to min(4, roster length)
 * — a teacher's locally-edited roster can diverge, so leftovers visibly stay
 * in the queue — and no-op under 2. Consuming the leftover clears the
 * highlight.
 */
export function createChat(
  activity: StoredActivity,
  studentIds: string[],
  now: number
): StoredChat | null {
  const requested = eligibleWaiting(activity).filter((seat) =>
    studentIds.includes(seat.studentId)
  );
  const seated = requested.slice(0, Math.min(4, activity.characters.length));
  if (seated.length < 2) return null;

  const cast = shuffled(activity.characters.slice(0, seated.length));
  const chat: StoredChat = {
    id: randomUUID(),
    members: seated.map((seat, index) => ({
      studentId: seat.studentId,
      name: seat.name,
      // `cast` and `seated` are the same length by construction.
      characterId: cast[index]!.id,
    })),
    inactiveStudentIds: [],
    lines: [],
    startedAt: now,
    status: "active",
    endReason: null,
  };
  activity.chats.push(chat);
  if (
    activity.leftoverStudentId !== null &&
    chat.members.some((m) => m.studentId === activity.leftoverStudentId)
  ) {
    activity.leftoverStudentId = null;
  }
  return chat;
}

/**
 * Pair the whole queue at once — the demo's pairEveryoneIn minus rematch
 * memory: adjacent pairs in queue order; an odd count seats the last three
 * as a trio when the activity has a 3rd character, otherwise the newest
 * joiner stays first in line as the leftover. Null under 2 eligible (the
 * existing leftover highlight stays untouched).
 */
export function planPairEveryone(
  activity: StoredActivity
): { groups: string[][]; leftoverStudentId: string | null } | null {
  const pool = eligibleWaiting(activity).map((seat) => seat.studentId);
  if (pool.length < 2) return null;

  let leftover: string | null = null;
  let trio: string[] | null = null;
  if (pool.length % 2 === 1) {
    if (activity.characters.length >= 3) {
      trio = pool.splice(pool.length - 3, 3);
    } else {
      leftover = pool.pop() ?? null;
    }
  }

  const groups: string[][] = [];
  for (let i = 0; i + 1 < pool.length; i += 2) {
    // Both indexes are within bounds — the loop condition guarantees i + 1.
    groups.push([pool[i]!, pool[i + 1]!]);
  }
  if (trio) groups.push(trio);
  return { groups, leftoverStudentId: leftover };
}

/** The two longest-waiting eligible students once both are past the
 *  threshold — greedy in queue order, no rematch memory. */
export function findAutoMatchPair(
  activity: StoredActivity,
  thresholdSeconds: number,
  now: number
): [string, string] | null {
  const ready = eligibleWaiting(activity).filter(
    (seat) => (now - seat.joinedAt) / 1000 >= thresholdSeconds
  );
  if (ready.length < 2) return null;
  // Two elements exist — just checked.
  return [ready[0]!.studentId, ready[1]!.studentId];
}

/**
 * A member leaves the room (teacher remove or student leave): mark them
 * inactive; when active membership drops below 2 the chat ends for the
 * remaining peer with reason "teacher" (demo semantics — the founder call).
 * Undefined when the chat/member isn't an active match — idempotent.
 */
export function markInactive(
  activity: StoredActivity,
  chatId: string,
  studentId: string
): { ended: boolean; chat: StoredChat } | undefined {
  const chat = activity.chats.find((c) => c.id === chatId);
  if (!chat || chat.status !== "active") return undefined;
  if (!activeMembers(chat).some((m) => m.studentId === studentId)) {
    return undefined;
  }
  chat.inactiveStudentIds.push(studentId);
  const ended = activeMembers(chat).length < 2;
  if (ended) {
    chat.status = "ended";
    chat.endReason = "teacher";
  }
  return { ended, chat };
}

/**
 * The teacher ends a chat outright (per-card End chat, or End-all's loop):
 * membership stays intact — everyone is still in the room — the chat just
 * flips to ended with reason "teacher". Undefined when the chat is missing
 * or already ended — idempotent, like every teacher command. The result
 * shape matches markInactive's so settleMembershipChange serves both.
 */
export function endChat(
  activity: StoredActivity,
  chatId: string
): { ended: true; chat: StoredChat } | undefined {
  const chat = activity.chats.find((c) => c.id === chatId);
  if (!chat || chat.status !== "active") return undefined;
  chat.status = "ended";
  chat.endReason = "teacher";
  return { ended: true, chat };
}

/**
 * The teacher's world-level pause: stamp the freeze anchor. Everything else
 * — refusing sends, holding auto-match, clocking snapshots against the
 * anchor — reads `pausedAt` where it already works. False when already
 * paused, the teacher-command idempotency signal.
 */
export function pauseChats(activity: StoredActivity, now: number): boolean {
  if (activity.pausedAt !== null) return false;
  activity.pausedAt = now;
  return true;
}

/**
 * Resume: shift the stored clocks forward by the pause duration so nobody's
 * wait or chat time jumps, then clear the anchor. The min-clamp handles
 * everything born mid-pause (joins, lobby:back returns, manually-paired
 * chats): their timestamps sit past the anchor, so they land at `now` —
 * zero accrued time — instead of in the future. False when not paused.
 */
export function resumeChats(activity: StoredActivity, now: number): boolean {
  if (activity.pausedAt === null) return false;
  const pauseMs = now - activity.pausedAt;
  for (const seat of activity.seats.byId.values()) {
    seat.joinedAt = Math.min(seat.joinedAt + pauseMs, now);
  }
  for (const chat of activity.chats) {
    if (chat.status !== "active") continue;
    chat.startedAt = Math.min(chat.startedAt + pauseMs, now);
  }
  activity.pausedAt = null;
  return true;
}

/**
 * A member speaks: mint the line, append, trim to the transcript cap
 * (oldest dropped). Undefined when the chat isn't active or the sender
 * isn't an active member — idempotent-silent, like every socket rule.
 * No io, no emits; the fan-out is lobby.ts's job.
 */
export function appendLine(
  activity: StoredActivity,
  chatId: string,
  studentId: string,
  text: string,
  now: number
): { chat: StoredChat; line: StoredChatLine } | undefined {
  const chat = activity.chats.find((c) => c.id === chatId);
  if (!chat || chat.status !== "active") return undefined;
  if (!activeMembers(chat).some((m) => m.studentId === studentId)) {
    return undefined;
  }
  const line: StoredChatLine = {
    id: randomUUID(),
    studentId,
    text,
    sentAt: now,
  };
  chat.lines.push(line);
  if (chat.lines.length > CHAT_TRANSCRIPT_MAX_LINES) {
    chat.lines.splice(0, chat.lines.length - CHAT_TRANSCRIPT_MAX_LINES);
  }
  return { chat, line };
}
