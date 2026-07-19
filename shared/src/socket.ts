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

export type LobbyConnectionState = "connected" | "reconnecting";

/** Teacher-facing queue entry. Exact-allowlist-tested: never the token. */
export interface QueueEntry {
  id: string; // server-minted student id
  name: string; // real name — a teacher-only surface
  waitSeconds: number; // computed server-side at emit; client ticks between
  connection: LobbyConnectionState;
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
}

export interface ClientToServerEvents {
  /** Teacher only; idempotent — removing an absent seat is a no-op. */
  "queue:remove": (payload: { studentId: string }) => void;
  /** Student intentional exit (back-as-reset, sign-out): immediate seat
   *  removal, no 2-minute ghost row. Never fired on refresh/pagehide. */
  "lobby:leave": () => void;
}

/**
 * How long a dropped student's seat survives before it's reaped. The window
 * starts at DETECTED disconnect — a dark phone sends no close frame, so
 * detection is Socket.IO's ping cycle (~45s at the default pingInterval 25s
 * + pingTimeout 20s). Note: `RECONNECT_WINDOW_SECONDS = 120` in
 * useChatDemo.ts is the same product window; when chat goes real in feature
 * 3, this shared constant becomes the one source.
 */
export const LOBBY_GRACE_SECONDS = 120;

/**
 * How long a disconnect stays invisible to the teacher's queue. A student
 * refresh reconnects in ~1–2s; don't flash the row for it. Gates only the
 * teacher-facing state change — never the grace clock.
 */
export const LOBBY_DISCONNECT_BROADCAST_DELAY_MS = 4000;

/** Seat cap per activity (engine.io bypasses the Express rate limiters, so
 *  the cap is the socket layer's own abuse guard). Tombstones don't count. */
export const MAX_STUDENTS_PER_ACTIVITY = 60;
