# API contract

The canonical home of Chaverola's HTTP API — and, since feature 2, its
Socket.IO contract. Keep this file current as features land — the wire
types here mirror `shared/src/api.ts` (REST) and `shared/src/socket.ts`
(sockets), which is what actually compiles against both the client and
the server; if the two ever disagree, the code is right and this file has
a bug.

Implemented by `server/`: feature 1 (create & join) over REST, then the
Socket.IO features documented in [Socket events](#socket-events) below —
feature 2 (the live lobby, i.e. the waiting queue), feature 3 (matching:
the server creates chats, tracks them, and ends them), and feature 4's
messaging slices: **students in a chat send real messages to each other**
(`chat:send` → targeted `chat:line`, with a capped in-memory transcript
re-delivered on resume) and **the teacher reads every chat live with real
names attached** (`chat:transcript-line` to the teacher room, with the
whole transcript riding `ChatSnapshot.messages`). Feature 5 adds the
**student typing indicator** (`chat:typing` → `chat:peer-typing`, an
ephemeral heartbeat relay — students only). Feature 6 makes **ending
real**: the teacher's `chat:end` / `chats:end-all` end chats outright.
Feature 7 makes **pausing real**: `chats:pause-all` / `chats:resume-all`
freeze and unfreeze the whole class — sends refuse, matchmaking and the
clocks hold, and every connected student hears `activity:paused`. Feature
8 gives students the **peer-drop banner**: a chat partner's drop (past
the teacher's own 4s gate) and return ride `chat:peer-connection`, with
the reconnect countdown seeded server-side — and makes the expiry
honest: a 1:1 ended by a partner's expired grace says so
(`chat:ended` reason `"peer-timeout"`). Feature 9 makes the reaped
student's own return honest too: their ended chat replays with the
wire-only reason `"self-timeout"`. The name reveal is further out still.

## Conventions

- **Base URL:** the client reads it from `VITE_API_URL`
  (`https://api.chaverola.com` in production; `http://localhost:3001` in
  local dev).
- All request and response bodies are JSON. Requests are capped at
  **16kb** (`express.json({ limit: "16kb" })`).
- Every 2xx body is a **named-member envelope** (`{ "activity": ... }`,
  never a bare object or array).
- Optional fields are **omitted** when absent — never `null`, never `""`.
- The server trims all strings before validating.
- Every response carries `Cache-Control: no-store`.
- Rate-limited responses use IETF draft-8 `RateLimit-*` headers.

## Wire types

From `shared/src/api.ts` (the activity types are in
`shared/src/types.ts`, limits in `shared/src/constants.ts`):

```ts
export interface CharacterInput {
  name: string;
  emoji?: string;
} // the server mints character ids

export interface CreateActivityRequest {
  hostName: string; // 1–30 after trim
  characters: CharacterInput[]; // 2–4; names unique (trimmed, case-insensitive)
  scenario?: string; // ≤ 20 words and ≤ SCENE_MAX_CHARS; omit when blank
  teacherEmail?: string; // EMAIL_PATTERN, ≤ EMAIL_MAX_CHARS; omit when blank
  settings: ActivitySettings; // required in full; bounds REJECTED, not clamped
}
export interface CreateActivityResponse {
  activity: HostedActivity;
  hostKey: string;
}
export interface GetActivityResponse {
  activity: Activity;
} // the student projection
export interface GetHostedActivityResponse {
  activity: HostedActivity;
}

export type ApiErrorCode =
  "invalid_json" | "invalid_request" | "not_found" | "capacity" | "internal";
export interface ApiFieldIssue {
  path: string;
  message: string;
} // zod-style: "characters.1.name"
export interface ApiErrorResponse {
  error: { code: ApiErrorCode; message: string; issues?: ApiFieldIssue[] };
}
```

`Activity` is the **student projection**: `joinCode`, `hostName`,
`characters`, and optionally `scenario`. `HostedActivity` extends it with
`settings` and optionally `teacherEmail`. **Neither ever contains the
hostKey** — it appears only as the top-level `hostKey` member of the
create response.

## Endpoints

### `POST /activities` → `201 CreateActivityResponse`

Validates the body, mints character ids (the Unicode-aware slugger ported
from the client), issues a join code (uniform over the free codes in
1000–9999 minus `1234`; a dense fallback enumerates free codes when the
store is nearly full), and mints the hostKey
(`crypto.randomBytes(18).toString("base64url")` — 24 chars, 144 bits).

Errors:

- `400 invalid_json` — unparseable body (also: a body over 16kb comes
  back as `400 invalid_request`, never a mislabeled 500).
- `400 invalid_request` — validation failure, with `issues[]` naming each
  bad field by path.
- `429` — rate limited (see below).
- `503 capacity` — the store is at `MAX_ACTIVITIES`.

### `GET /activities/:joinCode` → `200 GetActivityResponse`

The student lookup. Returns **only the student projection** —
`teacherEmail`, `settings`, and the hostKey are absent by construction.

- Params that aren't exactly 4 digits, unknown codes, and **`"1234"`
  always** → `404 not_found` (the demo is fully client-simulated; the
  server never knows it, so a compromised server can't impersonate it).
- Does **not** refresh the activity's TTL — enumerating codes must not
  keep activities alive.

### `GET /activities/host/:hostKey` → `200 GetHostedActivityResponse`

The teacher lookup, by capability URL. Returns the full
`HostedActivity` — without echoing the hostKey back.

- Unknown keys and malformed params (including any 4-digit param — a join
  code structurally cannot unlock the host route) → `404 not_found`,
  indistinguishable from a miss.
- Refreshes the TTL: an activity stays alive as long as its host page
  keeps refetching.

### `GET /healthz` → `200 { ok: true, commit? }`

`commit` is Render's injected `RENDER_GIT_COMMIT`, absent locally.
Mounted **before** the rate limiters: it is the client's fire-and-forget
warm-up ping (fired from the homepage, create, and join pages) and
Render's health check — neither may burn limiter budget.

## Rate limits

Per-IP, sized for one school NAT (20 classes × 30 students = 600 users on
one IP — the sizing math is commented in `server/src/app.ts`):

- `POST /activities`: **60 / 15 min**.
- GET lookups (the joinCode and hostKey routes share one limiter):
  **1,200 / 5 min**.

429 responses use the shared error envelope with `code: "capacity"` — the
`ApiErrorCode` union deliberately has no rate-limit member (the client
treats every non-2xx the same), and the 429-vs-503 status keeps the two
capacity cases distinguishable.

## Socket events

The live lobby and matching speak Socket.IO v4 on the same origin —
default namespace, path `/socket.io/`. The canonical types live in
`shared/src/socket.ts`, same convention as the REST contract: the server
types its io server `Server<ClientToServerEvents, ServerToClientEvents>`,
the client types its socket
`Socket<ServerToClientEvents, ClientToServerEvents>`.

engine.io intercepts `/socket.io/` on the `http.Server` **before Express
runs**, so none of the REST conventions above apply here: Express's rate
limiters never see socket traffic, there is no 16kb body cap and no
`Cache-Control` header, and CORS comes from the `Server` constructor's
own option, not the Express middleware. The socket layer carries its own
four abuse guards instead: the seat cap
(`MAX_STUDENTS_PER_ACTIVITY`), the per-socket `chat:send` rate limit
(10 messages per sliding 10 seconds), the per-message character cap
(`CHAT_MESSAGE_MAX_CHARS`, counted in code points), and the per-socket
`chat:typing` relay floor (at most one relay per second).

### Connecting

Authentication rides `socket.handshake.auth` — one payload shape per
role:

```ts
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
```

The client supplies the payload through an **auth callback**, so every
reconnect attempt (including automatic ones) reads the freshest session
token. Teacher sockets join a per-activity room and receive both the
queue and chat snapshots on join; a teacher connection also refreshes the
activity's TTL, and
keeps refreshing it every ~5 minutes while connected — the keep-alive
that stops a live class from expiring mid-lesson. Student connections
never refresh the TTL, the same invariant as the REST lookups. The demo
code `1234` is rejected unconditionally — the server never knows the
demo exists.

Connection **rejections** ride `connect_error` with a coded message:

- `activity_gone` — unknown or malformed joinCode/hostKey, or the store
  was wiped (deploy/restart). The student client shows the "activity
  ended" screen; the teacher falls back to not-found.
- `removed` — a tombstoned seat token: the teacher removed this student.
  The client lands on the name step with the removed notice.
- `full` — the activity is at `MAX_STUDENTS_PER_ACTIVITY`.
- `invalid` — malformed auth payload.

Socket.IO never re-attempts a **rejected** connection on its own — after
a `connect_error` the client must call `connect()` again itself (the
lobby's full-activity screen has a Try again button for exactly this).

### Server → client

```ts
export interface ServerToClientEvents {
  /** Teacher room; also emitted to a teacher socket the moment it joins. */
  "queue:snapshot": (payload: { students: QueueEntry[] }) => void;
  /** Student only. Persist studentId + token into the session for resume;
   *  `paused` is the activity-wide pause at connect time (live state —
   *  never persisted), so a refresh mid-pause stays frozen. */
  "lobby:welcome": (payload: {
    studentId: string;
    token: string;
    paused: boolean;
  }) => void;
  /** Student only: the teacher removed you → name step + notice. */
  "lobby:removed": () => void;
  /** Student only: the activity died under you → the ended screen. */
  "activity:ended": () => void;
  /** Student only, targeted at every connected seat — chat members, lobby
   *  waiters, and wrappingUp alike (the pause is activity-wide). Live
   *  flips only; connect-time state rides lobby:welcome. */
  "activity:paused": (payload: { paused: boolean }) => void;
  /** Teacher room; also emitted to a teacher socket the moment it joins. */
  "chats:snapshot": (payload: {
    chats: ChatSnapshot[];
    leftoverStudentId: string | null; // pair-everyone's odd one out
    paused: boolean; // the world-level pause — keeps a second host device coherent
    lastPartners: Record<string, string[]>; // waiting seats' previous partners — feeds the rematch heads-up (teacher room only)
    rematchNotice: string | null; // pair-everyone left an exact pair/trio in line — the dismissible rail notice (teacher truth)
  }) => void;
  /** Student only, targeted; re-sent on every resume while matched.
   *  `lines` is the transcript backlog (authoritative on every delivery);
   *  `everPeers` is everyone ever in the room minus self;
   *  `reconnectingPeers` is the offline backlog — active peers mid-grace,
   *  past the same 4s gate as chat:peer-connection, seconds computed at
   *  emit — authoritative on every delivery like `lines`: the "dropped"
   *  fan-out skips disconnected seats, so a resumer who was dark when a
   *  partner dropped learns it only here. */
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
  /** Student only, targeted at each connected active member of the chat —
   *  the sender's own echo included (it is the delivery receipt). */
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
   *  between events); "returned" fires on EVERY resume into an active
   *  chat, and receivers ignore a return for a peer they don't have
   *  marked offline. */
  "chat:peer-connection": (payload: {
    chatId: string;
    characterId: string;
    state: "dropped" | "returned";
    secondsLeft: number | null; // remaining grace on "dropped"; null on "returned"
  }) => void;
  /** Teacher room: one line per chat:send, real name attached — the one
   *  delta on the teacher wire; chats:snapshot also carries the transcript,
   *  so a dropped delta heals instead of wedging a card. */
  "chat:transcript-line": (payload: {
    chatId: string;
    line: ChatTranscriptLine;
  }) => void;
  /** Student only, targeted; re-sent on resume while the seat is wrappingUp
   *  (the re-delivery carries the stored reason, so a survivor whose own
   *  socket blipped around the ending still learns the honest one).
   *  "peer-timeout" is a 1:1 partner's expired grace; every teacher-caused
   *  ending — chat:end, chats:end-all, chat:remove, and a below-2 ending
   *  from lobby:leave — stays "teacher". "self-timeout" exists only on
   *  the wire, never in the store: the per-recipient reason a reaped
   *  student hears on their return (the stored 1:1 reason stays
   *  "peer-timeout" — the survivor's perspective).
   *  `reveal` is the name reveal (feature 10): present ONLY when the
   *  teacher's revealNames setting is on at end time — the one sanctioned
   *  exception to the characterIds-only student wire. Each OTHER member's
   *  real name, keyed by a characterId the student already knows; absent
   *  means no reveal (also the older-server deploy default). */
  "chat:ended": (payload: {
    reason: "teacher" | "peer-timeout" | "self-timeout";
    reveal?: { characterId: string; name: string }[];
  }) => void;
  /** Teacher room minus the sender — keeps a second host device coherent. */
  "settings:changed": (payload: { settings: ActivitySettings }) => void;
}

export interface QueueEntry {
  id: string; // server-minted student id
  name: string; // real name — a teacher-only surface
  waitSeconds: number; // computed server-side at emit; client ticks between
  connection: "connected" | "reconnecting";
}

export interface ChatParticipant {
  id: string; // studentId
  name: string; // captured at chat start — survives seat removal
  character: Character; // the SERVER roster's copy, id + name + emoji?
}

export interface ChatSnapshot {
  id: string;
  participants: ChatParticipant[]; // everyone ever in the room, seat order
  inactiveStudentIds: string[]; // removed / left mid-chat
  reconnectingStudentIds: string[]; // active members dropped past the 4s delay
  messages: ChatTranscriptLine[]; // the whole capped transcript, oldest first
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

/** Teacher-only projection of the same stored line — real names are fine
 *  here, exactly as on ChatParticipant. */
export interface ChatTranscriptLine {
  id: string;
  studentId: string;
  name: string;
  characterId: string;
  text: string;
  sentAt: number; // epoch ms, server clock
}
```

Both teacher-facing snapshots always arrive **whole**, never as deltas —
at ≤60 seats and a classroom's worth of chats, snapshots buy zero sync
bugs, and a dropped emit can't wedge a card. **Message lines are the one
exception:** `chat:transcript-line` is a per-message delta, because a
full snapshot per message would be far too fat. It stays safe under the
same rule, since `chats:snapshot` also carries the transcript — a dropped
delta heals on the next seat change or reconnect; the delta is an
optimization, never the only path. `queue:snapshot` excludes
matched and wrapping-up seats, so the queue is exactly the pool the
pairing rail can act on. The queue clock (`waitSeconds`) is computed
server-side at emit and ticked locally by the client between snapshots —
while the class is paused it's computed against the pause anchor instead
(frozen), the client's local tick stands down, and resume shifts the stored
timestamps so the clock continues without a jump.

`ChatParticipant.character` is the **server's** roster copy on purpose:
character edits stay local to the teacher's page, so a locally renamed
roster would otherwise leave a card unable to resolve its own labels.

### Client → server

```ts
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
   *  server-side (so broadcastState can't resurrect it and a second host
   *  device stays coherent). A no-op when there is no notice. */
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
```

Every teacher command is registered on **teacher sockets only** — that
structural boundary, not a per-event role check, is what keeps a student
from starting chats or rewriting settings. Two cases are pinned by tests:
a 4-digit join code cannot open a teacher socket at all, and a student
socket emitting `queue:remove`, `chat:start`, `chat:remove`, `chat:end`,
`chats:end-all`, `chats:pause-all`, `chats:resume-all`, or
`settings:update` is silently ignored.

Teacher commands are also **idempotent and self-correcting**: a command
naming a student who just dropped, a chat that just ended, or a seat that
is already gone does nothing, and the snapshot that follows any real
change re-syncs the rail. `queue:remove` deliberately no-ops on a matched
seat — `chat:remove` is the only path that tombstones a chat member,
because it also does the chat bookkeeping.

`lobby:leave` fires only on in-app exits; a refresh, tab close, or home
button sends nothing the client can trust, so those ride the grace window
below.

### Matching: the operational truths

- **Who can be matched.** One pool decides every pairing: seats that are
  connected, not already in a chat, and not sitting on the ended screen,
  ordered by join time. A student marked `reconnecting` is therefore
  unmatchable server-side, not merely dimmed on the teacher's screen.
- **Characters are dealt at random from the roster's first N.** A chat of
  N seats uses characters 1..N, shuffled — so a 2-person chat always uses
  the first two characters, and who gets which is chance.
- **Starting a chat clamps, it doesn't reject.** `chat:start` filters to
  eligible students and takes at most `min(4, roster length)`; anyone who
  doesn't fit visibly stays in the queue. Below 2 eligible it does
  nothing.
- **Auto-match is server-run and teacher-gated.** A 1-second interval is
  armed on an activity's **first** connected teacher socket and cleared
  when the **last** one disconnects, so a closed laptop holds pairing and
  reopening resumes it. Each firing pairs the two longest-waiting
  students who have both waited `settings.autoMatchSeconds`, then waits
  `AUTO_MATCH_GAP_SECONDS` (3) before the next — pairs land one at a
  time. Everything else (the record, `settings.autoMatch`, the threshold,
  eligibility) is read fresh inside the tick, so settings edits and
  manual pairing never touch the timer.
- **Every seat gets the same 120s grace, matched or waiting.** A student
  who drops mid-chat keeps their seat and can resume into the same chat
  for two minutes; their card membership dims meanwhile. When the grace
  runs out, a matched seat leaves its **chat** as well as its seat — the
  membership goes inactive, and if that drops the room under two active
  members the chat ends for the peer as a removal would, recorded with
  the honest reason `"peer-timeout"` (see the below-2 bullet). Matched
  seats used to arm no timer at all so a resume always worked; that made
  a student whose `lobby:leave` died in transit indistinguishable from
  one mid-blip and stranded their partner until the activity expired
  (found on a real handset, 2026-07-20). The grace is the backstop:
  whatever the client fails to say, the silence eventually frees the peer.
- **Below 2 active members ends the chat.** Whether the teacher removed
  someone, a student left, or a dropped member's grace ran out, a room
  that would drop under two ends — with `endReason: "peer-timeout"` when
  the cause was the expired grace (the survivor's 🔌 "Your partner lost
  connection" wrap-up), `"teacher"` for everything else. The remaining
  peer's seat goes **wrapping up**:
  off the queue and unmatchable until their "Back to the lobby" tap emits
  `lobby:back`, which re-queues them with a fresh wait clock. Auto-return
  was rejected — it would show the teacher a "waiting" student who is
  still reading the ended screen.
- **The teacher can end a chat outright.** `chat:end` (one card's End
  chat) and `chats:end-all` (the round-closer) flip the chat to
  `status: "ended"` with reason `"teacher"` while membership stays
  intact — nobody is marked inactive. Every member's seat goes wrapping
  up with the same semantics as a below-2 end: `chat:ended` to connected
  members (a dropped member gets a fresh 120s grace and hears it on
  resume; a cold resume then returns to the lobby via the existing
  post-refresh path), and the return to the queue is otherwise each
  student's own `lobby:back` tap, never automatic. End-all also holds auto-match: the
  client turns the setting off in the same confirm, so nobody is
  re-paired into a round the teacher just closed.
- **The teacher can pause the whole class.** `chats:pause-all` stamps
  `pausedAt` — one field, both the flag and the freeze anchor. While
  paused: `chat:send` and `chat:typing` refuse silently, the auto-match
  tick stands down, snapshots clock `waitSeconds`
  against the anchor, and every connected seat (chatting, waiting, or
  wrapping up) hears `activity:paused` — `lobby:welcome` carries the
  state for anyone who connects mid-pause. Still flowing on purpose:
  joins, `lobby:back`, `lobby:leave`, manual pairing (a chat started
  mid-pause is born frozen — the send guard is activity-level), ending,
  settings edits, and the **120s grace window** — a pause must not stop
  a dead phone from being reaped and its partner freed (founder call,
  2026-07-21). `chats:resume-all` (and `chats:end-all`) shift every
  seat's `joinedAt` and every active chat's `startedAt` forward by the
  pause duration, clamped to now — pre-pause time is preserved,
  mid-pause arrivals resume at zero, and nobody's clock jumps.
- **Settings sync; the roster doesn't.** `settings:update` is
  zod-validated against the same schema `POST /activities` uses and
  replaces the stored settings wholesale; the server echoes
  `settings:changed` to the teacher's **other** devices (the room minus
  the sender). Invalid payloads are logged and dropped. `revealNames` now
  acts (feature 10): while it is on, a chat's `chat:ended` reveals each
  peer's real name, read live at end time. Character,
  scenario, and host-name edits stay local to the teacher's page —
  they'd have to reach students' lobbies, which is a bigger feature than
  a settings echo.
- **Chats outlive their students.** A chat record keeps everyone who was
  ever in it (with the name captured at chat start), so a card still
  reads correctly after a member's seat is gone.

### Messaging: the operational truths

- **Sending is `chat:send`, delivery is `chat:line`.** The server trims,
  rejects empty, rejects over `CHAT_MESSAGE_MAX_CHARS` — counted in
  **code points**, matching the composer, so a multi-unit emoji is one
  character on both sides — rate-limits, appends to the chat's stored
  transcript, and fans the projected line out to every **connected active
  member**, the sender included (the echo is the delivery receipt; there
  is no local optimistic append). Every rejection is a silent no-op.
- **The rate limit is per socket:** 10 messages per sliding 10 seconds,
  loose enough that chained one-word messages never trip it, tight enough
  that a script gets nowhere. Its state lives in the connection closure
  and dies with the socket.
- **The server never inspects content.** Length and rate are the whole of
  it — no wordlist, no masking (DECISIONS.md → "The server never inspects
  what students write"). The teacher watching live with real names is the
  moderation model.
- **The transcript is capped and ephemeral.** `CHAT_TRANSCRIPT_MAX_LINES`
  (200) per chat, oldest dropped, in memory, wiped by every deploy like
  everything else.
- **`chat:started`'s backlogs are the only healing channel.** Every
  fan-out (`chat:line`, `chat:peer-connection`) skips disconnected seats
  and there is no `connectionStateRecovery`, so a student who blinked
  gets the missed messages exclusively from `lines` — and a missed
  partner drop exclusively from `reconnectingPeers` (the classroom blip
  that downs BOTH students: the first one back never heard the other's
  "dropped"). Clients must treat both as authoritative on **every**
  `chat:started`, not only the first — the server re-emits it on every
  reconnect.
- **`everPeers` is the roster lines resolve against.** `peers` is the
  live roster and shrinks on `chat:update`; `everPeers` is everyone ever
  in the room minus self, so a departed member's backlog lines (and their
  character's color) survive a refresh.
- **The teacher reads everything, live, with real names.** Every accepted
  `chat:send` also emits one `chat:transcript-line` to the teacher room —
  the same stored line the students got, projected with `studentId` and
  `name` attached (read-only; teachers still never send). The whole capped
  transcript rides `ChatSnapshot.messages` too, so a teacher refresh or a
  second host device rebuilds every card's transcript from the on-join
  snapshot alone.
- **Typing is a heartbeat, never a stored fact.** While keys flow, the
  client re-emits `chat:typing` at most once per `TYPING_HEARTBEAT_MS`
  (2s); the server relays it as `chat:peer-typing` to each OTHER
  connected active member and stores nothing. There is no stop event —
  the receiver expires the indicator `TYPING_INDICATOR_TTL_MS` (5s) after
  the last heartbeat, and the typist's own message landing clears it
  instantly. Both directions are **volatile** emits, best-effort by
  design: a heartbeat that can't go out now dies instead of queueing, so
  a buffered one can never flush late and ghost the indicator. Typing is
  never in a resume backlog — a refreshed receiver simply waits for the
  next heartbeat — and the teacher never hears it (see the privacy
  rules).

### Privacy rules

The projection tradition extends to sockets: every payload is built by
an explicit field-by-field projector in `server/src/store/projections.ts`
(never a spread), with exact-key allowlist tests. Students receive
**only targeted emits** — never a queue snapshot, another student's name
or presence, `settings`, `teacherEmail`, or the hostKey. Lobby occupancy
stays a mystery to students by design. A `QueueEntry` never contains the
seat token.

Matching extends the same rule to chats, and this is the load-bearing
one: **the student wire carries characterIds and nothing else.** A
student learns their own `selfCharacterId` and their peers as bare
`{ characterId }` objects — never a peer's real name, never a peer's
studentId. Messages follow the same split: a `ChatLine` attributes its
sender by `characterId` only, even though the server stores the line under
the sender's studentId. The who-am-I-talking-to mystery is the product, so
it is pinned structurally: `toChatStarted`'s peers, everPeers, and lines are
all allowlist-tested (`["characterId"]` for peers;
`["characterId","id","sentAt","text"]` for lines). The **one** sanctioned
exception is the name reveal (feature 10): when the teacher's `revealNames`
setting is on, `chat:ended` carries each peer's real name at chat end —
`toChatEnded` is allowlist-tested both ways (`["reason"]` when off,
`["reason","reveal"]` when on), so a real name reaches a peer only when the
teacher asked for it. Real names live only on `ChatSnapshot` and `ChatTranscriptLine`,
which go to the teacher's **room** and nowhere else — the same
teacher-only surface as `QueueEntry`, and pinned by a socket test: a
student socket hears neither `chats:snapshot` nor `chat:transcript-line`.

The boundary runs the other way too, for the first time with typing:
`chat:peer-typing` is a **student-only** signal the teacher deliberately
does not get. The teacher's oversight surface is the transcript — what
was said, with real names — and the teacher wire stays
snapshots-plus-one-delta on purpose; a typing flicker per card across a
classroom of chats is noise (DECISIONS.md → "The teacher never sees
typing"). Pinned by the same socket test style: the teacher socket never
hears `chat:peer-typing`, and neither does the sender's own.

### Timing truths a client author needs

- **Disconnect detection is not instant.** A dark phone sends no close
  frame, so detection is Socket.IO's ping cycle — roughly 45 seconds at
  the default `pingInterval` 25s + `pingTimeout` 20s. Expect the
  latency; don't tune it away (tighter timeouts flap on school wifi).
- **Grace window — every seat, waiting or matched.** A dropped seat
  survives `LOBBY_GRACE_SECONDS` (120) starting at _detected_ disconnect,
  marked `reconnecting`, and reconnecting restores it with its original
  wait clock. At expiry a waiting seat is reaped silently; a seat **in a
  chat** leaves its chat as well (see the matching truths above) — and
  the activity remembers its token for the rest of its life. A later
  join presenting that token is seated wrapping-up under a fresh
  identity and replayed the ended chat: `chat:started` (the old
  transcript, projected through the old membership id), then
  `chat:ended {reason:"self-timeout"}` — the 📶 screen instead of a
  silent lobby. A pause does NOT hold this window — the grace runs
  through it, and the teacher's "reconnecting" tags keep real time even
  while the wait clocks freeze.
- **Broadcast delay.** Every "lost connection" surface waits
  `LOBBY_DISCONNECT_BROADCAST_DELAY_MS` (4000) so a student's ~1–2s page
  refresh never flashes anything: the teacher's queue row, the chat
  card's `reconnectingStudentIds`, and (since feature 8) the partners'
  `chat:peer-connection` "dropped" all flip on the same gate. The delay
  gates only what's shown, never the grace clock — which is why the
  "dropped" payload's `secondsLeft` arrives at ~116, not 120.
- **Resume re-delivers, it doesn't replay.** Whatever a seat is in the
  middle of, the server re-states it on connect: a matched student gets
  `chat:started` again — carrying the whole capped transcript in `lines`
  and the current offline peers in `reconnectingPeers`, which is how a
  blip's missed messages and a missed partner drop arrive (refresh, wifi
  recovery, duplicate-tab takeover all land back in the same chat) — and
  a wrapping-up seat gets `chat:ended` again. The one true replay is the
  reaped returner's (the grace-window bullet above), and it re-states on
  every resume too: a refresh on the 📶 screen gets the same burst back.
  Clients don't have to persist chat state.
- **Duplicate tabs.** Two sockets presenting the same seat token: the
  newer socket takes the seat, the older one is disconnected.

Constants live in `shared/src/socket.ts` (`LOBBY_GRACE_SECONDS = 120`,
`LOBBY_DISCONNECT_BROADCAST_DELAY_MS = 4000`,
`TYPING_HEARTBEAT_MS = 2000`, `TYPING_INDICATOR_TTL_MS = 5000` — the TTL
must outlast the heartbeat, which is why both are shared,
`MAX_STUDENTS_PER_ACTIVITY = 60`, `AUTO_MATCH_GAP_SECONDS = 3`);
`STUDENT_NAME_MAX_CHARS = 40`, `CHAT_MESSAGE_MAX_CHARS = 75`, and
`CHAT_TRANSCRIPT_MAX_LINES = 200` sit with the other shared caps in
`shared/src/constants.ts` (the message cap is the composer's limit too —
one constant, so the form can't accept what the server rejects). The
send rate limit (10 per 10s) and the typing relay floor
(`TYPING_RELAY_MIN_INTERVAL_MS`, half the heartbeat) are
server-internal, in `lobby.ts`. Matched and wrapping-up seats count
toward the seat cap — they still hold seats; tombstones don't.

**Dev-only time scaling.** A dev server started with
`CHAVEROLA_TIME_SCALE=n` (1–100) divides the lobby's flow clocks by n —
grace, broadcast gate, the engine.io ping cycle, the auto-match tick/gap,
and the teacher-set auto-match threshold (derived in
`server/src/live/timing.ts`; floor 50ms per timer). Production is pinned
to 1 (`NODE_ENV === "production"` forces it in `readTimeScale`, and Render
never sets the var), so every number above is the truth on the wire.
`/healthz` reports `timeScale` whenever it isn't 1, plus the process
`pid`. The abuse guards and lifecycle clocks — send rate limit, `TYPING_*`
timings, teacher keepalive, store TTL/sweep, the client's
`LEAVE_FLUSH_MS` — never scale. See DECISIONS.md → "Localhost real flows
compress through a server-side time-scale knob; production is pinned
to 1".

## curl smoke

```bash
curl -s http://localhost:3001/healthz          # 200 {"ok":true,"pid":…} (+"timeScale" when scaled)
curl -s -X POST http://localhost:3001/activities -H "content-type: application/json" \
  -d '{"hostName":"Ms. Cohen","characters":[{"name":"Brutus"},{"name":"Caesar"}],"settings":{"revealNames":true,"rematchWarning":true,"autoMatch":true,"autoMatchSeconds":20}}'
                                               # 201; note joinCode + hostKey
curl -s http://localhost:3001/activities/<joinCode>        # 200, student projection only
curl -s http://localhost:3001/activities/1234              # 404
curl -s http://localhost:3001/activities/host/<hostKey>    # 200, full activity
curl -s http://localhost:3001/activities/host/<joinCode>   # 404
```
