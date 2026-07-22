# Architecture

How Chaverola is put together across its three packages, how a request
flows through the server, and where everything runs. The API surface
itself lives in [api.md](api.md); the _why_ behind each choice is in
[DECISIONS.md](../DECISIONS.md) (mostly the "Backend & API" section).

## Workspace layout

A pnpm-workspaces monorepo with three scoped packages:

```text
chaverola/
├─ client/   @chaverola/client — React 19 + Vite + Tailwind v4 (the app)
├─ server/   @chaverola/server — Express 5 + TypeScript (the API)
└─ shared/   @chaverola/shared — the wire contract (types + constants)
```

Who imports what:

- **`shared/` depends on nothing.** It is buildless — its `exports` map
  points at `./src/index.ts`, and Vite, tsx, and Vitest all compile it in
  place. No dist, no build ordering.
- **`client/` and `server/` both depend on `shared/`** (`workspace:*`) and
  never on each other. The handwritten interfaces in `shared/src/api.ts`
  and `shared/src/types.ts` are the canonical wire contract; every limit
  (name caps, join-code pattern, settings bounds) lives in
  `shared/src/constants.ts` so the form and the validator can't drift.
- **zod exists only in `server/`.** The schema is pinned to the shared
  contract with `satisfies z.ZodType<CreateActivityRequest>` — drift is a
  compile error — and pnpm's strict `node_modules` keeps zod out of the
  client structurally. The client keeps its friendly per-field form
  validation instead.

Skipping client builds for server-only pushes turned out to need more than
the workspace layout: Vercel's automatic monorepo detection rebuilt the
client on a server-only push, so an explicit Ignored Build Step does it by
paths (see Deploy topology).

## Client component geography

Where the client's shared machinery lives and which files are tied
together. The surface-by-surface map (which page owns which flow) is in
[AGENTS.md](../AGENTS.md) → Task router; this section is the cross-cutting
pieces those surfaces share.

- **The chatbox engine contract.** The chatbox shell
  ([client/src/components/Student/Chatbox/](../client/src/components/Student/Chatbox/)
  `index.tsx`) is **presentational** — driven entirely by props: the room
  as one `chat: ChatRoomState` object plus the action callbacks its parent
  mediates. The contract (`ChatRoomState` and `ChatRoomActions`) lives in
  [client/src/types/chat.ts](../client/src/types/chat.ts); the mock
  "engine"
  ([client/src/components/chat/useChatDemo.ts](../client/src/components/chat/useChatDemo.ts)
  — under `chat/` because the homepage hero uses it too) explicitly
  implements it (`ChatDemo extends ChatRoomState, ChatRoomActions` plus
  dev-only triggers), so swapping in a real data source is a type-checked
  replacement, not a re-plumbing. The same conventions back the Teacher
  view, whose host dashboard takes an injected `HostEngine`
  (`Teacher/HostActivity/hostEngine.ts`) with `useHostActivityLive.ts`
  (real keys) and `useHostActivityDemo.ts` + `hostWorld.ts` (`1234`) as
  its two implementations. `LiveChatStage` is a component split beside the
  demo's `ChatStage.tsx`, never a conditional hook (an invariant — see
  AGENTS.md).
