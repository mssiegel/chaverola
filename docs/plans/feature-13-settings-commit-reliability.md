# Feature 13 — A half-typed field stops freezing the settings that work

The live settings panel commits on one all-or-nothing gate.
[`LiveSettingsPanel.tsx:84-98`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
holds the whole debounced commit behind `validateLiveDraft(draft, committed).length === 0`
(the gate is line 93), and that validator covers the **entire** draft — a blank
host name, a malformed email, a duplicated or emptied character name
([`hostActivity.ts:77-93`](../../client/src/lib/hostActivity.ts) →
[`activitySetup.ts:182-231`](../../client/src/lib/activitySetup.ts)). One
unfinished field freezes every other control in the panel, including the four
that are wired to the server end to end.

**Reproduce it in about thirty seconds** — real activity or the `1234` demo, the
panel is the same component on both (the demo wrapper and the live one render
the same `HostActivityDashboard`,
[`HostActivityPage.tsx:188-281`](../../client/src/pages/teacher/HostActivityPage.tsx)):

1. Open the host page and expand **Edit activity settings**.
2. Type `ms.cohen@` into **Your email**. The inline error appears.
3. Under **Settings**, turn **Match students 1:1 automatically** off.
4. The panel's switch moves. The pairing rail's switch, a few inches away on the
   same screen, stays on — and auto-match keeps pairing the class.

The panel's switch renders `draft.settings`
([`LiveSettingsPanel.tsx:192-196`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx));
the rail's renders `activity.settings`
([`index.tsx:169`](../../client/src/components/Teacher/HostActivity/index.tsx) →
[`PairingPanel.tsx:305-309`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)).
Nothing emits, so the server never hears the flip and a reload loses it — which
falsifies the guarantee the code states about itself at
[`PairingPanel.tsx:284-286`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)
("the two switches can never disagree"). The reverse direction is what makes this
urgent for feature 11: a **correctly typed** email never reaches the server while
any other field is invalid, so transcripts keep going to the old address with
nothing on screen to say so.

**Second symptom, same root cause.** `removeCharacter`
([`LiveSettingsPanel.tsx:105-117`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx))
calls `setDraft(next)` unconditionally at :110, then gates its
deliberately-undebounced commit at :114 on that same whole-draft validator. With
any unrelated field invalid the row vanishes from the panel while
`activity.characters` still holds it: `maxGroupSize` still counts it
([`index.tsx:84`](../../client/src/components/Teacher/HostActivity/index.tsx)),
`committedIds` still holds its id (`LiveSettingsPanel.tsx:67-70`), and "Add a
character" reappears
([`CharacterRowsField.tsx:141`](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx))
as though a slot opened up. **The audit corrected its own earlier trace here** —
an earlier pass had a blocked removal falling through to the debounce; line 93
applies the identical gate, so it never lands at all. Reproduce this one before
changing it.

**The decision this works within.** "Live edits propagate after a 1-second pause,
and invalid states never do" (founder, 2026-07-15 —
[`teacher-live.md:1070-1085`](../decisions/teacher-live.md)) is right about
**typing**: last-valid-wins keeps a blank or duplicate label off students' screens
mid-edit. It is wrong about clicks — line 1083 promises "a completed removal
stops future pairings from offering the character immediately," and the switch
guarantee at [`:826-831`](../decisions/teacher-live.md) assumes the panel's switch
behaves like the rail's. This doc **works within** that decision and narrows it:
"invalid states never propagate" scopes to fields the teacher is typing in, not
to a click on a switch, a stepper, or a remove button. The prompt **amends** the
entry rather than superseding it. The panel's other false promise (line 1084's
in-UI claim) belongs to **feature 12** — leave it alone here; the two docs are
independent and either can ship first.

One prompt: client-only, zero of the seven wire touch points, no server change,
no deploy race in either direction. It ends green (`pnpm typecheck` + `pnpm test`

- its own browser pass), gets **one commit straight to `main`**, and is safe to
  push on its own. Run `pnpm format` before committing and record the amended
  decision in `DECISIONS.md` + `docs/decisions/teacher-live.md`.

* [ ] Prompt — A click commits now; typing keeps the debounce

---

## Prompt — A click commits now; typing keeps the debounce

**Goal:** a teacher with a half-typed email can still turn auto-match off and have
it actually happen — both switches move together, the class stops being paired,
the server hears it, and a reload keeps it. Removing a character takes effect the
moment it's clicked, so the panel and the roster can never disagree about who's
in the cast. Typing is untouched: a half-finished name still waits for the pause,
and an invalid one still holds.

