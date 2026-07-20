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
not deploy safety: Prompt 1 leaves a window where students can type and the
teacher can't read, and that window is acceptable **only** because no real
classes are running on production between the two prompts (founder call,
2026-07-20). If that stops being true, Prompt 2 becomes urgent, not optional.

Both Prompts 1 and 2 are server-touching pushes — every server deploy wipes
live classes, so **push them outside school hours**.

To run a prompt, tell the agent:

> Read `docs/plans/feature-4-messaging.md` (all of it — the shared context
> sections apply to every prompt), read `AGENTS.md`, then do Prompt N.

When a prompt is done, tick its checkbox here (same commit).

- [ ] Prompt 1 — Students send each other messages (end to end)
- [ ] Prompt 2 — The teacher reads them (end to end)
- [ ] Prompt 3 — The cross-cutting production sweep

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

// ClientToServerEvents addition (Prompt 1):
/** Student only. Trimmed, capped at CHAT_MESSAGE_MAX_CHARS by code points,
 *  rate-limited. Every rejection is a silent no-op, like every other socket
 *  event — there is no error channel to a client today. */
"chat:send": (payload: { text: string }) => void;

// ServerToClientEvents additions:
/** Student only, targeted (Prompt 1). */
"chat:line": (payload: { chatId: string; line: ChatLine }) => void;
/** Teacher room (Prompt 2). */
"chat:transcript-line": (payload: {
  chatId: string;
  line: ChatTranscriptLine;
}) => void;
```

`chat:started` grows `lines: ChatLine[]` (the resume backlog) and
`everPeers: ChatPeer[]` (Prompt 1 — see the gap note there).
`ChatSnapshot` grows `messages: ChatTranscriptLine[]` (Prompt 2).

## Shared context: the deploy race

The one real cost of slicing vertically in this repo, and worth understanding
before Prompt 1 rather than after.

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
a real user, split that slice's push into a server commit then a client
commit — still one session and one working thing, just two commits. That is a
much smaller concession than going back to layered prompts.

---

## Prompt 1 — Students send each other messages

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

6. **The `everPeers` gap — do not skip this.** `toChatPeers` projects
   **active** members only, and `ConversationLines` drops any line whose
   sender it can't resolve (`if (!sender) return null`). So a student who
   refreshes after a peer left would silently lose that peer's messages from
   the backlog. `chat:started` has to carry everyone ever in the room, not
   just those still in it. Still characterIds only, so the privacy pin holds.

7. **Student client.** `useLobbyPresence.ts` gains an `onChatLine` callback
   and its `socket.on` beside the other chat listeners, and returns a
   `sendChatMessage(text)` that emits off `socketRef.current` — a plain
   function exactly like `returnToLobby`. `JoinActivityPage.tsx`'s
   `LiveMatch.notices` becomes one `messages: ChatMessage[]`; incoming lines
   append with `senderId: line.characterId`, which works because characterId
   already doubles as the participant id there. `everPeers` now comes from
   the wire instead of being inferred from the first `chat:started`.

   Message ordering: one array in client-observed order. On a resume
   `chat:started` it is rebuilt from the server's authoritative `lines`,
   which drops local "X left the chat" notices from before the refresh — the
   server owns the transcript, notices are ephemeral UI. Server-owned notice
   lines are the natural follow-up if that ever reads wrong.

8. **`LiveChatStage.tsx`.** Drop `composerDisabled` and its placeholder, feed
   `messages`, pass a real `onSend`. It is the only caller of those two
   props, so delete them from `ChatboxProps` rather than leaving dead API.

9. **Teacher copy this prompt makes untrue** (humanizer pass), both in
   `ChatsInProgressSection.tsx`: the empty-transcript hint ("Nothing to read
   yet. Students can't type until messaging arrives in the next update.") and
   the disabled-ending hint ("Ending and pausing come in the next update,
   along with messaging itself."). Ending is still disabled so the second
   still belongs — but neither sentence is true once students can type.
   Rewrite both to say what is now the case: students are talking, and
   reading along arrives next.

   Note the coupling while you're in there: `emptyHint` is gated on
   `!endingEnabled`, which was a fair proxy while ending and messaging were
   one bundle and is wrong now that they ship apart. Keep it honest here;
   Prompt 2 decouples it.

10. **Tests** — safety invariants only, per DECISIONS.md → "Server tests
    cover only the safety invariants". `appendLine` in `matching.test.ts`
    (appends; refuses non-members and ended chats; caps at the line limit).
    A new exact-key pin on `ChatLine` in `projections.test.ts`. In
    `lobby.test.ts` over real sockets: A sends and B receives A's
    characterId with no name anywhere in the payload; a student not in a
    chat is ignored; an over-length message is ignored.

    One existing test **breaks by design**: `projections.test.ts` pins
    `toChatStarted`'s top-level keys to an exact three-item list, and this
    prompt adds two. Widen the list to the new exact set — never loosen the
    assertion into a subset check. The nested `peers` pin
    (`toEqual(["characterId"])`) stays untouched, and `lines` gets the same
    treatment.

11. **Docs, in this prompt.** `docs/api.md` (the "no chat message has ever
    crossed the wire" claim in the header, plus the new events, types,
    constants and privacy rules in the socket sections), `AGENTS.md` (the
    "Messaging is the next feature" block and the invariants list), and
    `README.md`. This feature's founder calls are already in `DECISIONS.md`
    from the planning commit — what's owed here are the **supersede notes**
    on the entries scoped to expire with messaging: "Feature 3 makes matching
    real; messaging, ending, and pause stay placeholders", "An empty live
    transcript explains itself", and "Disabled ending controls share one hint
    line" (its quoted copy changes). Note too that "Leaving a live chat means
    leaving the activity (until messaging ships)" comes due but is
    **deliberately left open** — the server already ends a duo and continues
    a trio on `lobby:leave`; what's missing is a leave-the-chat-but-keep-your-seat
    path, which is its own slice. Say so in the entry rather than letting the
    "until messaging ships" clause quietly expire unaddressed.

12. **Two drive-by fixes**, both in files this prompt already edits, both
    left behind by the 2026-07-20 handset fix. First, `server/src/live/seats.ts`
    documents a `graceMs: null` branch — "a matched seat is never
    grace-reaped" — that is no longer true, and the early return it describes
    is now dead code. Second, `docs/api.md`'s "Timing truths" still says the
    grace window is "for waiting seats only" and that a seat in a chat "gets
    no such clock at all", contradicting the corrected text earlier in the
    same file.

**Done when:** `pnpm typecheck` and `pnpm test` green; a scratch
`socket.io-client` script driving a teacher and two students proves the fan-out,
the cap and the rate limit; a browser pass on two real student lobbies at
desktop and phone widths; **then a production pass with a real phone** —
messages both directions, a mid-chat refresh resuming with the backlog
intact, a peer leaving mid-conversation, and the cap and rate limit under a
deliberate hammer. Push, wait for `/healthz` to report the new server commit
before testing. `pnpm format`, one commit, checkbox ticked.

## Prompt 2 — The teacher reads them

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
   and `characterId` off `chat.members`, same as Prompt 1's `toChatLine`) and
   `messages` on `toChatSnapshot`. The existing `chat:send` handler gains one
   emit to the teacher room. **No new storage** — Prompt 1 already keeps the
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

4. **Copy.** Prompt 1's stopgap hints come out, replaced by real empty states
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

## Prompt 3 — The cross-cutting production sweep

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
