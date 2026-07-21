# Feature 8 — The peer-drop UI

Students in a live matched chat currently see **nothing** when a partner
disconnects — the partner's seat survives `LOBBY_GRACE_SECONDS = 120`, and
only at grace expiry does the survivor see "X left the chat" (or, in a
1:1, the **wrong** "Your teacher ended the chat 🎓" screen — the server
hardcodes the reason while the correct 🔌 "Your partner lost connection"
copy sits unused in `ChatEndedSection`). The demo (`1234`) already
simulates the full UX: banner, live countdown, honest wrap-up copy. The
client rendering (`PeerReconnectBanner`, the `Chatbox` prop threading, the
copy) all exists — this feature is the wire change, the server emits,
un-pinning the client, and demo alignment.

Four prompts, each an end-to-end slice: the banner goes live, expiry tells
the truth, a blip can't hide a drop, and the demo matches reality. Prompt
1 must land first; prompts 2, 3, and 4 are independent of each other.

## Product decisions (founder calls, 2026-07-21)

Each prompt records its own in DECISIONS.md.

1. **The drop banner appears past the same 4s gate as the teacher's
   "lost connection" tag** (`LOBBY_DISCONNECT_BROADCAST_DELAY_MS`) — one
   shared gate, and a partner's quick refresh never flashes a scary
   banner. The countdown starts at server-computed remaining grace
   (~1:56) and the client ticks locally between events.
2. **The return is a "X is back! 🎉" green flash (~2.5s), with no
   "Reconnecting…" spinner state anywhere** — the spinner was demo
   fiction a real socket can't observe (the server never sees a
   "reconnecting" phase, just gone → back). The demo loses it too.
   Sub-4s blips show nothing at all.
3. **A trio with both partners out shows the soonest-to-expire peer** —
   the first-dropped countdown is the urgent one; when they resolve, the
   banner switches to the other. A return's flash takes the banner
   briefly, then the remaining countdown resumes.
4. **The countdown keeps ticking through a class-wide pause** — real mode
   AND demo. The server's grace deliberately runs through a pause
   (founder call, 2026-07-21, feature 7); a frozen display would lie
   while the partner can actually time out and vanish.
5. **The group drop notice is a client heuristic**: a peer vanishing from
   `chat:update` while marked offline reads "X couldn't get back in and
   left the chat"; otherwise "X left the chat". No reason rides the wire.
   Accepted imprecision: a teacher removing an already-disconnected
   student mid-window also gets the timeout copy — from the survivors'
   view the peer was gone and never came back.
6. **A 1:1 grace-expiry end says so**: new wire reason `"peer-timeout"`.
   Teacher `chat:remove` and `lobby:leave` below-2 endings keep
   `"teacher"`.
7. **The self-timeout screen ("You lost connection 📶") is deferred** to
   its own later feature. Direction recorded: the server will remember
   reaped seats for at most 30 minutes so a late returner can learn what
   happened instead of silently landing back in the lobby.

## How to use this document

Same rules as features 4–7: each prompt is sized for one agent session,
ends green (typecheck + tests + its own verification, production pass
included), gets **one commit straight to `main`**, and is safe to push on
its own. Server-touching — fine at any hour pre-launch (no real classes
until end of August 2026).

- [x] Prompt 1 — Students see the drop and the return (end to end)
- [x] Prompt 2 — Expiry tells the truth (end to end)
- [ ] Prompt 3 — A blip can't hide a drop (end to end)
- [ ] Prompt 4 — The demo matches reality (end to end)

Repo rules that apply (details in `AGENTS.md`): run `pnpm format` before
committing; record newly-made decisions in `DECISIONS.md`; verify at the
cheapest gate that catches the mistake; humanizer pass on any new
user-facing copy (prompts 1–3 reuse the demo's existing strings — new
copy only appears if a prompt drifts from them).

## Shared context: the wire contract additions

In `shared/src/socket.ts`, documented in `docs/api.md` by the prompt that
adds each:

