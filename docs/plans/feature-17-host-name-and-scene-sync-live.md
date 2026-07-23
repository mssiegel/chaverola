# Feature 17 — The teacher's name and the scene reach students live

The live settings panel lets a teacher rewrite **Your name** and **The scene**
mid-activity. Neither edit leaves the tab. The one place an edit reaches the
server is `handleActivityChange`
([`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx)),
and it diffs exactly two things: `next.settings` (`:257-260`) and
`next.teacherEmail` (`:266-268`). `hostName` and `scenario` land in
`setActivity(next)` at `:269` and die there. There is no event for them in
`ClientToServerEvents`
([`socket.ts:222-292`](../../shared/src/socket.ts)), no handler
([`teacher.ts:248-286`](../../server/src/live/handlers/teacher.ts) is where the
two that exist live), no REST update route
([`activities.ts:34,49,62`](../../server/src/routes/activities.ts) are create,
host-read, student-read), and `StoredActivity.hostName` / `.scenario` are
write-once at create
([`activityStore.ts:157-174`](../../server/src/store/activityStore.ts)).

**Reproduce it in about two minutes** (the audit's three lenses disagreed on
the _mechanism_ of the scene bug — one said students see a stale scene
mid-chat, which is wrong, because no student surface renders the scene
mid-chat at all — so start from the observed behavior, not the story):

1. Host a real activity as "Ms. Cohen" with a scene. Two students join and
   sit in the lobby.
2. In **Edit activity settings**, change **Your name** to "Mr. Levi" and
   rewrite **The scene**. Stop typing for a second so the panel commits.
3. The host header flips to "Hosted by Mr. Levi"
   ([`HostHeader.tsx:47-49`](../../client/src/components/Teacher/HostActivity/HostHeader.tsx)).
   Both student lobbies keep the old name and the old scene
   ([`WaitingLobby.tsx:39`](../../client/src/components/Student/WaitingLobby.tsx),
   [`:74-80`](../../client/src/components/Student/WaitingLobby.tsx),
   [`:82-89`](../../client/src/components/Student/WaitingLobby.tsx)) — forever.
4. Now open a **third** tab and join fresh. The join gate
   ([`JoinGateCard.tsx:166-173`](../../client/src/pages/student/join/JoinGateCard.tsx))
   and the lobby show the **old** name and scene too. This is the sharp bit:
   the server was never told, so `toActivity`
   ([`projections.ts:26-34`](../../server/src/store/projections.ts)) hands the
   original values to a student who joins ten minutes later. It is missing
   data, not a stale cache, and no refresh can heal it.
5. Refresh the host page: the teacher's own edit is gone as well.

Setup promises step 3 will work, in as many words: _"Students see 'Hosted by
{name}' in the lobby"_
([`ActivitySetup/index.tsx:240-245`](../../client/src/components/Teacher/ActivitySetup/index.tsx)).
And the scene is worse than stale — it is currently an **unobservable no-op on
every surface**: `activity.scenario` renders in exactly one place in the whole
client, `WaitingLobby.tsx:82-89`. A teacher can rewrite the scene, watch it sit
in the textarea, and change nothing anywhere, including on their own page.

**Deliberately the two fields that only render in the student LOBBY.** Both
are lobby-only, so this ships without touching mid-chat label resolution —
which is what makes it the small first edit-sync slice. Feature 18 (character
roster sync) extends the **same event** with `characters` to reach the student
**lobby**, and on a separate track snapshots each chat's cast at start so a
running chat keeps its names — that is where `liveMatchState.ts`, the frozen-cast
projectors, and retiring the removal guard get paid for. A character edit
deliberately does **not** reach a chat already in progress. Design here is
chosen so 18 extends this event rather than rewriting it: see the wire contract
section.

**The decisions this supersedes.** Local-only name/scene edits are a recorded
founder call, twice:
[`teacher-live.md:681-712`](../decisions/teacher-live.md) ("The live-settings
panel stays on real activities, editing the teacher's local view", 2026-07-19,
whose closing note says character/scenario/host-name edits stay local "until
roster sync ships") and
[`teacher-live.md:505-531`](../decisions/teacher-live.md) ("Settings edits sync
for real; characters, scenario, and host name stay local"). This document
**supersedes the name and scene half of both** and leaves the characters half
standing for feature 18. Prompt 2 records that in `DECISIONS.md` + the
`docs/decisions/teacher-live.md` entry, in the supersession style those entries
already use, and deletes the now-false comments at
[`HostActivity/index.tsx:197-201`](../../client/src/components/Teacher/HostActivity/index.tsx)
and
[`HostActivityPage.tsx:182-185`](../../client/src/pages/teacher/HostActivityPage.tsx).

## How to use this document

Same rules as features 4–11: each prompt is sized for one agent session, ends
green (`pnpm typecheck` + `pnpm test` + its own verification), gets **one
commit straight to `main`** (prompt 1 splits into a server commit and a client
commit — see the deploy race), and is safe to push on its own. Run
`pnpm format` before committing; record newly-made decisions in `DECISIONS.md`

- `docs/decisions/teacher-live.md`; run the humanizer skill on any new
  user-facing copy. The prompts are sequential — prompt 2 is the client half of
  the event prompt 1 already emits — but each leaves the app fully working, and
  prompt 1 on its own already fixes the late-joining student.

Each prompt carries **Ask the founder** items. Raise them when you run that
prompt, get an answer, then build. Do not resolve them yourself.

- [ ] Prompt 1 — The name and scene edits reach the server (and the teacher's other devices)
- [ ] Prompt 2 — Students' lobbies follow the edit live

## Shared context: the wire contract addition

In `shared/src/socket.ts`, per the seven touch points in
[`docs/adding-a-wire-event.md`](../adding-a-wire-event.md), documented in
`docs/api.md`:

```ts
// ClientToServerEvents (teacher only, beside settings:update at :265):
"activity:update-details": (payload: {
  hostName: string;
  scenario: string | null; // null clears the scene
}) => void;

// ServerToClientEvents — to the teacher room minus the sender AND to every
// connected seat. Same shape both directions.
"activity:details-changed": (payload: {
  hostName: string;
  scenario: string | null;
}) => void;
```

**Why this shape makes feature 18 an extension.** The payload is "the
student-visible half of the activity, full-replace" — the same idiom
`settings:update` uses for the settings object. Feature 18 adds one key,
`characters: Character[]`, to both events and one line to the allowlist pin;
it does not add an event, a second projector, or a second fan-out. The
recipients are already right: teachers _and_ students both need the roster.
Name the projector `toActivityDetails` for the same reason — it is the
student-visible detail block, not "the host name event".

The projector is a **field-by-field literal, never a spread**
(`projections.ts`'s house rule, stated at `:18-23`). This payload goes to
STUDENTS, so `teacherEmail`, `hostKey` and `settings` must be structurally
unable to ride along, and the exact-key pin in `projections.test.ts` is what
keeps it that way. `scenario` travels as `string | null` rather than an
optional key so a clear is expressible; `toActivity` keeps its
omit-when-undefined shape untouched (`projections.ts:32`).

## Shared context: the deploy race

This is the dangerous direction. `shared/` is in both deploy triggers, so one
push races two pipelines, and **a client emitting an event the server has no
handler for is dropped silently** — which here means the teacher's edit looks
applied, then vanishes on the next refresh, exactly the bug being fixed.

So prompt 1 ships as **two commits pushed separately**: the server commit
(`shared/` + `server/`) first, poll `/healthz` for that commit, then the client
commit (`client/`). Prompt 2 is client-only and benign in both directions (an
old client simply has no listener for an event the server already emits).
Remember the tip-commit rule: the tip of any push must touch `client/`,
`shared/`, or a root manifest or Vercel silently skips the client build —
prompt 1's server push has `shared/` in it, prompt 2's push is all `client/`,
so both are fine as long as no docs-only commit rides on top.

## Shared context: what the demo needs (nothing)

The `1234` demo already edits these fields "live" — the demo host page holds
its activity in local state and the panel writes straight into it
([`HostActivityPage.tsx:193-205`](../../client/src/pages/teacher/HostActivityPage.tsx)),
so renaming the host on `/activity/host/1234` already updates the demo header.
The demo's student tab reads a **separate deep-copied constant** and there is
no cross-tab sync by design
([`hostActivityDemo.ts:8-14,22-28`](../../client/src/mockData/hostActivityDemo.ts)).
The demo is therefore structurally unable to show a cross-tab edit, and the
two engines need no change for this feature. Say so out loud in the prompt 2
commit rather than inventing a simulation for it.

- **Ask the founder:** confirm the demo stays as-is here. The repo rule is "a
  feature isn't done until the demo shows it", and this is a deliberate
  exception, so it should be the founder's call, not an agent's.

---

## Prompt 1 — The name and scene edits reach the server (and the teacher's other devices)

**Goal:** a teacher who renames themselves or rewrites the scene mid-activity
changes the activity for real. The edit survives a refresh of the host page, a
second host device follows it live, and — the part that matters most — a
student who joins **after** the edit gets the new name and the new scene,
because `GET /activities/:joinCode` now reads changed stored values. Students
already in the lobby still keep the old copy until prompt 2.

1. **Wire** (`shared/src/socket.ts`): both events above, with docblocks in the
   established voice (teacher-only, zod-validated, full-replace, null clears).
2. **Schema** ([`activity.ts`](../../server/src/schemas/activity.ts)): declare
   `activityDetailsUpdateSchema` as a **sibling** const in the
   `teacherEmailUpdateSchema` idiom (`:63-71`) — same shared constants, same
   limits, same word-count refine as the create schema's `hostName` (`:74-78`)
   and `scenario` (`:100-109`) fields, with `scenario` as
   `z.union([z.null(), …])` so a clear is expressible. Feature 11 set this
   precedent deliberately: **don't refactor `createActivityRequestSchema`** to
   share the field definitions. No new rules, no new limits — the panel's
   client-side validation and this schema must keep agreeing.
3. **Projector** ([`projections.ts`](../../server/src/store/projections.ts)):
   `toActivityDetails(stored)` as a field-by-field literal returning
   `{ hostName, scenario: stored.scenario ?? null }`, beside `toActivity` at
   `:26-34`.
4. **Allowlist pin — mandatory**
   ([`projections.test.ts`](../../server/src/store/projections.test.ts)):
   `expect(Object.keys(toActivityDetails(fullRecord)).sort()).toEqual(["hostName","scenario"])`,
   in the style of the `toActivity` pin at `:79-88`. This is the privacy
   invariant and is not covered by "fewer tests".
5. **Handler** ([`teacher.ts`](../../server/src/live/handlers/teacher.ts)):
   `socket.on("activity:update-details", …)` beside `settings:update`
   (`:248-263`) — safeParse, `getByHostKey`, assign `current.hostName`, and
   set-or-`delete` `current.scenario` in the same idiom the email handler uses
   at `:273-277`; log the join code (never the scene text).
6. **Fan out twice.** `socket.to(room(data.joinCode)).emit(...)` covers the
   teacher's other devices. Students **never join the teacher room** —
   `teacher.ts:51` is the only `socket.join` in the server — so add a
   `sendActivityDetails(record)` helper to
   [`lobbyContext.ts`](../../server/src/live/lobbyContext.ts) that loops
   `record.seats.byId` and emits to each connected seat's socket, modeled
   exactly on `sendActivityPaused` (`:250-260`). Nobody is listening on the
   student side until prompt 2; that is the safe direction.
7. **Engine seam** ([`hostEngine.ts`](../../client/src/components/Teacher/HostActivity/hostEngine.ts)):
   `updateDetails(details: { hostName: string; scenario: string | null }): void`.
   [`useHostActivityLive.ts`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
   emits it beside `updateTeacherEmail` (`:268-270`) and registers the
   `activity:details-changed` listener beside `settings:changed` (`:181-183`),
   forwarding to a new `onDetailsSync` prop in the `onSettingsSync` style;
   [`useHostActivityDemo.ts`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
   is a no-op (demo edits already flow through local `setActivity`).
8. **Call site** ([`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx)):
   add a details diff beside the email diff — when `hostName` or `scenario`
   moved, `engine.updateDetails({ hostName: next.hostName, scenario: next.scenario ?? null })`.
   Wire `onDetailsSync` to fold the server's copy into `setActivity` **without
   re-entering `handleActivityChange`** — the anti-echo rule already spelled
   out at `:243-249`.
