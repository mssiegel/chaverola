# Feature 4 — Messaging

The rooms matching creates stop being silent. A student types, and the message
lands: peers see it as a character, the teacher sees it with the real name
attached. **Ending, pausing, typing indicators, peer-drop UI, the auto-end
clock and the name reveal all stay out** — they are later features, and
`endingEnabled` stays `false` throughout. The `1234` demo (teacher and
student) stays byte-identical and zero-network.

This is also the first feature cut the **new way**, on the founder's call
(2026-07-20): each prompt is one working thing delivered end to end — wire,
server, client, docs, tests, and its own production pass — instead of a
server prompt, then a client prompt, then a docs prompt. Read
DECISIONS.md → "Features ship as end-to-end slices, not layers" before
planning the next feature; this document is the first example of the shape.

## How to use this document

Work through the prompts **in order, one prompt per agent session**. Each
prompt is sized for one session, ends green (typecheck + tests + its own
verification, now including a production pass), gets **one commit straight to
`main`**, and is safe to push on its own.

Ordering is load-bearing, and differently from features 2 and 3: those
shipped the server first because the clients needed a deployed socket server.
A vertical slice can't do that — it ships both halves in one commit — so the
deploy race is handled by a rule instead of an ordering (see "Shared context:
the deploy race" below). What the ordering here buys is **product** honesty,
not deploy safety: Prompt 2 leaves a window where students can type and the
teacher can't read, and that window is acceptable **only** because no real
classes are running on production between Prompts 2 and 3 (founder call,
2026-07-20). If that stops being true, Prompt 3 becomes urgent, not optional.

**Every prompt here is a server-touching push** — even Prompt 1, which
changes no behavior at all, because `server/**` is in Render's build filter.
Every server deploy wipes live classes, so **push all of them outside school
hours**. There is no client-only prompt in this feature to hide behind.

To run a prompt, tell the agent:

> Read `docs/plans/feature-4-messaging.md` (all of it — the shared context
> sections apply to every prompt), read `AGENTS.md`, then do Prompt N.

When a prompt is done, tick its checkbox here (same commit).

- [x] Prompt 1 — The handset fix's leftovers (cleanup; no behavior change)
- [ ] Prompt 2 — Students send each other messages (end to end)
- [ ] Prompt 3 — The teacher reads them (end to end)
- [ ] Prompt 4 — The cross-cutting production sweep

Repo rules that apply to every prompt (details in `AGENTS.md`): run
`pnpm format` before committing; run every piece of new user-facing copy
through the **humanizer** skill; never hand-write `memo`/`useCallback`/
`useMemo` in the client (React Compiler does it); record newly-made decisions
in `DECISIONS.md`; verify at the cheapest gate that catches the mistake.

One rule needs a note this time. "A user-facing feature is not done until it
can be experienced in the demo flows" is already satisfied on arrival:
`useChatDemo` has simulated the whole room — scripted lines, ambient chatter,
typing, replies — since before the server existed, and `ChatCard` already
renders demo transcripts with real names. **There is no demo work in this
feature.** The obligation inverts: make sure the demo engines aren't
accidentally touched, because the real path is finally catching up to what
they have been pretending all along.

---

## Shared context: design decisions (founder, 2026-07-20)

Recorded with full reasoning in DECISIONS.md (the feature-4 planning entries
dated 2026-07-20):

- **Teacher read-only transcripts ship with messaging, not after it.** The
  homepage's teacher bullet already promises that students only see each
  other's characters, "nobody is anonymous to the teacher, and anyone who
  gets out of line is identifiable". Teacher oversight is the product's
  entire moderation mechanism, so student messaging without it would leave
  that bullet untrue. It is a separate prompt only because each prompt has to
  be one working thing — not because it is optional.
- **No content filtering, ever, on the server.** Length cap and rate limit
  only; the server never inspects words. The teacher watching live with real
  names is the model and Remove is the discipline tool (already recorded:
  removing a student mid-chat is a quiet exit). A wordlist is trivially
  evaded, punishes false positives, would be English-only in a product that
  mirrors every route under `/he`, and would need a "your message didn't
  send" feedback path that no socket event has today.
- **Teachers still never send.** The teacher's chat card gains a transcript
  and nothing else — no composer. (Shared_Project_Context.md: teachers talk
  to the class verbally.)
- **A message is attributed by character on the student wire and by real name
  on the teacher wire.** Same split as `ChatPeer` vs `ChatParticipant`, for
  the same reason.
- **The transcript is capped and ephemeral.** 200 lines per chat, oldest
  dropped, in memory, wiped by every deploy like everything else. A class
  period is ~10 minutes of chat; nobody is building a message archive here.

## Shared context: the wire contract additions

In `shared/src/socket.ts`, documented in `docs/api.md` by the prompt that
adds each piece — **not by a later docs prompt.** New constants in
`shared/src/constants.ts`: `CHAT_MESSAGE_MAX_CHARS = 75` (moved off
`MessageComposer`'s local `MAX_CHARS`, so the composer can't accept what the
server rejects — the rule the setup form already follows) and
`CHAT_TRANSCRIPT_MAX_LINES = 200`.

```ts
/** Student-facing: the sender is a characterId, never a studentId and never
 *  a name — the same load-bearing pin as ChatPeer. */
export interface ChatLine {
  id: string;
  characterId: string;
  text: string;
  sentAt: number; // epoch ms, server clock
}

/** Teacher-only surface (room lobby:${joinCode}) — real names are fine here,
 *  exactly as on ChatParticipant. */
export interface ChatTranscriptLine {
  id: string;
  studentId: string;
  name: string;
  characterId: string;
  text: string;
  sentAt: number;
}

// ClientToServerEvents addition (Prompt 2):
/** Student only. Trimmed, capped at CHAT_MESSAGE_MAX_CHARS by code points,
 *  rate-limited. Every rejection is a silent no-op, like every other socket
 *  event — there is no error channel to a client today. */
"chat:send": (payload: { text: string }) => void;

// ServerToClientEvents additions:
/** Student only, targeted (Prompt 2). */
"chat:line": (payload: { chatId: string; line: ChatLine }) => void;
/** Teacher room (Prompt 3). */
"chat:transcript-line": (payload: {
  chatId: string;
  line: ChatTranscriptLine;
}) => void;
```

`chat:started` grows `lines: ChatLine[]` (the resume backlog) and
`everPeers: ChatPeer[]` (both Prompt 2 — see step 7 there, which is
load-bearing). `ChatSnapshot` grows `messages: ChatTranscriptLine[]`
(Prompt 3).

## Shared context: the deploy race

The one real cost of slicing vertically in this repo, and worth understanding
before the first code push rather than after.

A vertical slice touches `shared/` in a single commit, and `shared/` sits in
**both** deploy triggers: Vercel's Ignored Build Step lists `../shared`
(`docs/architecture.md`, Deploy topology) and Render's build filter includes
it. So one push starts two independent pipelines that race. If the client
lands first, students get a live composer talking to a server that has no
`chat:send` handler — and Socket.IO drops an unhandled event **silently**, so
messages vanish with no error anywhere.

Features 2 and 3 dodged this by shipping the server in its own earlier
prompt. Vertical slices give that up in exchange for every prompt being
demonstrable, so the safety comes back as a rule:

> **After pushing a slice, poll `/healthz` for the new server commit before
> treating the feature as live or testing it.**

And where a future slice's client-ahead-of-server window would actually hurt
a real user, split that slice into a server commit and a client commit and
**push them separately, waiting for `/healthz` in between**. Pushing both at
once buys nothing — one push is one deployment on each side regardless of how
many commits it carries.

**The worse hazard, and it is silent.** Vercel's skip check diffs only the
**tip commit** of a push (`git diff --quiet HEAD^ HEAD -- . ../shared …`),
not the range since the last deployment — and a push of N commits produces
exactly one deployment. Render's filter, by contrast, diffs against the last
**deployed** commit. So a code commit followed by a docs-only commit, pushed
together, deploys the server and **silently skips the client** — not a race
but a permanent split: new server, old client, indefinitely, with a
green-looking history on both dashboards and no error anywhere.

So: **the tip commit of any push must itself touch `client/`, `shared/`, or a
root manifest, or the client will not rebuild.** Push the code commit on its
own; a docs-only follow-up goes in its own push. Note that `/healthz` does
**not** catch this — the server commit is new and the check passes while the
client is stale. To confirm the client actually shipped, check that Vercel's
latest production deployment is Ready (not Canceled) for the expected SHA.

Worth knowing while you're here: this rule lives **only in the Vercel
dashboard**. `client/vercel.json` contains nothing but rewrites, so the
config is invisible to the repo and ungreppable. Moving it into an
`ignoreCommand` there — ideally range-correct via `VERCEL_GIT_PREVIOUS_SHA`
with a `HEAD^` fallback, defaulting to _build_ whenever it can't tell — would
retire the discipline entirely. That's its own small piece of work, not a
rider on this feature.

---

## Prompt 1 — The handset fix's leftovers

**Goal:** clear the stale grace-window documentation and dead code left by
the 2026-07-20 handset fix, so nobody works against a false model. **No
behavior change** — a pure cleanup, verified by both suites staying green
with zero test edits. Server-touching all the same (`server/**` is in
Render's filter), so push outside school hours.

This is a separate commit rather than a rider on Prompt 2 for a reason worth
keeping: this repo's commit titles are narrative, and a grace-timer fix
buried inside a commit titled for messaging is undiscoverable by anyone
bisecting a grace-timer regression. It would also date the fix to feature 4
when it belongs to feature 3's aftermath — and hide that feature 3's own doc
sweep missed it, which is a data point the new working style should be able
to point at rather than bury. The vertical-slice rule constrains _features_,
not the repo; a behavior-preserving cleanup passes its actual test, which is
"safe to push on its own".

1. `server/src/live/seats.ts` — the `armDisconnectTimers` docblock still says
   `graceMs: null` "arms only the broadcast-delay timer — a matched seat is
   never grace-reaped", the exact opposite of current behavior. Rewrite it
   for the uniform 120s grace. Keep the two accurate sentences (both timers
   re-check the drop is still current; both are unref'd so pending timers
   never hold the process open on SIGTERM).

2. `server/src/live/seats.ts` — narrow `graceMs: number | null` to `number`
   and delete the `if (graceMs === null) return;` early return. Both call
   sites pass `LOBBY_GRACE_SECONDS * 1000`, so the branch is unreachable.

3. `server/src/live/lobby.ts` — narrow `armSeatTimers`'s `graceMs` the same
   way.

4. `docs/api.md`'s "Timing truths" — the "Grace window — for waiting seats
   only" bullet says a seat in a chat "gets no such clock at all",
   contradicting the corrected text ~50 lines earlier in the same file.
   Retitle it for every seat, waiting or matched, and rewrite the body to
   agree. Keep the "starting at DETECTED disconnect" detail and the
   `reconnecting` marking.

5. `docs/architecture.md` — it describes `armDisconnectTimers` as taking a
   nullable grace where `null` "is how a matched seat survives untimed".
   Step 2 makes that newly false, so it has to move in the same commit.

**Out of scope, deliberately:** `docs/plans/feature-3-real-matching.md`'s
own text. Plans record what was planned; DECISIONS.md already carries the
superseded founder call. Don't rewrite plan history.

**Done when:** `pnpm typecheck` and `pnpm test` green with **no test file
edited** — that is the proof it's behavior-preserving. `pnpm format`, one
commit, checkbox ticked.

## Prompt 2 — Students send each other messages

**Goal:** a student types in a real chat and their peers see it, on
production. Server-touching — **push outside school hours**. Safe to ship
alone: the teacher simply can't read the room yet, which is acceptable while
no real classes are running (see "How to use this document").

Read first: `shared/src/socket.ts`, `shared/src/constants.ts`,
`server/src/live/lobby.ts`, `server/src/live/matching.ts`,
`server/src/store/projections.ts`, `server/src/store/projections.test.ts`,
`server/src/live/lobby.test.ts`, `client/src/pages/student/useLobbyPresence.ts`,
`client/src/pages/student/JoinActivityPage.tsx`,
`client/src/components/Student/LiveChatStage.tsx`,
`client/src/components/Student/Chatbox/index.tsx`,
`client/src/components/chat/MessageComposer.tsx`,
`client/src/components/chat/ConversationLines.tsx`.

1. **Shared.** The two constants and `ChatLine`, `chat:send`, `chat:line` as
   above. `chat:started` grows `lines` and `everPeers`.

2. **The store.** `StoredChat` grows `lines: StoredChatLine[]`, and the record
   stays lean: `{ id, studentId, text, sentAt }`. No `characterId`, no `name`
   — both already live on `chat.members`, which is everyone ever in the room
   and whose `name` is captured at chat start precisely so it survives
   removal. The projectors resolve through it with the same
   `find(...)!`-plus-comment idiom `toChatStarted` already uses, justified
   the same way: `appendLine` refuses a non-member, so the find can't miss.
   Store one truth rather than denormalizing it.

3. **`matching.ts`.** A new pure `appendLine` taking the activity, chat id,
   student id, text and `now`, per the module's io-free charter: it refuses a
   chat that isn't active, refuses a non-active member, mints the id, appends,
   and trims to `CHAT_TRANSCRIPT_MAX_LINES` (oldest dropped). Returns
   `{ chat, line }` or `undefined`. No io, no emits — that stays lobby.ts's
   job.

4. **`projections.ts`.** `toChatLine` — exactly `id`/`characterId`/`text`/
   `sentAt`, an explicit field-by-field literal like every other projector.
   `toChatStarted` gains `lines` and `everPeers`.

5. **`lobby.ts`.** The student `chat:send` handler, beside `lobby:back`.
   Trim; reject empty; reject over `CHAT_MESSAGE_MAX_CHARS` counted by code
   points (`Array.from(text).length` — matching the client's `charCount`, so
   a multi-unit emoji counts as one); rate-limit; `findActiveChatOf`;
   `appendLine`; then fan out targeted `chat:line` to each active member,
   reusing `sendChatStarted`'s loop shape. Every rejection is a silent
   `return`.

   **Rate limit:** the first unbounded student→server event in the system —
   Express's limiters provably don't reach sockets. A sliding window of
   **10 messages per 10 seconds**, loose enough that chained one-word
   messages never trip it and tight enough that a script gets nowhere. Keep
   its state in a plain `const sendTimes: number[] = []` inside the student
   connection closure, not on `StudentSocketData`: it dies with the socket,
   so there's no map to clean up and no way to leak one student's budget into
   another's.

6. **Student client.** `useLobbyPresence.ts` gains an `onChatLine` callback
   and its `socket.on` beside the other chat listeners, and returns a
   `sendChatMessage(text)` that emits off `socketRef.current` — a plain
   function exactly like `returnToLobby`. `JoinActivityPage.tsx`'s
   `LiveMatch.notices` becomes one `messages: ChatMessage[]`; incoming lines
   append with `senderId: line.characterId`, which works because characterId
   already doubles as the participant id there.

   **The resume path is the part that will bite you — read this twice.**
   `onChatStarted` currently short-circuits whenever the chatId is already in
   memory, handing off to `shrinkToPeers`, which spreads `...prev` and
   touches only `peers` and `notices`. If that stays, **`payload.lines` is
   silently discarded on every resume** — and the server re-emits
   `chat:started` on _every_ reconnect, not just a page reload: a lock
   screen, a wifi blip, a duplicate-tab takeover. Meanwhile the `chat:line`
   fan-out skips disconnected seats (it copies `sendChatStarted`'s
   `if (!seat?.connected) continue`), and Socket.IO has no
   `connectionStateRecovery` here. So the resume payload is the **only**
   channel by which a student who blinked gets the messages they missed.
   Left unfixed, A's phone locks for thirty seconds, B sends three lines, and
   A never sees them — ever. That is the difference between "students can
   send each other messages" and "students can send each other messages
   unless the network hiccups".

   So `chat:started`'s `lines` are authoritative on **both** branches:
   - Fresh: `messages` is `payload.lines` mapped through. The server's order
     is already correct and already capped.
   - Resume: append, in server order, every `payload.lines` entry whose id
     isn't already in `prev.messages` (dedupe by line id — the sender's own
     echoed line must not double), then run the membership reconciliation on
     the result.

   Also delete `shrinkToPeers`'s `if (gone.length === 0) return prev` fast
   path, or move the line merge outside it — otherwise a blip with no
   membership change skips the merge entirely.

   Merging lines _before_ reconciling membership gives correct ordering for
   free: backlog lines land first, and a "left the chat" notice discovered on
   the same resume lands after them, which is the true order of events.
   Local notices already in the list keep their position. No timestamp field
   on `ChatMessage`, no sorting with missing keys.

   (`onChatUpdate`'s equivalent short-circuit is fine as-is — `chat:update`
   carries no lines.)

7. **`everPeers` — and the one line that makes it worth having.** Server
   side, add `toChatEverPeers(chat, studentId)` projecting `chat.members`
   (**not** `activeMembers`) minus self, in seat order, to `{ characterId }`
   only. `peers` must stay `toChatPeers` so the live roster still shrinks on
   `chat:update`; `everPeers` is additive, never a replacement. Departed
   members stay in `chat.members` forever, so it's the refresh-invariant
   roster.

   Client side, `onChatStarted` must build `everPeers` from
   `payload.everPeers` — **not** aliased from `payload.peers` — on the fresh
   branch, and refresh it from the payload on the resume branch too. Miss
   that one line and the wire field ships unused with the bug still live.

   Why it matters: trio A/B/C, B leaves, A refreshes. `chat:started`'s
   `peers` is `[C]`, so without `everPeers` the client rebuilds participants
   as `[self, C]` — and `ConversationLines` drops every line whose sender it
   can't resolve, so all of B's backlog vanishes with no notice and no gap.
   Character colors shift too, since `selfFirstCharacterColors` is seeded
   from that same array.

8. **`LiveChatStage.tsx`.** Drop `composerDisabled` and its placeholder, feed
   `messages`, pass a real `onSend`. It is the only caller of those two
   props, so delete them from `ChatboxProps` rather than leaving dead API.

9. **Teacher copy this prompt makes untrue** — **three** surfaces, not two,
   all through the humanizer:

   - `ChatsInProgressSection.tsx`, the empty-transcript hint ("Nothing to
     read yet. Students can't type until messaging arrives in the next
     update.").
   - `ChatsInProgressSection.tsx`, the disabled-ending hint ("Ending and
     pausing come in the next update, along with messaging itself."). Ending
     is still disabled so the line still belongs — it just must stop
     promising messaging, which has arrived.
   - `CompletedChatsSection.tsx` — **the one that's easy to miss.** Ended
     chats are reachable today (the below-2 rule ends a duo whenever the
     teacher removes someone or a student leaves), and the section's copy
     says "Expand any card to reread it" and "you can always look back at
     what was said" while passing no `emptyHint` at all, so the card body is
     a blank box. That's honest while nobody can type. After this prompt the
     teacher opens a card full of nothing while the copy insists they can
     reread it. Fix the "reread it" promise, and add an optional
     `emptyHint?: string` prop passed through to `ChatCard` — the call site
     already has `engine.endingEnabled` in scope one block up. Give the ended
     card its **own** string; the in-progress sentence is doubly wrong there
     (they could type, and they're finished). Don't thread `endingEnabled`
     into that component — the name would be a misnomer in a section with no
     ending controls, and it invites the next reader to wire up an End button.

   Note the coupling while you're in `ChatsInProgressSection`: `emptyHint` is
   gated on `!endingEnabled`, a fair proxy while ending and messaging were
   one bundle and wrong now that they ship apart. Keep it honest here;
   Prompt 3 decouples it.

10. **Tests** — safety invariants only, per DECISIONS.md → "Server tests
    cover only the safety invariants". New: `appendLine` in
    `matching.test.ts` (appends; refuses non-members and ended chats; caps
    at the line limit), and the exact-key pin on `ChatLine` in
    `projections.test.ts`.

    **Four existing tests break, and two of them `vitest` will not catch.**
    Vitest strips types; `pnpm typecheck` runs `tsc --noEmit` over `src`,
    which includes the test files. So run both.

    - _Runtime:_ `projections.test.ts` pins `toChatStarted`'s top-level keys
      to an exact three-item list; this prompt adds two. Widen it to the new
      exact set — never loosen it into a subset check.
    - _Typecheck:_ the `fullChat: StoredChat` literal in
      `projections.test.ts` and the `activity.chats.push({...})` literal in
      `matching.test.ts` both go missing the new required `lines` field.
    - _Correctly unbroken:_ the `toChatSnapshot` allowlist, because
      `messages` is a Prompt 3 addition. That is the slice boundary holding
      on the server projection layer — a good sign, not an oversight.

    **Two traps in the fixture, both of which produce tests that pass while
    proving nothing:**

    - Don't give `fullChat` `lines: []` and then loop a per-line key
      assertion over it — the loop never runs, and the new privacy pin
      passes even if `toChatLine` leaks `studentId` and `name`. Populate one
      real line and `expect(started.lines).toHaveLength(1)` before the loop.
    - The fixture has two members and no inactive ones, so `peers` and
      `everPeers` project identically and wiring `everPeers` to
      `activeMembers` would pass. Add a third member listed in
      `inactiveStudentIds`, then assert `peers` has 1 and `everPeers` has 2.
      That fixture is shared — the `toChatSnapshot` participants count moves
      from 2 to 3 in the same edit, or give `toChatStarted` its own local
      fixture. Either way, don't ship the vacuous version.

    In `lobby.test.ts`, add **one** case — the file's header scopes it to
    safety invariants and one happy path, and says caps belong to the
    browser passes. The one worth pinning is the over-cap guard measured in
    **code points**: a message whose `.length` exceeds the cap but whose
    code-point count doesn't must land. That's a real regression class and
    cheap. Empty-after-trim and the targeted fan-out are visible in any
    browser pass; the rate limit needs 11 real socket emits for weak value —
    leave it to Prompt 4's hammer.

11. **Docs, in this prompt.** More than the obvious four — this is where the
    style earns its keep, so sweep properly rather than patching the headline
    sentence. Named claims that go from true to false the moment a student
    types:

    - `docs/api.md` — the header's "no chat message has ever crossed the
      wire"; the `chat:started` payload block; the `ClientToServerEvents`
      block (no `chat:send`); the resume, constants, and privacy sections;
      and **the socket-layer claim at the top of Socket events**, which says
      there are "no rate limiters (the seat cap below is the socket layer's
      own abuse guard)". Keep the engine.io-bypasses-Express framing — it's
      still true — but name all three guards now: the seat cap, the per-socket
      send rate limit, and the per-message character cap. That's the sentence
      a future agent reads before deciding whether socket abuse handling
      exists.
    - `server/src/live/lobby.ts`'s own file header repeats the "rate limiters
      never fire" claim. Highest priority of the lot: this prompt adds the
      limiter to that very file.
    - `docs/architecture.md` — **missing from the original list, and it
      carries the bluntest false sentence anywhere**: "nothing has ever typed
      into one", with "messages" leading its still-simulated list. Also add
      `chat:line` to its closed enumeration of student targeted emits.
      AGENTS.md names architecture.md as a living doc to keep in sync "before
      considering a change complete", so leaving it out contradicts the
      repo's own rule.
    - `AGENTS.md` — the "Messaging is the next feature" block; the
      **`endingEnabled` invariant**, which predicts "when messaging makes
      them real" and is disproved here (messaging ships, the flag stays
      `false`) — dangerous because it's filed under "Invariants worth
      tripping over"; and the **chat-engine contract bullet**, which asserts
      students are blind to peer drops "while the rooms are silent" and that
      the reconnect window and auto-end clock "activate with messaging".
      Replace the silence justification with the structural one (`ChatPeer`
      is allowlist-pinned to `characterId`, so peer connection state has no
      slot on the student wire) and say plainly that messaging shipped
      without them, on purpose.
    - `shared/src/socket.ts`'s `LOBBY_GRACE_SECONDS` docblock — "the mid-chat
      reconnect clock only becomes real with messaging".
    - `client/src/components/Teacher/HostActivity/index.tsx` — "render
      disabled until messaging ships" becomes "until ending ships".
    - `README.md`'s scope note.

    `DECISIONS.md`: this feature's founder calls are already recorded from
    the planning commit. What's owed here are the **supersede notes** on the
    entries scoped to expire with messaging — "Feature 3 makes matching real;
    messaging, ending, and pause stay placeholders", "An empty live
    transcript explains itself", and "Disabled ending controls share one hint
    line" (its quoted copy changes). Note too that "Leaving a live chat means
    leaving the activity (until messaging ships)" comes due but is
    **deliberately left open** — the server already ends a duo and continues
    a trio on `lobby:leave`; what's missing is a
    leave-the-chat-but-keep-your-seat path, which is its own slice. Say so in
    the entry rather than letting the "until messaging ships" clause quietly
    expire unaddressed.

**Done when:** `pnpm typecheck` and `pnpm test` green; a scratch
`socket.io-client` script driving a teacher and two students proves the fan-out,
the cap and the rate limit; a browser pass on two real student lobbies at
desktop and phone widths; **then a production pass with a real phone** —
messages both directions, a mid-chat refresh resuming with the backlog
intact, a peer leaving mid-conversation, and the cap and rate limit under a
deliberate hammer. Push, wait for `/healthz` to report the new server commit
before testing. `pnpm format`, one commit, checkbox ticked.

## Prompt 3 — The teacher reads them

**Goal:** the teacher's chat cards fill with live transcripts, each line
prefixed with the sender's real name. Server-touching — **push outside school
hours**. This is the prompt that makes the homepage's teacher bullet true
again.

Read first: this document's shared context, `shared/src/socket.ts`,
`server/src/store/projections.ts`, `server/src/live/lobby.ts`,
`client/src/components/Teacher/HostActivity/useHostActivityLive.ts`,
`client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx`,
`client/src/components/Teacher/ChatCard/index.tsx`.

1. **Shared.** `ChatTranscriptLine`, `chat:transcript-line`, and `messages`
   on `ChatSnapshot`.

2. **Server.** `toChatTranscriptLine` in `projections.ts` (resolving `name`
   and `characterId` off `chat.members`, same as Prompt 2's `toChatLine`) and
   `messages` on `toChatSnapshot`. The existing `chat:send` handler gains one
   emit to the teacher room. **No new storage** — Prompt 2 already keeps the
   transcript; this prompt only opens a second, richer projection of it.
   That seam is what makes these two prompts honest slices rather than one
   feature sawn in half.

3. **Teacher client.** `useHostActivityLive.ts` drops its hardcoded
   `messages: []` and maps the snapshot into the client `ChatMessage` shape.
   `senderId` is the **studentId** — what `toHostedChat` already keys
   participants by — and `ChatSnapshot.participants` is everyone ever in the
   room, so a removed student's lines still resolve rather than silently
   disappearing.

   `chat:transcript-line` deltas merge into the `chats` state. This is a
   deliberate deviation from the snapshots-over-deltas rule, for message
   lines only: a full `broadcastState` per message would be far too fat.
   It's safe because the snapshot **also** carries the transcript, so a
   dropped delta heals on the next seat change or reconnect instead of
   wedging a card — the delta is an optimization, never the only path.

4. **Copy.** Prompt 2's stopgap hints come out, replaced by real empty states
   (humanizer pass), and `emptyHint` is decoupled from `endingEnabled` —
   "no messages in this chat yet" is a legitimate empty state forever, not a
   feature-not-shipped notice. The disabled-ending hint stays, since ending
   is still disabled, but it should no longer mention messaging at all.

5. **Tests.** The teacher receives the line with the real name attached; and
   the pin that matters — a `ChatSnapshot`'s transcript reaches the teacher
   room only and never a student socket.

6. **Docs, in this prompt.** The same files brought current again:
   `docs/api.md`, `AGENTS.md`, `README.md`, `DECISIONS.md`.

**Done when:** typecheck and tests green; a browser pass on the host page at
desktop and phone widths; **then a production pass** — a real phone chatting
while the host page shows lines appearing live with names attached, a second
host device staying coherent, and a teacher refresh restoring the full
transcript. Push, wait for `/healthz`. `pnpm format`, one commit, checkbox
ticked.

## Prompt 4 — The cross-cutting production sweep

**Goal:** find what only shows up in combination. Feature 1's version caught
a prod-breaking bug and feature 3's handset leg caught the worst bug this
project has had; **treat it as a hunt.** Per-prompt verification proves each
slice works — this is for the seams between them.

Covers, at minimum:

- The **demo sweep**: `/demo`, `/demo/teacher`, `/demo/student` must still do
  **zero** `/socket.io/` traffic, and the demo must still auto-pair and play
  its scripted chat. The demo engines simulate messaging and must never have
  started touching the socket.
- **Cold start** as the session's FIRST server contact, opportunistically —
  never by manufacturing a spin-down.
- The **restart story**: a deploy mid-chat with messages in flight.
- A **class-sized load** with the abuse hammer running: the rate limit and
  the 200-line cap under real concurrency, not one student in isolation.
- The **120-second grace backstop** with a chat in flight — the feature-3 fix
  interacting with a transcript that now exists.

While the phone is out, clear the entry already waiting in
`docs/pending-manual-tests.md` (the offline-leave confirmation, blocked by no
cellular service on 2026-07-20). Anything asked for and blocked again goes
back into that file rather than evaporating.

**Done when:** the sweep is run, a `### Pass record — YYYY-MM-DD` section is
appended to this document with what was actually exercised and what it found,
and the checkbox is ticked.
