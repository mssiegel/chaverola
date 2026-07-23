# Feature 14 — A woken host device stops reverting the class settings

`settings:update` is a **full replace**: the server assigns the whole
`ActivitySettings` object the client sends over the stored one
([`handlers/teacher.ts:248-263`](../../server/src/live/handlers/teacher.ts) —
`current.settings = parsed.data` at :256), then echoes `settings:changed` to the
room **minus the sender** (:260-262). That echo only reaches sockets connected at
that instant. A host device that was asleep never hears it, and nothing tells it
afterwards: the two snapshots a teacher socket gets at connect are
`queue:snapshot` and `chats:snapshot`
([`handlers/teacher.ts:61-62`](../../server/src/live/handlers/teacher.ts)), and
neither payload carries settings
([`socket.ts:90,104-116`](../../shared/src/socket.ts)). The client never re-GETs
the activity on reconnect either — the lookup effect keys on `attempt`, which
only advances through the manual "Try again" button
([`useHostedActivityLookup.ts:62-89`](../../client/src/lib/useHostedActivityLookup.ts)).
So the woken tab keeps the `activity.settings` it has held since its last
successful load, and the next commit ships that stale object whole.

**Reproduce it (two tabs, one host key):**

1. Open the same real host page in two tabs, A and B. Set B's DevTools Network to
   **Offline** (a sleeping laptop is the same thing; offline is faster).
2. In A, turn **Match students 1:1 automatically** off. The server stores it; B
   hears nothing.
3. Bring B online. Socket.IO reconnects — there is even a hidden→visible fast
   path for exactly this wake
   ([`useHostActivityLive.ts:196-204`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts))
   — fresh snapshots arrive, and B's auto-match switch still shows **on**.
4. In B, touch **any** switch in the panel, the rail's auto-match switch, or the
   seconds stepper. That commit carries B's whole stale settings object, and
   auto-match is back on for the entire class — silently, from a click that was
   about something else.

This is the only defect in the audit that **corrupts a setting that otherwise
works end to end**, and it was cross-verified. `mergeExternalSettings`
([`hostActivity.ts:113-126`](../../client/src/lib/hostActivity.ts)) is the
existing defence and it only covers the connected case.

**The decision this works within.** Whole-object replace and the
room-minus-sender echo are a recorded founder call — "Settings edits sync for
real; characters, scenario, and host name stay local"
([`teacher-live.md:505-540`](../decisions/teacher-live.md), 2026-07-19):
"Syncing the whole settings object is one event and stops the panel silently
reverting on refresh." **This doc works within that decision and does not
supersede it.** The replace stays a replace; the fix is to make sure a
reconnecting device holds current settings before it can send any. The teacher's
email is deliberately out of scope — it syncs with **no** echo and
last-write-wins, a separate 2026-07-23 call
([`teacher-live.md:8-38`](../decisions/teacher-live.md)).

- [ ] Prompt — Settings ride the reconnect snapshot (end to end)

---

## Prompt — Settings ride the reconnect snapshot (end to end)

**Goal:** a teacher whose laptop slept through a settings change wakes up holding
the class's real settings. The switches in the panel and the pairing rail show
what the server actually has, and the next thing that teacher touches commits
from that truth instead of reverting the class. No new UI, no new event — the
settings ride a snapshot the teacher socket already receives at connect, and land
through the same fold `settings:changed` already uses.

1. **Wire** ([`socket.ts:104-116`](../../shared/src/socket.ts)):
   `chats:snapshot`'s payload gains `settings: ActivitySettings`, documented in
   the payload docblock the way `lastPartners` and `rematchNotice` already are
   (teacher-room only; `??` on the client tolerates an older server).
   `chats:snapshot` is where teacher-wide world truth already rides (`paused`,
   `lastPartners`, `rematchNotice`).
2. **Projector** ([`projections.ts`](../../server/src/store/projections.ts)):
   `toActivitySettings(record)` as a **field-by-field literal, never a spread** —
   `revealNames`, `rematchWarning`, `autoMatch`, `autoMatchSeconds`
   ([`types.ts:40-49`](../../shared/src/types.ts)). Handing `record.settings`
   straight to the emit works today and is exactly how a future server-only
   field leaks tomorrow.
3. **Allowlist pin** — `server/src/store/projections.test.ts`, **mandatory, not
   optional under "fewer tests"**: an exact-key assertion on
   `toActivitySettings(fullRecord)` (the fixture at
   [`projections.test.ts:24-44`](../../server/src/store/projections.test.ts)
   already carries a full settings object). Confirm the existing `toActivity`
   student pin at :80-87 still passes — students get no settings at all.
4. **Emit** ([`lobbyContext.ts:117-137`](../../server/src/live/lobbyContext.ts)):
   `chatsPayload` returns `settings: toActivitySettings(record)`; widen the
   `chatsPayload` signature in the `LobbyContext` interface (:83-92) to match.
   Every caller gets it free — the connect-time emit at `handlers/teacher.ts:62`
   and every `broadcastState`. `handlers/teacher.ts:51` is the server's only
   `socket.join`, so students never join the teacher room and cannot receive it.
