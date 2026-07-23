import type {
  Activity,
  Character,
  ChatLine,
  ChatPeer,
  ChatSnapshot,
  ChatTranscriptLine,
  HostedActivity,
  QueueEntry,
} from "@chaverola/shared";

import { activeMembers, eligibleWaiting } from "../live/matching";
import type { StoredChat, StoredChatLine } from "../live/matching";
import { timing } from "../live/timing";
import type { Seat } from "../live/seats";
import type { StoredActivity } from "./activityStore";

/*
  The only module allowed to turn stored records into response JSON. Every
  projection is an explicit field-by-field literal — never a spread, never a
  delete — so a new StoredActivity field is private until someone adds it
  here on purpose. The privacy tests pin the exact key lists.
*/

/** The student projection: no teacherEmail, no settings, no hostKey. */
export function toActivity(stored: StoredActivity): Activity {
  const activity: Activity = {
    joinCode: stored.joinCode,
    hostName: stored.hostName,
    characters: stored.characters,
  };
  if (stored.scenario !== undefined) activity.scenario = stored.scenario;
  return activity;
}

/** The teacher projection: everything students see plus the teacher-only
 *  setup fields. The hostKey stays out — it lives only in the URL. */
export function toHostedActivity(stored: StoredActivity): HostedActivity {
  const activity: HostedActivity = {
    joinCode: stored.joinCode,
    hostName: stored.hostName,
    characters: stored.characters,
    settings: stored.settings,
  };
  if (stored.scenario !== undefined) activity.scenario = stored.scenario;
  if (stored.teacherEmail !== undefined) {
    activity.teacherEmail = stored.teacherEmail;
  }
  return activity;
}

/** Waiting seats' previous partners, for the teacher's rematch heads-up:
 *  `lastPartners` scoped to the currently-selectable (eligibleWaiting) pool,
 *  so the payload never carries departed students' stale keys. Teacher-room
 *  only. */
export function toRematchPartners(
  activity: StoredActivity
): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const seat of eligibleWaiting(activity)) {
    const partners = activity.lastPartners[seat.studentId];
    if (partners !== undefined) result[seat.studentId] = partners;
  }
  return result;
}

/** A drop reads "reconnecting" only past the broadcast delay — a refresh
 *  reconnects in ~1–2s and shouldn't flash the row (or dim a card member).
 *  The delay gates only this teacher-facing state, never the grace clock.
 *  timing.*, not the shared constants: countdown payloads must track the
 *  actual (possibly time-scaled) reap clock or they desync. */
function isReconnecting(seat: Seat, now: number): boolean {
  return (
    !seat.connected &&
    seat.disconnectedAt !== undefined &&
    now - seat.disconnectedAt >= timing.broadcastDelayMs
  );
}

/** Seconds left in a dropped seat's reconnect window — the student
 *  countdown's seed, computed at emit; the client ticks between events.
 *  Callers only ask about seats that are actually mid-drop (the broadcast
 *  timer's own seat, or one isReconnecting just passed), so disconnectedAt
 *  is set (the fallback keeps the helper total). */
