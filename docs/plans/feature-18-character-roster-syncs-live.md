# Feature 18 — Character edits reach the lobby and every future chat

The live settings panel leads with the **Characters** block, and every control
in it is a dead end on a real activity. Rename a character, swap its emoji, add
a fifth, drop the fourth — all four land in the teacher's local React state
([`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx)
diffs `settings` and `teacherEmail`, nothing else) and stop there. There is no
roster field on any wire event, no server handler, and
`StoredActivity.characters` is write-once at create
([`activityStore.ts:148-155`](../../server/src/store/activityStore.ts)).

The teacher's own page puts on a convincing show. Chat cards re-label by
character id within a second through
[`withCurrentCharacters`](../../client/src/lib/hostActivity.ts)
([`hostActivity.ts:128-144`](../../client/src/lib/hostActivity.ts), called at
[`ChatsInProgressSection.tsx:152`](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
and [`CompletedChatsSection.tsx:48`](../../client/src/components/Teacher/HostActivity/CompletedChatsSection.tsx)),
so the rename looks like it worked. It reaches nobody else. The student's side
resolves every label against the roster fetched **once** at join
([`characterLabel.ts:13-15`](../../client/src/lib/characterLabel.ts),
[`liveMatchState.ts:72-101`](../../client/src/pages/student/join/liveMatchState.ts),
[`ChatEndedSection.tsx:144-157`](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)),
and the lobby's roster chips come from the same copy
([`WaitingLobby.tsx:91-104`](../../client/src/components/Student/WaitingLobby.tsx)).
A student who joins ten minutes _after_ the rename gets the old name too
([`projections.ts:26-34`](../../server/src/store/projections.ts) reads
`stored.characters`), so this is missing data, not a stale cache — a refresh on
the host page just reverts the whole edit. It is a teacher-facing illusion with
nothing behind it. Emoji rides the identical path
([`EmojiSlot.tsx:58-75`](../../client/src/components/Teacher/ActivitySetup/EmojiSlot.tsx));
clearing one works locally only, via a truthiness check two files away
([`hostActivity.ts:154-160`](../../client/src/lib/hostActivity.ts)).

**What this feature delivers, and the line it draws.** A character rename, an
emoji swap, an added character, a removed one — each should reach the **waiting
lobby's** roster chips and **every chat that starts after the edit**, including a
student who joins ten minutes later and the teacher's second host device. But a
chat **already in progress keeps the cast it started with**. Renaming the cast
is a between-rounds move, not a mid-conversation one: two students deep in a
scene as Brutus and Cassius should not watch their names rewrite themselves
under them, and the teacher and both students should always agree on who is in
that room. The lobby and the next chat follow the edit; a running chat is a
fixed scene.

**The mechanism is a snapshot at chat start.** When a chat forms, each seat's
character name and emoji are captured onto `chat.members` — today a member holds
only `{ studentId, name, characterId }`
([`matching.ts:53-70`](../../server/src/live/matching.ts)), where `name` is the
student's real name and the character label is resolved later from
`characterId`. Every in-chat surface then reads that snapshot instead of the
live roster: the teacher's in-progress and completed cards, the student's
bubbles and peer labels, the end-of-chat reveal rows, and the emailed
transcript. The live roster — `stored.characters`, and its client mirror
`activity.characters` — drives only the lobby chips and the next `createChat`.
One consequence falls out for free: a character removed while it is on a card
keeps its captured label forever, so the raw-id fallback the removal path
fears never fires
([`projections.ts:125-140`](../../server/src/store/projections.ts) —
`resolveCharacter` returns the bare id as a name) — which is why removal becomes
safe at any time.

## Founder calls that shape this feature (2026-07-23)

Two product calls were settled in planning; the prompts below build to them and
each records its own into `DECISIONS.md` + `docs/decisions/teacher-live.md` when
it ships (per AGENTS.md → Working Rules), so this file is where they live until
then:

- **A chat freezes its cast when it starts.** Character name/emoji edits reach
  the lobby and every chat that starts _afterward_, never a chat already
  running. The alternative — following a rename into a live chat, which earlier
  drafts of this doc planned — was rejected: relabeling a character mid-scene
  disorients the two students in it and buys nothing a between-rounds edit
  doesn't. This is why the snapshot exists, and why there is **no** mid-chat
  re-resolution reducer.
- **A character can be removed at any time.** Because the snapshot keeps every
  running and completed chat's labels intact, removing a character that is in a
  live chat is now label-safe: the running chat keeps the cast it started with,
  and the character simply stops being dealt to future chats. The old
  "can't remove while in a live chat" lock (the `removeGuard` Live dot) is
  **retired**, not moved to the server — and the dot goes entirely, with no
  informational "in a live chat" marker replacing it.

## Depends on feature 17

The **lobby half** of this feature extends the event feature 17 introduces; it
does not add a second one. Feature 17 ships `activity:update-details` /
`activity:details-changed` (host name and scene) through all seven touch points
in [`docs/adding-a-wire-event.md`](../adding-a-wire-event.md). Feature 18 adds
`characters` to that same payload pair, reuses its fan-out, and extends its
allowlist pin — that is the channel the **roster reaches the lobby** on. The
**in-chat half** is separate and rides the existing chat events (`chat:started`
and the resume snapshot), which gain the frozen cast. Run 17 first. If 17
shipped different event names or a different payload split, prompt 2 adopts what
17 actually built rather than what this doc guesses.

## Decisions this supersedes

Three entries in [`docs/decisions/teacher-live.md`](../decisions/teacher-live.md)
speak to this area:

- **"Settings edits sync for real; characters, scenario, and host name stay
  local"** (2026-07-19, `:505-541`) — the founder call that made roster edits
  local-only, on the reasoning that roster sync "propagates to students'
  lobbies — a bigger feature than a settings echo." That was right. This is that
  bigger feature. Prompt 2 supersedes the character half; feature 17 superseded
  the scene and host-name half.
- **"The live-settings panel stays on real activities, editing the teacher's
  local view"** (2026-07-19, `:681-713`) — its remaining local-only clause
  retires here.
- **"Live edits propagate after a 1-second pause, and invalid states never do"**
  (2026-07-15, `:1132-1161`) — this one is **revised, not fulfilled**. It
  promised every valid edit applies "everywhere at once — roster rows, pairing,
  in-progress chat cards, student surfaces — re-labeling by stable character
  id." That is now true for **settings, scene and host name** (feature 17) but
  **deliberately not for characters**: a character edit reaches the lobby and
  future chats and stops at the door of a running one. Record the reversal in
  the entry's own update-note style — the phrase "in-progress chat cards,
  student surfaces" no longer describes character edits.

Each prompt records its own supersession in `DECISIONS.md` plus the area file,
per AGENTS.md → Working Rules.

## How to use this document

Same rules as features 4–11: each prompt is sized for one agent session, ends
green (`pnpm typecheck` + `pnpm test` + its own verification), gets **one commit
straight to `main`**, and is safe to push on its own. Run `pnpm format` before
committing; record newly-made decisions in `DECISIONS.md` +
`docs/decisions/teacher-live.md`; run the humanizer skill on all new
user-facing copy. The prompts are sequential — prompt 1 freezes running chats so
prompt 2 can safely make the roster mutable; 3 and 4 build on 2's server-side
roster — but each leaves the app fully working. Production is driven once, in
prompt 4.

Where a prompt names an **Ask the founder** question, raise it when you run that
prompt. Do not resolve it from this document.

- [ ] Prompt 1 — A chat's cast is fixed the moment it starts
- [ ] Prompt 2 — A renamed character reaches the lobby and every future chat
- [ ] Prompt 3 — Removing a character actually removes it
- [ ] Prompt 4 — Nobody is silently left out of a chat, and the panel stops lying

## Shared context: the two channels

A character edit travels on **two** channels, and keeping them apart is the
whole design:

1. **The lobby channel — feature 17's details event, `characters` added.** In
   `shared/src/socket.ts`, per
   [`docs/adding-a-wire-event.md`](../adding-a-wire-event.md), documented in
   `docs/api.md`. Feature 17 owns the event; 18 adds one field to each side:

   ```ts
   // ClientToServerEvents — teacher only, beside settings:update (socket.ts:264-265):
   "activity:update-details": (payload: {
     characters: Character[];   // ← feature 18 adds this
     hostName: string;          // feature 17
     scenario: string | null;   // feature 17
   }) => void;

   // ServerToClientEvents — same shape, fanned to other host devices AND to
   // every seated student's LOBBY:
   "activity:details-changed": (payload: { characters: Character[]; /* … */ }) => void;
   ```

   **This does not weaken the characterIds-only invariant.** A `Character` is
   `{ id, name, emoji? }` — public data every student already fetches at join
   through `GET /activities/:joinCode`
   ([`projections.ts:26-34`](../../server/src/store/projections.ts)). What must
   never ride along is `teacherEmail`, `hostKey`, `settings`, seats, or chats,
   which is exactly what the field-by-field projector and the exact-key
   allowlist pin in `projections.test.ts` exist to prevent. That pin is
   **mandatory** and is not part of this feature's otherwise-minimal test
   budget.

2. **The frozen-cast channel — the chat's own events.** A chat already carries
   its members to the teacher (`toChatSnapshot`) and to each student
   (`toChatStarted`, plus the resume delivery). Prompt 1 captures each
   character's name and emoji onto `chat.members` at chat start and teaches
   those two projectors to read the snapshot rather than resolve against the
   live roster. The student's `chat:started` / resume payload gains the chat's
   frozen `cast: Character[]` so the client resolves in-chat labels against it,
   never against the mutable lobby roster. This channel carries **no lobby
   data** and the lobby channel carries **no chat data** — that separation is
   what lets the lobby update while a running chat stays fixed.

## Shared context: character ids on the wire

The panel mints ids client-side as `live-character-N` from a module counter that
**resets on every page load**
([`hostActivity.ts:33-39`](../../client/src/lib/hostActivity.ts)), while the
server slugs ids from names at create time
([`activityStore.ts:78-92`](../../server/src/store/activityStore.ts)). Two host
devices — or one device refreshed twice — mint colliding ids for different
characters. The moment ids ride the wire (prompt 2), that collision becomes real
data. It also matters to the snapshot: `chat.members` reference `characterId`,
and a re-minted id would orphan a running chat's members.

Two hard constraints on whatever fix is chosen:

1. **An id that any chat already references must never change.** Stored chat
   members hold a `characterId`
   ([`matching.ts:53-70`](../../server/src/live/matching.ts)); the snapshot
   captures the label but the id stays the join key. Re-mint an in-use id and
   the snapshot lookups still resolve (the label is captured), but the deal-time
   `characterIdsInUse` bookkeeping and any future resolution break.
2. **Ids are opaque and always were** — nothing renders them, so a change of
   minting scheme costs nothing except the collision math.

**Ask the founder (prompt 2):** make client-side minting collision-proof (a
random suffix, so the panel's ids are globally unique and the server takes them
as given), or have the server remap unknown ids to its own slugged ones and echo
the canonical roster back. The first is smaller; the second keeps id minting in
one place and matches how create already works.

## Shared context: the deploy race

`shared/` is in both deploy triggers, so one push races two pipelines and
Socket.IO drops an unhandled event **silently** (AGENTS.md → Working Rules).

- **Prompt 1 (frozen cast)** adds a field to existing chat events. Both
  directions are benign _as long as the client falls back_: server-ahead means
  an old client ignores the new `cast` and resolves against `activity.characters`
  (still the immutable roster in prompt 1 — correct); client-ahead means the new
  client must read `payload.cast ?? activity.characters`, so a server that
  doesn't send `cast` yet still renders. Ship it with the fallback and the split
  is optional.
- **Prompt 2 (lobby sync)** is the dangerous one, exactly as in feature 17.
  **Server ahead of client** is benign: an unknown extra payload field is
  ignored and nobody emits the new roster yet. **Client ahead of server** is the
  worst kind of silent — a panel emitting `activity:update-details` with a
  roster at a server that doesn't read it is today's local-only edit, no error
  anywhere, looks like it works on your own screen. **Split prompt 2 into a
  server commit and a client commit and push them separately**, polling
  `/healthz` for the server commit in between.
- Remember the tip-commit rule: the last commit of any push must touch
  `client/`, `shared/`, or a root manifest, or Vercel silently skips the client
  build. A docs-only follow-up goes in its own push.
- Prompts 3 and 4 are server-behavior changes behind events that already exist,
  so both directions are benign.

---

## Prompt 1 — A chat's cast is fixed the moment it starts

**Goal:** every surface that shows a character _inside a chat_ — the teacher's
in-progress and completed cards, both students' bubbles and peer labels, the
end-of-chat reveal rows, and the emailed transcript — reads a name and emoji
**captured when the chat started**, not the live roster. Today the roster is
still write-once (feature 17 left characters local-only), so this ships with
**no student-visible change**: it is the insulation that lets prompt 2 make the
roster mutable without a running chat ever seeing the edit. The one visible
change is on the teacher's own page — the local-only fake relabel stops, because
the cards now render captured truth instead of the panel's unsynced draft.

1. **Capture the cast on `chat.members`**
   ([`matching.ts:154-161`](../../server/src/live/matching.ts)): when
   `createChat` builds `members`, snapshot each seat's character alongside its
   `characterId`. A member becomes
   `{ studentId, name, characterId, character }` where `character: Character` is
   resolved from `stored.characters` **at chat-start time** and never touched
   again. (Keeping both `characterId` and the captured `character` is
   deliberate: the id stays the matching/deal key, the object is the frozen
   label. An implementer who prefers `characterName` + `characterEmoji` scalars
   may — the projector shape is what matters.) Update the docblock at
   `matching.ts:53-70`, which already says `name` is captured "so a removed
   seat's card label survives" — the same reasoning now covers the character.
2. **Teacher projector reads the snapshot**
   ([`projections.ts:144-155`](../../server/src/store/projections.ts)):
   `toChatSnapshot` currently sets `character: resolveCharacter(activity, member.characterId)`.
   Change it to `character: member.character`. The teacher's card no longer
   depends on the live roster at all.
3. **Student projector ships the frozen cast**
   ([`projections.ts:219-241`](../../server/src/store/projections.ts)):
   `toChatStarted` today emits bare `characterId`s and lets the client resolve.
   Add the chat's `cast: Character[]` (the distinct captured characters from
   `chat.members`) to its payload — and to the resume delivery that reuses it —
   so the client resolves against a frozen roster instead of the mutable lobby
   copy. Add the field to `ServerToClientEvents`' `chat:started` shape (and any
   resume event) in `shared/src/socket.ts`, documented in `docs/api.md`.
4. **`resolveCharacter` stops being the chat path**
   ([`projections.ts:125-140`](../../server/src/store/projections.ts)): its
   docblock claims "the server's copy never changes and the id was minted from
   it — the find can't miss." Prompt 2 kills that claim. After this prompt the
   chat projectors no longer call it; rewrite the docblock to say the roster is
   now mutable, chat labels come from the member snapshot, and this helper
   remains only for surfaces that _want_ the live roster (if any) — verify
   whether any caller still does.
5. **The transcript reads the snapshot too**
   ([`server/src/email/transcript.ts`](../../server/src/email/transcript.ts)):
   feature 11's formatter resolves characters "the same way" as the projector
   (that is what the `resolveCharacter` docblock's export note points at). An
   emailed transcript is a record of a chat that already happened, so it must
   show the names used **during** that chat. Switch it to `member.character`,
   with a `?? resolveCharacter(...)` fallback for any member that predates this
   prompt. Feature 11 ships before this and is correct as-is against the
   immutable roster; this prompt is where the transcript starts reading captured
   truth.
6. **Retire `withCurrentCharacters`**
   ([`hostActivity.ts:128-144`](../../client/src/lib/hostActivity.ts)): its two
   callers (`ChatsInProgressSection.tsx:152`,
   `CompletedChatsSection.tsx:48`) re-resolve the server snapshot's participants
   against the client's local roster — which is exactly the relabel we are
   removing. The server snapshot now carries frozen labels, so both call sites
   render `chat.participants` directly and the function has no callers. Delete
   it (and its `hostActivity.test.ts` coverage, if any).
7. **Student resolves in-chat labels against the frozen cast**
   ([`liveMatchState.ts:72-101`](../../client/src/pages/student/join/liveMatchState.ts),
   [`useActiveMatch.ts:172-179`](../../client/src/pages/student/join/useActiveMatch.ts)):
   `applyChatStarted` resolves `self`/`peers`/`everPeers` against the `roster`
   the hook passes in, which is `activity?.characters` (the lobby copy). Change
   the hook to pass `payload.cast ?? activity?.characters ?? []` so the chat is
   resolved against its own frozen roster. The live peers are already baked once
   and never re-resolved (`shrinkToPeers` only filters,
   [`liveMatchState.ts:111-121`](../../client/src/pages/student/join/liveMatchState.ts));
   the only place the mutable roster could still leak in is the resume re-map of
   `everPeers` (`:164-199`) — feed it the frozen cast too. `characterLabel`
   reads `participant.character` and needs nothing
   ([`characterLabel.ts:13-15`](../../client/src/lib/characterLabel.ts)).
8. **Docs.** `docs/api.md` (the `cast` field on `chat:started`); the
   `liveMatchState.ts` module docblock at `:19-27` (the chat resolves against
   its own frozen cast, not the live roster);
   `docs/decisions/teacher-live.md` + `DECISIONS.md` (record the frozen-cast
   founder call and the revision of the 2026-07-15 entry).

**Edge cases:** a chat that started before this prompt shipped has members
without a captured `character` — the store is in-memory and a deploy wipes it,
but keep the `?? resolveCharacter` fallback so a mid-deploy resume never renders
a raw id; a resume/reconnect must re-resolve `everPeers` against the frozen cast,
not the current lobby roster (that is the one real leak this prompt closes ahead
of prompt 2); a removed character already reads its captured label here, so
prompt 3 inherits a clean slate.

**Tests:** the projections allowlist pins. Re-pin `toChatSnapshot` /
`toChatStarted` for the new shape (a `cast` array, `character` on members) and
keep the `toActivityDetails` pin from feature 17 unchanged
([`projections.test.ts:24-44`](../../server/src/store/projections.test.ts)).
These are privacy/shape invariants, not part of the test budget. Everything
else is a browser check.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass —
teacher plus two students, start their chat, exchange a message, then rename
both characters and clear one emoji in the panel → **nothing in the running chat
moves** on either student, and the teacher's card for that chat holds the old
names too (the edit is still local-only until prompt 2, so it also doesn't reach
the lobby yet — that is expected here); end the chat with **Reveal names** on →
the reveal rows show the names the chat ran under; a mid-chat refresh on a
student resumes with the same frozen names. The `1234` demo shifts with this too
— deleting the shared `withCurrentCharacters` means a rename no longer relabels a
demo chat **already in progress** (new demo chats still deal the current name),
which is the correct new behavior; if the demo cards lose their labels entirely,
the demo's chat participants must embed the character at deal time to mirror the
server snapshot (prompt 4's demo-parity step owns finishing this). The demo
journey is otherwise unchanged with zero `/socket.io/` traffic. `pnpm format`,
one commit (or a server/client split if you skip the `payload.cast` fallback),
checkbox ticked.

---

## Prompt 2 — A renamed character reaches the lobby and every future chat

**Goal:** a teacher renames Brutus to "Brute the Betrayer" (or swaps his knife
emoji for a dagger) in the panel, and within a second every student's **lobby**
roster chip says so — including a student who joins ten minutes later, and the
teacher's second host device — and the **next** chat that starts is dealt the
new name. The roster stops being write-once: it is server truth and survives a
refresh. A chat already running is untouched, because prompt 1 froze it.

1. **Wire** (`shared/src/socket.ts`): add `characters: Character[]` to feature
   17's `activity:update-details` and `activity:details-changed`, with a
   docblock saying why a roster is student-safe and the email/settings/hostKey
   are not, and that this is the **lobby** channel (the frozen-cast channel is
   prompt 1's).
2. **Projector** ([`projections.ts`](../../server/src/store/projections.ts)):
   extend feature 17's `toActivityDetails(stored)` with
   `characters: stored.characters` — a field-by-field literal, never a spread.
   This payload reaches students' lobbies. (If 17 shipped another name for the
   projector, use that one.)
3. **Allowlist pin** (`projections.test.ts`, **mandatory**): extend 17's
   exact-key assertion for `toActivityDetails` — it pinned
   `["hostName","scenario"]`, and this makes it
   `["characters","hostName","scenario"]`
   ([`projections.test.ts:24-44`](../../server/src/store/projections.test.ts)).
4. **Server handler** ([`handlers/teacher.ts`](../../server/src/live/handlers/teacher.ts),
   beside `settings:update` at `:248-263`): extend feature 17's
   `activityDetailsUpdateSchema` with the roster — the module-local
   `characterInputSchema` ([`schemas/activity.ts:27-41`](../../server/src/schemas/activity.ts),
   private to that file and reusable in place) plus the same count bounds and
   duplicate-name refine the create schema uses
   ([`schemas/activity.ts:79-99`](../../server/src/schemas/activity.ts)), and
   whatever id rule the founder's answer settles on. Repeat the refine in the
   sibling schema rather than refactoring `createActivityRequestSchema` — the
   `teacherEmailUpdateSchema` precedent at `:63-71`. Assign the roster onto the
   record from `getByHostKey`. **The store's `characters` becomes mutable here.**
   Log a count, never the names.
5. **Fan out twice.** `socket.to(room(joinCode))` reaches the teacher's other
   devices; students never join that room
   ([`handlers/teacher.ts:51`](../../server/src/live/handlers/teacher.ts) is the
   server's only `socket.join`), so a per-seat loop over `record.seats.byId`
   reaches them — model it on `sendActivityPaused`
   ([`lobbyContext.ts:250-260`](../../server/src/live/lobbyContext.ts)), the
   helper feature 17 already added.
6. **Teacher client.** [`useHostActivityLive.ts`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts):
   an `updateDetails` emitter beside `:265-270` and a listener beside the
   `settings:changed` one at `:181-183` (both extended by 17).
   [`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx):
   add a roster diff beside the settings and email diffs, and fold the incoming
   echo into `setActivity` **without** re-entering `handleActivityChange` — the
   anti-echo rule the settings sync documents at `:243-249`. Note that folding
   the roster into `activity.characters` now updates the lobby-facing copy and
   the pairing rail, **not** any running chat card (those render the frozen
   snapshot from prompt 1).
7. **Student client.** [`useLobbyPresence.ts`](../../client/src/pages/student/useLobbyPresence.ts):
   relay `activity:details-changed` to a callback prop exactly like
   `activity:paused` at `:236-238` (feature 17 wired the callback). The roster is
   currently immutable lookup state
   ([`useActivityLookup.ts:64-67`](../../client/src/lib/useActivityLookup.ts));
   the `deliver` seam at `:98-103` is wired through
   [`JoinActivityPage.tsx:71-75`](../../client/src/pages/student/JoinActivityPage.tsx)
   for exactly this. Use it; do not add a second state channel. **The lobby
   chips update; a student mid-chat is untouched** because the chat resolves
   against `payload.cast`, not this lookup (prompt 1).
8. **Future chats read the new roster.** `createChat` and pair-everyone already
   read `stored.characters` at deal time
   ([`matching.ts:142-151`](../../server/src/live/matching.ts),
   [`:196-212`](../../server/src/live/matching.ts)), so once the store is mutable
   they deal — and snapshot (prompt 1) — the current names for free. Verify,
   don't refactor.
9. **Docs.** `docs/api.md` (the new lobby-channel field); the now-false comment
   at [`index.tsx:197-201`](../../client/src/components/Teacher/HostActivity/index.tsx)
   and the block comment at
   [`HostActivityPage.tsx:170-186`](../../client/src/pages/teacher/HostActivityPage.tsx)
   (characters leave the local-only list — for the lobby and future chats, with
   running chats deliberately frozen); `docs/decisions/teacher-live.md` +
   `DECISIONS.md` (supersede the character half of the 2026-07-19 local-only
   call). `tools/verify/README.md:103-107` still tells the browser-verification
   reader that character edits are local-only and a refresh reverts them — fix it
   here (reach the lobby and future chats; a running chat keeps its cast).

**Ask the founder (this prompt):** when a second host device edits the roster
while this device has a half-typed rename in the panel draft, does the incoming
roster fold into the open draft (a `mergeExternalSettings`-shaped merge,
[`hostActivity.ts:103-126`](../../client/src/lib/hostActivity.ts)) or is the
roster last-write-wins per device like the teacher's email
([`socket.ts:266-270`](../../shared/src/socket.ts))? Last-write-wins is smaller
but re-introduces the stale-device overwrite; the merge is one more pure
function. Also settle the id question in the shared context above.

**Edge cases:** a cleared emoji arrives as an absent key and the server replaces
the roster wholesale, so it clears — verify rather than assume; an invalid draft
never emits (the panel already holds its commit at
[`LiveSettingsPanel.tsx:89-98`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)),
and server zod is the backstop; a student mid-chat sees the lobby chips change
but their chat does not — that is the whole point now, not a half-state; a
student whose socket is down misses the lobby event and heals on their next
`GET /activities/:joinCode`; a chat that starts one second after the edit is
dealt and frozen with the new names, which is the correct seam between "future"
and "running."

**Tests:** the `toActivityDetails` allowlist pin from step 3, and nothing else.
The round-trip is verified in the browser.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass with
`verify:up --scale 10` — host a real activity, one student in the lobby, rename a
character and swap its emoji → the lobby chips change within a second without a
refresh; a second student mid-chat is undisturbed; open a second host tab → it
shows the new name; open a **third** browser and join fresh → the new name is
there; start a **new** chat → it is dealt the new name; refresh the host page →
the edit survived (it round-tripped through the server); the `1234` demo
unchanged with zero `/socket.io/` traffic. Server commit and client commit pushed
**separately** with a `/healthz` poll between them. `pnpm format`, checkbox
ticked.

---

## Prompt 3 — Removing a character actually removes it

**Goal:** a teacher removes character 3 mid-activity and it is genuinely gone:
Pair-everyone stops forming trios on it, a manual 3-student start stops dealing
it, it never appears on a **future** chat card, and the removal survives a
reload. A chat already using that character keeps it — the snapshot from prompt 1
holds the label — and, per the founder call, **removal is allowed at any time**:
the old "can't remove while in a live chat" lock is gone.

Most of this falls out of prompts 1–2 and the job here is mostly verification
plus deleting a guard:

Keep the scope honest: only rows 3–4 are removable
([`CharacterRowsField.tsx:69`](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)),
`dealCast` only ever takes the roster's **first N**
([`matchRules.ts:31-33`](../../shared/src/matchRules.ts)), and auto-match always
deals two ([`autoMatch.ts:35-43`](../../server/src/live/autoMatch.ts)). Exactly
two paths could ever have dealt a removed character: a manual 3-or-more
`chat:start`, and pair-everyone's trailing trio. Do not build for more.

1. **Future deals already read the shrunk roster.** Once prompt 2 made
   `stored.characters` mutable, `dealCast` and `planPairEveryone` size and slice
   off the **current** server roster
   ([`matching.ts:150`](../../server/src/live/matching.ts),
   [`:203`](../../server/src/live/matching.ts) →
   [`matchRules.ts:31-33,43-57`](../../shared/src/matchRules.ts)), so a removed
   character is never dealt to a new chat. Verify; do not refactor.
2. **Running and completed chats keep their label** from the member snapshot
   (prompt 1) — the `resolveCharacter` raw-id fallback that the old removal path
   feared can no longer fire on a card. Verify with a browser removal of an
   in-use character.
3. **Delete the removal guard and the Live dot entirely.** The client's
   `removeGuard`
   ([`LiveSettingsPanel.tsx:151-161`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx))
   and the Live-dot treatment on rows 3–4
   ([`CharacterRowsField.tsx:70,113-122`](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx))
   exist to block a removal that would orphan a live chat's label. The snapshot
   makes that safe, so **both go**: removal is never gated, and an in-use
   character's row keeps **no** special affordance — not even an informational
   dot (founder call, 2026-07-23). The row removes like any other. **Do not add a
   server-side twin** — the earlier draft of this doc planned one, and it is
   explicitly not wanted now. Removal is a plain roster edit that rides the
   prompt-2 event like any other.
4. **`characterIdsInUse` is engine-divergent** — live builds it from server
   snapshot participants
   ([`useHostActivityLive.ts:274-278`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)),
   the demo from deal-time local objects
   ([`useHostActivityDemo.ts:263-267`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)).
   With the guard and the dot both gone it marks and gates nothing on the row;
   confirm nothing else in either engine still reads it in a way that would
   break, and if it has no readers left, delete it.
5. **Docs.** `docs/api.md` if the removal semantics need a line (it is just a
   roster replace now); the comment at
   [`LiveSettingsPanel.tsx:111-113`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
   — its claim that "a removed character must stop being offered to future
   pairings immediately" is finally true (the server holds the shrunk roster);
   `DECISIONS.md` + `teacher-live.md` for the retire-the-guard-and-dot call. The
   2026-07-16 decision "A character in a live chat shows the Live dot, and its
   hint says who" is **fully superseded** — the dot is gone.

**Edge cases:** removing a character whose only chats have **ended** — the
completed cards keep their snapshot label, so this is now unremarkable
(previously the thorniest case); removal dropping the roster below three while a
trio is running — the trio keeps its dealt, snapshotted characters and only
future deals shrink; removal racing a chat start — the server holds both, so
whichever lands first wins and the loser is a clean deal or a clean shrink, with
no label breakage either way. **Read `removeCharacter` before you plan the panel
side**: [feature 13](./feature-13-settings-commit-reliability.md) rewrites
exactly this function — it drops the validity gate at `LiveSettingsPanel.tsx:114`
and commits the removal straight from the committed activity — so if 13 shipped,
the removal always emits and there is no refusal path to design for. Removing
then re-adding a character with the same name mints a different id, so old chats
keep resolving to their captured label and new chats get the new id — both
correct.

**Tests:** none new. The projections pins from prompt 1 cover the snapshot,
`matchRules` is already tested, and the guard deletion plus the two deal paths
are browser clicks.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — three
students waiting, four characters; remove character 4, Pair everyone → the trio
is dealt from characters 1–3 and character 4 appears nowhere; start a manual
3-student chat, then remove a character that chat is using → the row shows no
Live dot and removes immediately, the running chat keeps its cast on both the
teacher card and the students' bubbles, and no raw id renders anywhere; reload
the host page → the removal stuck; the `1234` demo unchanged. `pnpm format`, one
commit, checkbox ticked.

---

## Prompt 4 — Nobody is silently left out of a chat, and the panel stops lying

**Goal:** the teacher selects three students for a chat and either all three get
seated or the teacher is told why not — instead of two getting a chat and the
third sitting in the queue with nothing marking them. Then the panel's opening
sentence gets to tell the truth about what character edits now do, and the whole
feature gets its one production drive.

1. **The silent under-seating.** `maxGroupSize` is computed from the roster
   ([`index.tsx:84`](../../client/src/components/Teacher/HostActivity/index.tsx)),
   so an added character permits a three-student selection the instant it lands
   locally; `createChat` clamps the request to the **server** roster —
   `requested.slice(0, Math.min(4, activity.characters.length))`
   ([`matching.ts:142-151`](../../server/src/live/matching.ts)) — and returns a
   chat for whoever fit. The leftover student gets no highlight, because
   `createChat` only ever _clears_ `leftoverStudentId`
   ([`matching.ts:178-183`](../../server/src/live/matching.ts)), and the
   teacher's selection is already wiped
   ([`index.tsx:114-118`](../../client/src/components/Teacher/HostActivity/index.tsx)).
   Prompt 2 closes the usual cause (an added character now reaches the server
   before it can be selected), but the panel's 1s debounce plus network latency
   leaves the window open, so this is a server robustness gap worth closing on
   its own terms.
2. **Ask the founder (this prompt):** what should the under-seated case do?
   (a) mark the unseated students as the leftover so the existing highlight
   explains it — the smallest change, reusing machinery the rail already
   renders; (b) refuse the whole `chat:start` when the request exceeds the
   roster, leaving the selection intact so the teacher can fix it; (c) keep
   clamping but surface a rail notice in the `rematchNotice` idiom
   ([`handlers/teacher.ts:130-140`](../../server/src/live/handlers/teacher.ts)).
   Get the call, then implement exactly one. Get the copy wording too if it needs
   any, and run the humanizer on it.
3. **Widen the panel copy** at
   [`LiveSettingsPanel.tsx:134-138`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx),
   which feature 12 narrowed to scope the promise to settings and email. The old
   string over-promised "changes reach everyone the moment you pause typing,
   including what students see mid-chat" — which is now **half true and half
   deliberately false**: settings, scene and host name reach everyone live
   (feature 17), and character edits reach the lobby and every new chat, **but a
   chat already running keeps its cast on purpose**. **Ask the founder for the
   wording** rather than reverting to the old string — the copy must not promise
   the mid-chat relabel this feature deliberately does not do — then run the
   humanizer skill on it. Check the collapsed hint at `:128-132` while you are
   there (feature 12 reshaped it for a different reason) and confirm it still
   reads true.
4. **Demo parity — and it is the inverted kind.** `/activity/host/1234` already
   deals from the live-edited local roster
   ([`hostWorld.ts:107-124`](../../client/src/components/Teacher/HostActivity/hostWorld.ts),
   handed in by [`useHostActivityDemo.ts:68-73`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)),
   so renaming, adding and removing all visibly work there **today** — the demo
   has been _better_ than live. After this feature the demo finally tells the
   truth for the lobby and future chats. **One thing to check that the corrected
   plan introduces:** does the demo relabel a character _inside a running demo
   chat_ when the teacher edits it? If it does, the demo now over-promises the
   opposite way — showing a mid-chat relabel the real app deliberately withholds —
   so freeze the demo's in-progress chat cards to match (the demo builds
   participants at deal time, so capturing the character there mirrors the
   server snapshot). Expect small or no demo engine work, but verify this leg
   specifically. The demo's student tab reads a separate module constant with no
   cross-tab sync
   ([`hostActivityDemo.ts:7-14`](../../client/src/mockData/hostActivityDemo.ts))
   and stays that way.
5. **Docs and the status table.** Give this feature its row in `AGENTS.md`'s
   status table, and correct the "nothing on a real activity is simulated
   anymore" claim — today it sits at [`AGENTS.md:22`](../../AGENTS.md), but
   [feature 20](./feature-20-docs-and-copy-drift-cleanup.md) rewrites that
   sentence and asks the founder whether the fact belongs in `AGENTS.md`'s Status
   block or in `architecture.md`'s realtime section, so **find its home before
   editing it** and fix the one home rather than both. This feature is what
   finally makes the roster half of it true. Then `docs/api.md`; `DECISIONS.md` +
   `teacher-live.md` for the under-seating call and the copy call.
6. **The production drive** (once per feature, per AGENTS.md): cold-wake check as
   the session's first server contact, then the feature's network-sensitive legs
   on chaverola.com — a rename reaching a real second device and a real student's
   **lobby** (not their running chat), a chat started after the edit carrying the
   new name, a removal, an add-then-seat-three. Send it to a real phone; if that
   can't happen now, record it in `docs/pending-manual-tests.md` rather than
   letting the ask evaporate.

**Edge cases:** a two-character roster with three students selected (the oldest
reachable version of this bug, unchanged by the roster sync); the leftover
highlight colliding with pair-everyone's own leftover (one field,
`leftoverStudentId` — whichever wrote last wins, and that is fine, but say so);
selecting four students on a four-character roster remains the normal path and
must not regress; a roster edit landing between the teacher's tap and the
server's `createChat` (the server's copy is the arbiter, which is the whole
point).

**Tests:** none new — the seating rule change is one branch in `createChat` with
a visible consequence in the rail, and `matching.test.ts` already fixtures the
surrounding behavior. Add an assertion to an existing test only if the founder
picks option (b), where the refusal is invisible from the client.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — three
students, two characters, select all three and Start their chat → the chosen
behavior happens and the teacher can tell what happened; add a third character,
wait for the commit, select all three again → all three get seated; the panel's
new sentence is humanized and accurate about the lobby-and-future scope;
`/activity/host/1234` renames, adds and removes for the lobby and future chats
with zero `/socket.io/` traffic, and a running demo chat keeps its cast. **Then
the production pass** as described in step 6, on chaverola.com. `pnpm format`,
one commit, checkbox ticked, `AGENTS.md` row flipped.