9. **Only if the founder keeps the second-device echo: don't clobber a
   half-typed edit.** The panel seeds its draft once
   ([`LiveSettingsPanel.tsx:47-49`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx))
   and never re-reads `hostName`/`scene`, so an arriving remote change needs the
   same treatment settings get: a `mergeExternalDetails(prev, next, draft)`
   beside [`mergeExternalSettings`](../../client/src/lib/hostActivity.ts)
   (`hostActivity.ts:113-126`), applied in the panel's merge effect at `:58-65`.
   **If the answer is silent last-write-wins, skip this step entirely** — there
   is no incoming event to merge, and the pure function isn't worth writing on
   spec.
10. **Docs.** `docs/api.md` (the two events). Amend the code comments at
    `HostActivityPage.tsx:182-185` and `HostActivity/index.tsx:197-201` to say
    name and scene now reach the server and the teacher's other devices, with
    students landing in prompt 2 — the full supersession entry is prompt 2's.

**Ask the founder:**

- Should a **second host device** hear a name/scene edit live (the
  `settings:changed` idiom, `teacher.ts:257-262`), or should it be silent
  last-write-wins like the teacher's email deliberately is
  (`socket.ts:266-270`)? The steps above assume the echo; if the answer is no,
  drop the `socket.to(room(...))` leg and keep only the seat loop.
