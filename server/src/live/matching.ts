import { randomUUID } from "node:crypto";

import {
  CHAT_TRANSCRIPT_MAX_LINES,
  activeMembersBy,
  dealCast,
  pairEveryonePlan,
  pickAutoMatchPair,
} from "@chaverola/shared";

import type { StoredActivity } from "../store/activityStore";
import type { Seat } from "./seats";

/*
  The matching layer, pure and io-free (seats.ts's charter): every state
  transition on an activity's chats lives here, testable without a socket in
  sight. lobby.ts owns the io server, the emits, and the auto-match timer;
  this module owns the chat records and the pairing rules.

  The genuinely-pure rules are ONE implementation in @chaverola/shared —
  `activeMembersBy` (active-membership filtering, behind `activeMembers`
  below), `dealCast` (a chat of N takes the roster's first N characters,
  shuffled), `pickAutoMatchPair` (auto-match's fresh-first pick, behind
  `findAutoMatchPair`), and `pairEveryonePlan` (pair-everyone's whole
  fresh-first plan, behind `planPairEveryone` below) — imported by both this
  layer and hostWorld.ts's demo. A neutral zero-dep module, not a server
  dependency on client code, so the old "mirror, never import" tripwire
  doesn't apply: it guarded against the demo's simulation transitions running
  on real students, and shared/ has none of those. The precedent is
  LOBBY_GRACE_SECONDS.

  What deliberately diverges (named, not drifted): the server tracks one-round
  last-partner memory (createChat maintains `activity.lastPartners`, and
  pair-everyone parks an unrepairable exact pair/trio in
  `activity.rematchNotice`) — otherwise the pairing DECISIONS, auto-match and
  pair-everyone alike, are the shared rules, so no exact rerun is formed either
  way. Chats end two ways (the teacher's endChat, and markInactive's below-2
  rule); the whole class pauses as one switch (pauseChats/resumeChats); ids are
  minted with randomUUID, not the demo's counter.
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
  endReason: "teacher" | "peer" | "peer-timeout" | null;
  /** The leaver's studentId, set only with endReason "peer" — persisted so
   *  the wrappingUp resume re-delivery can still name their character. */
  endedBy: string | null;
}

/** The members still actually in the room. */
export function activeMembers(chat: StoredChat): StoredChat["members"] {
  return activeMembersBy(
    chat.members,
    chat.inactiveStudentIds,
    (m) => m.studentId
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

/** The chat a student is actively seated in right now, if any. */
export function findActiveChatOf(
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
 *  them (they're still an active member of it; only leavers go inactive).
 *  A reaped-from-chat returner never resolves here — their new studentId is
 *  in no chat; their resume replays through seat.reapedFromChat instead. */
export function findEndedChatOf(
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

  const cast = dealCast(activity.characters, seated.length);
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
    endedBy: null,
  };
  activity.chats.push(chat);
  // Rematch memory is one round deep: starting a chat overwrites each
  // member's previous partners with this room (mirrors the demo's createChat
  // in hostWorld.ts, which stays the reference).
  for (const member of chat.members) {
    activity.lastPartners[member.studentId] = chat.members
      .filter((other) => other.studentId !== member.studentId)
      .map((other) => other.studentId);
  }
  if (
    activity.leftoverStudentId !== null &&
    chat.members.some((m) => m.studentId === activity.leftoverStudentId)
  ) {
    activity.leftoverStudentId = null;
  }
  return chat;
}

/**
 * Pair the whole queue at once through the shared `pairEveryonePlan`:
 * fresh-first greedy in queue order, swap-repair around exact reruns, an odd
 * count seating a trailing trio (a 3rd character exists) or marking the newest
 * joiner the leftover. `stuckStudentIds` is an exact pair/trio the plan
 * couldn't repair — the caller turns it into the rail notice. Null under 2
 * eligible (the existing leftover/notice stay untouched). Pure: reads the
 * pre-round memory; createChat writes it after.
 */
export function planPairEveryone(activity: StoredActivity): {
  groups: string[][];
  leftoverStudentId: string | null;
  stuckStudentIds: string[];
} | null {
  const plan = pairEveryonePlan(
    eligibleWaiting(activity).map((seat) => seat.studentId),
    activity.characters.length,
    activity.lastPartners
  );
  if (!plan) return null;
  return {
    groups: plan.groups,
    leftoverStudentId: plan.leftoverId,
    stuckStudentIds: plan.stuckIds,
  };
}

/** Auto-match's pick: eligible students past the wait threshold, in queue
 *  order, run through the shared fresh-first rule — a fully-fresh pair when
 *  one exists, else any non-exact-rerun pair, else null (an exact pair waits
 *  for someone new rather than repeating). Mirrors the demo's findAutoMatchPair. */
export function findAutoMatchPair(
  activity: StoredActivity,
  thresholdSeconds: number,
  now: number
): [string, string] | null {
  const ready = eligibleWaiting(activity).filter(
    (seat) => (now - seat.joinedAt) / 1000 >= thresholdSeconds
  );
  return pickAutoMatchPair(
    ready.map((seat) => seat.studentId),
    activity.lastPartners
  );
}

/**
 * A member leaves the room (teacher remove, student leave, or grace
 * expiry): mark them inactive; when active membership drops below 2 the
 * chat ends for the remaining peer. `endReason` is what that ending
 * records — "peer-timeout" only from the grace-expiry path, "peer" only
 * from the student's own lobby:leave (the ending then remembers WHO in
 * `endedBy`, so the survivor's screen can name their character); the
 * default keeps chat:remove on "teacher". Undefined when the chat/member
 * isn't an active match — idempotent.
 */
export function markInactive(
  activity: StoredActivity,
  chatId: string,
  studentId: string,
  endReason: "teacher" | "peer" | "peer-timeout" = "teacher"
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
    chat.endReason = endReason;
    chat.endedBy = endReason === "peer" ? studentId : null;
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
