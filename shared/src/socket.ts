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
  elapsedSeconds: number; // computed server-side at emit; client ticks between
  status: "active" | "ended";
  endReason: "teacher" | null; // the only reachable reason this feature
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
  /** Student only. Persist both into the session for resume. */
  "lobby:welcome": (payload: { studentId: string; token: string }) => void;
  /** Student only: the teacher removed you → name step + notice. */
  "lobby:removed": () => void;
  /** Student only: the activity died under you → the ended screen. */
  "activity:ended": () => void;
  /** Teacher room; also emitted to a teacher socket the moment it joins. */
  "chats:snapshot": (payload: {
    chats: ChatSnapshot[];
    leftoverStudentId: string | null; // pair-everyone's odd one out
  }) => void;
  /** Student only, targeted; re-sent on every resume while matched. `lines`
   *  is the transcript backlog and is authoritative on every delivery — the
   *  chat:line fan-out skips disconnected seats, so this payload is the only
   *  channel that heals a blip. `everPeers` is everyone ever in the room
   *  minus self (peers still shrinks on chat:update), so a departed member's
   *  lines keep resolving after a refresh. */
  "chat:started": (payload: {
    chatId: string;
    selfCharacterId: string;
    peers: ChatPeer[];
    everPeers: ChatPeer[];
    lines: ChatLine[];
  }) => void;
  /** Student only: remaining ACTIVE peers after a membership change; the
   *  client diffs against what it had and renders a local notice. */
  "chat:update": (payload: { chatId: string; peers: ChatPeer[] }) => void;
  /** Student only, targeted at each connected active member (the sender's
   *  own echo included — it is the delivery receipt). */
  "chat:line": (payload: { chatId: string; line: ChatLine }) => void;
  /** Student only, targeted; re-sent on resume while the seat is wrappingUp. */
  "chat:ended": (payload: { reason: "teacher" }) => void;
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
  /** Teacher only. Greedy pairs in queue order; odd count seats a trailing
   *  trio when the roster has a 3rd character, else marks the leftover. */
  "match:pair-everyone": () => void;
  /** Teacher only. Quiet exit; ends the chat when <2 active would remain. */
  "chat:remove": (payload: { chatId: string; studentId: string }) => void;
  /** Teacher only; zod-validated, replaces the stored settings. */
  "settings:update": (payload: { settings: ActivitySettings }) => void;
  /** Student: the ended screen's Back-to-the-lobby tap — returns a
   *  wrappingUp seat to waiting with a fresh clock. Otherwise a no-op. */
  "lobby:back": () => void;
  /** Student only. Trimmed, capped at CHAT_MESSAGE_MAX_CHARS by code
   *  points, rate-limited per socket. Every rejection is a silent no-op,
   *  like every other socket event — there is no error channel today. */
  "chat:send": (payload: { text: string }) => void;
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
 * pingInterval 25s + pingTimeout 20s). Note: `RECONNECT_WINDOW_SECONDS = 120`
 * in useChatDemo.ts simulates the same product window for the demo's
 * peer-drop UI. Messaging shipped without that UI on real rooms, on
 * purpose: ChatPeer is allowlist-pinned to characterId alone, so peer
 * connection state has no slot on the student wire — giving students the
 * countdown is its own feature, and this constant becomes its one source.
 */
export const LOBBY_GRACE_SECONDS = 120;

/**
 * How long a disconnect stays invisible to the teacher's queue. A student
 * refresh reconnects in ~1–2s; don't flash the row for it. Gates only the
 * teacher-facing state change — never the grace clock.
 */
export const LOBBY_DISCONNECT_BROADCAST_DELAY_MS = 4000;

/** Seat cap per activity (engine.io bypasses the Express rate limiters, so
 *  the cap is the socket layer's own abuse guard). Tombstones don't count;
 *  matched and wrappingUp seats do — they still hold seats. */
export const MAX_STUDENTS_PER_ACTIVITY = 60;

/**
 * Breather between server-side auto-matches so pairs land one at a time.
 * hostWorld.ts keeps the demo's own copy — same precedent as
 * LOBBY_GRACE_SECONDS vs RECONNECT_WINDOW_SECONDS.
 */
export const AUTO_MATCH_GAP_SECONDS = 3;