```ts
// Prompt 1 — ServerToClientEvents addition:
/** Student only, targeted at each OTHER connected active member — never
 *  the affected seat, never the teacher room. characterId-only, the same
 *  pin as ChatPeer. "dropped" fires past the same 4s gate as the
 *  teacher's reconnectingStudentIds; "returned" fires on EVERY resume
 *  into an active chat (the server can't know whether the drop was ever
 *  announced — resume already cleared disconnectedAt), so receivers
 *  ignore it for a peer they don't have marked offline. */
"chat:peer-connection": (payload: {
  chatId: string;
  characterId: string;
  state: "dropped" | "returned";
  secondsLeft: number | null; // remaining grace on "dropped"; null on "returned"
}) => void;

// Prompt 2 — chat:ended widens:
"chat:ended": (payload: { reason: "teacher" | "peer-timeout" }) => void;
// and ChatSnapshot.endReason: "teacher" | "peer-timeout" | null

// Prompt 3 — chat:started gains a field (authoritative on every
// delivery, like `lines` — the only channel that heals a blip):
reconnectingPeers: { characterId: string; secondsLeft: number }[];
```

## Shared context: the deploy race

Benign in both directions for every prompt — one commit, one push each.
Client ahead of server: `chat:peer-connection` never arrives and
`reconnectingPeers` is absent (`?? []`), so the banner simply doesn't
show — today's behavior. Server ahead of client: unhandled events drop
silently; an unknown `chat:ended` reason falls back to the generic ended
copy. The standing rules apply: poll `/healthz` for the new server commit
before testing, confirm Vercel's production deployment is Ready for the
SHA.

---

## Prompt 1 — Students see the drop and the return (end to end)

**Goal:** a student whose partner drops sees "X lost connection… 1:56 to
come back" ticking within ~4s of detection, through a pause, on
production; when the partner resumes, a "X is back! 🎉" flash clears it; a
quick refresh shows nothing to anyone.

1. **Shared.** The `chat:peer-connection` event above. Rewrite the stale
   paragraph of the `LOBBY_GRACE_SECONDS` docblock (~lines 210–219): the
   student countdown is real now and this constant is its one source
   (the demo's separate `RECONNECT_WINDOW_SECONDS` copy dies in Prompt
   4).

2. **Server projections** (`store/projections.ts`): `graceSecondsLeft(
seat, now)` beside `isReconnecting` — `Math.max(0, Math.ceil((seat.
disconnectedAt + LOBBY_GRACE_SECONDS * 1000 - now) / 1000))`; and
   `toPeerConnection(chat, studentId, state, secondsLeft)` resolving the
   member's characterId (the `toPeerTyping` shape).

3. **Server emits** (`live/lobby.ts`):
   - `armSeatTimers` → `onBroadcastDelay`: after `broadcastState`,
     `findActiveChatOf(record, seat.studentId)`; if found, fan out
     `"dropped"` with `graceSecondsLeft(seat, Date.now())` to every OTHER
     connected active member (the `chat:typing` loop shape, skipping the
     dropped seat; not volatile). The `findActiveChatOf` guard is what
     keeps the wrappingUp re-arm path (`settleMembershipChange`) from
     emitting a ghost drop for an already-ended chat — comment it, don't
     optimize it away.
   - Student connection handler, active-chat resume branch: after
     re-emitting `chat:started` to self, fan out `"returned"`
     (`secondsLeft: null`) to the other connected active members.

4. **Client wire** (`pages/student/useLobbyPresence.ts`):
   `onPeerConnection` callback prop + `useLatestRef` + registration —
   clone the `chat:peer-typing` lines; touch the hook doc comment.

5. **Client state** (`pages/student/JoinActivityPage.tsx`): `LiveMatch`
   gains `offlinePeers: Record<string, number>` (characterId → deadline
   epoch ms) and `returnedFlashId: string | null`; a `flashTimerRef`
   beside `typingExpiryRef` (same no-cleanup, guarded-setMatch pattern).
   - `"dropped"` (guarded: live + chatId + characterId in `prev.peers`):
     `offlinePeers[characterId] = Date.now() + (secondsLeft ??
LOBBY_GRACE_SECONDS) * 1000`; clear `typingPeerId` if it's that
     character.
   - `"returned"`: ignore if not in `prev.offlinePeers` (the load-bearing
     guard — StrictMode double-mounts and duplicate-tab takeovers also
     resume); else remove it, set `returnedFlashId`, re-arm
     `flashTimerRef` for 2500ms → guarded clear.
   - Fresh `onChatStarted` branch inits `offlinePeers: {}`,
     `returnedFlashId: null` (the resume backlog is Prompt 3).
   - `shrinkToPeers` always strips gone ids from `offlinePeers` (the
     notice copy upgrade is Prompt 2).