export function graceSecondsLeft(seat: Seat, now: number): number {
  const deadline = (seat.disconnectedAt ?? now) + timing.graceMs;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** The teacher's queue row. NEVER the token. `clockNow` is the wait
 *  clock's now — a paused activity passes its freeze anchor so waitSeconds
 *  holds, while `connection` keeps real time (a mid-pause drop must still
 *  read "reconnecting": its grace clock runs through the pause). */
export function toQueueEntry(
  seat: Seat,
  now: number,
  clockNow: number = now
): QueueEntry {
  return {
    id: seat.studentId,
    name: seat.name,
    waitSeconds: Math.max(0, Math.floor((clockNow - seat.joinedAt) / 1000)),
    connection: isReconnecting(seat, now) ? "reconnecting" : "connected",
  };
}

/** The student's lobby:welcome payload: the resume pair, plus the
 *  activity-wide pause at connect time (a refresh mid-pause stays frozen —
 *  the client keeps `paused` out of the persisted session). */
export function toLobbyWelcome(
  seat: Seat,
  activity: StoredActivity
): {
  studentId: string;
  token: string;
  paused: boolean;
} {
  return {
    studentId: seat.studentId,
    token: seat.token,
    paused: activity.pausedAt !== null,
  };
}

/** Characters resolve from the SERVER roster (character edits are
 *  local-only client-side, so the server's copy never changes and the id
 *  was minted from it — the find can't miss; the fallback keeps the
 *  projector total anyway). */
function resolveCharacter(
  activity: StoredActivity,
  characterId: string
): Character {
  return (
    activity.characters.find((c) => c.id === characterId) ?? {
      id: characterId,
      name: characterId,
    }
  );
}

/** The teacher's chat card (room lobby:${joinCode}) — real names are fine
 *  here; never a token. */
export function toChatSnapshot(
  chat: StoredChat,
  activity: StoredActivity,
  now: number
): ChatSnapshot {
  return {
    id: chat.id,
    participants: chat.members.map((member) => ({
      id: member.studentId,
      name: member.name,
      character: resolveCharacter(activity, member.characterId),
    })),
    inactiveStudentIds: [...chat.inactiveStudentIds],
    reconnectingStudentIds: activeMembers(chat)
      .filter((member) => {
        const seat = activity.seats.byId.get(member.studentId);
        return seat !== undefined && isReconnecting(seat, now);
      })
      .map((member) => member.studentId),
    messages: chat.lines.map((line) => toChatTranscriptLine(chat, line)),
    status: chat.status,
    endReason: chat.endReason,
  };
}

/** The teacher projection of a transcript line — real name attached, same
 *  teacher-only surface as ChatSnapshot. The second, richer view of the
 *  exact stored line toChatLine projects for students. */
export function toChatTranscriptLine(
  chat: StoredChat,
  line: StoredChatLine
): ChatTranscriptLine {
  // appendLine refuses a non-member, so the find can't miss.
  const sender = chat.members.find((m) => m.studentId === line.studentId)!;
  return {
    id: line.id,
    studentId: line.studentId,
    name: sender.name,
    characterId: sender.characterId,
    text: line.text,
    sentAt: line.sentAt,
  };
}

/** The student wire carries characterIds ONLY — never names, never peer
 *  studentIds (the load-bearing privacy pin). */
function toChatPeers(chat: StoredChat, studentId: string): ChatPeer[] {
  return activeMembers(chat)
    .filter((member) => member.studentId !== studentId)
    .map((member) => ({ characterId: member.characterId }));
}

/** Everyone ever in the room minus self, seat order — chat.members, NOT
 *  activeMembers: departed members stay in it forever, which is what makes
 *  this the refresh-invariant roster a resumed client rebuilds lines and
 *  colors from. Additive to `peers`, never a replacement. */
function toChatEverPeers(chat: StoredChat, studentId: string): ChatPeer[] {
  return chat.members
    .filter((member) => member.studentId !== studentId)
    .map((member) => ({ characterId: member.characterId }));
}

/** The student projection of a transcript line: characterId, never the
 *  sender's studentId or name. */
export function toChatLine(chat: StoredChat, line: StoredChatLine): ChatLine {
  // appendLine refuses a non-member, so the find can't miss.
  const sender = chat.members.find((m) => m.studentId === line.studentId)!;
  return {
    id: line.id,
    characterId: sender.characterId,
    text: line.text,
    sentAt: line.sentAt,
  };
}

export function toChatStarted(
  chat: StoredChat,
  activity: StoredActivity,
  studentId: string,
  now: number
): {
  chatId: string;
  selfCharacterId: string;
  peers: ChatPeer[];
  everPeers: ChatPeer[];
  lines: ChatLine[];
  reconnectingPeers: { characterId: string; secondsLeft: number }[];
} {
  // Callers only project a chat for its own members — the find can't miss.
  // Deliberately `members`, not activeMembers: the reaped-returner replay
  // projects through an INACTIVE member of a possibly-ended chat.
  const self = chat.members.find((m) => m.studentId === studentId)!;
  return {
    chatId: chat.id,
    selfCharacterId: self.characterId,
    peers: toChatPeers(chat, studentId),
    everPeers: toChatEverPeers(chat, studentId),
    lines: chat.lines.map((line) => toChatLine(chat, line)),
    // The offline backlog: peers mid-grace at delivery, on the same 4s
    // gate as chat:peer-connection (a fresh drop reads connected until its
    // own broadcast timer fires). characterId + seconds only — never the
    // seat (the entry pin in projections.test.ts).
    reconnectingPeers: activeMembers(chat).flatMap((member) => {
      if (member.studentId === studentId) return [];
      const seat = activity.seats.byId.get(member.studentId);
      if (!seat || !isReconnecting(seat, now)) return [];
      return [
        {
          characterId: member.characterId,
          secondsLeft: graceSecondsLeft(seat, now),
        },
      ];
    }),
  };
}

/** The student typing signal: characterId-only, the same load-bearing pin
 *  as ChatPeer. Ephemeral — never stored, never in a resume backlog. */
export function toPeerTyping(
  chat: StoredChat,
  studentId: string
): { chatId: string; characterId: string } {
  // The relay only calls this after findActiveChatOf, so the find can't miss.
  const typist = chat.members.find((m) => m.studentId === studentId)!;
  return {
    chatId: chat.id,
    characterId: typist.characterId,
  };
}

/** The student peer-connection signal: characterId-only, the same
 *  load-bearing pin as ChatPeer and toPeerTyping. */
export function toPeerConnection(
  chat: StoredChat,
  studentId: string,
  state: "dropped" | "returned",
  secondsLeft: number | null
): {
  chatId: string;
  characterId: string;
  state: "dropped" | "returned";
  secondsLeft: number | null;
} {
  // Callers resolve the chat via findActiveChatOf, so the find can't miss.
  const member = chat.members.find((m) => m.studentId === studentId)!;
  return {
    chatId: chat.id,
    characterId: member.characterId,
    state,
    secondsLeft,
  };
}

export function toChatUpdate(
  chat: StoredChat,
  studentId: string
): { chatId: string; peers: ChatPeer[] } {
  return {
    chatId: chat.id,
    peers: toChatPeers(chat, studentId),
  };
}

export function toChatEnded(
  chat: StoredChat,
  activity: StoredActivity,
  studentId: string
): {
  reason: "teacher" | "peer" | "peer-timeout";
  endedBy?: string;
  reveal?: { characterId: string; name: string }[];
} {
  // The stored reason is the truth — which is also what makes the
  // wrappingUp resume re-delivery honest for free. The fallback keeps
  // the projector total if it's ever called on a not-yet-ended chat.
  const reason = chat.endReason ?? "teacher";
  // A "peer" ending names the leaver — as a characterId the survivor
  // already knows from chat:started, never a studentId, never a name (the
  // ChatPeer pin). The key is absent entirely on every other reason.
  const endedBy = chat.members.find(
    (member) => member.studentId === chat.endedBy
  )?.characterId;
  const base: { reason: typeof reason; endedBy?: string } =
    endedBy === undefined ? { reason } : { reason, endedBy };
  // The name reveal — the ONE sanctioned exception to the characterIds-only
  // student wire. Names leave the server only when the teacher's revealNames
  // setting is on at end time, and only the OTHER members' (the recipient
  // knows their own). Omitted entirely when off, so a real name never reaches
  // a peer unasked-for — pinned by projections.test.ts.
  if (!activity.settings.revealNames) {
    return base;
  }
  return {
    ...base,
    reveal: chat.members
      .filter((member) => member.studentId !== studentId)
      .map((member) => ({
        characterId: member.characterId,
        name: member.name,
      })),
  };
}