5. **Client fold**
   ([`useHostActivityLive.ts:150-159`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)):
   in the `chats:snapshot` handler, when `payload.settings` is present call
   `onSettingsSyncRef.current(payload.settings)` — the same callback the
   `settings:changed` listener at :181-183 uses. It lands in
   [`HostActivityPage.tsx:248-249`](../../client/src/pages/teacher/HostActivityPage.tsx),
   which folds it into `activity`, and the panel's merge effect
   ([`LiveSettingsPanel.tsx:57-65`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx))
   folds it into any open draft without clobbering a half-typed field.
   Deliberately **not** routed through `handleActivityChange`
   ([`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx))
   — that wrapper diffs and emits, so a sync arriving there would echo straight
   back out. Update the `onSettingsSync` docblock at :108-110, which currently
   says the callback fires only when another device edits.
6. **Scope the fold to reconnects.** `chats:snapshot` broadcasts on every seat
   and chat change, so an unconditional fold makes a locally-flipped switch
   bounce back if an unrelated broadcast is in flight. Recommended: latch on
   `socket.on("connect")` and fold on the **first** `chats:snapshot` after each
   connect — three lines, and exactly the case this feature exists for. Folding
   only when a value actually differs is acceptable too; pick one and say why in
   a comment. (No `useMemo`/`useCallback` — the React Compiler owns memoization.)
7. **Docs, inside this prompt.** [`docs/api.md:243-249`](../api.md) (the
   payload) and the "Settings sync; the roster doesn't" bullet at
   [`:586-595`](../api.md). Add the decision entry to
   [`docs/decisions/teacher-live.md`](../decisions/teacher-live.md) plus its line
   in [`DECISIONS.md`](../../DECISIONS.md), cross-linked from the 2026-07-19
   entry at :505-540 as an extension, not a supersession.

**Ask the founder** when this prompt runs — do not answer either from this doc:

- **On reconnect, does the server always win?** Server-always-wins is simplest
  and the server genuinely is the source of truth. The awkward case is a teacher
  who flipped a switch on the laptop _while it was offline_: should that edit
  survive, or be overwritten? Worth knowing first: the audit found — in a single,
  **not cross-verified** sweep — that socket.io-client buffers emits and flushes
  them on reconnect, so a disconnected edit often _does_ land a moment after the
  snapshot, which makes "last write wins" genuinely ambiguous. Verify that
  buffering claim in a browser before relying on it — or take the answer from
  [feature 15](./feature-15-the-panel-respects-a-dropped-connection.md), whose
  step 1 verifies the same claim and rewrites `teacher-live.md:17-18` to match.
  If 15 ran first, use what it recorded instead of re-verifying.
- **Does the teacher see anything when settings move under them?** Silent is the
  smaller change and matches how `settings:changed` behaves on a connected second
  device. If the founder wants a note, run the humanizer skill on it — otherwise
  this prompt writes **no new user-facing copy at all**.

**Edge cases:** an older server sends no `settings` field — read it with a
presence check and the fold is skipped (today's behavior), the same
benign-both-directions pattern as feature 9's `lastPartners`; an older client
ignores the extra field. A first mount folds the settings the initial `GET`
already returned, so it is a no-op, and `mergeExternalSettings` returns `null`
when nothing moved. The **demo needs no work and cannot show this**: `1234` is
structurally zero-network with no socket to drop — say so in the decision entry
rather than inventing demo furniture for a reconnect that cannot happen. Features
12, 13 and 15 are independent of this one in either order. **Feature 16 is not:**
a remount builds a fresh socket, so once this ships, a returning host page folds
the server's settings back over its stale create-time copy and
[feature 16](./feature-16-the-host-page-never-serves-a-stale-snapshot.md)'s
settings-based reproduction stops firing. The rest of that stale object is
untouched, and 16 already probes with the teacher's email instead — say so in the
commit message.

**Tests:** only the mandatory `toActivitySettings` allowlist pin from step 3 — a
privacy invariant, not test coverage. No behavior test: the fold is one call into
plumbing `settings:changed` already exercises, and the failure mode is loud in a
browser.

**Done when:** `pnpm typecheck` + `pnpm test` green; the reproduction above no
longer reproducing — with B offline flip auto-match **off** in A, bring B online,
and B's panel switch **and** the rail's switch both read off with no interaction;
then flip an unrelated setting in B and auto-match is still off in A and after a
refresh of both tabs. Confirm the reverse direction, that a normal connected edit
still echoes with no switch flicker, and whatever the founder answered on the
disconnected-edit question. The `1234` demo unchanged with zero `/socket.io/`
traffic. **Production pass:** one push (benign both directions; the commit touches
`shared/` and `client/`, so Vercel rebuilds), poll `/healthz` for the new server
commit, confirm Vercel Ready for that SHA, then rerun the two-tab wake on
chaverola.com — ideally with a real phone as the second device. `pnpm format`, one
commit straight to `main`, checkbox ticked.