- **Clearing the scene**: when the teacher empties the scene textarea, does
  "The scene" disappear from students' lobbies, or does an emptied box mean
  "leave the scene as it was"? The wire carries `null` either way; this is the
  product call about what an empty box means. (Note the asymmetry today:
  `activityFromLiveDraft` at `hostActivity.ts:168-171` simply omits an empty
  scene, so the teacher's own page currently treats empty as "no scene".)

**Edge cases:** an emptied **name** never commits at all — the panel's whole
commit is gated on `validateLiveDraft`
(`LiveSettingsPanel.tsx:84-98`), so a blank host name can't reach the wire, and
the server schema is the backstop; a mid-edit disconnect drops the edit exactly
like a settings edit does today; a second device that was asleep during the
edit still refetches on reload (its stale-full-object problem belongs to
features 13/14, not here); the scene's word/char caps are enforced by the same
schema the create route uses, so a paste-bomb is rejected server-side, silently
like every other socket rejection.

**Tests:** the `toActivityDetails` allowlist pin from step 4 — mandatory,
privacy-bearing. Nothing else: the handler is a validated-input store write in
the `settings:update` idiom, and every other leg is visible in a browser
within seconds.

**Done when:** `pnpm typecheck` + `pnpm test` green; local pass with a host tab
and a student tab — rename the host and rewrite the scene, **refresh the host
page** and the edit is still there (proof it round-tripped through the server);
open a **second host tab** on the same hostKey and watch it follow the edit
live; **join a new student after the edit** and see the new name on the join
gate and the new name + scene in the lobby; a student who was already in the
lobby still shows the old copy (that's prompt 2); the `1234` demo unchanged
with zero `/socket.io/` traffic. **Push the server commit first, poll
`/healthz` for it, then push the client commit** and confirm Vercel Ready.
`pnpm format`, two commits, checkbox ticked — this prompt stands on its own
(the late-joining student is already fixed); the AGENTS.md status row waits for
prompt 2.

---

## Prompt 2 — Students' lobbies follow the edit live

**Goal:** a student sitting in the lobby watches "Hosted by Ms. Cohen" become
"Hosted by Mr. Levi" and the scene rewrite itself, without a refresh and
without losing their seat. Their tab has been receiving `activity:details-changed`
since prompt 1 and ignoring it; this prompt gives it somewhere to land.

1. **Listener** ([`useLobbyPresence.ts`](../../client/src/pages/student/useLobbyPresence.ts)):
   register `activity:details-changed` beside the `activity:paused` relay at
   `:236-238` and forward to a new `onActivityDetails` callback prop,
   latest-ref'd beside `onPeerConnection` (`:192`). The hook stays a thin
   relay, per touch point 5 of `docs/adding-a-wire-event.md`.
2. **Thread it up** ([`useActiveMatch.ts:37-57`](../../client/src/pages/student/join/useActiveMatch.ts)):
   accept `onActivityDetails` as a caller-supplied prop and forward it
   untouched, the same way `onEnded` is forwarded (its docblock at `:23-36`
   explains the rule: page-level state stays with the page).
   **Deliberate deviation from the seven touch points:** there is **no**
   `liveMatchState.ts` reducer here. Nothing about a chat changes — the fields
   live on the activity lookup, not on the match. Say so in the commit so the
   next agent doesn't go looking for the missing reducer.
3. **Make the student's activity replaceable**
   ([`JoinActivityPage.tsx:70-75`](../../client/src/pages/student/JoinActivityPage.tsx)):
   the lookup already exposes exactly the channel needed —
   `deliver` ([`useActivityLookup.ts:98-103`](../../client/src/lib/useActivityLookup.ts))
   writes `settled`, and settled state **outranks** both the `handedOff`
   hand-off map (`:118-128`) and any refetch (`:75` short-circuits the effect
   while the map holds the code). So the page's `onActivityDetails` handler
   rebuilds the activity field-by-field (`hostName` from the payload,
   `scenario` set or omitted, `characters`/`joinCode` carried over) and calls
   `deliverLookup`. No new state, no new hook, no cache invalidation.
4. **Render sites need no change.** `WaitingLobby.tsx:39,74-80,82-89` and
   `JoinGateCard.tsx:166-173` already read from `activity`; they re-render
   when the lookup does.
5. **Decisions.** Record the supersession: add the entry to the top of
   [`docs/decisions/teacher-live.md`](../decisions/teacher-live.md) and its one
   line to `DECISIONS.md`, and add the supersession notes onto `:505-531` and
   `:681-712` in the style those entries already use (`:496-503` and `:706-712`
   are the models). The decision to record is the **reversal**: host name and
   scene now sync to students live; characters remain local-only until feature 18. Then delete the now-false comments at
   `HostActivity/index.tsx:197-201` and `HostActivityPage.tsx:182-185`,
   leaving only the characters caveat.
6. **Docs.** `docs/api.md` if prompt 1 left the student-recipient half
   unstated; the AGENTS.md status table only moves when the feature is
   complete, which is here.

**Ask the founder:**

- Does the lobby **announce** the change (a brief "Your teacher updated the
  scene" line or a highlight on the changed block) or does it swap silently?
  Silent is the smaller build and matches how `activity:paused` behaves. If
  the answer is announce, that string is new user-facing copy and needs the
  humanizer pass before the prompt is done.
- The panel's promise copy at
  [`LiveSettingsPanel.tsx:134-138`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
  becomes _two-thirds_ true when this ships — characters are still local. The
  ownership is already settled between the other two docs:
  [feature 12](./feature-12-the-settings-panel-tells-the-truth.md) narrows the
  sentence to what travels today, and
  [feature 18](./feature-18-character-roster-syncs-live.md) prompt 4 widens it
  once the roster syncs. **The only open question is the interim**: does this
  prompt touch that sentence to fold name and scene in, or does it stay narrow
  until 18 widens it in one go? Read what the string actually says before
  asking — if 12 hasn't shipped, it is still the original over-promise. Either
  way, don't rewrite it twice, and any new wording gets the humanizer pass.

**Edge cases:** a student **mid-chat** when the edit lands has no lobby on
screen, but their lookup updates, so returning to the lobby shows the new copy
and no chat state is touched; a student on the **name** stage sees the join
gate's "Hosted by" update under them, which is correct and harmless; a
disconnected student misses the event and heals on reconnect only if they
reload (accepted — the lobby's copy is not worth a snapshot field, and the
next student to join gets fresh truth from `toActivity`); `scenario: null`
must **remove** the block rather than render an empty one (see prompt 1's
founder question about what clearing means); the demo student tab is untouched
by design (see the shared context).

**Tests:** none. The allowlist pin landed in prompt 1; everything here is a
relay plus a state write, and a broken relay is loud in the browser within
seconds — nothing about this failure mode is silent.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass with one host
tab and **two student tabs** (one sitting in the lobby, one mid-chat) — rename
the host and rewrite the scene, and the lobby tab updates without a refresh
while the chatting tab is undisturbed and shows the new copy when its chat
ends; clear the scene and the block behaves as the founder decided; a third
student joining afterward gets the same truth; the `1234` demo is unchanged
with zero `/socket.io/` traffic, desktop and phone widths. **Production pass**
on chaverola.com (this is the feature's one prod drive): cold-wake check first,
then the same host-plus-two-students run against the real server, after
confirming `/healthz` carries the new commit and Vercel is Ready. `pnpm format`,
one commit, both checkboxes ticked, AGENTS.md status row added.
