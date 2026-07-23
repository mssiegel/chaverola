# Feature 5 — Typing indicator

A student starts typing and their peers' screens show it — the bouncing dots
and "«character» is typing…" the demo has played since before the server
existed. The UI is already built and shipping: `PeerIsTyping` and
`TypingDots` render from `Conversation`, `ChatRoomState.typingPeerId` already
has its slot, and `LiveChatStage` pins it to `null` with a comment saying
exactly why. This feature replaces that pin with the wire. **Students only:
the teacher never sees typing** (founder call, 2026-07-21 — recorded in
DECISIONS.md). Ending, pausing, peer-drop UI, the auto-end clock and the name
reveal all stay out, `endingEnabled` stays `false`, and the `1234` demo stays
byte-identical and zero-network.

One prompt, because it is one working thing: a wire event pair, a stateless
server relay, and client threading into a render path that already exists.
Feature 4's cross-cutting sweep existed because three slices had seams
between them; one slice has no seams with itself, so its production pass
lives in its own done-when.

## How to use this document

Same rules as feature 4: the prompt is sized for one agent session, ends
green (typecheck + tests + its own verification, production pass included),
gets **one commit straight to `main`**, and is safe to push on its own.
Server-touching (`server/**` is in Render's build filter) — which is fine at
any hour right now: Chaverola has no real classes until launch (end of
August 2026), so a deploy wipe hits nobody. To run it, tell the agent:

> Read `docs/plans/feature-5-typing-indicator.md` (all of it), read
> `AGENTS.md`, then do Prompt 1.

When it's done, tick the checkbox here (same commit).

- [x] Prompt 1 — Students see each other typing (end to end)

Repo rules that apply (details in `AGENTS.md`): run `pnpm format` before
committing; never hand-write `memo`/`useCallback`/`useMemo` in the client
(React Compiler does it); record newly-made decisions in `DECISIONS.md`;
verify at the cheapest gate that catches the mistake. There is **no new
user-facing copy** in this feature — the "is typing…" strings shipped long
ago with the demo — so the humanizer owes nothing here.

## Shared context: design decisions (founder, 2026-07-21)

Recorded with full reasoning in DECISIONS.md (Chat behavior, the three
entries dated 2026-07-21):

- **The teacher never sees typing.** The teacher's oversight surface is the
  transcript — what was said, with real names. A typing flicker per card
  across a classroom of chats is noise, and the teacher wire stays
  snapshots-plus-one-delta on purpose. Adding a teacher typing signal later
  is a founder call, not a completion.
- **Typing is a heartbeat that dies in five seconds, never a stored fact.**
  No stop event, no server state, no store field, nothing in any resume
  backlog. The client re-emits while keys flow; the receiver expires the
  indicator on a TTL; the peer's own message landing clears it instantly. A
  stop event was rejected because it would still need the TTL backstop (a
  stop packet lost on school wifi, a socket that dies mid-typing, a locked
  phone) — two mechanisms where one self-heals every failure mode.
- **One typing slot per room, last writer wins.** A duo has exactly one
  possible typist, and every 3+-person room already collapses to "someone is
  typing…" (`isGroup` in `Conversation`), so per-peer slots would change
  nothing on screen. The single slot keeps `LiveMatch` flat.

## Shared context: the wire contract additions

In `shared/src/socket.ts`, documented in `docs/api.md` by this prompt. The
two constants live beside `LOBBY_GRACE_SECONDS` — socket-timing constants
that both ends must agree on (the TTL must outlast the heartbeat):

```ts
/** Client re-emit floor while keys flow: the indicator appears within ~2s
 *  of the first keystroke, and one heartbeat per 2s is the whole cost. */
export const TYPING_HEARTBEAT_MS = 2_000;
/** Receiver-side expiry, measured from the LAST heartbeat: 2.5 heartbeats,
 *  so one dropped packet never flickers the indicator, while an abandoned
 *  draft dies within 5s. */
export const TYPING_INDICATOR_TTL_MS = 5_000;

// ClientToServerEvents addition:
/** Student only. A typing heartbeat, re-emitted at most once per
 *  TYPING_HEARTBEAT_MS while keys flow. No payload — the seat and chat
 *  resolve server-side, so there is nothing to validate or spoof. Silent
 *  no-op outside an active chat, like every other socket event. */
"chat:typing": () => void;

// ServerToClientEvents addition:
/** Student only, targeted at each OTHER connected active member — never
 *  the sender, never the teacher room. characterId-only, the same pin as
 *  ChatPeer. Ephemeral: never stored, never in a resume backlog; the
 *  receiver expires it TYPING_INDICATOR_TTL_MS after the last heartbeat. */
"chat:peer-typing": (payload: { chatId: string; characterId: string }) => void;
```

Both directions use **volatile emits** — the first in this repo, so comment
them where they appear. Typing is the textbook volatile case: a heartbeat
that can't go out _now_ must die, not queue, because a buffered heartbeat
flushing after a blip is the one way a ghost indicator could outlive its
moment. Volatile also discards while disconnected, so the client needs no
`connected` guard.

## Shared context: the deploy race

Benign for this feature, in both directions — worth knowing so nobody splits
the slice defensively. Client ahead of server: `chat:typing` is an unhandled
event and Socket.IO drops it silently — no indicator, no error, no harm.
Server ahead of client: nothing emits `chat:typing`, so nothing relays. The
standing rules still apply all the same: poll `/healthz` for the new
server commit before testing, and the tip commit of
the push must touch `client/`, `shared/`, or a root manifest — automatic
here, since the slice touches all three workspaces in one commit, but check
Vercel's latest production deployment is Ready for the SHA anyway.

---

## Prompt 1 — Students see each other typing (end to end)

**Goal:** a student types in a real chat and their peers see the indicator,
on production; the teacher sees nothing; the demo is untouched.
Server-touching — **safe to push at any hour** (pre-launch, no real classes
to wipe).

Read first: `shared/src/socket.ts`, `server/src/live/lobby.ts`,
`server/src/store/projections.ts`, `server/src/live/lobby.test.ts`,
`server/src/store/projections.test.ts`,
`client/src/pages/student/useLobbyPresence.ts`,
`client/src/pages/student/JoinActivityPage.tsx`,
`client/src/components/Student/LiveChatStage.tsx`,
`client/src/components/Student/Chatbox/index.tsx`,
`client/src/components/chat/MessageComposer.tsx`,
`client/src/components/chat/Conversation.tsx`.

1. **Shared.** The two events and two constants exactly as above, docblocks
   included.

2. **Projections.** `toPeerTyping(chat, studentId)` in `projections.ts` — an
   explicit field-by-field literal `{ chatId: chat.id, characterId }`, with
   the same `find(...)!`-plus-comment idiom the other projectors use,
   justified the same way: the handler only calls it after
   `findActiveChatOf`, so the find can't miss. It goes here rather than
   inline in lobby.ts because projections.ts is the only module allowed to
   turn stored records into wire JSON — the privacy convention is
   structural, and this must not be the first exception.

3. **The relay, in `lobby.ts`.** Registered beside `chat:send`, with its
   guard state in the connection closure beside `sendTimes` (same rationale:
   dies with the socket, no map to clean up):

   ```ts
   let lastTypingRelayAt = 0;
   ```

   The handler: consume the guard **first** (`now - lastTypingRelayAt <
TYPING_RELAY_MIN_INTERVAL_MS` → silent return, else stamp it — consuming
   before the lookups caps a hostile loop at one store lookup per second),
   then `getByJoinCode` → `findActiveChatOf` → `toPeerTyping` → volatile
   fan-out to each active member, **skipping the sender** and skipping
   disconnected seats, copying `chat:send`'s loop shape. Every rejection is
   a silent return. **No store touch, no teacher emit.**

   `TYPING_RELAY_MIN_INTERVAL_MS = TYPING_HEARTBEAT_MS / 2`, a module
   constant beside `CHAT_SEND_WINDOW_MS`: half the client's heartbeat, so
   timer jitter can never drop a legitimate heartbeat, while a hostile
   emit-loop relays (and looks up) at most once a second. A sliding window
   would be machinery for nothing — heartbeats are ~1 per 2s by design.

   While in the file: its header's abuse-guard list names three guards (seat
   cap, send rate limit, character cap). It now has four.