- **Shared chat pieces**
  ([client/src/components/chat/](../client/src/components/chat/)): the card
  chrome (`ChatFrame` / `CHAT_FRAME_CLASS`), the gradient "You're X … with
  Y" header (`ChatHeader`), the message-line renderer
  (`ConversationLines`), the conversation feed (`Conversation`, with
  `PeerIsTyping` and `PeerReconnectBanner`), and the message input
  (`MessageComposer`, with `LazyEmojiPicker` / `EmojiPickerPopover` — also
  the setup form's emoji slots, always inside the `ui/popover` primitive)
  are shared by the student chatbox, the homepage hero chatbox, and the
  teacher chat cards
  ([client/src/components/Teacher/ChatCard/](../client/src/components/Teacher/ChatCard/)).
  Character display labels come from `characterLabel` / `peerListLabel`
  ([client/src/lib/characterLabel.ts](../client/src/lib/characterLabel.ts)).
  Every confirmation step renders through
  [`ui/confirm-dialog`](../client/src/components/ui/confirm-dialog.tsx) —
  `EndChatConfirmationModal` is a thin wrapper over it, and the host page's
  remove/end-all confirmations use it directly (copy in
  `Teacher/HostActivity/confirmCopy.ts`).
- **Demo-engine helpers** live in
  [client/src/lib/random.ts](../client/src/lib/random.ts) (`nextId`,
  `randInt`, `randomFrom`, `shuffled`) — both engines import them; don't
  re-declare per-engine copies. The reserved notice sender id
  (`NOTICE_SENDER_ID`) lives in
  [client/src/types/chat.ts](../client/src/types/chat.ts).
- **Navbar ↔ homepage contract:** `HERO_JOIN_CTA_ID`
  ([client/src/lib/useHeroCtaPassed.ts](../client/src/lib/useHeroCtaPassed.ts))
  ties two files together — `HomePage` puts the id on the hero's Join CTA,
  and `AppLayout` watches that element to swap the mobile navbar mode.
- **Hook inventory.** A hook lives next to the components it drives
  (`components/chat/useChatDemo.ts`,
  `components/Teacher/HostActivity/useHostActivityDemo.ts` — whose pure
  simulation rules live beside it in `hostWorld.ts`); generic
  cross-cutting hooks live in `lib/`: `usePageTitle` (prepends the
  "Chaverola | " brand prefix itself — callers pass just the page name),
  `useHeroCtaPassed`, `useBackGuard`, `useLatestRef` (the
  ref-mirrors-latest-value idiom for timer callbacks — don't hand-roll
  it), `useSecondCountdown`, `useWarmUpServer` (the fire-and-forget
  `/healthz` ping that wakes the free-tier server), `useActivityLookup`,
  and the hooks inside `locale.ts` / `studentSession.ts`. The live
  lobby/host sockets are `pages/student/useLobbyPresence.ts` (student —
  stays mounted through the chat and ended stages) and
  `Teacher/HostActivity/useHostActivityLive.ts` (teacher), both through
  the factory in `lib/socket.ts`.
- **Mock data** lives only in
  [client/src/mockData/](../client/src/mockData/) (the one barrel file in
  the client). The demo join code `1234` always works, fully client
  simulated.
- **Sticky-grid gotchas.** Two are load-bearing:
  - The setup-page form grid must **not** get `items-start`, or the sticky
    `LobbyPreview` rail loses its track (there's a code comment on it).
  - Chrome insets `position: sticky` offsets by the scroll container's own
    padding, so a `sticky top-0` child rests below the container's clip
    line and scrolled content peeks through the gap above it. Keep the
    scroller's top padding at zero (move it onto the first child) so
    pinned elements sit flush — done for the host page's pairing rail
    (`Teacher/HostActivity/index.tsx`). The chat feed's pause/reconnect
    banner (`chat/Conversation.tsx`, `py-3` scroller) still carries the
    minor 12px version of this gap.

## Deploy topology

```text
   browser ──────────────► Vercel (client)      chaverola.com, www
      │                      static SPA; client-touching pushes deploy
      │  fetch/XHR
      ▼
   api.chaverola.com ─────► Render (server)     Virginia / US East, Free tier
      CNAME → onrender.com   single Node instance, tsx runs src directly
```

- **Vercel** builds only `client/` (Root Directory `client`, with
  source-files-outside-root enabled so `shared/` resolves). Its Ignored
  Build Step — `git diff --quiet HEAD^ HEAD -- . ../shared
../pnpm-lock.yaml ../package.json ../tsconfig.base.json`, run inside
  `client/` — skips pushes that touch none of those paths (set explicitly
  2026-07-19 after a server-only push proved the automatic detection
  didn't skip). The client reaches the API through `VITE_API_URL`, baked
  at build time; `lib/api.ts` scrubs BOMs and whitespace off it and
  requires an absolute URL, because the value once arrived with a leading
  UTF-8 BOM that turned every prod call into a relative-path 404 (caught
  by the feature-1 prod pass — the gotcha and the safe way to set env
  vars are in [operations.md](operations.md) → Setting Vercel env vars).
- **Render** runs the server (service `chaverola-api`, live since
  2026-07-18; build filters keep client-only pushes from deploying it). The
  build command installs with pnpm and runs `tsc --noEmit` as the deploy
  gate; at runtime **tsx executes the TypeScript source directly** — there
  is no emit step anywhere. Render injects `PORT` and
  `RENDER_GIT_COMMIT` (echoed by `/healthz`); Node's version comes from
  the root `.nvmrc`.
- **Free-tier consequences:** the instance spins down when idle, and the
  spin-down rule is verified empirically (2026-07-19, the feature-2
  Prompt 1 proof — results in
  [the feature-2 plan](plans/feature-2-live-lobby.md)): the service
  spins down ~15 minutes after the last inbound HTTP request _or_
  inbound WebSocket message, per Render's 2026-02-24 changelog rule. A
  connected Socket.IO client's heartbeat (a pong every ~25s) is an
  inbound message, so **any connected class keeps the server awake** —
  spin-down only happens when nobody is connected, which is exactly when
  it's harmless. Render's own platform health checks
  (`render-health-check: 1`) demonstrably do NOT count as traffic. Flip
  side: a forgotten open tab keeps the instance up, bounded by the 12h
  TTL sweep disconnecting everyone. A single `/healthz` hit wakes a
  sleeping instance in ~33 seconds (boot to `listening` is ~11s of
  that); the client's warm-up ping on page mount hides this cold start.
  Every server deploy or restart wipes all live activities — and since
  feature 2 that's loud, not silent: every connected student is kicked
  to the "activity ended" screen and the teacher's page falls back to
  not-found — so once real classes use Chaverola (launch: end of August
  2026), server-touching pushes should avoid school hours. Pre-launch,
  any hour is fine: there is no live class to wipe.
- **Cloudflare** fronts `api.chaverola.com`. It proxies WebSockets on
  all plans, and its ~100s proxied idle timeout never triggers under
  Socket.IO's 25s pings (the polling fallback's long-poll cycle also
  fits). Observed in the Prompt 1 proof: a student socket held 20
  minutes on the websocket transport straight through Cloudflare.
- **CORS** allows `chaverola.com`, `www.chaverola.com`, Vercel preview
  hostnames (`chaverola-*-moshe-siegels-projects.vercel.app`), and
  localhost outside production (`server/src/config.ts`). CORS is
  explicitly **not** the security boundary — curl ignores it; the hostKey
  is the boundary.

## Request flow (server)

`buildApp` in `server/src/app.ts` assembles the middleware in this order —
the order is load-bearing:

```text
trust proxy (3)          socket + Render internal + Cloudflare edge; the
                         limiters must see real client IPs, not Render's
→ helmet                 security headers
→ cors                   credentials: false, preflight cached 24h
→ pino-http              structured request logs
→ GET /healthz           BEFORE the limiters — the warm-up ping and
                         Render's health check never burn limiter budget
→ rate limiters          POST and GET limiters, picked per method
→ express.json (16kb)
→ Cache-Control: no-store
→ /activities router     validate (zod) → store → project → respond
→ 404 fallback           unknown routes get the shared error envelope
→ error middleware       HttpError → its status + envelope;
                         body-parser errors → 400 envelope; else log + 500
```

Handlers stay thin: `server/src/routes/activities.ts` only validates,
calls the store, and projects. The **projection layer**
(`server/src/store/projections.ts`) is the single module allowed to turn a
stored record into response JSON, and it builds explicit field-by-field
literals — the student projection cannot leak `settings`, `teacherEmail`,
or the hostKey by construction. Tests pin the exact key lists.

### The `app.ts` / `index.ts` seam

`app.ts` builds and returns the Express app **without listening** —
supertest targets it directly. `index.ts` is the only side-effectful
module: it wraps the app in `http.createServer(app)` (never
`app.listen()`), attaches the lobby's Socket.IO server to that same
`http.Server` (`attachLobby` in `server/src/live/lobby.ts` — the exact
attachment the seam was built for; feature 2 filled it without moving
anything), starts the sweep timer, listens, and handles SIGTERM (Render
sends it on every deploy). The SIGTERM sequence matters with sockets
open: `io.close()` is the **single owner** of shutdown — in Socket.IO v4
it disconnects every socket AND closes the attached `http.Server`,
whereas a bare `server.close()` would never finish while WebSocket
connections stay open. Nothing is flushed — the store is in-memory by
design and deploys wipe it.

## Realtime: the live lobby and matching

The Socket.IO layer built by feature 2 (the waiting queue) and feature 3
(matching), contract in `shared/src/socket.ts`, documented in
[api.md → Socket events](api.md#socket-events). The structural fact
everything else follows from: **engine.io bypasses Express.** It
intercepts `/socket.io/` on the `http.Server` before Express runs, so
Express `cors()` never sees the handshake (CORS is the `Server`
constructor's own option, fed the same `allowedOrigins()` from
`config.ts`), `pino-http` logs nothing (the lobby logs through the same
plain `pino` logger instance `index.ts` shares between both layers), and
Express's rate limiters never see socket traffic — the socket layer
carries its own abuse guards: the seat cap
(`MAX_STUDENTS_PER_ACTIVITY`), the per-socket `chat:send` rate limit,
and the per-message character cap. `serveClient: false` — the client
bundles its own.

How the layer is put together (`server/src/live/`):

- **`lobby.ts` is a thin composition root** (`attachLobby`) — it creates
  the `Server`, applies the time scale, builds the shared `LobbyContext`
  (`lobbyContext.ts`: the `io`, the child logger, and the broadcast/timer
  helpers every handler leans on — `broadcastState`, `armSeatTimers`,
  `settleMembershipChange`, and the snapshot builders), installs the auth
  middleware (`auth.ts`), dispatches each connection to
  `registerTeacherHandlers` (`handlers/teacher.ts`) or
  `registerStudentSession` (`handlers/studentSession.ts` +
  `studentChat.ts`), arms the auto-match timer (`autoMatch.ts`), and
  registers the `onActivityRemoved` cleanup. The split is by concern: an
  agent editing `chat:send` opens `handlers/studentChat.ts` and never
  reads the teacher commands.
- **`seats.ts` is the pure, io-free seat lifecycle** — testable without
  sockets. Seats hang off the `StoredActivity` record (the activity's
  lifecycle owns the seats' lifecycle), and the module owns the tricky
  rules: fresh-join idempotence via the client-minted nonce (StrictMode
  double-mounts, refresh races), duplicate-tab takeover (the newer
  socket wins the seat), tombstones for removed students (so a removed
  token gets the distinguishable `removed` rejection), the seat cap, and
  the **`currentSocketId` guard** — disconnect handling and grace expiry
  no-op unless the disconnecting socket still owns the seat, because on
  a refresh the new socket can resume the seat before the old socket's
  disconnect fires. Each seat owns up to two timers (broadcast delay +
  grace), cleared on resume, leave, remove, and activity removal.
  `armDisconnectTimers` arms both on every drop — the same 120s grace
  for every seat, matched or waiting (the 2026-07-20 handset fix); what
  grace expiry means for a seat mid-chat is the lobby layer's callback
  (`armSeatTimers` in `lobbyContext.ts`), so seats.ts stays chat-unaware.
  A seat's `wrappingUp` flag marks the ended-screen state; `toQueueEntries`
  skips those and takes an `exclude` set for matched seats, so seats.ts
  itself stays chat-unaware (the lobby layer supplies the set).
- **`matching.ts` is the same charter, one layer up** — pure, io-free,
  unit-tested: the chat records and every rule that moves them.
  `eligibleWaiting` is the single matchable pool (connected, unmatched,
  not wrapping up, in join order) and every path funnels through it, so
  "reconnecting students are unmatchable" is enforced once instead of at
  four call sites. `createChat` filters, clamps, deals characters
  (the shared `dealCast` — one Fisher–Yates for both engines, in
  `@chaverola/shared` alongside `activeMembersBy` and the odd-count
  `splitOddPool`), `planPairEveryone` and `findAutoMatchPair` run the
  eligible pool through the shared rematch-aware rules (`pairEveryonePlan`
  and `pickAutoMatchPair` — no exact rerun formed either way, a stuck
  exact pair/trio parked in `rematchNotice`), `markInactive` owns the
  below-2 ending, and
  `appendLine` owns the transcript (membership guard, id minting, the
  200-line cap). The split is the payoff: the lobby layer decides who may
  command what and who hears about it; matching.ts decides what actually
  happens.
- **Chats hang off the activity record** (`chats: StoredChat[]` plus
  `leftoverStudentId`), exactly like seats — one lifetime, one owner,
  and activity death takes everything with it. A `StoredChat` keeps
  every member who was ever in it, with the name captured at chat start,
  so a card outlives the seat it describes.
- **Auth is connection-time middleware**, mirroring the REST route
  guards: pattern-check then look up (`getByHostKey` refreshes the TTL,
  `getByJoinCode` never does), `1234` rejected unconditionally, the
  fresh-join name zod-validated against the shared cap. Every rejection
  rides `connect_error` with its code before the socket ever connects —
  student seating happens in the middleware too, so `full`/`removed`
  reject there.
- **Rooms and snapshots:** teacher sockets join a per-activity room and
  get a `queue:snapshot` and a `chats:snapshot` immediately on join;
  `broadcastState` re-sends both to the room after **every** seat or
  chat change. Snapshots over deltas — at ≤60 entries the bandwidth is
  nothing, the sync-bug surface is zero, and a dropped emit can't wedge
  a card. The one delta is `chat:transcript-line` (one line per
  `chat:send` to the room — a snapshot per message would be far too
  fat), and it is safe under the same rule because `chats:snapshot`
  also carries the transcript, so a dropped delta heals on the next
  snapshot (see DECISIONS.md → "Message lines are the one delta on the
  teacher wire"). Students get only targeted emits (`lobby:welcome`,
  `lobby:removed`, `activity:ended`, `chat:started`, `chat:update`,
  `chat:line`, `chat:peer-typing`, `chat:ended`), never a snapshot.
- **Teacher commands live on teacher sockets only.** `chat:start`,
  `match:pair-everyone`, `chat:remove`, `settings:update`, and
  `queue:remove` are registered by `registerTeacherHandlers`
  (`handlers/teacher.ts`), which the connection dispatch reaches only for
  a teacher socket — a student socket has no listener to reach, which is a
  stronger boundary than a role check inside each handler. Every
  one of them is idempotent, and the snapshot that follows repairs any
  divergence.
- **The auto-match timer is the one piece of scheduled server
  behavior.** A module-level `joinCode → { timer, teacherCount, nextAt }`
  map holds a 1-second `.unref()`ed interval, armed on an activity's 0→1
  teacher socket and cleared when its teacher count returns to zero (and
  in `onActivityRemoved`). **Everything else is read inside the tick** —
  the record via `getByJoinCode` (which never refreshes the TTL, so an
  unattended timer can't keep an activity alive), the auto-match setting,
  the threshold, eligibility, and the 3-second gap — so settings edits,
  seat changes, and manual pairing never have to touch the timer. The
  teacher-gating is a product decision, not a technical one: a closed
  laptop shouldn't keep putting kids in rooms.
- **Messaging is real, both directions of the split** (feature 4's
  first two slices): a student's `chat:send` appends to the chat's
  stored transcript (`StoredChat.lines`, capped at 200, oldest dropped)
  and fans a character-attributed `chat:line` out to the connected
  active members, while the teacher room hears the same stored line as
  a `chat:transcript-line` with the real name resolved — one store, two
  projections (`toChatLine` / `toChatTranscriptLine`), which is the
  slice seam between prompts 2 and 3. The resume re-delivery of
  `chat:started` carries the whole transcript for students, and
  `ChatSnapshot.messages` does the same for the teacher — each side's
  only channel that heals a blip, since the fan-out skips disconnected
  seats. Typing is real too (feature 5): a `chat:typing` heartbeat
  relays as `chat:peer-typing` to the other active members — ephemeral
  and stateless (nothing stored, nothing resumed), characterId-only,
  volatile in both directions, and deliberately with no teacher emit
  (DECISIONS.md → "The teacher never sees typing"). Ending is real too
  (feature 6): a teacher's `chat:end` / `chats:end-all` flips the chat
  to `status: "ended"` with reason `"teacher"`, every member goes
  wrappingUp and hears `chat:ended`, and the below-2 rule still ends a
  chat structurally when membership drops. And pausing is real (feature
  7): `chats:pause-all` stamps `StoredActivity.pausedAt` — one field,
  both the flag and the freeze anchor. While set, `chat:send` /
  `chat:typing` refuse, the auto-match tick stands down, and snapshots
  clock `waitSeconds` / `elapsedSeconds` against the anchor (frozen),
  while reconnecting state keeps real time — the 120s grace
  deliberately runs through a pause. Every connected student hears
  `activity:paused`, `lobby:welcome` carries the state so a mid-pause
  refresh stays frozen, and `chats:resume-all` (or `chats:end-all`)
  shifts the stored clocks forward by the pause duration so nothing
  jumps. And the peer-drop UI is real (feature 8): a chat member's drop
  fans out as `chat:peer-connection` to the room's other members on the
  same 4s gate as the teacher's reconnecting tag, seeded with the
  remaining grace, and every resume announces the return (receivers
  ignore a return for a peer they never saw drop). The `chat:started`
  resume payload carries the offline peers too (`reconnectingPeers`,
  authoritative on every delivery like `lines`), so a blip that downs
  both students can't hide the survivor's countdown from the first one
  back. The reaped student's own return is honest too (feature 9): a
  seat reaped out of a chat is remembered for the rest of the activity
  (`reapedFromChatByToken`, the tombstone lifetime), and the returning
  token is re-seated wrappingUp under a fresh identity and replayed
  `chat:started` (the old transcript, projected through the old
  membership id) followed by `chat:ended {reason:"self-timeout"}` — a
  wire-only, per-recipient reason; the stored 1:1 reason stays
  `"peer-timeout"`. **What is still simulated:** the auto-end clock and
  the name reveal.
- **The teacher socket is the TTL keep-alive:** while one is connected,
  a ~5-minute `.unref()`ed interval calls `getByHostKey`, so a live
  class can't expire at the 12h TTL mid-lesson. Student sockets never
  refresh the TTL — enumeration must not keep activities alive.
- **Activity death reaches the lobby through the store's
  `onActivityRemoved` hook** — registered by `attachLobby`, called by
  `remove()` on all three removal paths (the sweep and both lazy-expiry
  lookups): clear per-seat timers, emit `activity:ended` to the
  activity's students, disconnect everyone. The store never imports
  `io`.
- **One wire subtlety, learned on a real phone:** the server drops any
  packet it processes in the same tick as that socket's disconnect, and
  over real wifi an emit written back-to-back with a `disconnect()`
  coalesces into one TCP read — so the client's `lobby:leave` flushes
  alone and the disconnect trails 300ms behind
  (`client/src/pages/student/useLobbyPresence.ts`). Localhost never
  reproduces this; the frames arrive as separate reads there.

## In-memory lifecycle

There is no database. `server/src/store/activityStore.ts` holds two Maps
(`byJoinCode`, `byHostKey`) sharing the same record objects — one record,
two lookup paths.

- **TTL 12 hours**, refreshed **only** by hostKey lookups — the host
  page's fetch and, since feature 2, the connected teacher socket's
  ~5-minute keep-alive: an activity stays alive exactly as long as a
  teacher keeps the host page open. Student lookups and student sockets
  deliberately don't refresh, so enumerating join codes can't keep
  activities alive.
- **Sweep every 10 minutes** (`startSweep`, called only from `index.ts`;
  the interval is `.unref()`ed so it never holds the process open).
  Lookups also delete-and-miss expired records between sweeps.
- **Capacity cap `MAX_ACTIVITIES = 4000`** — comfortably under the 8,999
  usable join codes, so code minting (100 random draws, then a dense
  fallback that stays uniform) never starves.
- **Join code `1234` is never minted and never served** — it belongs to
  the client-simulated demo forever; the server 404s it unconditionally.
- Restarts and deploys wipe everything. Accepted for v1 — and honest
  since feature 2, by two different paths. An activity aging out under a
  _running_ server (sweep or lazy expiry) fires the store's
  `onActivityRemoved` hook, which emits `activity:ended` to connected
  students before disconnecting them. A **deploy or restart** never runs
  that hook — SIGTERM kills the process, `io.close()` just drops the
  sockets, and the store dies with it; the fresh instance boots empty, so
  each client's auto-reconnect presents a seat token the new store has
  never seen and gets a `connect_error: activity_gone` (the student's
  ended screen, the teacher's not-found). Either way nobody is left
  staring at a silent dead socket. Verified against prod (2026-07-19):
  a `render restart` under a live class landed the connected phone on
  the ended screen in ~37s (socket.io's reconnect backoff plus the new
  instance coming up), and a dark phone that reloaded afterward hit the
  same ending through the REST 404-with-token branch.

## Rate-limit sizing

All per-IP limits assume one school NAT carrying **20 simultaneous
classes × 30 students = 600 users on one IP**:

| Limiter                        | Limit         | Sizing                                                 |
| ------------------------------ | ------------- | ------------------------------------------------------ |
| `POST /activities`             | 60 / 15 min   | 20 teachers starting class at once, ×3 headroom        |
| GET lookups (code + host, one) | 1,200 / 5 min | 600 students × ~2 lookups in a join burst, ×2 headroom |

Residual exposure: a full 9,000-code sweep from one IP takes ~37 minutes —
accepted, because the student projection is public-by-assumption. The
math lives next to the limiters in `server/src/app.ts`.
