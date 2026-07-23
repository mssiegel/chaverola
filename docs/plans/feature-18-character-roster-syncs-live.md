# Feature 18 — Character edits reach students, mid-chat included

The live settings panel leads with the **Characters** block, and every control
in it is a dead end on a real activity. Rename a character, swap its emoji,
add a fifth, drop the fourth — all four land in the teacher's local React
state ([`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx)
diffs `settings` and `teacherEmail`, nothing else) and stop there. There is no
roster field on any wire event, no server handler, and
`StoredActivity.characters` is write-once at create
([`activityStore.ts:148-155`](../../server/src/store/activityStore.ts)).

What makes this worse than a missing feature is that the teacher's own page
puts on a convincing show. Chat cards re-label by character id within a second
through [`withCurrentCharacters`](../../client/src/lib/hostActivity.ts)
([`hostActivity.ts:135-144`](../../client/src/lib/hostActivity.ts), called at
[`ChatsInProgressSection.tsx:150-155`](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
and [`CompletedChatsSection.tsx:48`](../../client/src/components/Teacher/HostActivity/CompletedChatsSection.tsx)),
so the rename looks like it worked. The student's side resolves every label —
each bubble, each peer name, the drop banner, the reveal rows — against the
roster fetched **once** at join
([`characterLabel.ts:8-12`](../../client/src/lib/characterLabel.ts),
[`liveMatchState.ts:75-101`](../../client/src/pages/student/join/liveMatchState.ts),
[`ChatEndedSection.tsx:138-161`](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)),
and the lobby's roster chips come from the same copy
([`WaitingLobby.tsx:91-104`](../../client/src/components/Student/WaitingLobby.tsx)).
Teacher and student end up calling the same live chat different things. A
student who joins ten minutes _after_ the rename gets the old name too
([`projections.ts:26-34`](../../server/src/store/projections.ts) reads
`stored.characters`), so this is missing data, not a stale cache — a refresh
cannot heal it. Emoji rides the identical path
([`EmojiSlot.tsx:58-75`](../../client/src/components/Teacher/ActivitySetup/EmojiSlot.tsx));
clearing one works locally only, via a truthiness check two files away
([`hostActivity.ts:154-160`](../../client/src/lib/hostActivity.ts)).

**Remove has the widest blast radius.** The comment at
[`LiveSettingsPanel.tsx:111-113`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
explains that removal skips the typing debounce because "a removed character
must stop being offered to future pairings immediately." On a real activity it
never stops: `dealCast` still hands it out
([`matching.ts:153`](../../server/src/live/matching.ts) →
[`matchRules.ts:31-33`](../../shared/src/matchRules.ts)), and `planPairEveryone`
sizes its trailing trio off the **server's** `characters.length`
([`matching.ts:196-212`](../../server/src/live/matching.ts) →
[`matchRules.ts:43-57`](../../shared/src/matchRules.ts)), so Pair-everyone
forms a trio on the character the teacher just deleted. `withCurrentCharacters`
then can't find the id locally and falls back to the wire copy
([`hostActivity.ts:139-143`](../../client/src/lib/hostActivity.ts)), so the
deleted character is rendered **by name** on the teacher's own chat card. A
reload restores the row from the server
([`projections.ts:38-50`](../../server/src/store/projections.ts)).

It reads worse than it is, and the prompts below must not over-build for it:
`dealCast` slices the roster's **first N** characters
([`matchRules.ts:31-33`](../../shared/src/matchRules.ts)) and only rows 3–4 are
removable ([`CharacterRowsField.tsx:69`](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)),
while auto-match always deals a two-id pair
([`autoMatch.ts:35-43`](../../server/src/live/autoMatch.ts)). So 1:1 chats and
auto-match can never be affected. The only two reachable paths are a manual
3-or-more start and pair-everyone's trio.

**Add strands a student, quietly.** `maxGroupSize` is computed from the
**local** roster ([`index.tsx:84`](../../client/src/components/Teacher/HostActivity/index.tsx)),
so a locally-added third character immediately permits a three-student
selection. `createChat` clamps to the **server** roster —
`requested.slice(0, Math.min(4, activity.characters.length))`
([`matching.ts:142-151`](../../server/src/live/matching.ts)). Two students get
a chat; the third stays in the queue with no leftover highlight (`createChat`
only ever _clears_ `leftoverStudentId`,
[`matching.ts:178-183`](../../server/src/live/matching.ts)) and the selection
has already been wiped ([`index.tsx:114-118`](../../client/src/components/Teacher/HostActivity/index.tsx)).
**The audit corrected itself here and the correction matters:** the server never
_refuses_ a chat on roster grounds. It silently clamps and seats fewer. The
reportable defect is the silent under-seating, which is a server robustness gap
that survives even after the roster syncs (the panel's 1s debounce plus network
latency leaves the same window open), so it gets its own prompt.

**Reproduce all four in two minutes** (this whole area was contested — two of
three audit lenses argued the missing sync is a scheduled feature rather than a
bug, and only the consequences below were unsigned-off): host a real activity
with three characters, get three students into the queue, start a chat with
two of them. Rename character 1 in the panel — your card relabels, the
students' bubbles don't. Add a fourth character, select all three waiting
students, Start their chat — two get seated, one sits in the queue with nothing
marking them. Remove character 3, hit Pair everyone with three students waiting
— the trio forms on the character you just deleted. Refresh the host page —
every edit is gone.

## Depends on feature 17

This doc **extends the event feature 17 introduces**; it does not add a second
one. Feature 17 ships `activity:update-details` / `activity:details-changed`
(host name and scene) through all seven touch points in
[`docs/adding-a-wire-event.md`](../adding-a-wire-event.md). Feature 18 adds
`characters` to that same payload pair, reuses its fan-out, and extends its
allowlist pin. Run 17 first. If 17 shipped different event names or a different
payload split, prompt 1 adopts what 17 actually built rather than what this doc
guesses.

## Decisions this supersedes

Three entries in [`docs/decisions/teacher-live.md`](../decisions/teacher-live.md)
speak to this area, and this feature is the one that retires the local-only
half of all three:

- **"Settings edits sync for real; characters, scenario, and host name stay
  local"** (2026-07-19, `:505-541`) — the founder call that made roster edits
  local-only, on the reasoning that roster sync "propagates to students'
  lobbies — a bigger feature than a settings echo." That was right. This is
  that bigger feature. Prompt 1 supersedes the character half; feature 17
  supersedes the scene and host-name half.
- **"The live-settings panel stays on real activities, editing the teacher's
  local view"** (2026-07-19, `:681-713`) — its remaining local-only clause
  retires here.
- **"Live edits propagate after a 1-second pause, and invalid states never do"**
  (2026-07-15, `:1070-1100`) — this one is not superseded, it is finally made
  true. It already specified the behavior this feature builds: re-labeling by
  stable character id, everywhere at once, student surfaces included.

Each prompt records its own supersession in `DECISIONS.md` plus the area file,
per AGENTS.md → Working Rules.

## How to use this document

Same rules as features 4–11: each prompt is sized for one agent session, ends
green (`pnpm typecheck` + `pnpm test` + its own verification), gets **one
commit straight to `main`**, and is safe to push on its own. Run `pnpm format`
before committing; record newly-made decisions in `DECISIONS.md` +
`docs/decisions/teacher-live.md`; run the humanizer skill on all new
user-facing copy. The prompts are sequential — 2 needs 1's roster on the wire,
3 and 4 need 1's server-side roster — but each leaves the app fully working.
Production is driven once, in prompt 4.

Where a prompt names an **Ask the founder** question, raise it when you run that
prompt. Do not resolve it from this document.

- [ ] Prompt 1 — A renamed character reaches every student
- [ ] Prompt 2 — The rename follows a student into their live chat
- [ ] Prompt 3 — Removing a character actually removes it
- [ ] Prompt 4 — Nobody is silently left out of a chat, and the panel stops lying

## Shared context: the wire contract addition

In `shared/src/socket.ts`, per [`docs/adding-a-wire-event.md`](../adding-a-wire-event.md),
documented in `docs/api.md`. Feature 17 owns the event; 18 adds one field to
each side of it:

```ts
// ClientToServerEvents — teacher only, beside settings:update (socket.ts:264-265):
"activity:update-details": (payload: {
  characters: Character[];   // ← feature 18 adds this
  hostName: string;          // feature 17
  scenario: string | null;   // feature 17
}) => void;

// ServerToClientEvents — same shape, fanned to other host devices AND to
// every seated student:
"activity:details-changed": (payload: { characters: Character[]; /* … */ }) => void;
```

**This does not weaken the characterIds-only invariant.** A `Character` is
`{ id, name, emoji? }` — public data every student already fetches at join
through `GET /activities/:joinCode`
([`projections.ts:26-34`](../../server/src/store/projections.ts)). What must
never ride along is `teacherEmail`, `hostKey`, `settings`, seats, or chats,
which is exactly what the field-by-field projector and the exact-key allowlist
pin in `projections.test.ts` exist to prevent. That pin is **mandatory** and is
not covered by this feature's otherwise-minimal test budget.

## Shared context: character ids on the wire

The panel mints ids client-side as `live-character-N` from a module counter
that **resets on every page load**
([`hostActivity.ts:33-39`](../../client/src/lib/hostActivity.ts)), while the
server slugs ids from names at create time
([`activityStore.ts:78-92`](../../server/src/store/activityStore.ts)). Two host
devices — or one device refreshed twice — mint colliding ids for different
characters. The moment ids ride the wire, that collision becomes real data.

Two hard constraints on whatever fix is chosen:

1. **An id that any chat already references must never change.** Stored chat
   members hold a `characterId`
   ([`matching.ts:55-70`](../../server/src/live/matching.ts)) and both
   projectors resolve through it
   ([`projections.ts:129-139`](../../server/src/store/projections.ts)). Re-mint
   an in-use id and every card and every student bubble goes to the fallback.
2. **Ids are opaque and always were** — nothing renders them, so a change of
   minting scheme costs nothing except the collision math.

**Ask the founder (prompt 1):** make client-side minting collision-proof (a
random suffix, so the panel's ids are globally unique and the server takes them
as given), or have the server remap unknown ids to its own slugged ones and
echo the canonical roster back. The first is smaller; the second keeps id
minting in one place and matches how create already works.

## Shared context: the deploy race

`shared/` is in both deploy triggers, so one push races two pipelines and
Socket.IO drops an unhandled event **silently** (AGENTS.md → Working Rules).

- **Server ahead of client** is benign everywhere: an unknown extra payload
  field is ignored, and nobody emits the new field yet.
- **Client ahead of server bites prompt 1 specifically:** a panel emitting
  `activity:update-details` with a roster at a server that doesn't read it is
  exactly today's behavior (a local-only edit) with no error anywhere — which
  is the worst kind of silent, because it looks like the feature works on your
  own screen. **Split prompt 1 into a server commit and a client commit and
  push them separately**, polling `/healthz` for the server commit in between.
- Remember the tip-commit rule: the last commit of any push must touch
  `client/`, `shared/`, or a root manifest, or Vercel silently skips the client
  build. A docs-only follow-up goes in its own push.
- Prompt 2 is client-only and races nothing. Prompts 3 and 4 are
  server-behavior changes behind an event that already exists, so both
  directions are benign.

---

## Prompt 1 — A renamed character reaches every student

**Goal:** a teacher renames Brutus to "Brute the Betrayer" (or swaps his knife
emoji for a dagger) in the live settings panel, and within a second every
student's lobby roster chip says so — including a student who joins ten minutes
later, and including the teacher's second host device. The roster stops being
write-once: it is server truth, it survives a refresh, and the panel's promise
about character edits becomes true for everything except a chat already in
progress (prompt 2).

1. **Wire** (`shared/src/socket.ts`): add `characters: Character[]` to feature
   17's `activity:update-details` and `activity:details-changed`, with a
   docblock saying why a roster is student-safe and the email/settings/hostKey
   are not.
2. **Projector** ([`projections.ts`](../../server/src/store/projections.ts)):
   extend 17's `toActivityDetails(stored)` with `characters: stored.characters`
   — a field-by-field literal, never a spread. This payload reaches students.
   (Feature 17 names it `toActivityDetails` because it projects the
   student-visible detail block, not one event; if 17 shipped another name, use
   that one.)
3. **Allowlist pin** (`projections.test.ts`, **mandatory**): extend 17's
   exact-key assertion for `toActivityDetails` — it pinned
   `["hostName","scenario"]`, and this prompt makes it
   `["characters","hostName","scenario"]`. Add `characters` to the
   `fullRecord` fixture's expectations wherever it moved
   ([`projections.test.ts:24-44`](../../server/src/store/projections.test.ts)),
   and **re-pin `toChatSnapshot` / `toChatStarted`** — the docblock at
   [`projections.ts:125-128`](../../server/src/store/projections.ts) claims
   "the server's copy never changes," and this prompt kills that claim. Rewrite
   the comment to say the roster is now mutable and the fallback is reachable.
4. **Server handler** ([`handlers/teacher.ts`](../../server/src/live/handlers/teacher.ts),
   beside `settings:update` at `:248-263`): extend feature 17's
   `activityDetailsUpdateSchema` with the roster — the module-local
   `characterInputSchema` ([`schemas/activity.ts:27-41`](../../server/src/schemas/activity.ts),
   private to that file and reusable in place, no export needed) plus the same
   count bounds and duplicate-name refine the create schema uses
   ([`schemas/activity.ts:79-99`](../../server/src/schemas/activity.ts)), and
   whatever id rule the founder's answer settles on. Repeat the refine in the
   sibling schema rather than refactoring `createActivityRequestSchema` — the
   `teacherEmailUpdateSchema` precedent at `:63-71`. Assign onto the record from
   `getByHostKey`. Log a count, never the names.
5. **Fan out twice.** `socket.to(room(joinCode))` reaches the teacher's other
   devices; students never join that room ([`handlers/teacher.ts:51`](../../server/src/live/handlers/teacher.ts)
   is the server's only `socket.join`), so a per-seat loop over
   `record.seats.byId` is what reaches them — model it on `sendActivityPaused`
   ([`lobbyContext.ts:250-260`](../../server/src/live/lobbyContext.ts)). One
   helper in `lobbyContext.ts`, shared with feature 17.
6. **Teacher client.** [`useHostActivityLive.ts`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts):
   an `updateDetails` emitter beside `:265-270` and a listener beside the
   `settings:changed` one at `:181-183`.
   [`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx):
   add a roster diff beside the settings and email diffs, and fold the incoming
   echo into `setActivity` **without** re-entering `handleActivityChange` — the
   same anti-echo rule the settings sync already documents at `:243-249`.
7. **Student client.** [`useLobbyPresence.ts`](../../client/src/pages/student/useLobbyPresence.ts):
   relay the event to a callback prop exactly like `activity:paused` at
   `:236-238`. The roster is currently immutable lookup state
   ([`useActivityLookup.ts:64-67`](../../client/src/lib/useActivityLookup.ts),
   and `:75` short-circuits the fetch entirely on the `handedOff` path) — the
   `deliver` seam at `:98-103` already exists for exactly this and is wired
   through [`JoinActivityPage.tsx:71-75`](../../client/src/pages/student/JoinActivityPage.tsx).
   Use it; do not add a second state channel.
8. **Docs.** `docs/api.md` (the new field); the now-false comment at
   [`index.tsx:197-201`](../../client/src/components/Teacher/HostActivity/index.tsx)
   and the block comment at
   [`HostActivityPage.tsx:170-186`](../../client/src/pages/teacher/HostActivityPage.tsx)
   (characters leave the local-only list); `docs/decisions/teacher-live.md` +
   `DECISIONS.md` (supersede the character half of the 2026-07-19 local-only
   call). `tools/verify/README.md:103-107` still tells the browser-verification
   reader that character edits are local-only and a refresh reverts them — fix
   it here.

**Ask the founder (this prompt):** when a second host device edits the roster
while this device has a half-typed rename in the panel draft, does the incoming
roster fold into the open draft (a `mergeExternalSettings`-shaped merge,
[`hostActivity.ts:103-126`](../../client/src/lib/hostActivity.ts)) or is the
roster last-write-wins per device like the teacher's email
([`socket.ts:266-270`](../../shared/src/socket.ts))? Last-write-wins is smaller
but re-introduces the stale-device overwrite; the merge is one more pure
function. Also settle the id question in the shared context above.

**Edge cases:** a cleared emoji arrives as an absent key and the server
replaces the roster wholesale, so it clears — verify it rather than assuming;
an invalid draft never emits (the panel already holds its commit at
[`LiveSettingsPanel.tsx:89-98`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)),
and server zod is the backstop; a student mid-chat sees the lobby chips change
but their bubbles do not until prompt 2 — an acceptable half-state for one
commit, and better than today in every direction; a student whose socket is
down misses the event and heals on their next `GET /activities/:joinCode`.

**Tests:** the projections allowlist pin from step 3, and nothing else. It is
the privacy invariant, not part of the test budget. The round-trip is verified
in the browser.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass with
`verify:up --scale 10` — host a real activity, one student in the lobby, rename
a character and swap its emoji → the student's roster chips change within a
second without a refresh; open a second host tab → it shows the new name; open
a **third** browser and join fresh → the new name is there; refresh the host
page → the edit survived (it round-tripped through the server); the `1234`
demo unchanged with zero `/socket.io/` traffic. Server commit and client commit
pushed **separately** with a `/healthz` poll between them. `pnpm format`,
checkbox ticked.

---

## Prompt 2 — The rename follows a student into their live chat

**Goal:** a teacher renames a character while a chat is running, and the
students in that chat watch every bubble prefix, the peer label, the typing
indicator, the drop banner and the end-of-chat reveal row change to the new
name — no refresh, no waiting for the round to end. This is the half of
`teacher-live.md:1070-1100`'s promise ("student surfaces … re-labeling by
stable character id") that has never been true.

1. **Understand why prompt 1 is not enough.** Live participants are resolved
   **once**, at chat start: `applyChatStarted` builds `self`, `peers` and
   `everPeers` through `toParticipant`/`resolveCharacter` against the roster
   passed in ([`liveMatchState.ts:75-101`](../../client/src/pages/student/join/liveMatchState.ts),
   `:207-225`), and nothing re-resolves them afterwards. A new roster changes
   the lobby and nothing else.
2. **New pure reducer** in [`liveMatchState.ts`](../../client/src/pages/student/join/liveMatchState.ts):
   an `applyRoster(prev, roster)` that re-resolves `self`, `peers` and
   `everPeers` by `characterId` against the new roster, preserving everything
   the wire never carries — `realName` (stamped by `applyReveal` at
   `:350-363`), the participant `id`, message history, `offlinePeers`,
   `typingPeerId`, `returnedFlashId`. A non-live match is a no-op. A
   characterId the new roster no longer has keeps the label it had rather than
   collapsing to the mystery fallback at `:79-83`.
3. **One wiring line** in [`useActiveMatch.ts`](../../client/src/pages/student/join/useActiveMatch.ts):
   the roster the hook already reads at `:172-179` becomes the trigger —
   `setMatch((prev) => applyRoster(prev, activity?.characters ?? []))` when it
   changes. Keep the hook's shape: the reducer owns the transition, the hook
   owns the subscription.
4. **Verify the render path needs nothing.** `characterLabel`
   ([`characterLabel.ts:8-12`](../../client/src/lib/characterLabel.ts)) reads
   `participant.character`, and the ended screen's reveal rows read the same
   objects ([`ChatEndedSection.tsx:138-161`](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)),
   so re-resolving the participants is the whole change. Confirm rather than
   refactor — no new props, no new context.
5. **Docs.** `docs/architecture.md` if the reducer inventory is listed there;
   the `liveMatchState.ts` module docblock at `:19-27` (roster resolution is no
   longer a one-time parameter).

**Ask the founder (this prompt):** should a mid-chat rename **announce itself**
to the student — a notice line in the transcript, the way a peer's departure
gets one at `shrinkToPeers` ([`liveMatchState.ts:132-147`](../../client/src/pages/student/join/liveMatchState.ts))
— or should the label just quietly change? Silent is smaller and matches the
teacher's mental model ("I renamed the cast between rounds"); a notice avoids a
student wondering whether they are still talking to the same person. Do not
decide this without asking.

**Edge cases:** a rename landing between `chat:started` and the first message
(the reducer runs on a fresh match too); a rename landing after the chat ended
while the student is still on the ended screen (`prev.kind === "live"` is still
true — the reveal rows must relabel too); a rename of a character nobody in
this chat holds (no visible change, no churn); a removed character mid-chat —
prompt 3 decides whether that is even reachable, and until then the label
holds; the roster arriving before `chat:started` on a resume (the fresh build
already uses the current roster).

**Tests:** none. Every one of `applyRoster`'s obligations — labels update by id,
message history survives, `realName` survives to the reveal rows — is a line in
the browser pass below, so nothing here fails silently. The existing
[`liveMatchState.test.ts`](../../client/src/pages/student/join/liveMatchState.test.ts)
must stay green unchanged; if the reducer's signature forces a fixture edit,
edit the fixture rather than adding a case.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass —
teacher plus two students, start their chat, exchange a message, then rename
both characters and clear one emoji from the panel → both students' bubbles,
peer labels and typing indicator relabel live, and the message history is
intact; end the chat with **Reveal names** on → the reveal rows show the new
names (proof `realName` survived the re-resolve); rename a character nobody in
the chat holds → nothing moves; the `1234` demo unchanged. `pnpm format`, one
commit, checkbox ticked.

---

## Prompt 3 — Removing a character actually removes it

**Goal:** a teacher removes character 3 mid-activity and it is genuinely gone:
Pair-everyone stops forming trios on it, a manual 3-student start stops dealing
it, it never appears on a chat card again, and the removal survives a reload.
The row stays locked while a live chat is using that character — and the lock
finally means something, because the server enforces its own copy of it.

Keep the scope honest: only rows 3–4 are removable
([`CharacterRowsField.tsx:69`](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)),
`dealCast` only ever takes the roster's **first N**
([`matchRules.ts:31-33`](../../shared/src/matchRules.ts)), and auto-match always
deals two ([`autoMatch.ts:35-43`](../../server/src/live/autoMatch.ts)). Exactly
two paths are reachable: a manual 3-or-more `chat:start`, and pair-everyone's
trailing trio. Do not build for more.

1. **Server-side removal guard** in the `activity:update-details` handler: the
   server's twin of the client's `removeGuard`
   ([`LiveSettingsPanel.tsx:151-161`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)).
   Without it, `resolveCharacter`'s fallback
   ([`projections.ts:129-139`](../../server/src/store/projections.ts)) — which
   the docblock above it calls unreachable — goes live and renders a **raw
   opaque id** as a display name on the teacher's own chat card and on the
   student's bubbles.
2. **Pair-everyone and manual start read the new roster for free** once the
   server holds it (`matching.ts:150`, `:203`). Verify, don't refactor.
3. **Client `characterIdsInUse` is engine-divergent** — live builds it from
   server snapshot participants
   ([`useHostActivityLive.ts:274-278`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)),
   the demo from deal-time local objects
   ([`useHostActivityDemo.ts:263-267`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)).
   Prompt 1 mostly heals this by itself (an added character now reaches the
   server and can be dealt, so its row can lock). Re-verify both engines rather
   than unifying them.
4. **Docs.** `docs/api.md` (the guard's refusal semantics); the comment at
   [`LiveSettingsPanel.tsx:111-113`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
   (its claim is finally true — say where it is enforced); `DECISIONS.md` +
   `teacher-live.md` for whatever the two questions below settle.

**Ask the founder (this prompt), two questions:**

- **A character that an _ended_ chat still shows.** The guard has to cover
  active chats or a running room breaks. Ended chats are the real choice: (a)
  guard those too, so a character used once can never be removed for the
  activity's life; (b) allow removal and let completed cards fall back —
  unacceptable as-is, since the fallback prints a raw id; (c) capture the
  character's name and emoji onto `chat.members` at chat start
  ([`matching.ts:154-168`](../../server/src/live/matching.ts)) so a removed
  character's completed card keeps its label forever. (c) is a small data-model
  change and is what the client's `withCurrentCharacters` fallback was already
  reaching for. Present all three.
- **Is `removeGuard` still wanted at all, and if so, should it gate more than
  the remove button?** Today it is inconsistent: it swaps the remove button
  ([`CharacterRowsField.tsx:70`](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx),
  `:113-122`) while the emoji slot (`:73-77`) and the name input (`:80-92`)
  stay wide open — the row that says "…is in a live chat right now" lets you
  rename that character and strip its emoji freely. Once renames propagate
  safely (prompts 1–2), renaming an in-use character is a _feature_, and the
  guard may only need to keep covering removal. Do not tighten or loosen it
  without asking.

**Edge cases:** removal racing a chat start (the server holds both, so
whichever lands first wins and the other is a clean refusal or a clean deal);
removal dropping the roster below three while a trio is running (the trio keeps
its dealt characters; only future deals shrink); a refused removal must not
leave the panel showing a vanished row — the panel calls `setDraft`
unconditionally at [`LiveSettingsPanel.tsx:105-117`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx),
so decide how a server refusal gets back to the draft (the echo from prompt 1
is the cheapest channel). **Read `removeCharacter` before you plan that**:
[feature 13](./feature-13-settings-commit-reliability.md) rewrites exactly this
function — it drops the validity gate at `:114` and commits the removal
straight from the committed activity — so if 13 shipped, the removal always
emits and the refusal path is the only way the row can come back. Removing then
re-adding a character with the same
name mints a different id, so old chats keep resolving to the old one, which is
correct.

**Tests:** none new. The projections pin from prompt 1 already covers the
payload, `matchRules` is already tested, and the guard's behavior is two
browser clicks. Add one only if the founder picks option (c) above and the
stored member shape changes, in which case the existing `matching.test.ts`
fixture needs updating anyway.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — three
students waiting, four characters; remove character 4, Pair everyone → the
trio is dealt from characters 1–3 and character 4 appears nowhere; start a
manual 3-student chat while a character is in use → its row shows the Live dot
and the remove is refused server-side too (drive it from a scratch
`socket.io-client` script in `tools/verify/scratch/` if the UI won't let you
try); reload the host page → the removal stuck; no raw id renders on any card
or bubble; the `1234` demo unchanged. `pnpm format`, one commit, checkbox
ticked.

---

## Prompt 4 — Nobody is silently left out of a chat, and the panel stops lying

**Goal:** the teacher selects three students for a chat and either all three
get seated or the teacher is told why not — instead of two getting a chat and
the third sitting in the queue with nothing marking them. Then the panel's
opening sentence gets to say what it originally said, because it is finally
true, and the whole feature gets its one production drive.

1. **The silent under-seating.** `createChat` clamps the request to the server
   roster and returns a chat for whoever fit
   ([`matching.ts:142-151`](../../server/src/live/matching.ts)); the leftover
   student gets no highlight, because `createChat` only ever clears
   `leftoverStudentId` ([`matching.ts:178-183`](../../server/src/live/matching.ts)),
   and the teacher's selection is already gone
   ([`index.tsx:114-118`](../../client/src/components/Teacher/HostActivity/index.tsx)).
   Prompt 1 closes the usual cause (the roster now matches), but the window
   stays open through the panel's 1s debounce and any network latency, so this
   is a server robustness gap worth closing on its own terms.
2. **Ask the founder (this prompt):** what should the under-seated case do?
   (a) mark the unseated students as the leftover so the existing highlight
   explains it — the smallest change, and it reuses machinery the rail already
   renders; (b) refuse the whole `chat:start` when the request exceeds the
   roster, leaving the selection intact so the teacher can fix it; (c) keep
   clamping but surface a rail notice in the `rematchNotice` idiom
   ([`handlers/teacher.ts:130-140`](../../server/src/live/handlers/teacher.ts)).
   Get the call, then implement exactly one of them. Get the copy wording too
   if it needs any.
3. **Widen the panel copy** at
   [`LiveSettingsPanel.tsx:134-138`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx),
   which feature 12 narrowed to scope the promise to settings and email. With
   features 17 and 18 shipped the original claim — changes reach everyone the
   moment you pause typing, students mid-chat included — is true again. **Ask
   the founder for the wording** rather than reverting to the old string
   verbatim; then run the humanizer skill on it. Check the collapsed hint at
   `:128-132` while you are there — feature 12 already reshaped that one for a
   different reason (it can only see this tab's copy of the email), so confirm
   it still reads true rather than re-opening its shape.
4. **Demo parity — and it is the inverted kind.** `/activity/host/1234` already
   deals from the live-edited local roster
   ([`hostWorld.ts:107-124`](../../client/src/components/Teacher/HostActivity/hostWorld.ts),
   handed in by [`useHostActivityDemo.ts:68-73`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts),
   `:113-122`), so renaming, adding and removing all visibly work there **today**
   — the demo has been _better_ than live, which is how a teacher learns the
   panel and concludes roster editing works everywhere. After this feature the
   demo finally tells the truth. Expect **no demo engine work**; what this step
   owes is a re-verification pass and a note if anything drifted. The demo's
   student tab reads a separate module constant with no cross-tab sync
   ([`hostActivityDemo.ts:7-14`](../../client/src/mockData/hostActivityDemo.ts))
   and stays that way.
5. **Docs and the status table.** Give this feature its row in `AGENTS.md`'s
   status table, and correct the "nothing on a real activity is simulated
   anymore" claim — today it sits at [`AGENTS.md:22`](../../AGENTS.md), but
   [feature 20](./feature-20-docs-and-copy-drift-cleanup.md) rewrites that
   sentence and asks the founder whether the fact belongs in `AGENTS.md`'s
   Status block or in `architecture.md`'s realtime section, so **find its home
   before editing it** and fix the one home rather than both. This feature is
   what finally makes the roster half of it true. Then `docs/api.md`;
   `DECISIONS.md` + `teacher-live.md` for the under-seating call and the copy
   call.
6. **The production drive** (once per feature, per AGENTS.md): cold-wake check
   as the session's first server contact, then the feature's network-sensitive
   legs on chaverola.com — rename reaching a real second device and a real
   student handset mid-chat, a removal, an add-then-seat-three. Send it to a
   real phone; if that can't happen now, record it in
   `docs/pending-manual-tests.md` rather than letting the ask evaporate.

**Edge cases:** a two-character roster with three students selected (the oldest
reachable version of this bug, unchanged by the roster sync); the leftover
highlight colliding with pair-everyone's own leftover (one field,
`leftoverStudentId` — whichever wrote last wins, and that is fine, but say so);
selecting four students on a four-character roster remains the normal path and
must not regress; a roster edit landing between the teacher's tap and the
server's `createChat` (the server's copy is the arbiter, which is the whole
point).

**Tests:** none new — the seating rule change is one branch in `createChat`
with a visible consequence in the rail, and `matching.test.ts` already fixtures
the surrounding behavior. Add an assertion to an existing test only if the
founder picks option (b), where the refusal is invisible from the client.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — three
students, two characters, select all three and Start their chat → the chosen
behavior happens and the teacher can tell what happened; add a third character,
wait for the commit, select all three again → all three get seated; the panel's
new sentence is humanized and accurate; `/activity/host/1234` still renames,
adds and removes with zero `/socket.io/` traffic. **Then the production pass**
as described in step 6, on chaverola.com. `pnpm format`, one commit, checkbox
ticked, `AGENTS.md` row flipped.
