# Feature 10 — Name reveal on real activities

The name reveal — the end-of-chat panel that tells a student **who they were
really chatting with** — was the last feature still simulation-only on real
activities (the `1234` demo had it; live hard-coded it off). Everything else
already existed: the reveal UI ([`ChatEndedSection.tsx`](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)
renders each peer's real name when `revealNames` is on), the setting already
synced live (`revealNames`, field 1 of `ActivitySettings`), and the names were
already captured server-side (`StoredChat.members[].name`, taken at chat
start). The only gap: the student wire is deliberately **characterIds-only**,
so the server never sent the names, and [`LiveChatStage.tsx`](../../client/src/components/Student/LiveChatStage.tsx)
hard-coded `revealNames={false}`.

This feature adds the **one sanctioned exception** to the characterIds-only
student wire: at chat-end, when the teacher's `revealNames` setting is on,
`chat:ended` carries each peer's real name.

**Product calls (founder, 2026-07-22):**

- **Per-chat-end, setting-driven.** Reveal fires when a chat ends and the
  setting is on at that moment. For an end-of-class reveal, flip the setting
  on then "End all chats." No retroactive reveal to students already back in
  the lobby, and no separate "reveal now" button (extends the 2026-07-15
  no-mid-chat-reveal call in `docs/decisions/teacher-live.md`).
- **Reveal on every ending** — teacher-ended, round-closed, and connection-loss
  endings (`peer-timeout`, `self-timeout`) all reveal, matching the demo.
- **Everyone ever in the room** — the reveal lists every other member the chat
  ever had, including one who dropped or was removed earlier.

## How this was built

One end-to-end slice, one commit. The reveal rides the existing `chat:ended`
event (no new event), so it reaches all three emit sites — the live ending and
both resume replays — for free, which is what makes it survive a refresh on the
ended screen. The deploy race is benign both ways (an older client reads
`reveal` as `undefined` → the secret box, today's behavior; an older server
sends no `reveal` → same).

- [x] Prompt — The name reveal fires on real activities (end to end)

**What shipped:**

1. **Wire** ([`shared/src/socket.ts`](../../shared/src/socket.ts)): `chat:ended`
   gains `reveal?: { characterId: string; name: string }[]`.
2. **Projector** ([`projections.ts`](../../server/src/store/projections.ts)):
   `toChatEnded(chat, activity, studentId)` adds `reveal` — the other members'
   `{ characterId, name }` — only when `activity.settings.revealNames` is on;
   omitted otherwise, so a name never leaves the server unasked-for.
3. **Emit sites** — `settleMembershipChange` ([`lobbyContext.ts`](../../server/src/live/lobbyContext.ts))
   and both resume replays ([`studentSession.ts`](../../server/src/live/handlers/studentSession.ts))
   thread the record + recipient studentId through `toChatEnded`; the
   reaped-returner keeps its per-recipient `"self-timeout"` reason.
4. **Client** ([`liveMatchState.ts`](../../client/src/pages/student/join/liveMatchState.ts)
   `applyReveal` stamps `realName` onto `peers`/`everPeers` by characterId;
   [`useActiveMatch.ts`](../../client/src/pages/student/join/useActiveMatch.ts)
   tracks a `revealed` flag and applies the reducer on `chat:ended`;
   [`JoinActivityPage.tsx`](../../client/src/pages/student/JoinActivityPage.tsx)
   passes `revealNames={revealed}` to `LiveChatStage`, replacing the hard-coded
   `false`). `ChatEndedSection` was already reveal-ready.
5. **Test** — the `toChatEnded` privacy pin in [`projections.test.ts`](../../server/src/store/projections.test.ts):
   off → keys `["reason"]` (no name anywhere); on → `["reason","reveal"]`, the
   reveal excludes the recipient and lists the other members. The one test that
   guards the only dangerous failure mode. The reducer and the socket round-trip
   are verified in the browser.

**Verified:** `pnpm typecheck` + `pnpm test` green; browser pass with a real
join code — reveal-on names both partners on the ended screen; reveal-off shows
the neutral secret box and `chat:ended` carries no names; a refresh keeps the
reveal; the `1234` demo is unchanged.
