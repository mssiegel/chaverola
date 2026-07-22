/*
  The Socket.IO wire contract (namespace "/", path /socket.io/ on the API
  origin). Handwritten types, same convention as the REST contract in api.ts:
  the server types its io server `Server<ClientToServerEvents,
  ServerToClientEvents>`, the client types its socket
  `Socket<ServerToClientEvents, ClientToServerEvents>`.

  Connection REJECTIONS ride `connect_error` with a coded message:
  - "activity_gone" — unknown joinCode/hostKey, or the store was wiped
    (student shows the ended screen; teacher falls back to not-found)
  - "removed"       — a tombstoned seat token (name step + removed notice)
  - "full"          — MAX_STUDENTS_PER_ACTIVITY reached (its own copy)
  - "invalid"       — malformed auth payload
*/

import type { ActivitySettings, Character } from "./types";

export type LobbyConnectionState = "connected" | "reconnecting";

/** Teacher-facing queue entry. Exact-allowlist-tested: never the token. */
export interface QueueEntry {
  id: string; // server-minted student id
  name: string; // real name — a teacher-only surface
  waitSeconds: number; // computed server-side at emit; client ticks between
  connection: LobbyConnectionState;
}

/** Teacher-only surface (room lobby:${joinCode}) — real names are fine here.
 *  Exact-allowlist-tested: never a token. `character` is the SERVER roster's
 *  copy (id + name + emoji?) so a locally-renamed roster still resolves. */
export interface ChatParticipant {
  id: string; // studentId
  name: string; // captured at chat start — survives seat removal
  character: Character;
}

export interface ChatSnapshot {
  id: string;
  participants: ChatParticipant[]; // everyone ever in the room, seat order
  inactiveStudentIds: string[]; // removed / left mid-chat
  reconnectingStudentIds: string[]; // active members dropped past the 4s delay
  messages: ChatTranscriptLine[]; // the whole capped transcript, oldest first
  elapsedSeconds: number; // computed server-side at emit; client ticks between
  status: "active" | "ended";
  // "peer-timeout": a below-2 ending caused by a partner's expired grace.
  endReason: "teacher" | "peer-timeout" | null;
}

/** Student-facing: characterIds only — never names, never peer studentIds. */
export interface ChatPeer {
  characterId: string;
}

/** Student-facing chat message: the sender is a characterId, never a
 *  studentId and never a name — the same load-bearing pin as ChatPeer. */
export interface ChatLine {
  id: string;
  characterId: string;
  text: string;
  sentAt: number; // epoch ms, server clock
}

/** Teacher-only projection of the same stored line (room lobby:${joinCode})
 *  — real names are fine here, exactly as on ChatParticipant. */
export interface ChatTranscriptLine {
  id: string;
  studentId: string;
  name: string;
  characterId: string;
  text: string;
  sentAt: number; // epoch ms, server clock
}

/** socket.handshake.auth payloads. */
export interface TeacherAuth {
  role: "teacher";
  hostKey: string;
}
export interface StudentAuth {
  role: "student";
  joinCode: string;
  name?: string; // fresh join (trimmed, 1–STUDENT_NAME_MAX_CHARS)
  nonce?: string; // client-minted at signIn; makes fresh joins idempotent
  studentId?: string; // seat resume
  token?: string; // seat resume
}

