# Feature 3 — Real matching

The demo's pairing rail becomes real: on `/activity/host/:hostKey` the teacher
taps 2–4 waiting students (or "Pair everyone 1:1", or lets server-side
auto-match do it) and a chat is born — characters dealt at random from the
roster, a live card in "Chats in progress", and each student's phone moving
from the waiting lobby into the chat room. **Messaging stays out** — it is the
next feature. No chat messages cross the wire; the student's composer, the
teacher's "End chat" / "End all chats" / "Pause all chats", and the auto-end
clock are honest placeholders. One structural exception (founder call): when a
chat's active membership would drop below 2 — the teacher removed someone, or
a student left — the chat ends for the remaining peer with reason
`"teacher"`, exactly as the demo does. The `1234` demo (teacher and student)
stays byte-identical and zero-network.

## How to use this document

Work through the prompts **in order, one prompt per agent session**. Each
prompt is sized for one session, ends green (typecheck + tests + its own
verification), gets **one commit straight to `main`**, and is safe to push on
its own. Ordering is load-bearing and different from feature 2: **the student
client ships before the teacher client**, and **auto-match arms only in
Prompt 3** — otherwise a deployed window exists where chats start (auto-match
is on by default) against student clients that can't render them, stranding
real students. Prompts 1 and 3 are server-touching pushes — every server
deploy wipes live classes, so **push them outside school hours**.

To run a prompt, tell the agent:

> Read `docs/plans/feature-3-real-matching.md` (all of it — the shared
> context sections apply to every prompt), read `AGENTS.md`, then do Prompt N.

When a prompt is done, tick its checkbox here (same commit).

- [x] Prompt 1 — Shared contract + server matching layer + tests (auto-match
      built but NOT armed)
- [x] Prompt 2 — Student client: the real chat room (dormant until Prompt 3)
- [x] Prompt 3 — Teacher client + arm auto-match (the feature completes)
- [x] Prompt 4 — Docs + stale-reference sweep
- [x] Prompt 5 — End-to-end production verification

Repo rules that apply to every prompt (details in `AGENTS.md`): run
`pnpm format` before committing; run every piece of new user-facing copy
through the **humanizer** skill; never hand-write `memo`/`useCallback`/
`useMemo` in the client (React Compiler does it); record newly-made decisions
in `DECISIONS.md`; verify at the cheapest gate that catches the mistake; a
user-facing feature must be experienceable in the demo flows (already true
here — the demo IS the spec).

---

## Shared context: design decisions (founder, 2026-07-19)

Recorded with full reasoning in DECISIONS.md (the feature-3 planning entries
dated 2026-07-19):

- **Ending is placeholder.** "End chat", "End all chats", "Pause all chats"
  render disabled with a short hint; the server never starts an auto-end
  clock. The one exception: active membership dropping below 2 ends the chat
  with reason `"teacher"` (demo semantics — `useHostActivityDemo`'s
  `removeFromChat`). The remaining peer gets the ended screen, taps back,
  rejoins the queue with a fresh wait clock; the card moves to "Completed
  chats".
- **Auto-match is real, server-run, gated on teacher presence.** The server
  pairs the two longest-waiting eligible students once both have waited
  `settings.autoMatchSeconds`, one pair per firing with a 3s gap
  (`AUTO_MATCH_GAP_SECONDS`) — but only while ≥1 teacher socket is connected
  for the activity. Teacher closes the laptop → auto-match holds; reconnect →
  eligible students pair again. (Founder: "as a teacher, if my laptop is
  closed I wouldn't expect students to still be getting matched.")
- **Mid-chat lifecycle: show drops, Remove works, nothing automatic.** A
  dropped chat member dims on the teacher's card ("lost connection", same 4s
  broadcast delay as queue rows) and recovers on reconnect. The participant ×
  does the quiet-exit remove (tombstone + `lobby:removed`; a 3+ group
  continues with a neutral notice, a duo ends per the exception above).
  **No 2-minute mid-chat reaping: a matched seat is never grace-reaped** —
  the student can resume into their chat until the activity dies. Students
  stay blind to peer drops this feature (the room is silent anyway;
  peer-reconnect UI ships with messaging).
