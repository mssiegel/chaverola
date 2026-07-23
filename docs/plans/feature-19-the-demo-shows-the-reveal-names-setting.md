# Feature 19 — The demo shows what "reveal names" actually does

**Reproduce it in 30 seconds:** open `/activity/host/1234?fast=10`, expand **Edit
activity settings**, and flip **Reveal names when a chat ends** off. Now end a
chat. Then flip it on and end another. Nothing on the page differs — not the card
that moves into Completed, not a toast, not a line anywhere.

That is the whole gap. `revealNames` is real on live activities as of feature 10
— the server reads it at the moment a chat ends
([`projections.ts:335-351`](../../server/src/store/projections.ts), the gate at
`:340`), so a teacher who flips it mid-activity changes the very next chat that
ends and nothing that already ended. But the teacher's demo world never reads it:
neither
[`hostWorld.ts:164-190`](../../client/src/components/Teacher/HostActivity/hostWorld.ts)
(`endChatIn`, where a demo chat ends) nor
[`useHostActivityDemo.ts:124-137`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
mentions `revealNames` at all — a grep over both files returns nothing.

It is also the only setting in that panel with nothing to show — auto-match pairs
the simulated queue, the stepper changes when, the rematch warning fires the
amber box — and it sits first in the list
([`SettingsSection.tsx:41-48`](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx)),
promising "the students in it find out who they were really talking to."

It's invisible rather than merely subtle because the reveal is a **student-side**
event and the demo host page simulates no student: the teacher's own cards always
show real names, reveal or not
([`ChatCard/index.tsx:135-140`](../../client/src/components/Teacher/ChatCard/index.tsx)),
so the setting can't show through by accident. The student demo tab does mock the
reveal, but independently, with its own local toggle
([`ChatStage.tsx:55-57`](../../client/src/components/Student/ChatStage.tsx) →
[`ChatDemoControls.tsx:48-58`](../../client/src/components/demo/ChatDemoControls.tsx)),
and the two demo tabs deliberately share no state
([`hostActivityDemo.ts:7-14`](../../client/src/mockData/hostActivityDemo.ts)). So
the toggle stays; what goes is the promise attached to it — the comment at
`ChatStage.tsx:55-56` says the mock stands in "until the teacher host page owns
it for real," and it has since feature 10.

This is a rule violation, not a nice-to-have. [`AGENTS.md:194`](../../AGENTS.md):
"A user-facing feature is not done until it can be experienced in the demo."

**Decisions this works within (none are superseded):** "The live name reveal
fires at chat-end, per the teacher's setting"
([`chat-behavior.md:488-522`](../decisions/chat-behavior.md), 2026-07-22) — the
reveal is evaluated **at the moment a chat ends**, with no retroactive reveal, so
a completed demo card must remember what the setting was when it ended. And "When
the backend arrives: real activities get strictly real, and `1234` stays the only
demo" ([`demo-flows.md:76-88`](../decisions/demo-flows.md)) plus the AGENTS.md
demo invariants — extend the demo engines and the
[`mockData/`](../../client/src/mockData/) fixtures, never fork a component.

**No wire, no server, no `shared/`.** No new event, so no
`docs/adding-a-wire-event.md` pass and no `projections.test.ts` allowlist pin
(feature 10's reveal pin stays as it is). Nothing races on deploy, and the commit
touches `client/`, so Vercel builds it.

- [ ] Prompt — The demo host page shows the reveal firing

---

## Prompt — The demo host page shows the reveal firing

**Goal:** a teacher (or the founder mid-pitch) at `/activity/host/1234` flips
**Reveal names when a chat ends**, ends a chat, and sees the difference on the
page. Flipping the setting changes the next chat that ends and leaves
already-completed chats alone, exactly like a real activity. The student demo
tab's behavior doesn't change; only its stale comment does.

**Ask the founder before writing code** — three real choices live here:

1. **What the demo host page shows when a chat ends with reveal on.** Candidates:
   a small line or badge on the completed-chat card, a toast at the moment the
   chat ends, or something on the chat card's header. The card is the natural
   home because the reveal is per chat and the card is already per chat
   ([`CompletedChatsSection.tsx:44-57`](../../client/src/components/Teacher/HostActivity/CompletedChatsSection.tsx));
   a toast is what a teacher actually notices mid-class.
2. **Whether reveal-off gets its own marker** ("Names stayed secret") or shows
   nothing. A visible off-state makes the toggle demoable in one flip; silence is
   less cluttered.
3. **What the two pre-seeded completed chats show at page load.** The demo boots
   with two chats already finished
   ([`hostActivityDemo.ts:74-131`](../../client/src/mockData/hostActivityDemo.ts),
   `HOST_SEED_CHATS`). Stamping them from the default setting makes the marker
   visible at first paint; leaving them unstamped gives a clean before/after.

Then, whatever the answer:

1. **Stamp the setting onto the chat at end time, not at render time.** Add one
   field to `HostedChat`
   ([`hostWorld.ts:54-67`](../../client/src/components/Teacher/HostActivity/hostWorld.ts))
   recording whether names were revealed when this chat ended, and set it in
   `endChatIn`
   ([`hostWorld.ts:164-190`](../../client/src/components/Teacher/HostActivity/hostWorld.ts))
   from `activity.settings.revealNames`. `endChatIn` doesn't take the activity —
   thread the boolean in from its callers. Reading at render time would
   retroactively rewrite completed cards when the teacher flips the toggle, which
   is precisely what live does **not** do.
2. **Cover the second ending site.** `removeFromChat`
   ([`useHostActivityDemo.ts:169-188`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts))
   ends a chat inline without going through `endChatIn` when fewer than two
   members remain, so it needs the same stamp. `endChat` and `endAllChats`
   ([`:124-137`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts))
   route through `endChatIn` and come along free.
3. **Seed chats** ([`hostActivityDemo.ts:74-131`](../../client/src/mockData/hostActivityDemo.ts)
   - `seedWorld` at
     [`hostWorld.ts:345-415`](../../client/src/components/Teacher/HostActivity/hostWorld.ts)):
     stamp the two `status: "ended"` seeds per the answer to question 3.
4. **Render it** per the answer to question 1, in the existing teacher components
   — `CompletedChatsSection` /
   [`ChatCard`](../../client/src/components/Teacher/ChatCard/index.tsx) — never a
   demo-only fork. The live engine has no equivalent field, so the prop must be
   optional and absent-safe: the live dashboard renders the same components
   ([`index.tsx:294-297`](../../client/src/components/Teacher/HostActivity/index.tsx)).
   Do **not** add a field to the live `HostEngine` contract to make this
   symmetric — the live page telling the teacher what students saw is a different
   feature.
5. **Fix the stale student-demo comment** at
   [`ChatStage.tsx:55-56`](../../client/src/components/Student/ChatStage.tsx). The
   local toggle stays — it's the demo's steering wheel and the two demo tabs share
   no state. Say that, instead of "until the teacher host page owns it for real."
6. **Humanizer pass** on every new user-facing string.
7. **Docs, inside this prompt.** Record the founder's call in
   [`docs/decisions/demo-flows.md`](../decisions/demo-flows.md) plus its one-line
   index entry in [`DECISIONS.md`](../../DECISIONS.md) — what the demo shows for
   reveal-on and reveal-off, and the end-time-stamp rule. If the answer introduces
   a new component, add it to the geography list in
   [`docs/architecture.md`](../architecture.md#client-component-geography). No
   `docs/api.md` change and no `AGENTS.md` status-table change.

**Edge cases:** flipping the toggle after a chat ended must not change that card —
that's the whole point of the end-time stamp, and the first thing to check. A
chat that ends with zero messages still gets the marker (the reveal is about who,
not what was said). A chat ended by removing the second-to-last member goes
through the inline path in step 2. Chats still in progress get no marker. The
seeded completed chats are on screen at first paint, so whatever the founder
picks for them is the first thing a pitch audience sees.

**Tests:** none. `hostWorld.test.ts` must stay green, but don't expect it to catch
a mistake here: it never imports `endChatIn`
([`hostWorld.test.ts:8-16`](../../client/src/components/Teacher/HostActivity/hostWorld.test.ts)
pulls in `createChat`, `findAutoMatchPair`, `pairEveryoneIn` and `tickWorld` only)
and its `world()` fixture builds `chats: []` ([`:31-45`](../../client/src/components/Teacher/HostActivity/hostWorld.test.ts)),
so an `endChatIn` signature change or a new required `HostedChat` field surfaces
in the typechecker at the call sites, not in this file. A missing or wrong marker
is loud on screen the moment you end a demo chat, which is the repo's bar for
skipping a test (`DECISIONS.md` → "Testing stays small").

**Done when:** `pnpm typecheck` + `pnpm test` green (`hostWorld.test.ts`
included). Browser pass at `/activity/host/1234?fast=10`, desktop and phone: with
reveal **on**, end a chat → the marker appears on its completed card; flip reveal
**off**, end another → that card differs (or stays silent, per the founder's
call) while the first card is untouched; flip back on → already-completed cards
still don't change; End all chats stamps every card; remove one student from a
1:1 and confirm that card is stamped too. Zero `/socket.io/` traffic. Then load a
**real** host page and confirm the completed-chat cards render exactly as today,
and run the student demo at `/activity/join/1234?fast=10` once to confirm its
reveal toggle still works. `pnpm format`, one commit straight to `main`, safe to
push on its own, checkbox ticked.
