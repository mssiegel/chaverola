# Feature 15 — The settings panel goes quiet while the teacher is offline

When the host page loses its socket it dims and stops taking taps — everywhere
except the one block that sits above the dimming. `reconnecting`
([`index.tsx:185`](../../client/src/components/Teacher/HostActivity/index.tsx))
drives the amber banner
([`index.tsx:211-226`](../../client/src/components/Teacher/HostActivity/index.tsx))
and the `pointer-events-none opacity-60 select-none` wrapper around the whole
pairing-and-chats grid
([`index.tsx:232-236`](../../client/src/components/Teacher/HostActivity/index.tsx)).
**Edit activity settings** is rendered before both
([`index.tsx:202-206`](../../client/src/components/Teacher/HostActivity/index.tsx)),
so it keeps its normal colours and full interactivity while everything under it
is greyed out.

The sharp edge is auto-match, the one setting the page shows twice. The rail's
switch
([`PairingPanel.tsx:305-309`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx),
under a comment promising the two "can never disagree",
[`PairingPanel.tsx:284-286`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx))
goes grey and dead. The panel's identical switch
([`LiveSettingsPanel.tsx:189-197`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx))
stays bright and clickable. One setting, two controls, one live and one dead, on
the same screen, at the exact moment the teacher's edits are least likely to
land.

**Reproduce it:** host a real activity, open **Edit activity settings**, then set
devtools Network to Offline. Within a few seconds the banner appears and the rail
below it dims; the panel doesn't change at all. Scroll between the two switches.

There is a second, smaller half. The panel's 1-second debounce cleans up with a
bare `clearTimeout` and never flushes
([`LiveSettingsPanel.tsx:84-98`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)),
so an edit made in the last second before the panel unmounts is dropped. **This
half is single-sourced and partly contested**: the decision doc says an edit made
while the socket is down is simply "lost"
([`teacher-live.md:17-18`](../decisions/teacher-live.md)), but one audit sweep
found that socket.io-client `^4.8.3`
([`client/package.json:31`](../../client/package.json)) buffers the packet and
flushes it on reconnect, so a disconnected edit usually _does_ land, late. Nobody
has watched that happen in a browser. The prompt verifies it before touching
either the code or the doc.

**The decision this works within:** "When the teacher's connection drops, the
queue dims under a reconnecting banner"
([`teacher-live.md:613-639`](../decisions/teacher-live.md), indexed at
[`DECISIONS.md:123`](../../DECISIONS.md)) already settles the principle —
"readable but not actionable is the point: a tap on a stale rail would emit into
a dead socket and appear to do nothing", extended 2026-07-20 to cover the whole
grid. This doc supersedes nothing. It finishes applying that decision to the
block left outside it, and corrects the "lost" clause to whatever the browser
actually shows.

- [ ] Prompt — The settings panel joins the reconnecting treatment

---

## Prompt — The settings panel joins the reconnecting treatment

**Goal:** while "Reconnecting to your class…" is up, the settings panel reads the
same way the rest of the page does, so the teacher can't flip a switch that looks
alive next to an identical one that's visibly dead. And an edit sitting in the
debounce when the page goes away isn't silently dropped.

1. **Verify both facts in the browser first**, before writing any code
   (`verify:up --scale 10`, a real join code, devtools Offline). (a) Confirm the
   split treatment above. (b) Flip a setting while offline, come back online,
   then reload the host page: did the edit survive? That answer is what the docs
   get rewritten to say, and it decides how much step 4 is worth.
2. **Ask the founder:** which treatment? The established rule is dim +
   non-interactive, which would make the panel match the grid — but it also
   freezes a teacher mid-sentence in the email field when their wifi blips, and
   the panel is the one place on the page they might be _reading_ rather than
   acting. The alternative is leaving it interactive and telling the truth in
   words ("your edits will send when you're back"), which the socket buffer may
   already make honest. Bring the step 1 findings to the question.