- **All settings sync.** A teacher edit sends the full `ActivitySettings`
  over the socket; the server validates (zod) and replaces its copy, and
  echoes `settings:changed` to the teacher's _other_ devices (the panel's
  `mergeExternalSettings` absorbs it). This retires "settings edits are
  local-only" for settings ONLY — characters/scenario/hostName edits stay
  local-only. `revealNames`/`autoEndChats` stay inert server-side.
- **Ended-screen return stays a tap.** The remaining peer's seat goes
  `wrappingUp` — off the queue, unmatchable — until their "Back to the
  lobby" tap emits `lobby:back` (fresh wait clock). Auto-return would show
  the teacher a "waiting" student who's still reading the ended screen, and
  auto-match could pair them. (Mirrors the demo's `wrappingUp` and the
  recorded "end of chat requires a tap" decision.)
- **Student in-chat exit works and means leaving the activity.** The chatbox
  End/Leave pill opens a confirm that honestly says they'll leave the
  activity; confirming runs the same flow as browser-back (back-as-reset →
  `lobby:leave`). A duo partner's chat ends per the exception. No dead
  buttons in the room.
- **Students receive characterIds only.** `chat:started`/`chat:update` carry
  the student's own characterId and peers as characterIds — never names,
  never peer studentIds. Reveal-at-end is out of scope; the live ended
  screen shows a neutral line instead of a reveal.
- **Roster divergence clamps, never silently no-ops.** Character edits stay
  local-only, so a teacher's local roster can diverge from the server's.
  `chat:start` clamps to `min(4, server roster length)` eligible students;
  leftovers visibly stay in the queue. Teacher card labels resolve via
  `withCurrentCharacters` with the wire's server-roster `Character` as
  fallback.
- **No rematch memory server-side this feature.** Chats effectively never
  end, so `lastPartners` / exact-rematch / `rematchNotice` are structurally
  inert (a below-2 ending returns one student whose partners left the
  activity — exactness is impossible). The client stubs stay
  (`isExactRematch: () => false`); server pairing is greedy in queue order,
  behaviorally identical to the demo's rules with empty memory. Reconnecting
  students stay unmatchable (already recorded; the server now enforces it
  too).

## Shared context: the wire contract additions

In `shared/src/socket.ts`, documented in `docs/api.md` by Prompt 4. New
constant `AUTO_MATCH_GAP_SECONDS = 3` (comment: `hostWorld.ts` keeps the
demo's own copy — same precedent as `LOBBY_GRACE_SECONDS` vs
`RECONNECT_WINDOW_SECONDS`).

```ts
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

// ServerToClientEvents additions:
/** Teacher room; also emitted to a teacher socket the moment it joins. */
"chats:snapshot": (payload: {
  chats: ChatSnapshot[];
  leftoverStudentId: string | null; // pair-everyone's odd one out
}) => void;
/** Student only, targeted; re-sent on every resume while matched. */
"chat:started": (payload: {
  chatId: string;
  selfCharacterId: string;
  peers: ChatPeer[];
}) => void;
/** Student only: remaining ACTIVE peers after a membership change; the
 *  client diffs against what it had and renders a local notice. */
"chat:update": (payload: { chatId: string; peers: ChatPeer[] }) => void;
/** Student only, targeted; re-sent on resume while the seat is wrappingUp. */
"chat:ended": (payload: { reason: "teacher" }) => void;
/** Teacher room minus the sender — keeps a second host device coherent. */
"settings:changed": (payload: { settings: ActivitySettings }) => void;

// ClientToServerEvents additions:
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
```

