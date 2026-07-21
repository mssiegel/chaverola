# AGENTS.md

This file is the canonical source of guidance for all AI agents (Claude Code, Cursor, Copilot, etc.) working in this repository. Read this first. Do not create a separate `CLAUDE.md`, `.cursorrules`, or equivalent — keep agent instructions consolidated here.

## Status

Every UI surface is built and lives in its real flow (demo URLs exist but
only as redirects). `server/` is a real Express 5 API implementing the
create-and-join contract plus the live-lobby and matching socket contract
([docs/api.md](docs/api.md)) — live at `https://api.chaverola.com`
(Render, free tier), and **both sides of the client call it**: students
resolve real codes through `GET /activities/:joinCode`, teachers create
activities with `POST /activities` and host them at
`/activity/host/:hostKey`. The demo code `1234` stays fully
client-simulated, zero network. Feature 1 is **complete** — verified end
to end on production 2026-07-19
([docs/plans/feature-1-create-and-join.md](docs/plans/feature-1-create-and-join.md)).
Feature 2 is **complete** — verified end to end on production 2026-07-19
([docs/plans/feature-2-live-lobby.md](docs/plans/feature-2-live-lobby.md)):
**the waiting queue is real over Socket.IO** — students in a real lobby
hold live, resumable seats, and the teacher's host page renders the queue
live with Remove acting on the real world. The prod pass covered the
reconnect gauntlet, duplicate-tab takeover, and the restart story (a live
`render restart` ended the class honestly and `io.close()` exited clean
with open sockets); a cellular pass on a physical handset is the one gap
left to the founder's own device. Feature 3 — **real matching** — is
built and green locally 2026-07-20
([docs/plans/feature-3-real-matching.md](docs/plans/feature-3-real-matching.md)):
the host page's pairing rail seats real students, "Pair everyone 1:1"
and server-run auto-match act on the real queue, live cards track real
chats, settings edits sync, and a matched student's phone moves into a
real chat room. Feature 3 is **complete** — verified end to end on
production 2026-07-20: 282 scripted assertions across manual pairing,
trios and the leftover case, teacher-gated auto-match (including the
closed-laptop hold and resume), settings sync across two host devices,
mid-chat drops and resumes, and the demo's zero-network sweep.