1. **Carve the settings controls out of the debounce**
   (`LiveSettingsPanel.tsx`). Wrap the `patchSettings` from `makeDraftPatches`
   ([`draftPatches.ts:29-33`](../../client/src/components/Teacher/ActivitySetup/draftPatches.ts))
   in a panel-local handler that patches the draft exactly as today **and** calls
   `onActivityChange` immediately with
   `{ ...activity, settings: { ...draft.settings, ...changes } }` — spread from
   the committed `activity`, never rebuilt through `activityFromLiveDraft`, so a
   half-typed name, scene, or email can't ride along. This is the rail's idiom at
   [`index.tsx:58-64`](../../client/src/components/Teacher/HostActivity/index.tsx),
   not a new abstraction. **One wrap covers all four controls** — the three
   switches and the seconds stepper share this single `onChange`
   ([`SettingsSection.tsx:47,56,65,75`](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx)).
2. **Same treatment for removal** (`LiveSettingsPanel.tsx:105-117`): commit
   `{ ...activity, characters: activity.characters.filter((c) => c.id !== id) }`
   and drop the validity gate at :114. Keep the `setDraft(next)` at :110 and keep
   `removeGuard` at :151-161 — a character in a live chat still can't be removed.
3. **Leave the debounced path alone** (`:84-98`). Typed fields still commit only
   on a valid whole draft.
4. **Confirm the two no-op loops close** before writing anything. (a) The later
   debounce tick re-commits the same settings and `handleActivityChange` diffs
   before emitting
   ([`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx),
   the diff at :257-260), so no second `settings:update` goes out. (b) The
   immediate commit fires the panel's merge effect (`:57-65` →
   `mergeExternalSettings`,
   [`hostActivity.ts:113-126`](../../client/src/lib/hostActivity.ts)); the draft
   already holds the new value, so it returns `null` and doesn't churn.
5. **Docs, inside this prompt.** The update note on the 2026-07-15 entry in
   `docs/decisions/teacher-live.md` plus its line in `DECISIONS.md`. Nothing in
   `docs/api.md` — no wire change. Keep the panel's docblock at
   `LiveSettingsPanel.tsx:34-41` honest about the new split.

**Ask the founder** when you run this prompt — don't guess:

- Should the carve-out stop at clicks, or should typed fields commit
  independently too (a valid rename lands even while the email is bad)?
  Click-only is the smallest correct change and preserves the 2026-07-15 typing
  rule verbatim; per-field commits fix more of the freeze for a bigger diff.
- When an edit genuinely is held back, should the panel say so anywhere, or is
  the inline field error enough? Any new line is user-facing copy: the wording is
  the founder's call and it needs the humanizer pass.
- Removing a character while another field is invalid — commit the removal, or
  refuse it and leave the row until the other field is fixed? This stays a
  client-side call: [feature 18](./feature-18-character-roster-syncs-live.md)
  allows removal at any time — a chat snapshots its cast at start, so removing an
  in-use character is label-safe — and adds **no** server-side refusal, so there
  is no server round-trip to reconcile with. Decide it on the panel's own terms.

**Edge cases:** a removed row that was only ever local filters to a no-op against
`activity.characters` — harmless, and the draft still loses the row. Holding the
seconds stepper emits one `settings:update` per click instead of one per pause;
each is a full idempotent replace and classroom scale makes the chatter
irrelevant. A flip made while the socket is down behaves exactly as it does today
— the decision doc says such an edit is lost
([`teacher-live.md:17-18`](../decisions/teacher-live.md)), one audit sweep found
socket.io-client buffers and flushes it, nobody has watched it happen, and
[feature 15](./feature-15-the-panel-respects-a-dropped-connection.md) owns that
surface; don't assert either here. A second host device hears the flip through
`settings:changed` exactly as it does from the rail today, and `removeGuard` still
blocks removing a character mid-chat (feature 18 retires that guard once a chat's
cast is snapshotted; until then it stands).

**Tests:** none. The fix is a handler shape inside a component and the no-DOM
client policy can't reach it (`DECISIONS.md` → "Testing stays small"). The failure
mode is loud, not silent — two switches on one screen in opposite positions.
`hostActivity.test.ts` keeps guarding the debounced path, which this prompt does
not change.

**Done when:** `pnpm typecheck` + `pnpm test` green, and the browser pass on a
**real** activity (`pnpm verify:up --scale 10`, host plus two students):
half-type `ms.cohen@` and flip auto-match off → the rail's switch moves with it,
the queue stops auto-pairing, and a reload still shows it off; fix the email,
pause → the corrected address round-trips and survives a reload; with the bad
email still there, remove character 4 → the row goes **and** the roster agrees (no
4th student selectable, "Add a character" offers one slot, not a phantom one);
the seconds stepper takes effect on the click; **the debounce is intact** — a
rename with the bad email present does not relabel the chat cards until the email
is valid. Then the same two checks on the `1234` demo, the same panel and the same
bug ([`hostWorld.ts:321`](../../client/src/components/Teacher/HostActivity/hostWorld.ts),
[`:113-121`](../../client/src/components/Teacher/HostActivity/hostWorld.ts)), with
zero `/socket.io/` traffic. Production pass on chaverola.com — client-only, so
confirm Vercel is Ready for the expected SHA. `pnpm format`, one commit, checkbox
ticked.
