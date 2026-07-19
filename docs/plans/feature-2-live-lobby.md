# Feature 2 — The live lobby

The first realtime work: Socket.IO attaches to the existing `http.Server`, and
the waiting queue becomes real. Students joining a real activity appear live in
the teacher's queue (names + wait clocks) on `/activity/host/:hostKey`; the
teacher's remove acts on the real world and the removed student's screen
reacts; the student lobby truthfully reflects connected / reconnecting /
removed / ended — including the dark-phone-screen reconnect that classroom
mobiles hit constantly. **Matching and chat stay out** — they are the next
feature. Until then, real host pages show an honest placeholder where the
pairing controls would be, and the demo (`1234`) keeps the full simulated
experience.

## How to use this document

Work through the prompts **in order, one prompt per agent session**. Each
prompt is sized for one session, ends green (typecheck + tests + its own
verification), gets **one commit straight to `main`**, and is safe to push on
its own — prod never breaks between prompts. Ordering is load-bearing:
**Prompt 1 before everything** (the clients need the deployed socket server),
and **Prompt 2 before Prompt 3** (the teacher side is verified against real
student clients, phones included). Prompt 1 is a server-touching push — every
server deploy wipes live classes, so **push it outside school hours**.

To run a prompt, tell the agent:

> Read `docs/plans/feature-2-live-lobby.md` (all of it — the shared context
> sections apply to every prompt), read `AGENTS.md`, then do Prompt N.

When a prompt is done, tick its checkbox here (same commit).

- [x] Prompt 1 — Shared socket contract + server live-lobby layer + tests +
      the spin-down proof
- [ ] Prompt 2 — Client wiring, student side (lobby presence + reconnect)
- [ ] Prompt 3 — Client wiring, teacher side (the live queue; the feature
      completes)
- [ ] Prompt 4 — Docs + stale-reference sweep
- [ ] Prompt 5 — End-to-end production verification (feature 1's Prompt 7
      caught a prod-breaking bug; keep the tradition)

> **Prompt 1 spin-down proof, results (2026-07-19, for Prompt 4's docs):**
> passed both ways against prod. One student socket held 20 min (websocket
> transport through Cloudflare, zero external HTTP) — no spin-down. After
> its disconnect the instance stopped 15:08 later via SIGTERM, shutdown
> completing within one second. Render's own platform health checks (every
> ~5s at `/healthz`, `render-health-check: 1`) demonstrably do NOT count as
> inbound traffic — they ran identically through both phases. Two extra
> observations: Render restarted the stopped instance on its own ~2.5 min
> later with no inbound request (the store wipe at stop time is what
> matters, not the downtime), and the 120s grace reap fired in prod to the
> millisecond. SIGTERM-with-open-sockets gets its real test in Prompt 5's
> restart story.

Repo rules that apply to every prompt (details in `AGENTS.md`): run
`pnpm format` before committing; run every piece of new user-facing copy
through the **humanizer** skill; never hand-write `memo`/`useCallback`/
`useMemo` in the client (React Compiler does it); record product decisions in
`DECISIONS.md`; verify at the cheapest gate that catches the mistake; a
user-facing feature must be experienceable in the demo flows.

---

## Shared context: design decisions (founder, 2026-07-19)

