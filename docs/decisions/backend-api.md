# Backend & API

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The transcript mailer: Gmail SMTP behind one module, log-only without credentials

_2026-07-23_

**Decision:** The transcript email sends over Gmail SMTP (nodemailer, the
founder's account plus an app password, `GMAIL_USER` / `GMAIL_APP_PASSWORD`
on Render), isolated in `server/src/email/`: a pure formatter, a send-once
guard, and the mailer. With either credential missing the mailer runs in
log-only mode, so dev needs zero env vars. In dev's log mode it logs the
whole composed email (that's how the format gets eyeballed); in production's
log mode it logs a warning with the recipient and line count only, never the
student messages. The body is plain text: a short header, then each chat as a
numbered block ("Chat 3 of 15") with a participants line that marks anyone
who left mid-chat, then the lines in the teacher's `(Rachel) Brutus 🔪: text`
format, an empty-chat line for a silent room, and a "showing the most recent
200" note at the transcript cap. The subject names the host and join code
with **no date** (the server runs UTC, so a stamped date is wrong for an
evening class; Gmail timestamps the message in the reader's own zone). A
silent activity — chats but not a single message — sends nothing.

**Why:** Founder call (2026-07-23), realizing the earlier
[Transcripts wait](#transcripts-wait-feature-1-only-stores-the-teachers-email)
plan. Gmail SMTP is free and fine at MVP volume, and the one-module isolation
keeps a later swap to Resend a single-file change. Log-only mode is what
preserves the zero-env dev rule and turns a misconfigured production into a
visible warning instead of a silent non-delivery. Suppressing the body in
production keeps classroom transcripts out of Render's log stream. One
operational constraint shaped the whole feature: the free-tier instance spins
down when idle, so "send it later" would usually fire against a dead process
— the send has to happen at a concrete event (an activity ending) while the
server is demonstrably alive.

_Implemented in [server/src/email/](../../server/src/email/) (formatter,
send-once guard, mailer), created at boot in
[index.ts](../../server/src/index.ts). Extends
[Transcripts wait](#transcripts-wait-feature-1-only-stores-the-teachers-email)._

### One implementation of the pure matching rules, shared by both engines

_2026-07-22_

**Decision:** The genuinely-identical pure matching primitives live once in
`@chaverola/shared`, and both the server's `matching.ts` and the client's
`hostWorld.ts` demo import them instead of keeping mirrored copies:
`activeMembersBy` (active-membership filtering), `dealCast` (a chat of N takes
the roster's first N characters, shuffled), and `splitOddPool` (pair-everyone's
odd-count trio/leftover rule). `shuffled` (Fisher–Yates) moves to `shared/`
too. What stays divergent is named, not drifted: id minting stays split
(`randomUUID` server, a counter client), and each engine owns its own memory
STATE (the demo's `HostWorld.lastPartners`/`rematchNotice`, the server's
`StoredActivity` fields) — the pairing DECISIONS themselves are all shared.
(Feature 9 finished the job: the rematch predicates, `pickAutoMatchPair`, and
the whole `pairEveryonePlan` — the swap-repair loop and the `stuckInLineNotice`
string — moved here too, so `findAutoMatchPair` and `planPairEveryone` are both
thin adapters mapping shared-rule ids back to their own seat shape.)
`tickWorld`, `seedWorld`, and the rest of the simulation stay in `hostWorld.ts`.

**Why:** Speedup planning (2026-07-21). The "mirror, never import" rule guarded
two real hazards — the demo's simulation transitions running against real
students, and a server dependency on client code — and a neutral, zero-dep
module in `shared/` (already imported by both sides, buildless) triggers
neither. The precedent is `LOBBY_GRACE_SECONDS`, which already retired the
demo's mirror of the grace window. Keeping four byte-identical copies in
lockstep by prose was the cost being paid; the extraction removes the copies,
and naming the divergences keeps the deliberate differences from reading as
drift. The invariant "the live engine imports only types from `hostWorld`" is
untouched — `useHostActivityLive` now takes `activeMembersBy` from `shared/`,
not from the simulation.

_Implemented in [matchRules.ts](../../shared/src/matchRules.ts) and
[random.ts](../../shared/src/random.ts) (the shared primitives),
[matching.ts](../../server/src/live/matching.ts) (server wrappers + the
rewritten header naming what's shared and what diverges), and
[hostWorld.ts](../../client/src/components/Teacher/HostActivity/hostWorld.ts) plus
[useHostActivityLive.ts](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(client wrappers)._

### Localhost real flows compress through a server-side time-scale knob; production is pinned to 1

_2026-07-21_

**Decision:** A dev server started with `CHAVEROLA_TIME_SCALE=n` (clamped
to 1–100) runs every lobby flow clock n× fast: the 120s reconnect grace,
the 4s disconnect broadcast gate, the engine.io ping cycle (so
dead-connection detection compresses too), the auto-match tick/gap, and the
teacher-set auto-match threshold. Production is hard-pinned to scale 1 by
two independent locks — Render never sets the variable, and
`NODE_ENV === "production"` forces 1 even if it leaks in. The client gets
no knob: every real-activity countdown is server-seeded and the ping
settings ride the handshake, so scaling the server scales the world.
Deliberately NOT scaled: the `chat:send` rate-limit window, the `TYPING_*`
heartbeat/TTL, the teacher keepalive, the store TTL/sweep, and the client's
`LEAVE_FLUSH_MS`. `/healthz` reports `timeScale` whenever it isn't 1 (plus
`pid` always), so a wrongly-scaled or stale server identifies itself.

**Why:** Founder call (speedup planning, 2026-07-21). Verification of real
socket flows was waiting out real-world clocks on localhost — ~20s
auto-match, ~45s dead-connection detection, 120s grace — while `?fast`
compresses demo timers only. A server-side knob compresses everything the
browser harness waits on without touching client code, and an unset knob
(and production, always) is byte-identical to today. The alternative — a
client-side scale reaching real activities — was cut as unnecessary
(see [speedup plan](../../docs/plans/speedup.md), "Considered and cut").

_Implemented in [timing.ts](../../server/src/live/timing.ts) (the derived-numbers
singleton and its what-never-scales docblock),
[config.ts](../../server/src/config.ts) (`readTimeScale`), and
[lobby.ts](../../server/src/live/lobby.ts) (`applyTimeScale` first thing in
`attachLobby`); the scale-8 peer-connection test in `lobby.test.ts` pins
the mechanism._

### The student chat wire carries characterIds only

_2026-07-19_

**Decision:** Everything a student receives about their chat is targeted and
character-shaped: their own characterId plus peers as bare characterIds —
never a peer's real name, never a peer's studentId. The teacher's chat
snapshots carry real names and the server roster's full `Character` (so a
locally renamed roster still resolves on cards). A chat-ended payload
carries only the reason.

**Why:** The projection tradition
([The host page is never projected — it's the teacher's private control room](teacher-live.md#the-host-page-is-never-projected--its-the-teachers-private-control-room))
extended to matching: the who-am-I-chatting-with mystery is the product, and
peer studentIds buy the client nothing while no messages travel — every
field a student doesn't get is a field that can't leak. Pinned by exact-key
allowlist tests like every other projection.

_Implemented in [projections.ts](../../server/src/store/projections.ts)
(`toChatStarted`, `toChatUpdate`, `toChatEnded`, `toChatSnapshot`), with
the allowlists in `projections.test.ts` — the load-bearing one asserts a
peer object's keys are exactly `["characterId"]`. Keep that test passing
rather than loosening it._

### Starting a chat clamps to the server's roster instead of rejecting

_2026-07-19_

**Decision:** A teacher's start-chat command is filtered to currently
eligible students (connected, unmatched) and clamped to `min(4, the server's
roster size)`; whoever doesn't fit visibly stays in the queue. Below 2
eligible members the command does nothing and the next snapshot corrects the
rail.

**Why:** Character edits are local-only, so the teacher's roster can briefly
disagree with the server's — and a selected student can drop in the instant
before the tap lands. Rejecting the whole command on either mismatch makes
the button read as broken; clamping produces a visible, explainable outcome,
and the rail self-corrects from the snapshot either way. Founder-approved in
feature-3 planning.

_Implemented in [matching.ts](../../server/src/live/matching.ts) (`createChat`
filters through `eligibleWaiting`, then slices to
`min(4, roster length)`)._

### Sockets connect at lobby entry and host-page load, and never on the demo

_2026-07-19_

**Decision:** The Socket.IO connection is not app-wide. A student's socket
connects only when they enter the lobby stage of a **real** activity — the
code and name steps stay REST-only. A teacher's socket connects as soon as
the host page resolves a real activity; there is no "start the live
activity" click, because the host page already is the live activity from the
moment of creation. The demo (`1234`) never loads or connects a socket on
either side — zero network, structurally.

**Why:** Founder call (feature-2 planning). Sockets exist for presence, and
presence begins when a student is actually in the room and when a teacher
opens the control room — connecting earlier spends server connections on
visitors who never finish joining. An explicit teacher "start" gate was
rejected as a product change: activities have been live-from-creation since
feature 1, and students can already join the moment the code exists. The
demo rule is the standing offline-forever guarantee extended to the
transport layer.

_Implemented in
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts)
(student) and
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(teacher), both over the factory in
[socket.ts](../../client/src/lib/socket.ts) — `autoConnect: false`, so nothing
connects on the demo by construction._

### The backend is Express 5 on Render's free tier — REST now, Socket.IO later

_2026-07-17_

**Decision:** The server is Express 5 + TypeScript, deployed as a single
instance on Render (Virginia/US-East), on the **free tier** until traffic
justifies paying. REST covers the out-of-session lifecycle (create an
activity, look one up); everything inside a live session — queue,
matching, chat, the teacher's live view — arrives in later features over
Socket.IO attached to the same HTTP server. The server keeps a hard seam
for that: `app.ts` builds the Express app without listening, and
`index.ts` wraps it in `http.createServer` (never `app.listen()`), which
is exactly where Socket.IO attaches later.

**Why:** Founder call (2026-07-17). Boring, battle-tested pieces for a v1
whose hard part (realtime) is still ahead; Express 5 finally forwards
async throws to error middleware, which keeps handlers thin. The free
tier's spin-down and deploy-wipe are accepted trade-offs with their own
entries (the warm-up ping, the in-memory lifecycle). US East sits well
for both US schools and transatlantic latency.

**Update (2026-07-19):** the "Socket.IO later" half landed with feature
2 — `attachLobby` ([lobby.ts](../../server/src/live/lobby.ts)) wraps the same
`http.Server` at the `index.ts` seam, exactly as reserved. The seam
never had to move.

_Implemented in [app.ts](../../server/src/app.ts) and
[index.ts](../../server/src/index.ts); topology in
[docs/architecture.md](../../docs/architecture.md)._

### The API lives at `api.chaverola.com` from day one, with no `/api/v1` prefix

_2026-07-17_

**Decision:** The API's base URL is `https://api.chaverola.com` (a CNAME
to the Render host) from the very first deploy, and endpoint paths are
unversioned — `/activities`, not `/api/v1/activities`.

**Why:** Founder call. Baking the real domain in from the start means
`VITE_API_URL` never churns through onrender.com hostnames. URL
versioning protects clients you don't control; Chaverola has one
first-party client in the same repo, the contract is compile-checked
through `shared/`, and all data is ephemeral — there is nothing durable
for an old client to corrupt. The dedicated `api.` subdomain also makes
an `/api` path prefix redundant. If a public API ever ships, introduce
`/v1` then.

_Recorded in [docs/api.md](../../docs/api.md); the DNS landed 2026-07-18 with
the Prompt 4 deploy._

### Teachers set up at class start, and a warm-up ping hides the cold start

_2026-07-17_

**Decision:** The product assumes teachers create activities **at the
start of class** — no accounts, setup takes under a minute — so the
client fires a fire-and-forget `GET /healthz` when the homepage, the
create page, or the join page mounts. `/healthz` sits before the rate
limiters on purpose: the ping every visitor fires (and Render's health
check) never burns limiter budget.

**Why:** Founder call. The free-tier instance spins down after ~15 idle
minutes and takes tens of seconds to wake; without the ping, the first
teacher of the morning would submit a form into a sleeping server. With
it, the server wakes while the teacher is still typing. The client-side
mounts land with the wiring prompts (feature-1 Prompts 5–6); the
patience copy on pending buttons covers the case where the ping loses
the race.

**Update (2026-07-19):** placement revisited (founder question: should
the ping centralize into a run-once call in `App.tsx`?) and deliberately
kept per-surface. `App` mounts once per page load, so a run-once ping
couldn't re-warm a server that spun down while a visitor idled on the
homepage before navigating into the join or create page — the
per-surface mounts re-ping at exactly the moments that precede an API
call. Per-surface also keeps the demo routes zero-network (the demo must
work offline forever), and the host page needs no ping because its own
lookup is the wake. DRY lives in the shared hook
([useWarmUpServer.ts](../../client/src/lib/useWarmUpServer.ts)); the three
one-line call sites are declarations of intent.

_Server side in [app.ts](../../server/src/app.ts)._

### Nothing persists: activities live in memory for 12 hours, and deploys wipe them

_2026-07-17_

**Decision:** No database. Activities live in in-memory Maps on the
single server instance: a 12-hour TTL refreshed **only** by hostKey
lookups (student lookups and code enumeration never keep an activity
alive), a sweep every 10 minutes, and a hard cap of 4,000 concurrent
activities. Restarts and deploys wipe every live class — accepted for
v1, with the working rule: **avoid server-touching pushes during school
hours**.

**Why:** Founder call. An activity is inherently ephemeral — it exists
for one class period and is worthless the next morning — so durability
would buy nothing anyone needs yet, at the cost of schema, migrations,
and hosting. The hostKey-only TTL refresh makes the lifetime match
reality: an activity lives exactly as long as its teacher keeps the host
page open, and a crawler enumerating join codes can't immortalize
garbage.

_Implemented in
[activityStore.ts](../../server/src/store/activityStore.ts)._

### Host access is a URL capability — the hostKey — not an account

_2026-07-17_

**Decision:** Creating an activity returns the `joinCode` (for students)
plus `hostKey = crypto.randomBytes(18).toString("base64url")` — 24
characters, 144 bits. The host page becomes `/activity/host/:hostKey`
(feature-1 Prompt 6): shareable with an assistant teacher, **never
stored client-side, never a field of `HostedActivity`** (it exists only
as the create response's own `hostKey` member, and the host GET doesn't
echo it back). A join code structurally cannot unlock the host route —
four digits never match the key pattern, and the host route 404s any
4-digit param. CORS is explicitly **not** the security boundary (curl
ignores CORS); the hostKey is.

**Why:** Founder call. No accounts is a core product promise, so the
URL itself must be the credential — and at 144 bits it's unguessable in
a way a login would only complicate. Losing the URL loses the activity;
accepted, because activities are ephemeral and `teacherEmail` is the
future recovery channel (a localStorage stash was rejected — see the
considered-and-rejected entry).

_Implemented in [activityStore.ts](../../server/src/store/activityStore.ts),
[projections.ts](../../server/src/store/projections.ts), and
[activities.ts](../../server/src/routes/activities.ts); the
joinCode-never-unlocks-host rule is an executable test in
[activities.test.ts](../../server/src/routes/activities.test.ts)._

### The wire contract is handwritten types in `shared/`; zod validates on the server only

_2026-07-17_

**Decision:** `@chaverola/shared` holds the canonical wire contract as
handwritten TypeScript interfaces (moved verbatim from the client, doc
comments kept) plus every shared limit and constant; the package is
buildless and zero-dependency. zod exists only in `server/`, and the
create schema is pinned with
`createActivityRequestSchema satisfies z.ZodType<CreateActivityRequest>`
— any drift between schema and contract is a compile error. The client
keeps its friendly per-field form validation and never imports zod. The
packages carry scoped names `@chaverola/{client,server,shared}`, which
lets Vercel skip builds that don't affect the client.

**Why:** Founder call. Generating types from zod schemas would make zod
the contract's source of truth and pull it toward the client bundle;
handwritten interfaces stay readable, keep their doc comments, and the
`satisfies` pin buys the same drift protection generation would.
pnpm's strict `node_modules` keeps zod structurally unreachable from
the client, so the boundary can't erode by accident.

_Implemented in [shared/src/](../../shared/src/) and
[schemas/activity.ts](../../server/src/schemas/activity.ts)._

### Rate limits assume a whole school behind one IP, and join-code enumeration is accepted

_2026-07-17_

**Decision:** Every per-IP limit is sized from one assumption: a school
NAT can put **20 simultaneous classes × 30 students = 600 users on one
IP**. So: `POST /activities` at 60 per 15 minutes (20 teachers starting
class at once, ×3 headroom); GET lookups (the joinCode and hostKey
routes share one limiter) at 1,200 per 5 minutes (600 students × ~2
lookups in a join burst, ×2 headroom). Known residual exposure: one IP
can sweep all 9,000 codes in ~37 minutes — accepted, because the
student projection is public-by-assumption (join code, host name,
characters, scenario: what's on the classroom board anyway), while
`teacherEmail`, `settings`, and the hostKey are never in it. 429s reuse
the shared error envelope with code `capacity` — the `ApiErrorCode`
union has no rate-limit member on purpose (the client treats every
non-2xx the same), and the 429-vs-503 status keeps the two capacity
cases distinguishable.

**Why:** Founder call on the scale assumption (2026-07-17). Sizing per
IP without it would lock out exactly the customer the product wants — a
school where many classes join at once. The enumeration exposure is
handled by making the enumerable data safe rather than the enumeration
impossible: the projection leaks nothing sensitive, and enumeration
can't even keep activities alive (student lookups never refresh the
TTL).

_Sizing math commented in [app.ts](../../server/src/app.ts); the privacy
allowlist is pinned by
[projections.test.ts](../../server/src/store/projections.test.ts)._

### Create is not idempotent in v1: a lost response can orphan one activity

_2026-07-17_

**Decision:** `POST /activities` carries no idempotency key. If the
response is lost after the server processed the create (say, a
connection drop during a cold start), a retry mints a second activity;
the first sits unused until the 12-hour TTL reaps it. Accepted for v1.
The client's half of the bargain (landed with feature-1 Prompt 6): the
submit stays disabled until the request settles — no short client-side
timeout that would invite an automatic retry.

**Why:** Founder call. Idempotency machinery (client-minted keys, a
dedup window in the store) is real complexity, and the worst case here
is one orphaned in-memory record that expires on its own — nothing
leaks, and with a 4,000 cap against 8,999 codes an orphan can't
meaningfully crowd anyone out.

_The client half is implemented in
[ActivitySetupForm](../../client/src/components/Teacher/ActivitySetup/index.tsx)._

### Transcripts wait: feature 1 only stores the teacher's email

_2026-07-17_

**Decision:** The optional `teacherEmail` collected at setup is stored
(and exposed only in the host projection) but nothing is sent yet.
Transcript email ships in a later feature via **Nodemailer + a Gmail
app password** as a stopgap, isolated behind a single send module so
swapping to a real provider (Resend or similar) touches one file.

**Why:** Founder call. Collecting the email now costs one optional
field and means the send feature works for teachers from day one of
_its_ launch; building sending now would block feature 1 on deliverability
plumbing. The Gmail stopgap is free and fine at MVP volume — the
one-module isolation is what keeps it disposable.

_Storage in [activityStore.ts](../../server/src/store/activityStore.ts);
host-only exposure pinned by
[projections.test.ts](../../server/src/store/projections.test.ts)._

_Update (2026-07-23): the send half is being built. Feature 11 prompt 2
landed the mailer and formatter (see
[The transcript mailer](#the-transcript-mailer-gmail-smtp-behind-one-module-log-only-without-credentials)),
still invisible — nothing sends until prompt 3 wires the End activity button.
Full supersede lands with that send._

### Considered and rejected for the backend: TanStack Query, dotenv, a hostKey stash, an npm conversion

_2026-07-17_

**Decision:** Recorded so they aren't re-litigated (founder calls,
2026-07-17):

1. **TanStack Query** — the client will make three fetch calls; the
   lean-deps rule wins. A hand-rolled typed `api.ts` is the whole layer.
2. **dotenv** — dev needs zero env vars (port defaults to 3001, CORS
   defaults to localhost) and Render injects prod env, so there is
   nothing for it to load.
3. **A localStorage hostKey stash** for lost-URL recovery — on a shared
   classroom computer it would hand the next user the teacher view.
   `teacherEmail` is the future recovery channel.
4. **Converting the workspace to npm** — the repo is already pnpm
   workspaces; a conversion is churn with no benefit, and pnpm's strict
   `node_modules` is load-bearing for the zod boundary.

**Why:** Each rejection is the same shape: the alternative solves a
problem this repo doesn't have yet, at the cost of a dependency, a
secret-handling surface, or a privacy hole it would have to carry
forever.