**The handset leg earned its keep.** A real phone on cellular found what
every scripted leg missed: a student who left mid-chat while their socket
was down stranded their partner in a dead room permanently. Fixed on both
sides and re-verified (see DECISIONS.md → "A matched seat gets the same 2
minutes as any other"). Keep sending real features to a real phone —
headless Chrome on broadband never actually loses its connection, so it
cannot test what a user does while offline. When you ask for a handset run
and it can't happen then, record it in
[docs/pending-manual-tests.md](docs/pending-manual-tests.md) rather than
letting the ask evaporate.

**Messaging is landing, slice by slice** —
[docs/plans/feature-4-messaging.md](docs/plans/feature-4-messaging.md),
the first feature cut as end-to-end slices rather than layers. Two code
slices are live: **students in a real chat send each other messages**
(`chat:send` → targeted `chat:line`, a capped 200-line in-memory
transcript, resume re-delivering the backlog through
`chat:started.lines`), and **the teacher reads every chat live with
real names attached** — each `chat:send` also emits
`chat:transcript-line` to the teacher room (the one delta on the
teacher wire; `chats:snapshot` carries the whole transcript in
`ChatSnapshot.messages`, so a dropped delta heals and a refresh
restores every card). Feature 5 made the **typing indicator real**:
a student's `chat:typing` heartbeat relays as `chat:peer-typing` to
their peers — ephemeral, characterId-only, volatile both ways, TTL
expiry, and deliberately never to the teacher (see DECISIONS.md →
"Chat behavior", the three 2026-07-21 entries). Feature 6 made
**ending real**: "End chat" and "End all chats" work on live
activities (`chat:end` / `chats:end-all` → the server ends the chat,
every member goes wrappingUp and hears `chat:ended`, the card moves
to Completed). Feature 7 made **pausing real**: "Pause all chats" /
Resume flip the world-level pause (`chats:pause-all` /
`chats:resume-all` → sends and typing refuse, auto-match holds, wait
and chat clocks freeze at the anchor and shift on resume, and every
connected student hears `activity:paused` — the frozen room, the
lobby's paused pill). The 120s disconnect grace deliberately runs
THROUGH a pause (founder call, 2026-07-21). Feature 8's first slice
made the **peer-drop banner real**
([docs/plans/feature-8-peer-drop.md](docs/plans/feature-8-peer-drop.md)):
a chat partner's drop reaches the other members as
`chat:peer-connection` on the teacher's own 4s gate, the banner counts
down the remaining grace (ticking through a pause — the grace does),
and a resume flashes "is back! 🎉" — no spinner phase, ever. Its
second slice made **expiry honest**: a 1:1 ended by a partner's
expired grace says so on the wire (`chat:ended` reason
`"peer-timeout"` → the survivor's 🔌 "Your partner lost connection"
wrap-up, riding the resume re-delivery too), and a group's survivors
read "X couldn't get back in and left the chat" — a client heuristic
off the offline map, no reason on the wire. Its third slice made **a
blip unable to hide a drop**: `chat:started` carries the offline peers
(`reconnectingPeers`, authoritative on every delivery like `lines`),
so a wifi blip that downs both students can't hide the partner's
countdown from the first one back. Its last slice aligned the demo:
the `1234` peer-drop simulation now plays the wire's story — no
spinner phase, the countdown ticks through a pause, and the window is
the shared `LOBBY_GRACE_SECONDS` (the demo's own mirror is gone).
What hasn't shipped: the auto-end clock and the name reveal still
render as honest placeholders on real activities (the demo still
simulates both).

The demo flows are a **permanent product surface** — the homepage links to
them and the founder pitches with them — not scaffolding; see the working
rule below. The map:

| Surface               | Route                                     | Where it lives                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage              | `/`                                       | `client/src/pages/HomePage.tsx` + `components/home/` — the hero chatbox and the teacher-view `ChatCard` mirror one live `useChatDemo` chat; demo section (`DemoSection.tsx`); founder's note with photo fallback                                                                                                                                                                              |
| Student join flow     | `/activity/join[/:joinCode]`              | `client/src/pages/student/JoinActivityPage.tsx` — code → name → lobby → chatting → ended, all on one URL; the real lobby's live seat is `useLobbyPresence.ts` beside it; `components/Student/ChatStage.tsx` owns the demo's chat stages (keyed per match) and `LiveChatStage.tsx` the real room                                                                                               |
| Teacher setup         | `/activity/create`                        | `client/src/components/Teacher/ActivitySetup/` — form UI; the caps, draft persistence, validation, and the `POST /activities` request mapping live in `client/src/lib/activitySetup.ts`                                                                                                                                                                                                       |
| Teacher live activity | `/activity/host/:hostKey`                 | `client/src/components/Teacher/HostActivity/` — the dashboard takes an injected `HostEngine` (`hostEngine.ts`): the demo engine `useHostActivityDemo.ts` + pure world model `hostWorld.ts` for `1234`, the live engine `useHostActivityLive.ts` (teacher socket) for real keys, which resolve via `lib/useHostedActivityLookup.ts`; live-edit draft model in `client/src/lib/hostActivity.ts` |
| Demo entry URLs       | `/demo`, `/demo/teacher`, `/demo/student` | Thin locale-aware redirects in `client/src/App.tsx` — teacher entries land on `/activity/host/1234`, the student entry on `/activity/join/1234` (name prefilled); never pages of their own (see DECISIONS.md → "Routes & app structure")                                                                                                                                                      |
| Not found             | `*`                                       | `client/src/pages/NotFoundPage.tsx`                                                                                                                                                                                                                                                                                                                                                           |

Load-bearing flow facts (the reasoning for each is in DECISIONS.md):

- The demo activity behind join code `1234` seeds everything
  (`client/src/mockData/`); `/activity/host/1234` hosts the Rome demo (no
  teacher email, on purpose). Everything else is strictly real: join codes
  resolve through `lib/useActivityLookup.ts` and host keys through
  `lib/useHostedActivityLookup.ts` — `1234` synchronously from mock data
  (the demo works offline forever), the rest over the API via
  `lib/api.ts`, with `not-found` and `unreachable` as distinct render
  states (the host page's unreachable screen has a retry). The server is
  the only join-code issuer; an unknown host link gets a friendly
  not-found, never the old demo redirect. Real lobbies and host pages
  show no demo furniture, and no client ever pairs anyone by itself — the
  demo lobby's 20s auto-pair is simulation; on real activities pairing is
  the server's job. Two teacher-side gotchas: the create submit
  deliberately has **no client-side timeout** (create isn't idempotent —
  a retry could mint a second activity), and live edits on a real
  activity split by kind — **settings sync** (every commit that changes
  them emits `settings:update`, and the teacher's other devices hear
  `settings:changed`), while **character, scenario, and host-name edits
  stay local-only** until roster sync ships, because those would have to
  reach students' lobbies (founder call; a refresh reverts them — see
  DECISIONS.md).
- The live lobby and matching (features 2 and 3): sockets connect at
  lobby entry (student, `pages/student/useLobbyPresence.ts` — which now
  stays mounted through the chat and ended stages, not just the lobby)
  and host-page resolve (teacher,
  `HostActivity/useHostActivityLive.ts`), both through the factory in
  `lib/socket.ts` (`autoConnect: false`, auth callback — the demo stays
  structurally zero-network). A dropped student **in the queue** keeps
  their seat for 2 minutes, marked "lost connection" and fully
  unmatchable; detection is the ping cycle (~45s — a latency, not a bug),
  and only in-app exits (back-as-reset, sign-out, teacher remove) drop
  the seat instantly — closing the tab or leaving the site rides the
  grace window by design (DECISIONS.md).
- Invariants worth tripping over, all of them load-bearing:
  - **The live engine imports nothing from `hostWorld.ts` beyond types.**
    `tickWorld` runs the SIMULATION's auto-match and must never see a
    real student. Where the live engine needs the same derivation, it
    keeps a deliberate local copy.
  - **Every seat gets the same 120s grace, matched or waiting — and a
    matched seat that runs it out leaves its CHAT, not just its seat.**
    A student who drops mid-chat can resume into that chat for two
    minutes; past that, their membership goes inactive and the partner
    is freed. Matched seats used to arm no timer at all, which stranded
    a partner forever when a `lobby:leave` died in transit (found on a
    real handset 2026-07-20). Don't "restore" the missing timer.
  - **Auto-match runs only while a teacher socket is connected** —
    armed on the 0→1st, released on the last. A closed laptop holding
    pairing is the product, not a bug (founder call).
  - **The student wire carries characterIds only** — never a peer's
    name, never a peer's studentId, in any payload, ever. Pinned by
    exact-key allowlist tests in `projections.test.ts`; keep them
    passing rather than loosening them.
  - **`pausedAt` is both the pause flag and the freeze anchor.** While
    set, snapshots clock `waitSeconds`/`elapsedSeconds` against it (but
    reconnecting state keeps real time — the grace clock runs through a
    pause), and `resumeChats` shifts the stored timestamps forward by
    the pause duration so nothing jumps. Don't split it into a boolean
    plus a timestamp, and don't "fix" the grace window to freeze.
  - **Live socket timers never pass through `scaledMs`**; demo
    simulation always does.
- The student flow renders navbar-free inside `StudentWorldLayout` (purple
  world, drifting doodles, brand pill that swaps for the student's name badge
  mid-chat); everything else sits under `AppLayout`, whose logo also hides on
  the host route. Student identity is a sessionStorage session
  (`lib/studentSession.ts`); a **resolved** landing on code entry signs the
  student out (bare URL or a code the server said doesn't exist — never an
  in-flight lookup or an unreachable server, so a lobby refresh keeps the
  session), and browser back during a live chat asks first
  (`lib/useBackGuard.ts`).
- The chat-engine contract (`ChatRoomState`/`ChatRoomActions`) carries the
  2-minute peer-reconnect window and the per-chat auto-end clock (reason
  `"timer"` at zero, rendered by `chat/AutoEndCountdown.tsx` in the student
  header and on teacher chat cards). A 1:1 reconnect timeout ends the chat;
  a group timeout drops the peer with a notice instead. The
  **peer-reconnect window is real since feature 8**: the page feeds an
  offline map from the `chat:peer-connection` wire (rebuilt wholesale
  from `chat:started`'s `reconnectingPeers` backlog on every resume) and
  `Student/LiveChatStage.tsx` derives `peerState` / `offlinePeerId` /
  `reconnectSecondsLeft` from it, ticking on plain real time (never
  `scaledMs`). The **auto-end clock stays demo behavior only** —
  `autoEndSecondsLeft: null` on real rooms, because no clock runs
  server-side; its own later slice, not a leftover. `typingPeerId` has
  been real since feature 5 (`chat:peer-typing`, the page owns the slot
  and its TTL expiry). `LiveChatStage` stays a component split beside the
  demo's `ChatStage.tsx` — never a conditional hook.
- The setup form and the host page's live settings panel share their field
  components and validation; live edits propagate on a 1-second pause,
  last-valid-wins, with stable character ids (`lib/hostActivity.ts`).
- Demo surfaces are marked and steerable: a golden `DemoBanner` ("the
  students are pretend") shows whenever the activity is the `1234` demo —
  sticky under the navbar on the host page (where HostHeader's condensed
  waiting bar stands down), a solid card pinned below the corner pills in
  the student world — and the
  "You're driving this demo" panels are permanent, teacher-facing demo
  furniture. Student-demo entries land on `/activity/join/1234` with the
  name prefilled (`DEMO_STUDENT_NAME`, "Rachel"). The demo lobby auto-pairs
  after ~20s if no demo button is pressed (`JoinActivityPage.tsx`).
- Setup-page layout gotcha: the form grid must NOT get `items-start`, or the
  sticky `LobbyPreview` rail loses its track (there's a code comment on it).

## Project Brief

The full project brief (what Chaverola is, scope, tech stack, canonical routes, branding, and chatbox conventions) lives in [Shared_Project_Context.md](Shared_Project_Context.md). Read it before doing any work — it is the shared source of truth for the project's requirements.

## Documentation

The living docs are [README.md](README.md), this file, [DECISIONS.md](DECISIONS.md), [Shared_Project_Context.md](Shared_Project_Context.md), and the technical docs under [docs/](docs/) — [docs/architecture.md](docs/architecture.md) (packages, request flow, deploy topology, the in-memory lifecycle) and [docs/api.md](docs/api.md) (the canonical API contract, kept current per feature), plus [docs/pending-manual-tests.md](docs/pending-manual-tests.md) — manual tests that were asked for and blocked, kept so they can be picked up later instead of quietly disappearing. Keep them all in sync with the code before considering a change complete. Feature plans live in [docs/plans/](docs/plans/). (`PROJECT_DOCUMENTATION_STANDARD.md` was retired 2026-07-18 — founder call; see DECISIONS.md.)

## Project Overview

Chaverola is a fun, game-like classroom chat activity. Students join with a
code, get a character, and roleplay with peers without knowing who's who;
teachers create activities and can reveal names. The client is a React app
where every screen is currently driven by mock data + demo events — nothing
is a dead end; the server is an Express API being wired in feature by
feature. Primary stack: **React 19, TypeScript, Vite, Tailwind v4, ShadCN,
Express 5, pnpm workspaces.**

## Commands

Run from the repo root:

- **Dev:** `pnpm dev` — client (Vite) and server (tsx watch, port 3001) in
  parallel; `pnpm dev:client` / `pnpm dev:server` run one side alone
- **Build:** `pnpm build` — type-check + production build (client; the
  server has no build — tsx runs its source, and `typecheck` is its gate)
- **Typecheck:** `pnpm typecheck` — `pnpm -r typecheck` across all three
  packages
- **Lint:** `pnpm lint` — ESLint 9 flat configs in `client/` and
  `server/`, including the React Hooks + React Compiler lints (client)
- **Test:** `pnpm test` — `pnpm -r test`: the client suite
  (`client/vitest.config.ts`, plain node environment over the pure logic
  layer) plus the server suite (`server/src/**/*.test.ts` — the safety
  invariants: projection privacy, REST and socket payloads alike, now
  including the characterIds-only pin on the student chat wire; the
  hostKey boundary in both its REST and socket editions; the `1234`
  reservation; a student socket being ignored on every teacher command;
  the seat-resume `currentSocketId` race guard; and the one lifecycle
  rule that would silently strand real students — a matched seat's drop
  arming the grace timer, with a resume re-delivering `chat:started`
  (`live/lobby.test.ts` — which also pins the message cap's code-point
  unit, the teacher transcript's room boundary: real names never
  reach a student socket, and the typing relay's boundary:
  `chat:peer-typing` reaches the other chat members only, never the
  sender or the teacher). `live/matching.test.ts` covers the pure
  pairing and transcript rules a browser pass can't cheaply pin). Both
  suites are deliberately
  small; see DECISIONS.md → "Testing stays small" entries before adding
  tests.
- **Preview:** `pnpm preview` — serve the production build
- **Format:** `pnpm format` / `pnpm format:check` — Prettier over the whole repo.
  `prettier-plugin-tailwindcss` sorts Tailwind classes (including inside `cn()`/
  `cva()` calls) into canonical order — never hand-order class strings; run
  `pnpm format` and let it decide.

## Architecture

- **Monorepo:** three pnpm workspaces — `@chaverola/client` (the app),
  `@chaverola/server` (the Express 5 API), and `@chaverola/shared` (the
  wire contract: handwritten types + every shared limit/constant;
  buildless and zero-dependency — its `exports` points at source). The
  client and server both import `@chaverola/shared` and never each other.
  **zod lives in `server/` only**, pinned to the shared contract with
  `satisfies z.ZodType<CreateActivityRequest>` so schema/type drift is a
  compile error; the client keeps its friendly per-field form validation.
  Full picture in [docs/architecture.md](docs/architecture.md).
- **Routing** ([client/src/App.tsx](client/src/App.tsx)): the canonical route tree is
  defined once and mounted twice — at `/` and at `/he` (the Hebrew variant, same English
  text for now). Use [`LocaleLink`](client/src/components/layout/LocaleLink.tsx) and
  [`useLocalePath`](client/src/lib/locale.ts) for internal navigation so the active locale
  prefix is preserved.
- **Design tokens** ([client/src/index.css](client/src/index.css)): a single set of CSS
  variables ("Grape & Citrus") drives the theme via Tailwind v4 `@theme`. Character-name
  colors come from `--char-*` tokens, assigned **by speaking order** per room by
  [`assignCharacterColors`](client/src/lib/characterColor.ts) (or its
  `selfFirstCharacterColors` wrapper, which seeds the viewer's own character first): the
  student's own character is always green, the 2nd speaker golden, 3rd bluish, 4th
  purplish. See [DECISIONS.md](DECISIONS.md) for the rule and rationale. The brand-mark
  gradient (logo tile, ChaverolaPill, join button) is the `--brand-gradient-*` token
  pair; the SVG stops in `Logo.tsx`/`favicon.svg` are pinned mirrors of it.
- **Chatbox** ([client/src/components/Student/Chatbox/](client/src/components/Student/Chatbox/)):
  the shell (`index.tsx`) is **presentational** — driven entirely by props: the room
  as one `chat: ChatRoomState` object plus the action callbacks its parent mediates.
  The engine contract lives in [client/src/types/chat.ts](client/src/types/chat.ts)
  (`ChatRoomState` + `ChatRoomActions`); the mock "engine"
  ([client/src/components/chat/useChatDemo.ts](client/src/components/chat/useChatDemo.ts)
  — under `chat/` because the homepage hero uses it too) explicitly implements it
  (`ChatDemo extends ChatRoomState, ChatRoomActions` plus dev-only triggers), so
  swapping in a real data source later is a type-checked replacement, not a
  re-plumbing. The same chatbox conventions back the Teacher view.
- **Navbar ↔ homepage contract:** `HERO_JOIN_CTA_ID`
  ([client/src/lib/useHeroCtaPassed.ts](client/src/lib/useHeroCtaPassed.ts)) ties two
  files together — `HomePage` puts the id on the hero's Join CTA, and `AppLayout`
  watches that element to swap the mobile navbar mode.
- **Shared chat pieces** ([client/src/components/chat/](client/src/components/chat/)):
  the card chrome (`ChatFrame` / `CHAT_FRAME_CLASS`), the gradient "You're X … with Y"
  header (`ChatHeader`), the message-line renderer (`ConversationLines`), the
  conversation feed (`Conversation`, with `PeerIsTyping` and `PeerReconnectBanner`),
  the message input (`MessageComposer`, with `LazyEmojiPicker` /
  `EmojiPickerPopover` — also used by the setup form's emoji slots, always
  inside the `ui/popover` primitive), and the end-chat confirmation modal are
  shared by the student chatbox, the homepage hero chatbox, and the teacher
  chat cards
  ([client/src/components/Teacher/ChatCard/](client/src/components/Teacher/ChatCard/)).
  Character display labels come from
  [`characterLabel` / `peerListLabel`](client/src/lib/characterLabel.ts).
  Every confirmation step renders through
  [`ui/confirm-dialog`](client/src/components/ui/confirm-dialog.tsx) —
  `EndChatConfirmationModal` is a thin wrapper over it, and the host page's
  remove/end-all confirmations use it directly (copy in
  `Teacher/HostActivity/confirmCopy.ts`).
- **Demo-engine helpers** live in [client/src/lib/random.ts](client/src/lib/random.ts)
  (`nextId`, `randInt`, `randomFrom`, `shuffled`) — both engines import them;
  don't re-declare per-engine copies. The reserved notice sender id
  (`NOTICE_SENDER_ID`) lives in [client/src/types/chat.ts](client/src/types/chat.ts).
- **Mock data** lives only in [client/src/mockData/](client/src/mockData/). The demo join
  code `1234` always works.

## Conventions

- **Prettier** config lives at the repo root (`.prettierrc`); run `pnpm format` before
  committing. 2-space indent, double quotes, semicolons, 80-col, `es5` trailing commas.
- **Indexed access is checked** (`noUncheckedIndexedAccess`): `array[i]` /
  `record[key]` may be `undefined` — handle it, or assert with `!` plus a one-line
  comment stating why the access can't miss.
- **Path alias:** import app code via `@/…` (maps to `client/src/`).
- **ShadCN** primitives live in `client/src/components/ui/` (new-york style). Prefer adding
  components there over hand-rolling equivalents. They're owned code and may be
  customized: our `ui/badge.tsx` IS the rounded "eyebrow pill", not the stock ShadCN
  badge styling.
- **Demo furniture** lives in `client/src/components/demo/`
  (`DemoControlsPanel` — the dashed "You're driving this demo" panel — with
  `EventButton`, `DemoToggle`, `ChatDemoControls` — the student-seat trigger
  panel used by the join flow's chatting stage, with an `extraEvents` slot —
  and `DemoBanner`, the pretend-students banner). The panels also appear in the
  join-flow lobby and on the teacher host page. It is teacher-facing and
  permanent on the demo flows, NOT dev scaffolding (founder pitches use it);
  when a real backend arrives it leaves real activities only. The `onWorld`
  prop switches to the white/glass theme for the purple student world.
- **Accepted duplication** (deliberate — don't extract): the sticky-note captions on
  the homepage, the two numbered-step renderers (HomePage vs HowItWorksSection emit
  different markup), the page-section wrapper strings, the page-H1 strings, the
  ping/pulse "live" dots (different animations on different surfaces), and the
  seed-message id-stamping idiom in the two demo engines. Two or three short
  repetitions read cheaper than a component boundary; revisit any of these at a
  fourth occurrence.
- **Routes are canonical** — do not invent new ones beyond those in the project brief.
- **Shared vs. role-specific chat components:** anything more than one surface
  renders identically lives in [client/src/components/chat/](client/src/components/chat/)
  (shared chat types and the `ChatRoomState`/`ChatRoomActions` engine contract in
  [client/src/types/chat.ts](client/src/types/chat.ts), shared helpers like
  `assignCharacterColors` in [client/src/lib/](client/src/lib/)); each role's own
  chrome stays under `components/Student/` or `components/Teacher/` —
  `Student/Chatbox/` is down to the shell (`index.tsx`) and the student-only
  `ChatEndedSection`, since the homepage hero shares the feed and composer. This
  layout is a current convention, not a commitment — if you see a clearly better
  structure, reorganize at any time, then update this bullet (and any stale paths
  elsewhere in this file) to match.
- **Directory casing:** the role-chrome roots `components/Student/` and
  `components/Teacher/` are PascalCase; every other directory is lowercase. New
  directories should be lowercase. Don't case-rename the existing two: case-only
  renames misbehave in git on Windows, and TypeScript's casing checks already catch
  wrong-case imports.
- **Hooks have no dedicated directory:** a hook lives next to the components it
  drives (e.g. `components/chat/useChatDemo.ts`,
  `components/Teacher/HostActivity/useHostActivityDemo.ts` — whose pure
  simulation rules live beside it in `hostWorld.ts`);
  generic cross-cutting hooks live in `lib/` (`usePageTitle` — it prepends the
  "Chaverola | " brand prefix itself, callers pass just the page name —
  `useHeroCtaPassed`, `useBackGuard`, `useLatestRef` — the
  ref-mirrors-latest-value idiom for timer callbacks; don't hand-roll it —
  `useSecondCountdown`, `useWarmUpServer` — the fire-and-forget `/healthz`
  ping that wakes the free-tier server — `useActivityLookup`, and the hooks
  inside `locale.ts` / `studentSession.ts`). All API calls go through the
  typed fetch layer in `lib/api.ts` (failures are `ApiResult` values, not
  exceptions; `VITE_API_URL` bakes the base URL at build time — dev falls
  back to `localhost:3001`, a prod build without it fails at startup).
  All per-tab persistence goes through the sessionStorage helpers in
  `lib/storage.ts` (`readSessionJson`/`writeSessionJson`/`removeSessionItem`,
  plus the `isRecord`/`hasString` guards for the validate callbacks)
  — don't hand-roll try/catch JSON storage access.
- **React Compiler does the memoizing** — never hand-write `memo` /
  `useCallback` / `useMemo` (all removed 2026-07-11 at the product owner's
  request). The wiring is in `client/vite.config.ts`: `@vitejs/plugin-react`
  v6 runs the compiler as a Babel preset via `@rolldown/plugin-babel` (v6
  dropped the old `babel` option). The `react-hooks` `recommended-latest`
  lint enforces the Rules of React so the compiler can optimize; it bails on
  any component that breaks them — it caught refs written during render in
  `useChatDemo` (sync latest-value refs in a `useEffect`, or use
  `useLatestRef`). Confirm optimization is happening by grepping the build
  for `useMemoCache`. Relatedly, `typescript` stays pinned to `5.9.3` (not
  the native-preview 7.x) so the typescript-eslint parser can handle the
  code.
- **Dependency policy:** stay lean. Deliberately not added to the client
  (evaluated 2026-07-15): `zod` (revisited 2026-07-17 — it landed in
  `server/` only; the client's storage validators stay a few lines on
  shared guards), `react-hook-form` (the setup form is built and its UX
  rules are recorded), i18n libraries (no Hebrew text yet — extraction comes
  with the translation pass), `xstate` and debounce utilities (not enough
  repetition to buy a dependency). Also rejected for the server (2026-07-17):
  TanStack Query (three fetch calls) and dotenv (dev needs zero env vars;
  Render injects prod env) — see DECISIONS.md → "Backend & API".
- **`index.tsx` means folder-as-component** (`Student/Chatbox/`, `Teacher/ChatCard/`):
  one component whose private sub-parts share the folder. The only barrel file is
  `mockData/index.ts` — don't add new barrels.
- **Sticky inside a padded scroller:** Chrome insets `position: sticky`
  offsets by the scroll container's own padding, so a `sticky top-0` child
  rests below the container's clip line and scrolled content peeks through
  the gap above it. Keep the scroller's top padding at zero (move it onto
  the first child) so pinned elements sit flush — done for the host page's
  pairing rail (`Teacher/HostActivity/index.tsx`). The chat feed's
  pause/reconnect banner (`chat/Conversation.tsx`, `py-3` scroller) still
  carries the minor 12px version of this gap.
- **Mobile-first:** design and verify every screen at phone width.

## Working Rules for AI Agents

- **Cut features into end-to-end slices, not layers.** Each prompt in a plan
  doc is **one working thing** delivered all the way through — wire, server,
  client, docs, tests, and its own production pass — demonstrable on its own
  when it lands. Not a server prompt, then a client prompt, then a docs
  prompt. Docs are updated **inside the prompt that changes the behavior**,
  never deferred to a sweep at the end. A cross-cutting production hunt still
  earns its own final prompt: per-prompt verification proves each slice
  works, but it can't cover the seams between slices. Founder call
  (2026-07-20) — see DECISIONS.md → "Features ship as end-to-end slices, not
  layers", and [docs/plans/feature-4-messaging.md](docs/plans/feature-4-messaging.md)
  for the first worked example.
  - **The deploy race is the cost, and it has a rule.** A vertical slice
    touches `shared/` in one commit, and `shared/` is in BOTH deploy
    triggers (Vercel's Ignored Build Step and Render's build filter), so one
    push starts two pipelines that race. Client-lands-first means a UI
    talking to a server that has no handler yet — and Socket.IO drops an
    unhandled event **silently**, so there is no error anywhere. After
    pushing a slice, **poll `/healthz` for the new server commit before
    treating the feature as live or testing it**. Where a
    client-ahead-of-server window would actually hurt a real user, split the
    slice into a server commit and a client commit and **push them
    separately, waiting for `/healthz` between** — pushing both at once buys
    nothing, since one push is one deployment per side however many commits
    it carries. Layering used to buy this for free (feature 2: "Prompt 1
    before everything"); don't quietly go back to it.
  - **The tip commit of any push must touch `client/`, `shared/`, or a root
    manifest, or the client will not rebuild.** Vercel's skip check diffs
    only the TIP commit (`git diff --quiet HEAD^ HEAD -- . ../shared …`), not
    the range since the last deployment, and a push of N commits produces
    exactly one deployment. Render's filter diffs against the last DEPLOYED
    commit instead. So a code commit followed by a docs-only commit, pushed
    together, deploys the server and **silently skips the client** — not a
    race but a permanent split: new server, old client, indefinitely, green
    on both dashboards. Push the code commit on its own; a docs-only
    follow-up goes in its own push. `/healthz` does NOT catch this (the
    server commit is new and the check passes while the client is stale) —
    confirm Vercel's latest production deployment is Ready, not Canceled, for
    the SHA you expect. This config lives only in the Vercel dashboard;
    `client/vercel.json` has nothing but rewrites, so it is ungreppable from
    the repo.
- **Humanize all copy you write.** Any user-facing text you create or change — UI
  strings, button labels, empty states, mock chat messages, error/success copy — must be
  run through the **humanizer** skill ([blader/humanizer](https://github.com/blader/humanizer))
  before it's considered done, so nothing reads as AI-generated. Install it once with
  `npx skills add blader/humanizer` (or `/plugin marketplace add blader/humanizer` then
  `/plugin install humanizer@humanizer`), then invoke `/humanizer` on the drafted text.
  This does **not** apply to code, comments, or internal docs — only copy a user reads.
- **Record product/UX decisions.** When a choice is made about how the product behaves
  or why a screen works a certain way — especially anything non-obvious or that looks like
  a bug but is intentional — add it to [DECISIONS.md](DECISIONS.md) with its reasoning, so
  future agents don't "fix" it. Record the decision, not just the change.
- **The demo flows are product — every feature must show up in them.** The demo
  activity (join code `1234`, reached from the homepage demo section and the `/demo`
  redirect URLs) is a permanent sales surface: teachers self-serve it and the founder
  pitches with it. A user-facing feature is not done until it can be experienced in the
  demo flows. Because the demo renders the SAME components as the real flows, UI changes
  carry over for free; what's on you is the simulation — when a feature adds new
  behavior or data, extend the demo engines (`useChatDemo.ts`,
  `useHostActivityDemo.ts` + `hostWorld.ts`) and the `client/src/mockData/` fixtures so
  the demo actually demonstrates it. The `ChatRoomState`/`ChatRoomActions` contract
  type-checks the shape, but showing the feature in the demo story is a judgment call —
  make it. Never fork demo-specific pages or components; demo URLs stay thin redirects.
  Once `server/` is real, keep the split recorded in DECISIONS.md → "Demo flows & demo
  furniture": real activities strictly real, `1234` the only simulated one.
- **Record learnings in the repo, not in private memory.** Gotchas, verification
  techniques, and working knowledge worth keeping go in this file (or the relevant
  doc) so every future agent and tool sees them — never only in an assistant's own
  memory store. This is a product-owner preference.
- **Verify at the cheapest gate that catches the mistake.** Run
  `pnpm typecheck` on every change (incremental, seconds). Add `pnpm test`
  when logic in `client/src/lib/`, `hostWorld.ts`, or `server/src/live/`
  changed, or when anything else in `server/src/` changed (`pnpm -r test`
  covers the server suite). For server behavior beyond the tests' safety
  invariants, curl against `pnpm dev:server` is the next rung — and for
  socket behavior, which curl can't reach, scratch `socket.io-client`
  scripts driving a teacher and a couple of students (in the scratchpad,
  never the repo) beat opening four browser tabs. Drive the
  browser (the `verify` skill) only when the change shows up in rendered
  UI — and then only the surfaces the change touches, at desktop and phone
  widths, with fast timers on (`?fast=10` on a dev build; see the skill).
  A full every-surface sweep is for cross-cutting changes (layout shells,
  design tokens, shared chat pieces), not for localized ones.
- **Render free-tier spin-down is settled — never re-verify it by waiting.**
  Proven empirically 2026-07-19 (results recorded in
  [docs/plans/feature-2-live-lobby.md](docs/plans/feature-2-live-lobby.md)):
  a connected Socket.IO client's heartbeat keeps the service awake; spin-down
  happens 15 min after the last connection/request; Render's own platform
  health checks (`render-health-check: 1`) do NOT count as inbound traffic.
  Do not run multi-minute hold-and-wait checks against this again — they cost
  15–40 minutes and add no information (founder call, 2026-07-19). Treat the
  claim as established unless production contradicts it (a live class drops
  mid-session, or Render announces a policy change). Wake-after-spin-down UX
  is testable for free: the server is naturally asleep at the start of most
  work sessions, so check cold-start behavior opportunistically as the
  session's FIRST server contact — never by manufacturing a spin-down.
- **Verifying a style-neutral refactor:** run `pnpm build` before and after and
  compare the `dist/assets/index-*.css` filename hash — identical hash is byte-level
  proof no styling changed (used across the 2026-07-13 DRY refactor). If the hash
  changes unexpectedly, diff the two bundles rule-by-rule (split on `}`). Gotcha:
  Tailwind v4 scans **code comments and any text in `client/`** for class
  candidates, so a comment containing a bare utility word (e.g. the CSS
  filter/blur one) silently adds that dead rule to the bundle — reword the comment
  instead of accepting the bloat.

## Reading production logs

- **Vercel (client):** the Vercel CLI is installed and linked to the
  `chaverola` project — `vercel logs <deployment-url>` tails a deployment,
  `vercel ls` lists recent deployments (also the way to grab a real
  preview hostname, e.g. for the server's CORS regex).
- **Setting Vercel env vars — never from a PowerShell pipe.** Piping a
  value into `vercel env add` from PowerShell smuggled a UTF-8 BOM in
  front of `VITE_API_URL`; the baked URL lost its scheme, every prod API
  call resolved as a relative path on chaverola.com, and the demo kept
  working so nothing looked broken (caught by the feature-1 prod pass).
  Use Git Bash: `printf 'value' | vercel env add NAME production`. The
  project stores env vars as **sensitive** — `vercel env pull` returns
  them empty — so verify a value by grepping the deployed bundle, not by
  pulling. Since `4aa218a` the client also scrubs BOMs/whitespace and
  refuses a non-absolute URL at module init.
- **Render (server):** the Render CLI (`render.exe`, installed next to the
  Vercel CLI) reads `RENDER_API_KEY` from the environment — the key lives
  in the gitignored `.env.local` at the repo root. Load it, then query the
  service (`chaverola-api`, id `srv-d9ducu3bc2fs73esrr8g`):

  ```powershell
  $env:RENDER_API_KEY = (Get-Content .env.local |
    Select-String '^RENDER_API_KEY=').Line -replace '^RENDER_API_KEY=', ''
  render logs --resources srv-d9ducu3bc2fs73esrr8g --limit 50 -o text --confirm
  ```

  Add `--tail` to stream, `--text <substring>` to filter; `-o json` for
  structured entries (each line is the server's pino JSON). `render
services -o json --confirm` lists services; `render deploys list
srv-d9ducu3bc2fs73esrr8g -o json --confirm` shows deploy history. The
  active workspace is saved once per machine (`render workspace set
tea-d8f90l0g4nts738mebhg -o json --confirm` if it's ever missing). We
  chose the CLI over Render's hosted MCP server so the key stays in
  `.env.local` instead of inside agent config.
