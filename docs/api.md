# API contract

The canonical home of Chaverola's HTTP API — and, since feature 2, its
Socket.IO contract. Keep this file current as features land — the wire
types here mirror `shared/src/api.ts` (REST) and `shared/src/socket.ts`
(sockets), which is what actually compiles against both the client and
the server; if the two ever disagree, the code is right and this file has
a bug.

Implemented by `server/`: feature 1 (create & join) over REST, feature 2
(the live lobby — the waiting queue) over Socket.IO, documented in
[Socket events](#socket-events) below. Matching and chat are still
client-simulated and arrive in later features.

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

The live lobby (feature 2) speaks Socket.IO v4 on the same origin —
default namespace, path `/socket.io/`. The canonical types live in
`shared/src/socket.ts`, same convention as the REST contract: the server
types its io server `Server<ClientToServerEvents, ServerToClientEvents>`,
the client types its socket
`Socket<ServerToClientEvents, ClientToServerEvents>`.

engine.io intercepts `/socket.io/` on the `http.Server` **before Express
runs**, so none of the REST conventions above apply here: no rate
limiters (the seat cap below is the socket layer's own abuse guard), no
16kb body cap, no `Cache-Control` header, and CORS comes from the
`Server` constructor's own option, not the Express middleware.

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
token. Teacher sockets join a per-activity room and receive queue
snapshots; a teacher connection also refreshes the activity's TTL, and
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
  /** Student only. Persist both into the session for resume. */
  "lobby:welcome": (payload: { studentId: string; token: string }) => void;
  /** Student only: the teacher removed you → name step + notice. */
  "lobby:removed": () => void;
  /** Student only: the activity died under you → the ended screen. */
  "activity:ended": () => void;
}

export interface QueueEntry {
  id: string; // server-minted student id
  name: string; // real name — a teacher-only surface
  waitSeconds: number; // computed server-side at emit; client ticks between
  connection: "connected" | "reconnecting";
}
```

The queue always arrives as a **full snapshot**, never a delta — at ≤60
entries, snapshots buy zero sync bugs.

### Client → server

```ts
export interface ClientToServerEvents {
  /** Teacher only; idempotent — removing an absent seat is a no-op. */
  "queue:remove": (payload: { studentId: string }) => void;
  /** Student intentional exit (back-as-reset, sign-out): immediate seat
   *  removal, no 2-minute ghost row. Never fired on refresh/pagehide. */
  "lobby:leave": () => void;
}
```

Two boundaries are pinned by tests: a 4-digit join code structurally
cannot open a teacher socket, and a student socket emitting
`queue:remove` is silently ignored. `lobby:leave` fires only on in-app
exits; a refresh, tab close, or home button sends nothing the client can
trust, so those ride the grace window below.

### Privacy rules

The projection tradition extends to sockets: every payload is built by
an explicit field-by-field projector in `server/src/store/projections.ts`
(never a spread), with exact-key allowlist tests. Students receive
**only targeted emits** — never a queue snapshot, another student's name
or presence, `settings`, `teacherEmail`, or the hostKey. Lobby occupancy
stays a mystery to students by design. A `QueueEntry` never contains the
seat token.

### Timing truths a client author needs

- **Disconnect detection is not instant.** A dark phone sends no close
  frame, so detection is Socket.IO's ping cycle — roughly 45 seconds at
  the default `pingInterval` 25s + `pingTimeout` 20s. Expect the
  latency; don't tune it away (tighter timeouts flap on school wifi).
- **Grace window.** A dropped seat survives `LOBBY_GRACE_SECONDS` (120)
  starting at _detected_ disconnect, marked `reconnecting` in the queue.
  Reconnecting restores the seat with its original wait clock.
- **Broadcast delay.** The teacher-facing row change waits
  `LOBBY_DISCONNECT_BROADCAST_DELAY_MS` (4000) so a student's ~1–2s page
  refresh never flashes the row. The delay gates only the teacher-facing
  state, never the grace clock.
- **Duplicate tabs.** Two sockets presenting the same seat token: the
  newer socket takes the seat, the older one is disconnected.

Constants live in `shared/src/socket.ts` (`LOBBY_GRACE_SECONDS = 120`,
`LOBBY_DISCONNECT_BROADCAST_DELAY_MS = 4000`,
`MAX_STUDENTS_PER_ACTIVITY = 60`); `STUDENT_NAME_MAX_CHARS = 40` sits
with the other form caps in `shared/src/constants.ts`.

## curl smoke

```bash
curl -s http://localhost:3001/healthz          # 200 {"ok":true}
curl -s -X POST http://localhost:3001/activities -H "content-type: application/json" \
  -d '{"hostName":"Ms. Cohen","characters":[{"name":"Brutus"},{"name":"Caesar"}],"settings":{"revealNames":true,"autoEndChats":true,"autoEndMinutes":7,"rematchWarning":true,"autoMatch":true,"autoMatchSeconds":20}}'
                                               # 201; note joinCode + hostKey
curl -s http://localhost:3001/activities/<joinCode>        # 200, student projection only
curl -s http://localhost:3001/activities/1234              # 404
curl -s http://localhost:3001/activities/host/<hostKey>    # 200, full activity
curl -s http://localhost:3001/activities/host/<joinCode>   # 404
```