4. **Client hook.** `useLobbyPresence.ts` gains an `onPeerTyping` callback —
   `useLatestRef` + `socket.on("chat:peer-typing", …)` beside the other chat
   listeners, ref added to the effect deps — and returns a plain
   `sendTyping()` beside `sendChatMessage`, throttled by a timestamp ref
   (the repo has no debounce utility on purpose; two lines is the whole
   need):

   ```ts
   const lastTypingSentAtRef = useRef(0);
   const sendTyping = () => {
     const now = Date.now();
     if (now - lastTypingSentAtRef.current < TYPING_HEARTBEAT_MS) return;
     lastTypingSentAtRef.current = now;
     // volatile: a heartbeat that can't go out now must die, not queue.
     socketRef.current?.volatile.emit("chat:typing");
   };
   ```

   The throttle lives here, not in the composer: heartbeat cadence is wire
   policy and belongs at the socket layer; the composer stays presentational
   and demo-shared.

5. **Client page.** `JoinActivityPage.tsx`: `typingPeerId: string | null`
   joins the `LiveMatch` interface — on the match state, not beside it, so
   every clearing invariant lives in the merge points that already exist.
   The expiry timer follows the `submitSlowTimerRef` pattern
   (`typingExpiryRef`). `onPeerTyping`: guard on live-match-and-same-chatId,
   set the slot (skip the object churn when it's already that character),
   and **always re-arm the TTL timer** — it runs from the last heartbeat,
   not the first. The clears:

   - `onChatLine`: null the slot only when `line.characterId ===
prev.typingPeerId` — the peer's message landing clears _their_ bubble,
     instantly, never another typist's. Leave the pending timer armed: a
     late fire can only re-null a null (say so in a comment).
   - `shrinkToPeers`: null the slot when the typer is no longer among the
     peers — a typist who left clears with their own departure notice.
   - `onChatStarted`, fresh branch: `typingPeerId: null` in the literal.
     Resume branch: keep `prev.typingPeerId` — the TTL covers staleness, and
     after a real refresh `prev` is gone anyway, so the indicator is simply
     absent until the next heartbeat ≤2s later. That gap is intended:
     typing is not in the backlog, by design.
   - Chat end: nothing — `Chatbox` already renders
     `typingPeerId={isEnded ? null : typingPeerId}`.
   - No cleanup effect for the timer: a stray post-unmount fire is a guarded
     `setMatch` no-op (comment it).

   Thread `typingPeerId={match.typingPeerId}` and `onTyping={sendTyping}`
   into `LiveChatStage`.

6. **Client components.** `LiveChatStage.tsx`: two new required props,
   `typingPeerId: string | null` and `onTyping: () => void`; the hardcoded
   `typingPeerId: null` becomes the prop; rewrite the docblock's "no typing
   indicator" sentence and the "nobody visibly types" comment — typing is
   real now, while peer-drop UI and the clocks stay quiet, and their
   justification (`ChatPeer` is allowlist-pinned to `characterId`, so peer
   connection state has no slot on the student wire) stays word-for-word
   true. `Chatbox/index.tsx`: optional `onTyping?: () => void`, passed
   straight to `MessageComposer` — demo callers pass nothing, so the demo
   engines never see it. `MessageComposer.tsx`: optional `onTyping`, fired
   from `handleChange` **when the new value is non-empty** (clearing a
   draft isn't typing) and from `insertEmoji` after a successful insert
   (emoji are first-class input here). The `disabled` textarea already
   suppresses change events, so pause-suppression comes free.
   `Conversation`/`PeerIsTyping` need **zero changes**: live participant ids
   are characterIds, so the wire value resolves directly; an unresolvable id
   renders nothing; self can never arrive because the server skips the
   sender.

7. **Tests — two, and nothing else** (per the founder: essentials only).
   Zero existing tests break — nothing pins the socket event set, and no
   fixture gains a required field.

   - `lobby.test.ts`, one case, squarely in the file's safety-invariants
     charter (a room boundary plus the privacy pin): teacher + two students
     in a real chat; leak listeners for `chat:peer-typing` on the teacher
     socket and on student A; A emits `chat:typing` **once** (the
     min-interval guard eats rapid repeats — comment it); await it at B;
     assert the payload's keys are exactly `["characterId", "chatId"]` and
     the characterId is A's per `chat.members`; short sleep; both leak
     collectors still empty.
   - `projections.test.ts`, a four-line exact-key pin on `toPeerTyping` —
     that file promises every projector is pinned, and this must not be the
     first unpinned one.

   No client tests: the throttle is two lines in a hook and the expiry is a
   timeout ref, the same untested-by-convention plumbing as every other
   timer in those files.

8. **Docs, in this prompt.** The named claims that go stale the moment a
   peer's dots appear:

   - `docs/api.md` — both events in the event blocks; a Typing bullet under
     the messaging operational truths (the heartbeat protocol, the TTL,
     volatile/best-effort delivery, never stored, never in a resume backlog
     — a refreshed receiver waits for the next heartbeat — and never the
     teacher); the privacy rules gain the inverse boundary, the first
     student signal the teacher deliberately does **not** get; the
     socket-layer abuse-guard sentence grows from three guards to four; the
     constants paragraph gains the two shared constants (noting
     `TYPING_RELAY_MIN_INTERVAL_MS` is server-internal, like the send
     window); the header's shipped list.
   - `docs/architecture.md` — `chat:peer-typing` joins the **closed
     enumeration of student targeted emits**; "typing indicators" comes off
     the "What is still simulated" list, with a sentence on the relay
     (ephemeral, characterId-only, stateless, deliberately no teacher
     emit).
   - `AGENTS.md` — the messaging status paragraph gains typing; the
     chat-engine contract bullet carves typing out of
     "quiet-except-messages"; the lobby.test.ts inventory gains the typing
     boundary pin.
   - `README.md`'s scope note — one clause; the honest-placeholders list is
     unchanged.
   - `docs/plans/feature-4-messaging.md` — **untouched.** Its "typing
     indicators stay out" was true of feature 4; plan history is never
     rewritten.

   DECISIONS.md owes nothing here — this feature's three entries land with
   the planning commit.

**Done when:** `pnpm typecheck` and `pnpm test` green; a scratch
`socket.io-client` script (scratchpad, never the repo) driving a teacher and
three students proves the relay reaches both other members and not the
sender, the payload is exactly `{chatId, characterId}`, the teacher hears
nothing, and a 100ms burst is eaten by the min-interval guard; a browser
pass on two real student lobbies at desktop and phone widths; **then the
production pass** — two real devices in a real duo: the indicator appears
within ~2s of typing, expires within ~5s of stopping, and clears the moment
the message lands; a trio (third seat via the scratch script is fine) shows
"someone is typing…"; lock a phone mid-typing and the partner's indicator
dies within 5s; refresh the receiver mid-typing — absent, then back on the
next heartbeat; the teacher's host page, open throughout, shows no typing
artifact anywhere; `/demo/student` still does zero `/socket.io/` traffic and
its scripted typing still plays. Any leg blocked by hardware goes into
`docs/pending-manual-tests.md` rather than evaporating. Push (any hour is
fine pre-launch), poll `/healthz` for the new server commit, confirm Vercel's
production deployment is Ready. `pnpm format`, one commit, checkbox ticked.

---

## Pass record — 2026-07-23 (the real-devices leg)

The deferred two-device pass ran on a real phone (cellular, wifi off) with a
laptop student and the teacher page in view, against production — every leg
of `docs/pending-manual-tests.md` entry 3 passed: the indicator appeared
within ~2s of typing and held while typing continued, expired within ~5s of
stopping, cleared the moment the message landed with no overlap, the
mid-typing lock killed the partner's indicator within ~5s (the volatile-emit
leg the entry existed for), the receiver refresh came back absent then
restored on the next heartbeat, and the teacher's page showed no typing
artifact at any point. Entry deleted; nothing found.