6. **Client render** (`components/Student/LiveChatStage.tsx`): new props
   `offlinePeers`, `returnedFlashId`. A 1s ticker (`useState(Date.now)` +
   `setInterval` effect gated on `!isEnded` and a non-empty map — plain
   real time, never `useSecondCountdown`/`scaledMs`; deadline-derived so
   background-tab throttling self-corrects). Derivation replacing the
   pinned values: flash set → `peerState: "reconnected"`, `offlinePeerId:
returnedFlashId`; else map non-empty → `"disconnected"`, the
   min-deadline entry, `Math.max(0, Math.ceil((minDeadline - now) /
1000))` — clamp at 0:00 and never act on local zero; the server's
   `chat:update`/`chat:ended` resolves it. Else the connected nulls.
   Rewrite the header + pinned-values comments. (The banner keeps
   importing `RECONNECT_WINDOW_SECONDS` for its sr-only line until Prompt
   4 — both are 120. `Chatbox` already forces `peerState` to
   `"connected"` when ended, so the banner can't outlive the room.)

7. **Server test** (`live/lobby.test.ts`, the file's idiom — real
   sockets, store-direct setup, collector arrays for negatives): ONE new
   test (~15s timeout). Two students matched via `createChat`; A
   disconnects → B hears `chat:peer-connection` past the 4s gate (exact
   key pin `["characterId","chatId","secondsLeft","state"]`,
   `state: "dropped"`, A's member characterId, `secondsLeft` in
   (110, 116]); A resumes (studentId + token) → B hears `"returned"`,
   `secondsLeft: null`; a teacher-socket collector stays empty (the
   teacher never hears it).

8. **Docs.** DECISIONS.md (decisions 1–4 above); `docs/api.md` — the
   `chat:peer-connection` block after `chat:peer-typing` + the header's
   shipped list; `docs/architecture.md`'s "what is still simulated"
   sentence; AGENTS.md — the Status paragraph and the chat-engine
   contract bullet ("peer connection state has no slot on the student
   wire" is no longer true).

**Done when:** `pnpm typecheck` + `pnpm test` green; a browser pass —
teacher + two student tabs on a real activity: kill tab A → within ~4–5s
tab B shows "X lost connection… ~1:56 to come back" ticking; restore A →
"X is back! 🎉" for ~2.5s, then clear; quick-refresh A → B sees nothing;
pause mid-drop → the countdown keeps ticking; the `1234` demo unchanged.
Then the production pass: push, poll `/healthz`, confirm Vercel Ready,
rerun the two-tab drop/return on chaverola.com. `pnpm format`, one
commit, checkbox ticked.

---

## Prompt 2 — Expiry tells the truth (end to end)

**Goal:** when the window runs out, a 1:1 survivor lands on 🔌 "Your
partner lost connection… Not your fault!" (not the teacher copy), and a
group's survivors read "X couldn't get back in and left the chat".

1. **Shared.** `chat:ended` payload → `{ reason: "teacher" |
"peer-timeout" }`; `ChatSnapshot.endReason` → the same union + null
   (the teacher card only badges "Ended" — type-only there; lobby.ts's
   wrappingUp-resume fallback `{ reason: "teacher" }` still typechecks).

2. **Server.** `matching.ts`: `StoredChat.endReason` union widened;
   `markInactive(..., endReason: "teacher" | "peer-timeout" =
"teacher")` records the passed reason in the below-2 branch (the
   default keeps `chat:remove` and `lobby:leave` call sites untouched).
   `lobby.ts` `onGraceExpiry` passes `"peer-timeout"`. `projections.ts`
   `toChatEnded` projects `chat.endReason ?? "teacher"` and its stale
   "only reachable reason" comment dies — the wrappingUp resume
   re-delivery then carries the honest reason for free.

3. **Client.** `useLobbyPresence` `onChatEnded` payload widened.
   `JoinActivityPage`: new `liveEndReason` state set from
   `payload.reason`, reset on `backToLobby` and the fresh
   `onChatStarted` branch, threaded to `LiveChatStage` as `endReason` →
   `endReason: isEnded ? (endReason ?? "teacher") : null`.
   `shrinkToPeers`: a gone peer present in `prev.offlinePeers` reads
   "couldn't get back in and left the chat" (the demo's exact string).

4. **Tests.** Two asserts in `matching.test.ts`'s existing `markInactive`
   describe: `"peer-timeout"` is recorded; the default still yields
   `"teacher"`. No 120s socket test — it would need injected-timing
   machinery this feature doesn't want.

5. **Docs.** DECISIONS.md (decisions 5–7); api.md (the reason union, the
   `chat:ended` doc line); AGENTS.md's Status note about below-2 endings
   misreporting as `"teacher"`.

**Done when:** typecheck + tests green; a manual pass with a locally
shortened `LOBBY_GRACE_SECONDS`: 1:1 expiry → the 🔌 screen; trio expiry
→ the honest notice, chat continues; a refresh after a peer-timeout end
still shows the 🔌 screen (the stored reason rides the resume). Prod
pass, `pnpm format`, one commit, checkbox ticked.

---

## Prompt 3 — A blip can't hide a drop (end to end)

**Goal:** the common classroom failure — a wifi blip drops BOTH students;
the first one back missed the partner's `"dropped"` emit (fan-outs skip
disconnected seats). The `chat:started` resume backlog becomes
authoritative for offline peers, the same philosophy as `lines`.

1. **Shared.** `chat:started` gains `reconnectingPeers` (shape above).

2. **Server.** `toChatStarted(chat, activity, studentId, now)` — the
   signature grows; build the array from `activeMembers` minus self,
   filtered by the existing `isReconnecting`, seconds via
   `graceSecondsLeft`; update both call sites in lobby.ts.
   **`projections.test.ts`'s exact-key pin WILL break — update it in the
   same change:** new signature, `"reconnectingPeers"` in the sorted key
   list, each entry pinned to `["characterId","secondsLeft"]` (the
   privacy allowlist doing real work).

3. **Client.** `useLobbyPresence` `onChatStarted` payload gains optional
   `reconnectingPeers` (`?? []` — deploy-window tolerance).
   `JoinActivityPage`: the fresh branch builds `offlinePeers` from it;
   the resume/merge branch **order matters** — run `shrinkToPeers`
   against the OLD `offlinePeers` first (a peer who timed out while this
   phone was dark still gets the honest notice from local memory), THEN
   overwrite `offlinePeers` wholesale from the payload.

4. **Docs.** api.md's `chat:started` snippet; `docs/architecture.md`'s
   "what is still simulated" list settles to "the auto-end clock and the
   name reveal" plus the deferred self-timeout screen note.

**Done when:** typecheck + tests green; browser pass: kill both student
tabs, restore one while the other stays dark → the banner shows with the
correct remaining time; refresh the observer mid-drop → the banner
survives. Prod pass, `pnpm format`, one commit, checkbox ticked.

---

## Prompt 4 — The demo matches reality (end to end)

**Goal:** the `1234` demo plays the same story the real wire tells — no
spinner phase, countdown through a pause, one shared window constant —
and the dead `"reconnecting"` state leaves the codebase.

1. **`chat/useChatDemo.ts`**: delete `RECONNECT_WINDOW_SECONDS`; import
   `LOBBY_GRACE_SECONDS` from `@chaverola/shared`. `reconnectPeer` drops
   the spinner phase: clear the countdown → `"reconnected"` immediately →
   one `later(..., 2500)` back to `"connected"` + clear `offlinePeerId`.
   The reconnect countdown's `active` drops `&& !isPaused` (ticks through
   a pause; the auto-end clock keeps its pause freeze — that matches
   server semantics).
2. **`types/chat.ts`**: remove `"reconnecting"` from
   `PeerConnectionState` + its comment; rewrite the
   `ChatRoomState.isPaused` docblock (the reconnect window no longer
   holds during a pause).
3. **`chat/PeerReconnectBanner.tsx`**: the sr-only line imports
   `LOBBY_GRACE_SECONDS` from `@chaverola/shared` (kills the
   banner → demo-engine dependency); delete the `reconnecting` config
   entry + the unused `Loader2` import.
4. **Comments:** `chat/Conversation.tsx`'s pause-banner note;
   `shared/src/socket.ts`'s `AUTO_MATCH_GAP_SECONDS` comment loses its
   `RECONNECT_WINDOW_SECONDS` reference. (`ChatDemoControls` needs no
   change — it only checks `peerState === "connected"`.)

**Done when:** typecheck + tests green; demo pass on `1234`: "Partner
drops off" → banner; "Partner comes back" → straight to 🎉, no spinner;
pause with a partner out → the countdown keeps ticking. Prod pass (a
client-only push), `pnpm format`, one commit, checkbox ticked.