export interface ServerToClientEvents {
  /** Teacher room; also emitted to a teacher socket the moment it joins. */
  "queue:snapshot": (payload: { students: QueueEntry[] }) => void;
  /** Student only. Persist studentId + token into the session for resume;
   *  `paused` is the activity-wide pause at connect time (session-state
   *  only, never persisted) so a refresh mid-pause stays frozen. */
  "lobby:welcome": (payload: {
    studentId: string;
    token: string;
    paused: boolean;
  }) => void;
  /** Student only: the teacher removed you → name step + notice. */
  "lobby:removed": () => void;
  /** Student only: the activity died under you → the ended screen. */
  "activity:ended": () => void;
  /** Teacher room; also emitted to a teacher socket the moment it joins. */
  "chats:snapshot": (payload: {
    chats: ChatSnapshot[];
    leftoverStudentId: string | null; // pair-everyone's odd one out
    paused: boolean; // the world-level pause — keeps a second host device coherent
    // Waiting seats' previous partners (studentId → prior chat's others),
    // teacher-room only; feeds the rematch heads-up. `?? {}` on the client
    // tolerates an older server during a deploy.
    lastPartners: Record<string, string[]>;
    // Pair-everyone left an exact pair/trio in line — the dismissible rail
    // notice (teacher truth, so a second host device stays coherent). `?? null`
    // on the client tolerates an older server during a deploy.
    rematchNotice: string | null;
  }) => void;
  /** Student only, targeted; re-sent on every resume while matched, and
   *  replayed once for a chat the recipient was reaped out of (immediately
   *  followed by chat:ended {reason:"self-timeout"}). `lines`
   *  is the transcript backlog and is authoritative on every delivery — the
   *  chat:line fan-out skips disconnected seats, so this payload is the only
   *  channel that heals a blip. `everPeers` is everyone ever in the room
   *  minus self (peers still shrinks on chat:update), so a departed member's
   *  lines keep resolving after a refresh. `reconnectingPeers` is the
   *  offline backlog — active peers mid-grace, past the same 4s gate as
   *  chat:peer-connection, seconds computed at emit — and is authoritative
   *  on every delivery for the same reason as `lines`: the "dropped"
   *  fan-out skips disconnected seats too, so a resumer who was dark when
   *  a partner dropped learns it only here. */
  "chat:started": (payload: {
    chatId: string;
    selfCharacterId: string;
    peers: ChatPeer[];
    everPeers: ChatPeer[];
    lines: ChatLine[];
    reconnectingPeers: { characterId: string; secondsLeft: number }[];
  }) => void;
  /** Student only: remaining ACTIVE peers after a membership change; the
   *  client diffs against what it had and renders a local notice. */
  "chat:update": (payload: { chatId: string; peers: ChatPeer[] }) => void;
  /** Student only, targeted at each connected active member (the sender's
   *  own echo included — it is the delivery receipt). */
  "chat:line": (payload: { chatId: string; line: ChatLine }) => void;
  /** Student only, targeted at each OTHER connected active member — never
   *  the sender, never the teacher room. characterId-only, the same pin as
   *  ChatPeer. Ephemeral: never stored, never in a resume backlog; the
   *  receiver expires it TYPING_INDICATOR_TTL_MS after the last heartbeat. */
  "chat:peer-typing": (payload: {
    chatId: string;
    characterId: string;
  }) => void;
  /** Student only, targeted at each OTHER connected active member — never
   *  the affected seat, never the teacher room (its card already carries
   *  reconnectingStudentIds). characterId-only, the same pin as ChatPeer.
   *  "dropped" fires past the same 4s gate as the teacher's reconnecting
   *  tag, with the remaining grace computed at emit (the client ticks
   *  between events). "returned" fires on EVERY resume into an active chat
   *  — the server can't know whether the drop was ever announced (resume
   *  already cleared disconnectedAt), so receivers ignore a return for a
   *  peer they don't have marked offline. */
  "chat:peer-connection": (payload: {
    chatId: string;
    characterId: string;
    state: "dropped" | "returned";
    secondsLeft: number | null; // remaining grace on "dropped"; null on "returned"
  }) => void;
  /** Teacher room: one line per chat:send, real name attached — the one
   *  delta on the teacher wire (a full snapshot per message would be far
   *  too fat). Safe because chats:snapshot also carries the transcript, so
   *  a dropped delta heals on the next seat change or reconnect instead of
   *  wedging a card. */
  "chat:transcript-line": (payload: {
    chatId: string;
    line: ChatTranscriptLine;
  }) => void;
  /** Student only, targeted; re-sent on resume while the seat is wrappingUp
   *  (the resume re-delivery carries the stored reason, so a survivor whose
   *  own socket blipped around the ending still learns the honest one).
   *  "peer-timeout" is a 1:1 partner's expired grace; every teacher-caused
   *  ending — chat:end, chats:end-all, chat:remove, and a below-2 ending
   *  from lobby:leave — stays "teacher". "self-timeout" exists only on the
   *  wire, never in the store: it's the per-recipient reason a reaped
   *  student hears when they return to their ended chat (the stored 1:1
   *  reason stays "peer-timeout" — the survivor's perspective). */
  "chat:ended": (payload: {
    reason: "teacher" | "peer-timeout" | "self-timeout";
  }) => void;
  /** Student only, targeted at every connected seat — chat members, lobby
   *  waiters, and wrappingUp alike (the pause is activity-wide). Connect-time
   *  state rides lobby:welcome instead; this event only carries live flips. */
  "activity:paused": (payload: { paused: boolean }) => void;
  /** Teacher room minus the sender — keeps a second host device coherent. */
  "settings:changed": (payload: { settings: ActivitySettings }) => void;
}

