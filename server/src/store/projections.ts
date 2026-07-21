import { LOBBY_DISCONNECT_BROADCAST_DELAY_MS } from "@chaverola/shared";
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

import { activeMembers } from "../live/matching";
import type { StoredChat, StoredChatLine } from "../live/matching";
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

/** A drop reads "reconnecting" only past the broadcast delay — a refresh
 *  reconnects in ~1–2s and shouldn't flash the row (or dim a card member).
 *  The delay gates only this teacher-facing state, never the grace clock. */
function isReconnecting(seat: Seat, now: number): boolean {
  return (
    !seat.connected &&
    seat.disconnectedAt !== undefined &&
    now - seat.disconnectedAt >= LOBBY_DISCONNECT_BROADCAST_DELAY_MS
  );
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
  // Paused clocks freeze at the anchor; reconnecting state keeps real time
  // (same split as toQueueEntry — the grace clock runs through a pause).
  const clockNow = activity.pausedAt ?? now;
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
    elapsedSeconds: Math.max(0, Math.floor((clockNow - chat.startedAt) / 1000)),
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
  studentId: string
): {
  chatId: string;
  selfCharacterId: string;
  peers: ChatPeer[];
  everPeers: ChatPeer[];
  lines: ChatLine[];
} {
  // Callers only project a chat for its own members — the find can't miss.
  const self = chat.members.find((m) => m.studentId === studentId)!;
  return {
    chatId: chat.id,
    selfCharacterId: self.characterId,
    peers: toChatPeers(chat, studentId),
    everPeers: toChatEverPeers(chat, studentId),
    lines: chat.lines.map((line) => toChatLine(chat, line)),
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

export function toChatUpdate(
  chat: StoredChat,
  studentId: string
): { chatId: string; peers: ChatPeer[] } {
  return {
    chatId: chat.id,
    peers: toChatPeers(chat, studentId),
  };
}

export function toChatEnded(chat: StoredChat): { reason: "teacher" } {
  return {
    // "teacher" is the only reachable reason this feature; the fallback
    // keeps the projector total if it's ever called on a not-yet-ended chat.
    reason: chat.endReason ?? "teacher",
  };
}