`lobby:leave` gains documented mid-chat semantics: it drops chat membership
first (peer emits exactly like `chat:remove`'s, minus the tombstone), then
releases the seat.

## Shared context: the server matching model

New pure module `server/src/live/matching.ts` (io-free, mirroring
`seats.ts`'s charter; unit-tested like `hostWorld.test.ts`). Chats hang off
`StoredActivity` (`chats: StoredChat[]`, plus
`leftoverStudentId: string | null`, lazily nulled at snapshot build once that
seat stops waiting):

```ts
export interface StoredChat {
  id: string; // randomUUID
  members: { studentId: string; name: string; characterId: string }[];
  inactiveStudentIds: string[];
  startedAt: number;
  status: "active" | "ended";
  endReason: "teacher" | null;
}
```

Functions: `activeMembers(chat)`; `matchedStudentIds(activity)` (active
members of active chats); `eligibleWaiting(activity)` — the one matchable
pool: seats not matched, not wrappingUp, connected, in `joinedAt` order (this
enforces unmatchable-while-reconnecting server-side);
`createChat(activity, studentIds, now)` — filter to eligible, clamp to
`min(4, roster length)`, no-op under 2, deal the roster's FIRST N characters
via a local Fisher–Yates shuffle (write `shuffled` here — never import client
code), clear a consumed leftover; `planPairEveryone(activity)` — the demo's
`pairEveryoneIn` minus rematch memory (odd count → trailing trio when roster
≥3 characters, else newest joiner = leftover; rest chunk into adjacent pairs
in queue order); `findAutoMatchPair(activity, thresholdSeconds, now)` — first
two eligible past the threshold;
`markInactive(activity, chatId, studentId)` → `{ ended, chat }` (ended when
active members drop below 2).

Seat model changes (`seats.ts`): `Seat` gains `wrappingUp: boolean`; new
`markWrappingUp(seat)` and `returnToQueue(seat, now)` (clears the flag,
resets `joinedAt`); `toQueueEntries` gains an `exclude: ReadonlySet<string>`
parameter and skips wrappingUp seats (seats.ts stays chat-unaware — lobby.ts
supplies `matchedStudentIds`); `armDisconnectTimers` accepts
`graceMs: number | null` — `null` arms only the 4s broadcast-delay timer.
**A matched seat's disconnect arms NO grace timer** (the founder call above).
When a chat ends under an already-disconnected remaining member, a fresh 120s
grace is armed at chat-end — otherwise that seat would live untimed until
activity death, silently holding a cap slot. Matched and wrappingUp seats
count toward the 60-seat cap (they hold seats); tombstones still don't.

The auto-match timer (in `lobby.ts`): a module map
`joinCode → { timer, teacherCount, nextAt }`. Arm on the 0→1st teacher socket
(a 1000ms `.unref()`ed interval); clear on the last teacher disconnect and in
`onActivityRemoved`. **Everything else is read inside the tick** — the record
(via `getByJoinCode`, which never refreshes TTL), `settings.autoMatch`,
`settings.autoMatchSeconds`, eligibility, and `now < nextAt` — so settings
edits, seat changes, and manual pairing never touch the timer. One pair per
firing; `nextAt = now + AUTO_MATCH_GAP_SECONDS * 1000`.

Privacy rules — the projection tradition extends: every new payload is built
by an explicit field-by-field projector in `projections.ts` with exact-key
allowlist tests. The load-bearing pin: `chat:started`'s peers are exactly
`["characterId"]` — no names, no studentIds on the student wire. Students
still receive only targeted emits; teacher commands are registered on teacher
sockets only (the structural boundary).

---

## Prompt 1 — Shared contract + server matching layer + tests

**Goal:** the deployed server can create chats, track them, and end them
structurally — but nothing in production can trigger it yet (no client emits
the new events, and the auto-match interval is built but **not armed**).
Prod-safe on its own; still a server-touching push — **outside school hours**.

Read first: all three shared-context sections above,
`server/src/live/seats.ts`, `server/src/live/lobby.ts`,
`server/src/live/lobby.test.ts`, `server/src/store/activityStore.ts`,
`server/src/store/projections.ts` (+ its test),
`server/src/schemas/activity.ts`,
`client/src/components/Teacher/HostActivity/hostWorld.ts` (the reference
rules — read, never import).

1. `shared/src/socket.ts` — the contract additions above +
   `AUTO_MATCH_GAP_SECONDS`; export from the barrel.
2. `activityStore.ts` — `StoredActivity` gains `chats` and
   `leftoverStudentId` (initialized empty/null at creation).
3. `server/src/live/matching.ts` — the pure module per the shared context.
4. `seats.ts` — `wrappingUp`, `markWrappingUp`, `returnToQueue`, the
   `exclude` parameter, `armDisconnectTimers(graceMs: number | null)`.
5. `projections.ts` — `toChatSnapshot(chat, activity, now)` (per-member
   `reconnecting` uses the same rule as `toQueueEntry`; `elapsedSeconds`
   from `startedAt`; characters resolved from the server roster),
   `toChatStarted(chat, studentId)`, `toChatUpdate(chat, studentId)`,
   `toChatEnded(chat)`.
6. `schemas/activity.ts` — export the existing settings schema as
   `activitySettingsSchema` pinned `satisfies z.ZodType<ActivitySettings>`
   (it already validates bounds and the 5-step grid).
7. `lobby.ts` wiring:
   - `broadcastQueue` → `broadcastState(record)`: emits `queue:snapshot`
     (excluding matched + wrappingUp) AND `chats:snapshot` to the teacher
     room; used on every seat or chat change (snapshots over deltas).
   - Teacher handlers (teacher sockets only): on join, `chats:snapshot`
     beside the existing `queue:snapshot`. `chat:start` (shape-validate:
     array of 1–8 strings ≤200 chars → `createChat` → targeted
     `chat:started` to each seated member → broadcast).
     `match:pair-everyone` (`planPairEveryone` → `createChat` per group →
     targeted emits → store the leftover → broadcast). `chat:remove`
     (`markInactive`; tombstone + drop the seat via the queue-remove
     machinery, `lobby:removed` + disconnect if connected; chat ended →
     remaining members get `markWrappingUp` + `chat:ended` if connected, or
     a fresh 120s grace armed now if disconnected; chat continues →
     `chat:update` to remaining connected members; broadcast).
     `settings:update` (`activitySettingsSchema.safeParse` → replace
     `record.settings` + `socket.to(room).emit("settings:changed", …)`;
     invalid → log and ignore). Guard `queue:remove` to no-op on matched
     seats (a stale command must not tombstone a chat member without chat
     bookkeeping).
   - Student handlers: after `lobby:welcome`, an active chat member gets
     `chat:started` re-emitted (this IS resume-into-chat — refresh, wifi
     recovery, duplicate-tab takeover) and a wrappingUp seat gets
     `chat:ended` re-emitted. `lobby:leave` while matched → `markInactive`
     first (peer emits as in `chat:remove`, no tombstone), then the existing
     leave. `lobby:back` → `returnToQueue` if wrappingUp, else no-op.
     Disconnect while matched → mark + broadcast-delay only, **no grace
     timer**.
   - The auto-match interval per the shared context — **write the arm/clear
     functions but do not call the arming one** (a clearly-commented
     one-line call lands in Prompt 3). `onActivityRemoved` also clears the
     map entry.
8. Tests — **deliberately light** (the repo's rule, and the founder wants
   speed: test only what's essential — safety invariants and pure rules a
   browser pass can't cheaply pin):
   - `matching.test.ts` (pure, a handful of cases): createChat seats only
     eligible students (reconnecting/matched/wrappingUp filtered) and
     no-ops under 2; deals exactly the roster's first N characters, each
     once; planPairEveryone's odd-count branch (3+ characters → trailing
     trio; 2 characters → newest joiner leftover); markInactive below-2 →
     ended `"teacher"`.
   - `projections.test.ts` — the exact-key allowlists (the load-bearing
     privacy pins, same tradition as feature 2): `ChatSnapshot`;
     `ChatParticipant` → `["character", "id", "name"]` (never a token);
     `toChatStarted` → `["chatId", "peers", "selfCharacterId"]` with each
     peer exactly `["characterId"]` — no names, no studentIds on the
     student wire.
   - `lobby.test.ts` — three cases only: `chat:start` → both students get
     targeted `chat:started` and the queue snapshot excludes them (happy
     path + occupancy rule in one); a student socket emitting
     `chat:start`/`settings:update`/`chat:remove` is ignored (the boundary
     test, socket edition); a matched student's disconnect arms **no**
     grace timer (inspect `seat.timers.grace`, no waiting) and a resume
     re-delivers `chat:started` — the one lifecycle rule that would
     silently strand real students if it regressed.
   - Everything else — pair-everyone even counts, clamping, removals,
     `lobby:back`, settings echo, auto-match gating and timing,
     multi-device — is covered by the Prompt 2/3 browser passes and
     Prompt 5. **Do not add tests for them.**
9. Local smoke: `pnpm dev:server` + scratch node scripts (scratchpad, not
   the repo): a teacher script emitting `chat:start` / `match:pair-everyone`
   / `chat:remove` / `settings:update`, two student scripts — watch targeted
   `chat:started`s, snapshots, a duo removal's `chat:ended`, and
   `lobby:back` re-queueing.

**Done when:** `pnpm -r typecheck && pnpm -r test` green, local smoke passes,
`pnpm format`, commit **outside school hours**, tick the checkbox.

---

## Prompt 2 — Student client: the real chat room

**Goal:** a matched student's phone leaves the lobby for a real chat room —
read-only composer, honest exits, resumable across refresh and wifi blips.
Dormant in production on its own (nothing can start a chat until Prompt 3
arms auto-match and ships the teacher UI), which is exactly why this ships
before the teacher side.

Read first: `client/src/pages/student/JoinActivityPage.tsx` (all of it — the
stage machine, the match state, sign-out invariants, back-as-reset),
`client/src/pages/student/useLobbyPresence.ts`,
`client/src/components/Student/ChatStage.tsx`,
`client/src/components/Student/Chatbox/index.tsx` (+ `ChatHeader`,
`Conversation`, `ChatEndedSection`),
`client/src/components/chat/MessageComposer.tsx`,
`client/src/components/chat/useChatDemo.ts` (the `ChatRoomState` contract in
practice), `client/src/types/chat.ts`, `client/src/lib/characterLabel.ts`,
`client/src/lib/characterColor.ts`.

1. `useLobbyPresence.ts` — the hook stays active through the whole seated
   life of a real activity (lobby, chatting, and chat-ended stages), not
   just the lobby. Add `chat:started` / `chat:update` / `chat:ended` →
   `onChatStarted` / `onChatUpdate` / `onChatEnded` callback props (the
   `useLatestRef` idiom), and expose `returnToLobby()` emitting
   `lobby:back`. Cleanup semantics are already right: back-as-reset/sign-out
   still emit `lobby:leave` — which is now also the mid-chat
   intentional-leave path; refresh/pagehide still never do.
2. `JoinActivityPage.tsx` — `match` becomes a union: the existing demo shape
   or `{ kind: "live", chatId, self, peers, everPeers, notices }`.
   `onChatStarted`: resolve characterIds against the fetched activity roster
   (defensive fallback label if unresolvable); `Participant.id =
characterId` (unique within a chat), self gets `realName` from the
   session, peers get `realName: ""` — verified: nothing renders a peer's
   realName mid-chat. `onChatUpdate`: diff the previous peers → append a
   local `NOTICE_SENDER_ID` "left the chat" notice (via `characterLabel`)
   and shrink `peers` (`everPeers` keeps colors stable). `onChatEnded`: with
   a live match in memory → the ended state; with none (post-refresh, lobby
   on screen) → call `returnToLobby()` immediately — honest both ways. The
   removed flow also clears `match`.
3. New `components/Student/LiveChatStage.tsx` — a component split beside
   `ChatStage.tsx` (never a conditional hook). Builds a static
   `ChatRoomState`: `messages` = the notices, `typingPeerId: null`,
   `peerState: "connected"` (students stay blind to peer drops this
   feature), `autoEndSecondsLeft: null`, `isPaused: false`,
   `isEnded`/`endReason` from page state. Renders `Chatbox` with: the
   composer disabled via a new optional placeholder prop on
   `MessageComposer` (the current disabled copy is hardcoded for pause — the
   live line says chatting is coming; humanizer); a neutral ended-screen
   line instead of the name reveal (reveal is out of scope — don't claim
   "your teacher hasn't revealed names" when reveal doesn't exist); the
   End/Leave pill AND the back-guard confirm both routing to the
   leave-the-activity flow with honest live copy (humanizer) — confirming
   runs the existing back-as-reset (→ `lobby:leave`); the ended screen's
   back CTA → the page's live back flow (`returnToLobby()` + lobby stage).
4. Demo parity check: the demo student journey (`/activity/join/1234`, its
   20s auto-match, `ChatStage`, `useChatDemo`) is untouched.
5. All new copy through the humanizer skill.

**Done when:** typecheck/tests green; browser pass (verify skill, phone
width) against `pnpm dev` with a curl-created activity and the Prompt 1
scratch **teacher script** driving matches: `chat:start` on two joined
students → both land in the room (characters dealt, disabled composer, no
peer names anywhere); refresh mid-chat → resumes into the same chat;
DevTools-offline past 2 minutes → seat survives, reload resumes into the
chat; script duo-`chat:remove` → removed student lands on the name step with
the notice, the peer gets the ended screen and their back CTA re-queues them
(script sees the queue row reappear with a fresh clock); script trio remove →
the other two stay with a "left the chat" notice; browser back mid-chat →
confirm → leaves, the partner's chat ends; kill + restart the dev server
mid-chat → the ended/activity-gone screen. Demo journey: **zero**
`/socket.io/` traffic. `pnpm format`, commit, tick the checkbox.

---

## Prompt 3 — Teacher client + arm auto-match (the feature completes)

**Goal:** the host page's live branch becomes the demo's layout with real
behavior — the rail pairs real students, cards track real chats, settings
sync, and the one-line server change arms auto-match. Server-touching push —
**outside school hours**.

Read first: `client/src/components/Teacher/HostActivity/hostEngine.ts`,
`useHostActivityLive.ts`, `index.tsx` (the dashboard — both branches),
`PairingPanel.tsx`, `ChatsInProgressSection.tsx`,
`CompletedChatsSection.tsx`, `ChatCard/index.tsx` + `ChatCardHeader.tsx`,
`confirmCopy.ts`, `HostHeader.tsx`, `client/src/lib/hostActivity.ts`
(`withCurrentCharacters`, `mergeExternalSettings`),
`client/src/pages/teacher/HostActivityPage.tsx`, `LiveSettingsPanel.tsx`.

1. `hostEngine.ts` — `HostEngine` gains `updateSettings(settings)` and
   `endingEnabled: boolean` (demo: no-op / `true`; live: emit / `false` —
   flipping ending real later is an engine change, not a UI hunt).
2. `hostWorld.ts` — `HostedChat` gains **optional**
   `reconnectingStudentIds?: readonly string[]` and
   `elapsedSeconds?: number` (types only; zero demo behavior change; the
   demo engine adds the two new engine members as one-liners).
3. `useHostActivityLive.ts` — implement the stubs over the wire: subscribe
   `chats:snapshot` → map to `HostedChat` (`messages: []`,
   `autoEndSecondsLeft: null`, participants from the wire's server-roster
   `Character`); a local 1s tick advances `elapsedSeconds` (like
   `waitSeconds`; never `scaledMs`);
   `startChat`/`pairEveryone`/`removeFromChat`/`updateSettings` emit their
   events; `settings:changed` → an `onSettingsSync` callback prop; derive
   `chatsInProgress`, `completedChats`, `studentsChattingCount`,
   `characterIdsInUse`, `leftoverStudentId` from the snapshot.
   `endChat`/`endAllChats`/`pauseAllChats`/`resumeAllChats` stay no-ops;
   `isExactRematch: () => false` and `rematchNotice: null` stay. **The
   tripwire holds:** still nothing imported from `hostWorld.ts` beyond
   types.
4. `HostActivityPage.tsx` (`ConnectedHostActivityView`) — wrap
   `setActivity`: when `next.settings` differs, also call
   `engine.updateSettings(next.settings)` (one interception point catches
   the rail switch, End-all's auto-match hold, and the panel's commits);
   apply `onSettingsSync` via a functional settings merge (the panel's
   `mergeExternalSettings` folds it into open drafts). Update the now-stale
   "edits are local-only" comment block.
5. `index.tsx` — the live branch renders the demo's grid: sticky "Pair your
   students" rail with `pairing={true}`, `ChatsInProgressSection`,
   `CompletedChatsSection`; the reconnect banner + dim wraps the grid; no
   demo panel; thread `endingEnabled`.
6. Cards and sections: with `endingEnabled={false}`, "End all chats",
   "Pause all chats", and each card's "End chat" render disabled with a
   short hint (honest-placeholder pattern; humanizer). Live cards show an
   empty-transcript hint line while `messages.length === 0` (humanizer).
   Active members in `reconnectingStudentIds` dim with a "lost connection"
   tag (reuse the queue-row styling). A new tiny count-up timer component
   renders when `elapsedSeconds` is set (`AutoEndCountdown` stays
   demo-only). "Full chat" expansion already works client-side.
   `HostHeader`'s live copy can now make the pairing promise (drop/soften
   its `isDemo` gating; humanizer).
7. Server: the **one-line auto-match arming call** from Prompt 1, plus its
   clear on last-teacher-disconnect (already written — just wire the call
   sites).
8. All new copy through the humanizer skill.

**Done when:** typecheck/tests green; the full two-browser pass on
`pnpm dev` (teacher desktop + 4 student tabs at phone width, plus a real
phone if handy): tap two → "Start their chat" → both students land in rooms
and the card appears (names + characters, ticking count-up, empty-transcript
hint, disabled End chat); "Pair everyone 1:1" with 3 waiting + a 3-character
roster → a trio, with a 2-character roster → a pair + the "first in line"
tag; auto-match — 2 students past the threshold pair on their own, 4 waiting
pair ~3s apart, closing the teacher tab stops pairing and reopening resumes
it; DevTools-offline a chat member → the card member dims ~4s later (+
detection latency) and recovers; card × in a trio → the removed student hits
the name step, the others keep the room with the notice; card × in a duo →
the peer's ended screen → back CTA re-queues them and the card moves to
Completed; rail auto-match switch off → pairing stops; `autoMatchSeconds`
change applies; teacher refresh keeps edited settings; a second host device
sees the flip live (`settings:changed`) and both see identical snapshots;
`/activity/host/1234` byte-identical demo, zero `/socket.io/` traffic.
`pnpm format`, commit **outside school hours**, tick the checkbox.

---

## Prompt 4 — Docs + stale-reference sweep

**Goal:** the repo's documentation tells the truth about matching.

Read first: `docs/api.md`, `docs/architecture.md`, `AGENTS.md`, `README.md`,
DECISIONS.md → the 2026-07-19 feature-3 planning entries.

1. `docs/api.md` — extend the Socket events section: the new event maps and
   payload types, the privacy pins (students get characterIds only; teacher
   snapshots carry names), and the operational truths: auto-match is
   teacher-gated with the 3s gap; matched seats are never grace-reaped;
   wrappingUp + `lobby:back`; the below-2 ending; the clamp rule;
   `settings:update`/`settings:changed`.
2. `docs/architecture.md` — the realtime section grows the matching layer:
   `matching.ts` beside `seats.ts` (the pure/io-free split), chats on the
   activity record, `broadcastState`, the auto-match timer lifecycle, what
   remains simulated (messaging, ending, pause, reveal).
3. `AGENTS.md` — status: matching is real; messaging/ending/pause still
   placeholders. New tripwires/invariants: matched seats never grace-reap;
   auto-match arms only with a connected teacher; the student wire never
   carries names or peer studentIds; `endingEnabled` is the ending-era
   seam; the hostWorld tripwire unchanged.
4. `README.md` — anything stale.
5. DECISIONS.md — sweep the planning entries' "Planned in" lines to
   "Implemented in" links; add entries **only for anything newly decided
   during Prompts 1–3**; add _Update_ notes on the now-superseded entries
   ("chat sections hide entirely on real activities", "real host pages show
   an honest placeholder", "the live-settings panel edits the teacher's
   local view" — settings half is retired, characters/scenario/hostName
   half stands).
6. Stale-reference sweep: "matching and chat stay simulated" statements
   (AGENTS.md, code comments — `useHostActivityLive.ts`'s header,
   `HostActivityPage.tsx`'s local-only block, `shared/src/socket.ts`'s
   feature-3 note beside `LOBBY_GRACE_SECONDS`), and anything else Prompts
   1–3 invalidated.

**Done when:** `pnpm format:check` passes and every doc statement matches
the repo. Commit (docs-only, deploys nothing), tick the checkbox.

---

## Prompt 5 — End-to-end production verification

**Goal:** matching verified on chaverola.com with a real phone. Feature 1's
version of this caught a prod-breaking bug; treat it as a hunt.

1. Full pass on production (desktop teacher + a real phone on mobile data):
   create → host → join 3–4 students → tap-to-pair, Pair everyone (trio
   case if the roster allows), auto-match (including the
   teacher-closes-laptop hold and resume), a mid-chat wifi drop marking the
   card and recovering, duo × → ended screen → back-to-lobby re-queue, trio
   × → notice + room continues, student back-out mid-chat ending the
   partner's duo, settings flips syncing to a second host device, student
   refresh resuming into the chat.
2. The restart story: a server-touching push (or manual redeploy)
   **off-hours** while a chat is live → students in chats get the
   ended/activity-gone screen, the teacher falls back to not-found, a fresh
   activity works immediately.
3. Cold-start check opportunistically as the session's first server contact
   (never manufacture a spin-down).
4. Demo sweep: the whole demo journey (teacher + student) with the network
   tab open — **zero** `/socket.io/` traffic.
5. Sweep for stragglers: copy that skipped the humanizer, docs the pass
   invalidated, DECISIONS.md entries for anything decided during
   verification. Tick the final checkbox — matching is real.

**Done when:** everything above passes on production.

### Pass record — 2026-07-20

Scripted pass green: **282 assertions, zero failures**, against
chaverola.com on commit `192d127`. The scripts and the traps they paid for
are described in [the verify skill](../../.claude/skills/verify/SKILL.md);
they live in `%TEMP%\chaverola-verify\f3p5-*`.

- Manual pairing, card anatomy, the characterIds-only privacy pin, duo
  removal → ended screen → back-to-lobby re-queue, the 60s elapsed chip.
- Trios: the split, one removal (room survives at 2 active), a second
  removal (below 2 ends it), and the 2-character leftover case.
- Auto-match: teacher gating, the ≥3s gap (measured 3180ms), the
  closed-laptop hold and resume, the rail switch.
- Settings sync across two host devices, both directions, surviving a
  reload, with a behavioural proof the server received the update.
- Mid-chat drop → "lost connection" → resume; refresh-into-chat.
- Demo sweep: zero `/socket.io/` traffic, 44/44.
- The mid-chat leave race hammered over the transport matrix: the client's
  300ms flush delivered 20/20; a 0ms flush lost ~40% on websocket. The
  mitigation is load-bearing, not padding.

Item 3 (cold start) was **not exercisable** — the server was warm from the
Prompt 4 deploy nine minutes earlier, and the plan forbids manufacturing a
spin-down. Item 2 (the restart story) was deliberately skipped; the
reasoning is recorded in DECISIONS.md.

### The handset leg found a prod bug — 2026-07-20

The founder ran the cellular leg and it did what feature 1's pass did: it
broke something the scripts could not. With the phone's socket down (screen
lock, then airplane mode) the student tapped End; the `lobby:leave` died in
socket.io's send buffer, and because a matched seat armed no grace timer
nothing repaired it. The chat was still `active` seven minutes later with the
phone as a member and the partner stranded — it would have lived until the
12h TTL.

Fixed on both sides and verified on production:

- Server: every seat takes the same 120s grace, and a matched seat that runs
  it out leaves its **chat** as well as its seat. Measured independently with
  no client cooperation at all: a student who vanishes with no goodbye frees
  their partner **120.2s** after the drop.
- Client: a leave emitted on a down socket keeps the socket reconnecting to
  flush it, with the seat credentials frozen first (the sign-out that leaving
  performs would otherwise invalidate the reconnect).
- `f3p5-leave-offline-repro.mjs` reproduces the original failure and now
  passes 6/6; scripts A and C re-run clean afterwards (71/71, 31/31).

Recorded in DECISIONS.md →
[A matched seat gets the same 2 minutes as any other](../../DECISIONS.md).

**The confirming handset run was not performed** — the founder had no
cellular service available, and accepted the scripted verification instead
(2026-07-20). Worth knowing what that does and doesn't leave open. The
server half needs no client cooperation at all and was measured directly, so
it holds on any device. The client half was verified through CDP-simulated
offline rather than a real radio, and its mechanism (frozen auth, buffered
flush on reconnect) is not device-specific — but a headless browser still
cannot lose its connection the way a phone does, which is exactly how the
original bug hid. If the client half is ever silently broken, the symptom is
a partner freed in 120s instead of instantly, not a stranded one.

**The confirming handset run happened — 2026-07-23, passed.** Phone on
cellular (wifi off), a full minute in airplane mode so the socket genuinely
gave up, End tapped while still offline, then airplane mode off: the laptop
partner landed on the ended screen right away and the teacher's card moved
to Completed. The real-radio gap the two scripted halves left open is
closed; the queued entry in docs/pending-manual-tests.md is deleted.

**Deferred, deliberately:** the partner sees nothing while they wait out the
grace — the "lost connection" tag is teacher-only. That needs peer connection
state on `ChatPeer` (allowlist-pinned to `characterId` today) plus new copy,
so it is its own work rather than a rider on a safety fix.