export interface ClientToServerEvents {
  /** Teacher only; idempotent — removing an absent seat is a no-op. */
  "queue:remove": (payload: { studentId: string }) => void;
  /** Student intentional exit (back-as-reset, sign-out): immediate seat
   *  removal, no 2-minute ghost row. Never fired on refresh/pagehide.
   *  Mid-chat it drops chat membership first (the peer's emits are exactly
   *  chat:remove's, minus the tombstone), then releases the seat. */
  "lobby:leave": () => void;
  /** Teacher only. Filtered to eligible students, clamped to the server
   *  roster; no-ops below 2 eligible. */
  "chat:start": (payload: { studentIds: string[] }) => void;
  /** Teacher only. Fresh-first pairs in queue order, repairing around exact
   *  reruns; odd count seats a trailing trio when the roster has a 3rd
   *  character, else marks the leftover. An exact pair/trio it can't repair
   *  stays in line, carried back as rematchNotice on the next chats:snapshot. */
  "match:pair-everyone": () => void;
  /** Teacher only; idempotent — dismisses the pair-everyone rematch notice
   *  server-side so broadcastState can't resurrect it and a second host device
   *  stays coherent. A no-op when there is no notice. */
  "match:dismiss-rematch-notice": () => void;
  /** Teacher only. Quiet exit; ends the chat when <2 active would remain. */
  "chat:remove": (payload: { chatId: string; studentId: string }) => void;
  /** Teacher only; idempotent — an already-ended or unknown chat is a
   *  no-op. Every member is still active when this fires, so all of them
   *  go wrappingUp and hear chat:ended. */
  "chat:end": (payload: { chatId: string }) => void;
  /** Teacher only: the round-closer — ends every active chat at once. A
   *  class with none active is a no-op. Plural like chats:snapshot. Also
   *  clears an active pause: the round is over, the next starts unpaused. */
  "chats:end-all": () => void;
  /** Teacher only; idempotent — pausing a paused class is a no-op. The
   *  world-level pause: sends and typing refuse everywhere, auto-match and
   *  the clocks hold; joins, manual pairing, and ending keep flowing. */
  "chats:pause-all": () => void;
  /** Teacher only; idempotent — resuming an unpaused class is a no-op.
   *  Shifts the held clocks forward so nobody's wait or chat time jumps.
   *  chat:end never clears a pause; chats:end-all does. */
  "chats:resume-all": () => void;
  /** Teacher only; zod-validated, replaces the stored settings. */
  "settings:update": (payload: { settings: ActivitySettings }) => void;
  /** Student: the ended screen's Back-to-the-lobby tap — returns a
   *  wrappingUp seat to waiting with a fresh clock. Otherwise a no-op. */
  "lobby:back": () => void;
  /** Student only. Trimmed, capped at CHAT_MESSAGE_MAX_CHARS by code
   *  points, rate-limited per socket. Every rejection is a silent no-op,
   *  like every other socket event — there is no error channel today. */
  "chat:send": (payload: { text: string }) => void;
  /** Student only. A typing heartbeat, re-emitted at most once per
   *  TYPING_HEARTBEAT_MS while keys flow. No payload — the seat and chat
   *  resolve server-side, so there is nothing to validate or spoof. Silent
   *  no-op outside an active chat, like every other socket event. */
  "chat:typing": () => void;
}

/**
 * How long a dropped student's seat survives before it's reaped — every
 * seat, waiting or matched. A matched seat used to arm no timer at all so a
 * student could always resume into their chat, but that left a student whose
 * `lobby:leave` never arrived indistinguishable from one who dropped, and
 * their partner stranded in a dead room until the activity died (found on a
 * real handset, 2026-07-20). A matched seat that runs out its grace now
 * leaves its chat as well as its seat; see lobby.ts's armSeatTimers.
 *
 * The window starts at DETECTED disconnect — a dark phone sends no close
 * frame, so detection is Socket.IO's ping cycle (~45s at the default
 * pingInterval 25s + pingTimeout 20s). Since feature 8 this constant is
 * also the source of the student-facing reconnect countdown: the
 * chat:peer-connection "dropped" emit seeds secondsLeft from it, the
 * client falls back to it when the field is null, and the demo engine and
 * the banner's sr-only copy read it too — no separate demo window remains.
 */
export const LOBBY_GRACE_SECONDS = 120;

/**
 * How long a disconnect stays invisible to the teacher's queue. A student
 * refresh reconnects in ~1–2s; don't flash the row for it. Gates only the
 * teacher-facing state change — never the grace clock.
 */
export const LOBBY_DISCONNECT_BROADCAST_DELAY_MS = 4000;

/** Client re-emit floor while keys flow: the indicator appears within ~2s
 *  of the first keystroke, and one heartbeat per 2s is the whole cost. */
export const TYPING_HEARTBEAT_MS = 2_000;
/** Receiver-side expiry, measured from the LAST heartbeat: 2.5 heartbeats,
 *  so one dropped packet never flickers the indicator, while an abandoned
 *  draft dies within 5s. */
export const TYPING_INDICATOR_TTL_MS = 5_000;

/** Seat cap per activity (engine.io bypasses the Express rate limiters, so
 *  the cap is the socket layer's own abuse guard). Tombstones don't count;
 *  matched and wrappingUp seats do — they still hold seats. */
export const MAX_STUDENTS_PER_ACTIVITY = 60;

/**
 * Breather between server-side auto-matches so pairs land one at a time.
 * hostWorld.ts keeps the demo's own copy (the simulation stays
 * self-contained; the live engine imports nothing from it beyond types).
 */
export const AUTO_MATCH_GAP_SECONDS = 3;
