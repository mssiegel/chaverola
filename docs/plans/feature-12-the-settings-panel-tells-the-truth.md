# Feature 12 — The live settings panel stops promising what it cannot do

The host page's **Edit activity settings** panel opens with a promise it can't
keep. Its lead paragraph
([`LiveSettingsPanel.tsx:134-138`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx))
reads _"Changes reach everyone the moment you pause typing, including what
students see mid-chat."_ Characters, the scene and the host name reach nobody.
The one place an edit leaves the tab is
[`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx),
which diffs exactly two things: `settings` and `teacherEmail`. And "what
students see mid-chat" has no referent at all for the scene — its only student
render site in the whole client is the lobby card at
[`WaitingLobby.tsx:82-89`](../../client/src/components/Student/WaitingLobby.tsx).

**Reproduce it in a minute** (real join code, one teacher tab + one student tab):

1. Student joins and sits in the lobby. Teacher opens **Edit activity
   settings**, renames a character and rewrites the scene, then waits out the
   1-second pause.
2. The student's lobby still shows the old scene and the old character names —
   and so does a student who joins now. Refresh the host page: both edits are
   gone.
3. Pause all chats and reopen the panel. The **Match students 1:1
   automatically** row still says students "get paired up on their own", while
   [`autoMatch.ts:32`](../../server/src/live/autoMatch.ts) returns early on a
   paused class and pairs nobody. The pairing rail six inches away says it
   correctly ([`PairingPanel.tsx:299-303`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)).

Step 3 has a plain cause:
[`SettingsSection.tsx:18-26`](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx)
takes no `paused` prop, so its auto-match description at
[`:59-78`](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx)
promises pairing regardless. The rail already receives `engine.paused`
([`index.tsx:171`](../../client/src/components/Teacher/HostActivity/index.tsx));
the panel beside it
([`index.tsx:202-206`](../../client/src/components/Teacher/HostActivity/index.tsx))
is handed nothing. A third sentence states a global fact from local state: the
collapsed hint at
[`LiveSettingsPanel.tsx:128-132`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
nudges _"No email yet…"_ whenever this tab's `activity.teacherEmail` is empty,
but since feature 11 prompt 1 the email is a real server value with **no echo
event** by written decision ([`teacher-live.md:8-38`](../decisions/teacher-live.md))
— so device B keeps nudging after device A set one, and taking the nudge
overwrites A's address.

**Which decision this works within.** Two entries in
[`docs/decisions/teacher-live.md`](../decisions/teacher-live.md) contradict each
other and the UI ships the older one. [`:1070-1085`](../decisions/teacher-live.md)
(2026-07-15) specified the in-UI promise back when the host page was
client-side and it was true; the 2026-07-19 founder call at
[`:681-712`](../decisions/teacher-live.md) made roster, scene and host name
local-only and never superseded it. This doc works **within** the 2026-07-19
call and retires the copy half of the 2026-07-15 one — no behavior change, no
wire change. **It is temporary by design:** features 17 and 18 restore the
fuller promise, and whoever finishes 18 comes back and widens this copy. Say so
in the decision entry so the next agent finds it.

- [ ] Prompt — The panel only claims what it can actually do

---

## Prompt — The panel only claims what it can actually do

**Goal:** a teacher reading the live settings panel can trust every sentence in
it. The lead paragraph scopes its promise to what really travels, the auto-match
row admits it's on hold while chats are paused, and the collapsed email nudge
stops asserting something it can't know. No wire, no server, no behavior change.

1. **Rewrite the lead paragraph**
   ([`LiveSettingsPanel.tsx:134-138`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx))
   so it is true of all four blocks underneath. The facts it has to respect:
   settings and the teacher's email reach the server on the 1-second pause;
   character names and emoji re-label the teacher's own chat cards and pairing
   queue but never reach a student and don't survive a refresh; the host name
   changes only the page header; the scene renders on **no** teacher surface at
   all. Keep it short — it's a hint above a form, not a changelog.
   - **Ask the founder:** the exact wording, and how much of the split to spell
     out — including whether the scene gets its own sentence, since it is the
     one edit with no visible effect anywhere.
2. **Give the auto-match row `paused`.** Add an optional `paused?: boolean` to
   [`SettingsSection.tsx:18-26`](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx)
   and use it in the description at
   [`:59-78`](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx).
   `LiveSettingsPanel` takes `paused` and passes it down
   ([`:192-196`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx));
   [`index.tsx:202-206`](../../client/src/components/Teacher/HostActivity/index.tsx)
   passes `engine.paused`, the value the rail already gets at
   [`index.tsx:171`](../../client/src/components/Teacher/HostActivity/index.tsx).
   The setup form passes nothing and keeps today's text.
   - **Ask the founder:** should the paused row reuse the rail's exact sentence
     ("Auto-match is on hold while chats are paused.") so the two controls read
     identically, or say it in the row's own longer voice?
3. **Fix the collapsed hint**
   ([`LiveSettingsPanel.tsx:128-132`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)).
   - **Ask the founder:** soften the nudge into an invitation rather than a
     statement of fact; or always show the neutral hint and move the nudge
     inside the panel beside the email field; or leave it and accept the
     second-device case. Implement only the one they pick.
4. **Humanizer** on every string this prompt writes or changes.
5. **Decisions.** A new entry at the top of
   [`docs/decisions/teacher-live.md`](../decisions/teacher-live.md) recording
   what the panel now claims and that features 17 and 18 widen it back, plus a
   dated `_Partly superseded …_` note on the 2026-07-15 entry at
   [`:1070-1099`](../decisions/teacher-live.md) — the idiom already used at
   [`:496-503`](../decisions/teacher-live.md) — retiring its "changes reach
   everyone instantly" half. One line in `DECISIONS.md`.
6. **Leave the repo-internal drift alone.** Code comments and prose docs about
   what syncs are somebody else's — and specifically **not** feature 20's. The
   comment above the panel at
   [`index.tsx:197-201`](../../client/src/components/Teacher/HostActivity/index.tsx)
   is accurate today; features
   [17](./feature-17-host-name-and-scene-sync-live.md) and
   [18](./feature-18-character-roster-syncs-live.md) rewrite it when the sync
   scope actually moves, and
   [feature 20](./feature-20-docs-and-copy-drift-cleanup.md) only checks their
   work. This prompt touches user-facing copy, one prop, and the decision
   entries.

**Edge cases:** the panel is one component rendered by both engines, so the new
copy also shows on the `1234` demo — check it reads true there, where roster
edits _do_ drive the simulation's own pairings
([`hostWorld.ts:113-124`](../../client/src/components/Teacher/HostActivity/hostWorld.ts))
but still reach no student. The demo's `paused` is a real boolean, so the paused
row is reachable there too, which is the cheapest place to see it.

**Tests:** none. Every change is a rendered string or a prop passed to a
description — a regression is on the screen, never silent — and the client suite
is DOM-free by policy (`DECISIONS.md` → "Testing stays small").

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass at desktop and
phone widths — read every sentence in the panel against what the app does; pause
all chats and watch the panel's row and the rail's line agree; the collapsed
hint behaves as the founder chose; the `1234` demo host page reads true. The
panel still emits only on a settings or email diff. Copy run through the
humanizer skill, decision entries in the same commit, `pnpm format`, **one
commit straight to `main`**, safe to push on its own (client-only, no `shared/`
change, so no deploy race — the tip commit touches `client/`, so Vercel
rebuilds), checkbox ticked.