3. **Apply it in
   [`index.tsx`](../../client/src/components/Teacher/HostActivity/index.tsx).**
   Either way the change is a wrapper around `<LiveSettingsPanel>` at `:202-206`,
   plus the banner's comment at `:208-210` if the treatment now reaches above it.
   **Leave the comment at `:197-201` alone** — it describes which edits sync, not
   the reconnecting treatment, it is accurate today, and features
   [17](./feature-17-host-name-and-scene-sync-live.md) and
   [18](./feature-18-character-roster-syncs-live.md) own rewriting it when the
   sync scope moves ([feature 20](./feature-20-docs-and-copy-drift-cleanup.md)
   only checks their work). Write a new comment if the wrapper needs one. Keep
   the panel **outside**
   the grid wrapper at `:232-236` — moving it inside changes the desktop layout.
   If the answer is "non-interactive": `pointer-events-none` stops the mouse but
   not the keyboard, so a focused switch still toggles on Space; `inert` stops
   both, and the repo already uses it
   ([`CollapsibleSection.tsx:87-91`](../../client/src/components/Teacher/HostActivity/CollapsibleSection.tsx),
   [`AppLayout.tsx:74-82`](../../client/src/components/layout/AppLayout.tsx)).
   The rail's wrapper has the same keyboard gap; fix it there too only if the
   founder's answer covers it.
4. **Flush the pending edit on unmount**
   ([`LiveSettingsPanel.tsx:84-98`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)):
   keep the latest uncommitted draft in a ref, clear it when the debounce
   commits, and add a mount-scoped cleanup that commits whatever is left. Scope
   it honestly: the app is in `StrictMode`
   ([`main.tsx:17-23`](../../client/src/main.tsx)), so the cleanup runs once in
   dev on mount and must be a no-op when nothing is pending, and a tab close or
   reload never runs React cleanup at all. The reachable in-session unmount paths
   are the language switcher
   ([`AppLayout.tsx:66`](../../client/src/components/layout/AppLayout.tsx), which
   swaps the locale prefix and remounts the route) and `activity_gone`
   ([`HostActivityPage.tsx:215-227`](../../client/src/pages/teacher/HostActivityPage.tsx)),
   the second of which has nowhere to land the edit anyway. The brand home link
   is deliberately absent on this route
   ([`AppLayout.tsx:32-47`](../../client/src/components/layout/AppLayout.tsx)),
   so that path doesn't exist.
   - **Check what is still pending before you size this.**
     [Feature 13](./feature-13-settings-commit-reliability.md) moves the switches,
     the stepper and the remove button off the debounce entirely — if it shipped,
     the only thing that can ever sit in this timeout is typed text (name, scene,
     email), which shrinks the flush's job to exactly the field the question
     below turns on. Read `LiveSettingsPanel.tsx:84-98` as it stands rather than
     as this doc describes it.
   - **Ask the founder:** if step 1 shows buffered edits do land on reconnect, is
     this flush worth carrying at all? It earns its keep mainly for the email
     field, whose value decides where transcripts go
     ([feature 11](./feature-11-transcript-email.md) — and once its prompt 3
     lands, the wrap-up card replaces the dashboard and unmounts this panel).
5. **Docs, in this commit.** Rewrite `teacher-live.md:17-18` to match what the
   browser showed. Extend the reconnecting-banner entry at
   `teacher-live.md:613-639` with the panel's treatment and its reasoning, in the
   style of the 2026-07-20 extension already there; its `DECISIONS.md` index line
   at `:123` only needs touching if the heading changes. Run the humanizer skill
   on any new user-facing string.
6. **The demo needs nothing, deliberately.** Its connection is hard-coded
   `"connected"`
   ([`useHostActivityDemo.ts:294-297`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts))
   and the decision already records that the demo never reaches this state. Don't
   add a fake teacher-drop trigger for demo parity — say so in the commit message.

**Edge cases:** the teacher is mid-word in the email field when the drop hits
(step 2's answer decides whether the caret survives); the panel is a
`CollapsibleSection`, so collapsing it doesn't unmount anything and the flush
never fires on a collapse; a settings echo from another host device arriving
during a drop still merges into the open draft
([`LiveSettingsPanel.tsx:57-65`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx));
`removeCharacter`'s undebounced commit at
[`LiveSettingsPanel.tsx:105-117`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
is untouched by the flush; reconnecting restores everything with no manual step.

**Tests:** none. Both halves are rendered UI and a React lifecycle effect, and
the client suite is DOM-free by policy (`DECISIONS.md` → "Testing stays small").
No wire event changes, so the mandatory `projections.test.ts` pin doesn't apply.

**Done when:** `pnpm typecheck` + `pnpm test` green; a browser pass at desktop
and phone widths with devtools Offline — the panel and the rail now agree,
reconnect restores both, and the `1234` demo is visually unchanged; the flush
verified on the language-switcher path; both docs updated in the same commit.
Client-only, so no deploy race, and the tip commit touches `client/`. Run
`pnpm format`, one commit straight to `main`, safe to push on its own, tick the
checkbox.