Product decisions (recorded with full reasoning in DECISIONS.md — the entries
dated 2026-07-19 under "Student join flow & lobby", "Teacher live activity
page", and "Backend & API"):

- **Pairing UI on real activities = honest placeholder copy.** No
  tap-to-select, no "Pair everyone 1:1" / "Start their chat", no auto-match
  switch or its "students pair up on their own" footer line (a false promise
  while matchmaking doesn't exist). In their place: a short copy block saying
  matching is on the way and that this page shows who's joined. The demo keeps
  the full pairing UI.
- **The student lobby keeps "Waiting for your match"** on real activities —
  no forked interim copy; matching ships next feature.
- **Disconnect grace = 2 minutes, row marked, fully unmatchable.** A dropped
  student's queue row survives for `LOBBY_GRACE_SECONDS` marked "lost
  connection"; reconnecting restores it with the original wait clock. While
  marked, the student is excluded from auto-match, "Pair everyone 1:1", AND
  manual tap-to-pair (recorded now so feature 3 honors it); the marked row's
  only action is Remove. The grace window starts at _detected_ disconnect —
  a dark phone sends no close frame, so detection is Socket.IO's ping cycle
  (~45s at default `pingInterval` 25s + `pingTimeout` 20s). Document the
  latency; don't tune it away (tighter timeouts flap on school wifi).
- **Sockets connect at lobby entry (student) and host-page load (teacher).**
  No socket before the lobby stage; no teacher "start" click — the host page
  already is the live activity. The demo stays structurally zero-network.
- **Duplicate student names are allowed.** The server mints unique student
  ids; wait clocks disambiguate rows; remove targets the exact row tapped.
- **Teacher's own drop = banner + dimmed queue.** "Reconnecting…" copy with
  the last-known queue still readable underneath.
- **A wiped server ends the class honestly.** A student whose activity
  vanished (deploy/restart) gets an "activity ended" screen — the client
  knows the code WAS real because the session holds a seat token — instead of
  the misleading "recheck your code" sign-out. Sign-out is deferred to that
  screen's CTA. The teacher side keeps the existing friendly not-found.

Architecture facts every prompt builds on:

- **Socket.IO v4 attaches at the `index.ts` seam** (`server/src/index.ts` —
  built for exactly this; `app.ts` stays listen-free). engine.io intercepts
  the `/socket.io/` path on the `http.Server` **before Express runs**, so:
  Express `cors()` never sees the handshake — pass `allowedOrigins()` to the
  `Server` constructor's `cors` option (`config.corsOrigins`, the seam
  `config.ts` announced); `pino-http` logs nothing — the socket module uses a
  plain `pino` logger (new explicit dependency) shared with `pino-http`; the
  Express rate limiters never fire — hence the explicit
  `MAX_STUDENTS_PER_ACTIVITY` cap; set `serveClient: false` (the client
  bundles its own).
- **TTL:** the teacher's socket becomes the keep-alive. While a teacher
  socket is connected, refresh the activity's `lastSeenAt` every ~5 minutes
  (the host page fetches once, not on a poll — without this, a live class
  would expire at the 12h TTL mid-lesson… eventually). Student sockets
  **never** refresh the TTL — enumeration must not keep activities alive,
  same invariant as the REST lookups.
- **Activity death notifies the lobby.** `remove()` in `activityStore.ts` is
  reached from three places (the sweep, and the two lazy-expiry lookups). The
  store gains an `onActivityRemoved` hook the socket layer registers, so all
  three paths clear per-seat timers, emit `activity:ended` to connected
  students, and disconnect them. Never import `io` into the store.
- **SIGTERM changes.** `server.close(cb)` never completes while WebSocket
  connections are open, and in Socket.IO v4 `io.close()` also closes the
  attached `http.Server`. Prompt 1 prescribes the exact shutdown sequence
  and verifies it by watching a real deploy's logs — no automated test.
- **Free-tier spin-down, verified** (Render changelog 2026-02-24): a free
  service spins down after 15 minutes without _either_ an inbound HTTP
  request _or_ an inbound WebSocket message on an existing connection. An
  idle open connection does NOT prevent spin-down — but Socket.IO's client
  heartbeat (a pong every ~25s) is an inbound message, so **any connected
  class keeps the server awake**; spin-down only happens when nobody is
  connected, which is exactly when it's harmless. This claim is load-bearing,
  so Prompt 1 verifies it empirically against the deployed service instead of
  trusting the changelog. Cloudflare fronts `api.chaverola.com`; it proxies
  WebSockets on all plans, and its ~100s proxied idle timeout never triggers
  under 25s pings (the polling fallback's long-poll cycle also fits).
  Flip side: a forgotten open tab keeps the instance up — bounded by the 12h
  TTL sweep disconnecting everyone, and free-tier hours cover 24/7 anyway.
- **Reconnect reality (the critical path):** phones go dark mid-lobby and
  wake "soon after" expecting to continue. The client reconnect story is:
  socket.io-client auto-reconnect with an **auth callback** (re-read the
  freshest seat token on every attempt) plus a `visibilitychange` fast path
  (hidden→visible + disconnected → `connect()` immediately, skipping the
  backoff timer that background tabs throttle).

## Shared context: the socket contract

Lives in a new `shared/src/socket.ts`, exported from the shared barrel —
handwritten types, same convention as the REST contract. Documented in
`docs/api.md` by Prompt 4. Server types the io server
`Server<ClientToServerEvents, ServerToClientEvents>`; the client types its
socket `Socket<ServerToClientEvents, ClientToServerEvents>`.

```ts
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
```

Connection **rejections** ride `connect_error` with a coded message:
`activity_gone` (unknown joinCode/hostKey, or the store was wiped → student
shows the ended screen, teacher falls back to not-found), `removed` (a
tombstoned seat token → name step + removed notice), `full` (seat cap → its
own copy), `invalid` (malformed auth).

Constants (in `shared/src/constants.ts` or `socket.ts` — keep them with their
kin): `LOBBY_GRACE_SECONDS = 120` (note beside it:
`RECONNECT_WINDOW_SECONDS = 120` in `useChatDemo.ts` is the same product
window; when chat goes real in feature 3, the shared constant becomes the one
source), `LOBBY_DISCONNECT_BROADCAST_DELAY_MS = 4000` (a student refresh
reconnects in ~1–2s; don't flash the teacher's row for it),
`MAX_STUDENTS_PER_ACTIVITY = 60`, `STUDENT_NAME_MAX_CHARS = 40` (matches the
join form's current hardcoded `maxLength={40}`, which then reads the
constant).

Seat model (server-internal, never on the wire): per-activity seats
`{ studentId, token, name, joinedAt, connected, currentSocketId,
disconnectedAt?, timers }` hung off the `StoredActivity` record, so the
activity's lifecycle owns the seats' lifecycle. Rules:

- **The `currentSocketId` guard.** On a refresh, the new socket can resume
  the seat _before_ the old socket's disconnect fires. Disconnect handling
  and grace expiry must no-op unless the disconnecting socket still owns the
  seat — otherwise a stale disconnect arms a 2-minute timer that reaps a
  connected student. This is the likeliest correctness bug in the feature and
  gets a dedicated test.
- **Join nonce.** React StrictMode double-mounts effects in dev, and a prod
  refresh can land in the window between connect and welcome-persistence.
  Fresh joins carry a client-minted nonce; the server seats a nonce it has
  already seated by resuming, not duplicating. Fresh joins are idempotent.
- **Tombstones.** A removed seat leaves a tombstone (until the activity
  dies), so a reconnect with a removed token gets the distinguishable
  `removed` rejection instead of silently rejoining. Tombstones don't count
  against the cap. A token unknown for any other reason (grace expired,
  server restart) with a live activity = silent fresh join.
- **Duplicate tab.** Tab duplication copies sessionStorage, so two sockets
  can present the same token: the newer socket takes the seat, the older one
  is disconnected.
- **Timer lifecycle.** Each seat owns up to two timers (broadcast delay +
  grace). Both are cleared on: resume, `lobby:leave`, teacher remove,
  activity removal (all three store paths), and `resetForTests()`. The grace
  timer starts at detected disconnect; the broadcast delay only gates the
  teacher-facing state change, never the grace clock.

Privacy rules — the projection tradition extends to sockets:

- Students receive **only targeted emits**: never a queue snapshot, never
  another student's name or presence, never `settings` / `teacherEmail` /
  the hostKey. Lobby occupancy stays a mystery to students (an existing
  product rule — knowing only two people are waiting defeats the anonymity).
- Every socket payload is built by an explicit field-by-field projector in
  `server/src/store/projections.ts` (never a spread), with exact-key
  allowlist tests. `QueueEntry` must never contain the seat token.
- A join code structurally cannot open a teacher socket (pattern guard + the
  hostKey lookup), and a student socket's `queue:remove` is ignored — both
  as executable tests, mirroring the REST boundary tests.

---

## Prompt 1 — Shared socket contract + server live-lobby layer + tests + the spin-down proof

**Goal:** the deployed server accepts lobby sockets and maintains real seats;
nothing connects to it yet (prod-safe on its own). The load-bearing free-tier
claim is verified empirically at the end.

Read first: both shared-context sections above, `server/src/index.ts`,
`server/src/app.ts`, `server/src/config.ts`,
`server/src/store/activityStore.ts`, `server/src/store/projections.ts` (+ its
test), `server/src/routes/activities.ts` (the guard pattern to mirror),
`shared/src/constants.ts`.

1. `shared/src/socket.ts` — the contract above, exported from
   `shared/src/index.ts`. Add the new constants (`STUDENT_NAME_MAX_CHARS`,
   `LOBBY_GRACE_SECONDS`, `LOBBY_DISCONNECT_BROADCAST_DELAY_MS`,
   `MAX_STUDENTS_PER_ACTIVITY`).
2. Server deps: `socket.io`, `pino` (explicit — the socket layer can't ride
   `pino-http`; share one logger instance between them). Dev dep:
   `socket.io-client` (integration tests).
3. `server/src/live/seats.ts` — the **pure, io-free** seat lifecycle module
   (testable without sockets): seat creation/resume (nonce dedupe, duplicate-
   tab takeover, tombstones, the cap), disconnect marking, grace expiry, the
   `currentSocketId` guard, leave/remove, and a `toQueueEntries(activity,
now)` reader. The seats hang off `StoredActivity` (new field typed from
   this module; the projections' explicit-literal rule keeps it out of every
   REST response by construction — the existing exact-key tests prove it).
4. `activityStore.ts` — the `onActivityRemoved(cb)` hook, called by
   `remove()` so all three removal paths (sweep + both lazy-expiry lookups)
   reach the socket layer. Also export a `touch(record, now)` (or reuse the
   `getByHostKey` refresh) for the teacher TTL keep-alive.
5. `server/src/live/lobby.ts` — the socket wiring: `attachLobby(httpServer,
config, logger)` creating the typed `Server` (`cors:
{ origin: config.corsOrigins, credentials: false }`,
   `serveClient: false`); auth middleware mirroring the route-guard pattern
   (validate `TeacherAuth.hostKey` against `HOST_KEY_PATTERN` →
   `getByHostKey` (refreshes TTL); validate `StudentAuth` — `JOIN_CODE_PATTERN`,
   `1234` rejected unconditionally, zod-validate the fresh-join name against
   the shared cap — → `getByJoinCode`); rejections via `next(new
Error("<code>"))`. Teacher sockets join a per-activity room and get an
   immediate `queue:snapshot`; every seat change broadcasts a fresh snapshot
   to the room (snapshots over deltas — ≤60 entries, zero sync bugs). Student
   sockets get `lobby:welcome` on seating/resume. Teacher keep-alive: a ~5min
   interval refreshing `lastSeenAt` while connected (`.unref()`, cleared on
   disconnect). Register `onActivityRemoved` → clear timers, emit
   `activity:ended`, disconnect the activity's sockets.
6. `server/src/store/projections.ts` — `toQueueEntry(seat, now)` as an
   explicit literal, beside the REST projectors.
7. `server/src/index.ts` — attach the lobby to the existing `server`; change
   SIGTERM to the sequence that actually terminates with open sockets
   (`io.close()` closes the attached http server in v4 — pick one owner of
   the close and verify the process exits; don't double-close).
8. Tests — **deliberately light** (the repo's "tests stay small" rule, and
   the founder wants speed): two surfaces only, mirroring feature 1's shape.
   - Extend `projections.test.ts` with the exact-key allowlists:
     `toQueueEntry` → `["connection", "id", "name", "waitSeconds"]` (never
     the token), and the `lobby:welcome` payload → `["studentId", "token"]`.
   - One socket integration file (`socket.io-client` against an ephemeral
     server, ~4 cases): the happy path (student seats → teacher room gets
     the snapshot, the student socket does NOT — the occupancy-mystery
     rule); a 4-digit param can't open a teacher socket (the boundary test,
     socket edition); a student socket's `queue:remove` is ignored; the
     `currentSocketId` guard (resume-then-stale-disconnect leaves the seat
     connected — the one race worth pinning, it would silently reap live
     students).
   - Everything else — grace timing, broadcast delay, duplicate-tab, the
     cap, TTL touch, shutdown — is covered by the Prompt 2/3 browser passes,
     the deploy logs, and Prompt 5. **Do not add tests for them.**
9. Local smoke: run `pnpm dev:server`, connect a scratch `socket.io-client`
   node script (use the server's dev dep; keep the script in the scratchpad,
   not the repo) as teacher + two students against a curl-created activity;
   watch snapshots arrive, remove a student, watch the targeted
   `lobby:removed`.

**Done when:** `pnpm -r typecheck && pnpm -r test` green, local smoke passes,
`pnpm format`, commit (outside school hours — this deploys the server), tick
the checkbox. Then the **spin-down proof** against prod: connect one scratch
student socket to `api.chaverola.com`, generate no HTTP traffic for >15 min,
and confirm via `render logs` (CLI access per AGENTS.md) that the service does
NOT spin down; disconnect it, wait, and confirm it DOES. If the claim fails,
stop — the design needs a keep-alive rethink before any client work, and
that's a founder conversation.

---

## Prompt 2 — Client wiring, student side

**Goal:** a student in a real lobby has a live, resumable seat. Prod-safe on
its own: no teacher UI consumes the queue yet, so the only visible changes are
the student's own presence states.

Read first: `client/src/pages/student/JoinActivityPage.tsx` (all of it — the
stage machine, the sign-out effect, `LobbyDemoControls`),
`client/src/lib/studentSession.ts`, `client/src/lib/useActivityLookup.ts`,
`client/src/lib/api.ts`, `client/src/components/Student/WaitingLobby.tsx`,
DECISIONS.md → the 2026-07-19 lobby entries.

1. Client dep: `socket.io-client` (a deliberate ~13KB-gz bundle add — the
   join flow is the product; note it, don't agonize). New
   `client/src/lib/socket.ts`: the socket URL derives from `API_BASE_URL`;
   a factory returning a typed `Socket<ServerToClientEvents,
ClientToServerEvents>` with `autoConnect: false` and an **auth callback**
   (socket.io-client calls it before every attempt, including auto-
   reconnects, so it always reads the freshest session token). Never a
   module-level auto-connecting singleton — the demo must stay structurally
   zero-network.
2. `studentSession.ts` — the session grows to `{ name, joinCode, nonce,
studentId?, token? }`: mint the nonce (`crypto.randomUUID()`) at
   `signIn`; add an update helper for persisting `lobby:welcome`'s
   `{ studentId, token }`; extend the storage validator (existing sessions
   without a nonce stay valid — mint one lazily before first connect).
3. A lobby presence hook beside the page (e.g.
   `pages/student/useLobbyPresence.ts`): owns the socket for the lobby stage
   of **real activities only** (`joinCode !== DEMO_JOIN_CODE`), connecting on
   entry and closing on exit. Exposes a presence state:
   `"connected" | "reconnecting" | "removed" | "ended" | "full"`. Wires:
   `lobby:welcome` → persist; `lobby:removed` → removed; `activity:ended` →
   ended; `connect_error` codes → `removed` / `ended` / `full`;
   `visibilitychange` (hidden→visible + disconnected) → `connect()` now —
   THE dark-phone fast path. Intentional exits (back-as-reset firing the
   sign-out, or the removed flow) emit `lobby:leave` before closing; a
   refresh or `pagehide` never does.
4. `JoinActivityPage.tsx` integration — the careful part is the sign-out
   invariant (only a _resolved_ landing at the code gate signs out; no socket
   state may trip it):
   - `removed` → the existing removed-by-teacher flow (sign out, name step,
     the `role="alert"` notice) — the real event now drives the same UX the
     demo button does.
   - `ended` → a new "activity ended" stage rendered **before** the stage
     machine can fall through: honest copy (the class ended or the server
     reset — free-tier truthfulness), a CTA back to code entry, and
     **sign-out deferred to that CTA** (signing out immediately would
     re-derive the stage out from under the screen).
   - The REST path of the same truth: a resolved `not-found` while the
     session holds a `token` for that exact code → the same ended stage, not
     the "recheck your code" sign-out (that copy is for codes that never
     worked). This is the wake-after-deploy path: dark phone → reload → 404.
   - `full` → its own copy at the lobby gate (cap reached).
5. `WaitingLobby.tsx` — a `connection` prop and a third pill variant
   (mirroring the existing `isPaused` swap): while `reconnecting`, the pill
   goes amber with reconnecting copy; `connected` keeps "Waiting for your
   match" untouched (founder call — no interim copy fork).
6. Name input: `maxLength` reads `STUDENT_NAME_MAX_CHARS` (drops the
   hardcoded 40 — the form must not accept what the server rejects).
7. Demo parity: `LobbyDemoControls` gains "Your wifi blips" — flips the demo
   lobby's pill to reconnecting for a few seconds and back (through
   `scaledMs`; live socket timers must NEVER pass through `scaledMs` — demo
   simulation always does).
8. All new copy (reconnecting pill, ended screen, full copy, demo button)
   through the humanizer skill.

**Done when:** typecheck/tests green; browser pass (verify skill, phone width
included) against `pnpm dev` with a curl-created activity and the Prompt 1
scratch teacher script watching snapshots: join → seat appears in the script's
snapshot; lobby refresh resumes the same seat (script shows no
reconnecting flash — the broadcast delay works); DevTools offline → pill goes
reconnecting → online → restores; script emits `queue:remove` → name step +
notice, rejoin works; kill the dev server mid-lobby, restart it (store wiped)
→ the ended screen on both the socket path and a reload; `1234` demo fully
intact with **zero network** (DevTools network tab — no `/socket.io/`
requests anywhere in the demo). `pnpm format`, commit, tick the checkbox.

---

## Prompt 3 — Client wiring, teacher side (the feature completes)

**Goal:** the teacher's host page renders the real queue live and remove acts
on the real world.

Read first: `client/src/components/Teacher/HostActivity/useHostActivityDemo.ts`
(the `HostActivityDemo` interface — the contract to split),
`client/src/components/Teacher/HostActivity/index.tsx` (the dashboard: where
the hook is called, the `isDemo` blocks, `noStudentsYet`, `waitingHint`),
`client/src/components/Teacher/HostActivity/hostWorld.ts` (`WaitingStudent`),
`client/src/components/Teacher/HostActivity/PairingPanel.tsx` (queue rows,
CTAs, the auto-match switch + footer), `HostHeader.tsx`, `confirmCopy.ts`,
`client/src/pages/teacher/HostActivityPage.tsx` (the demo/real branch),
`client/src/lib/useHostedActivityLookup.ts`.

1. Extract the engine contract: a `HostEngine` type (the non-demo members of
   today's `HostActivityDemo` — everything except `triggerJoin`,
   `canTriggerJoin`, `fastForwardClocks`), with
   `HostActivityDemo extends HostEngine` keeping the demo triggers — the
   `ChatDemo extends ChatRoomState, ChatRoomActions` pattern, host edition.
2. **Engine injection by component split, never a conditional hook** (the
   react-hooks lint forbids it and the React Compiler needs it clean):
   `HostActivityPage` already branches demo vs. real, so give each branch its
   own thin wrapper — the demo one calls `useHostActivityDemo`, the live one
   calls the new `useHostActivityLive` — and `HostActivityDashboard` takes
   `engine: HostEngine` as a prop (plus an optional demo-triggers prop for
   the existing `isDemo` panel).
3. `useHostActivityLive(activity, hostKey)`: a teacher socket (auth callback
   supplying `{ role: "teacher", hostKey }`); queue state from
   `queue:snapshot` (server truth) with a local 1s tick advancing
   `waitSeconds` between snapshots; `removeFromQueue` emits `queue:remove`
   (the existing ConfirmDialog flow in `index.tsx`/`confirmCopy.ts` stays
   untouched — only the action behind it changes); connection state for the
   banner; `connect_error: activity_gone` → surface so the page falls back
   to its existing friendly not-found. Matching-era members are inert stubs
   (`chatsInProgress: []`, `startChat` no-op, `paused: false`, …).
   **Tripwire:** the live path imports nothing from `hostWorld.ts` beyond
   types/helpers — `tickWorld` runs auto-match when `settings.autoMatch` is
   on (the default!), and it must never see a real student.
4. `WaitingStudent` gains `connection: LobbyConnectionState` (the demo
   engine sets `"connected"` everywhere it builds one). `PairingPanel` queue
   rows render the lost-connection marking (dimmed row + a small "lost
   connection" tag; wait clock keeps ticking — the seat is still theirs).
5. The honest placeholder on real activities — replace this **explicit
   list**, nothing less: the row tap-to-select affordance, "Pair everyone
   1:1", "Start their chat (N)", the auto-match switch AND its footer copy
   ("students pair up on their own after waiting…" — a promise the page
   can't keep yet), and any `waitingHint` branch that references chatting.
   In their place, one short copy block: matching is coming in the next
   update; right now this page shows who's joined, live. Queue rows on real
   activities keep exactly two affordances: the name+clock display and
   Remove. The demo keeps everything.
6. Teacher reconnect banner + dimmed queue while the socket is down
   ("Reconnecting to your class…" — the last-known queue stays readable);
   restores on reconnect (the on-join snapshot guarantees fresh truth).
7. Demo parity: the host demo panel gains "A student's wifi blips" — marks a
   random queued demo student `reconnecting` for a few seconds and back
   (through `scaledMs`).
8. New copy (placeholder block, lost-connection tag, banner, demo button)
   through the humanizer skill.

**Done when:** typecheck/tests green; browser pass with two browsers plus a
**real phone** on `pnpm dev` (LAN address): student joins → row appears live
with a ticking clock; phone screen off → row marks "lost connection" after
the ~45s detection window (expect the latency — it's the ping cycle, not a
bug); screen on → row restores with the original clock; remove → the phone
reacts (name step + notice), rejoin allowed; back-from-lobby on the phone →
row disappears immediately (the `lobby:leave` path, no 2-minute ghost);
duplicate tab takeover (copy the lobby tab: the new tab owns the seat, the
old one doesn't zombie); teacher refresh mid-class → snapshot restores the
queue; `/activity/host/1234` byte-identical demo including the full pairing
UI. `pnpm format`, commit, tick the checkbox.

---

## Prompt 4 — Docs + stale-reference sweep

**Goal:** the repo's documentation tells the truth about the realtime layer.

Read first: `docs/api.md`, `docs/architecture.md`, `AGENTS.md` (status +
map), `README.md`, DECISIONS.md → the 2026-07-19 feature-2 entries.

1. `docs/api.md` — a "Socket events" section beside the REST contract: the
   event maps and auth payloads from `shared/src/socket.ts`, the rejection
   codes, the constants, the privacy rules (students get targeted emits
   only), and the operational truths a client author needs: disconnect
   detection latency (~45s ping cycle) and grace-starts-at-detected-
   disconnect.
2. `docs/architecture.md` — the realtime section: the attach seam is now
   filled (update the seam prose), rooms and auth, snapshots-over-deltas,
   the TTL-via-teacher-socket keep-alive, `onActivityRemoved`, the SIGTERM
   sequence, and "engine.io bypasses Express" (CORS via the Server option,
   plain pino, no rate limiters → the seat cap). Update the free-tier
   section with the verified spin-down facts (the 2026-02-24 changelog rule
   - the Prompt 1 empirical result) and the Cloudflare-WebSocket notes.
3. `AGENTS.md` — status table and load-bearing flow facts: the waiting queue
   is real over Socket.IO; matching/chat still simulated; the honest
   placeholder on real host pages; the demo untouched and zero-network.
   Commands/testing notes if the server test surface grew.
4. `README.md` — free-tier caveats if anything went stale (the "deploys wipe
   live classes" warning now bites harder: it kicks every connected student
   to the ended screen — say so).
5. DECISIONS.md — entries **only for anything newly decided during Prompts
   1–3** (the seven planning-session decisions are already recorded, dated
   2026-07-19). Sweep those entries' "_Planned in_" lines to "_Implemented
   in_" links now that the files exist.
6. Stale-reference sweep: any doc statement Prompts 1–3 invalidated (the
   "boots an empty, truthful host world **until the realtime feature**"
   phrasing in AGENTS.md, the api.md header's "not part of this contract
   yet", the architecture seam comment, feature-1 plan references if any).

**Done when:** `pnpm format:check` passes and every doc statement matches the
repo. Commit (a docs-only push deploys nothing), tick the checkbox.

---

## Prompt 5 — End-to-end production verification

**Goal:** the feature verified on production with a real phone, docs true,
nothing demo-side regressed. Feature 1's version of this prompt caught a
prod-breaking env-var bug; treat it as a hunt, not a formality.

1. Full pass on chaverola.com (desktop + a real phone on mobile data, not
   just wifi): create an activity → host it → join from the phone → the row
   appears live with a ticking wait clock. Then the reconnect gauntlet:
   - Phone screen off → row marks "lost connection" within ~a minute →
     screen on → seamless resume, original clock, pill never lied.
   - Remove the student → the phone lands on the name step with the notice
     → rejoin works (fresh seat).
   - Back-from-lobby on the phone → the row vanishes immediately.
   - Refresh both sides → no row flash (broadcast delay), seats survive,
     teacher snapshot restores.
   - Open the host URL on a second device — both queues live, remove from
     either is idempotent.
   - Duplicate the student tab — the newer tab owns the seat.
2. The restart story, for real: push a trivial server-touching commit (or
   manual redeploy) while a class is live **off-hours** → every student gets
   the ended screen (check both paths: a connected phone via the socket
   event, and a dark phone that reloads later via the REST branch); the
   teacher's host page falls back to not-found; creating a fresh activity
   right after works.
3. Free-tier checks — **no waiting**: the spin-down/keep-awake halves are
   settled by Prompt 1's proof (results blockquote above; standing rule in
   AGENTS.md) — do NOT re-run the 15–20 min holds. What's left is cheap:
   the wake-UX check (a student joining a cold server rides the
   warm-up/patience copy and lands in the lobby) done **opportunistically**
   as this session's FIRST server contact, when the service is naturally
   asleep — never by manufacturing a spin-down; and a seconds-long glance
   that the socket transport shows `websocket` through Cloudflare (not
   polling-forever — already observed in Prompt 1).
4. Demo sweep: `/demo`, `/demo/teacher`, `/demo/student` fully intact — the
   whole demo journey with the network tab open proves **zero** `/socket.io/`
   traffic on demo surfaces.
5. Sweep for stragglers: copy that skipped the humanizer, doc statements the
   pass invalidated, a DECISIONS.md entry for anything decided during
   verification. Tick the final checkbox — feature 2 is live.

**Done when:** everything above passes on production. Commit, tick the
checkbox — the live lobby is real.
