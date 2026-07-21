# Feature 7 — Pausing chats

"Pause all chats" and its one-tap Resume work on live activities. The
whole presentation layer shipped in the demo era and works on the `1234`
demo: the confirm dialog ("Pause all chats?" in the default color), the
Resume slot swap, the amber paused banner and per-card "Paused" badges,
the PairingPanel's "Auto-match is on hold" copy, the student's "Your
teacher paused the chat. Eyes up front! 👀" banner over a frozen
transcript, the locked composer ("Paused. Hang tight…"), and the lobby's
"Class is paused" pill. The 2026-07-17 spec is recorded in DECISIONS.md
("Pause is one world-level switch"). This feature adds the missing
middle: the wire contract (nothing pause-shaped existed in `shared/`),
one server field with guards, and real state threaded into the live
engines — which hard-coded `paused: false` on both sides. The
`pausingEnabled` seam and its "Pausing chats comes in a later update."
hint are deleted (a constant-true flag would be dead code, same pruning
as feature 6's `endingEnabled`).

**Founder calls (2026-07-21):** freeze everything the spec froze
**except the 120s disconnect grace window, which keeps running** — a
pause must not stop a dead phone from being reaped and its partner
freed; and the pause reaches **everyone** — chat members and lobby
waiters alike. Ship fast: minimal tests, no new machinery beyond the
freeze itself. The demo engines stay untouched and zero-network.

One prompt, because it is one working thing: a wire event pair plus one
broadcast, one store field that is both flag and freeze anchor, two pure
helpers, guards where sends and matching already resolve, and engines
whose UI was already fully wired.

## How to use this document

Same rules as features 4–6: the prompt is sized for one agent session,
ends green (typecheck + tests + its own verification, production pass
included), gets **one commit straight to `main`**, and is safe to push
on its own. Server-touching (`server/**` is in Render's build filter) —
fine at any hour pre-launch (no real classes until end of August 2026).

- [x] Prompt 1 — The teacher pauses the class for real (end to end)

Repo rules that apply (details in `AGENTS.md`): run `pnpm format` before
committing; record newly-made decisions in `DECISIONS.md`; verify at the
cheapest gate that catches the mistake. No new user-facing copy anywhere
— the paused UI shipped long ago, the hint line is a deletion, and the
confirm dialog's "Chat clocks stop too, so nobody loses time." is TRUE
under this design — so no humanizer pass was needed.

## Shared context: the wire contract additions

In `shared/src/socket.ts`, documented in `docs/api.md` by this prompt:

```ts
// ClientToServerEvents:
"chats:pause-all": () => void;   // teacher only; idempotent
"chats:resume-all": () => void;  // teacher only; idempotent
// ServerToClientEvents:
"activity:paused": (payload: { paused: boolean }) => void; // every connected seat
// lobby:welcome gains `paused: boolean` (connect-time state; never persisted)
// chats:snapshot gains `paused: boolean` (teacher truth, multi-device coherent)
```

## Shared context: one field, frozen clocks, one shift

`StoredActivity.pausedAt: number | null` is both the flag and the freeze
anchor. While set: `chat:send`/`chat:typing` refuse after the record
lookup, the auto-match tick returns early, and projections compute
`waitSeconds`/`elapsedSeconds` against `clockNow = pausedAt ?? now` —
**field-level, not wholesale**: `isReconnecting` keeps real `now`, or a
mid-pause drop would never show "lost connection" while its
still-running grace clock reaped it invisibly. `resumeChats` shifts
every seat's `joinedAt` and every active chat's `startedAt` by
`ts = min(ts + (now - pausedAt), now)` — pre-pause time preserved,
mid-pause arrivals (joins, lobby:back returns, manually-paired chats)
clamp to zero accrued time — then clears the anchor. `chats:end-all`
routes through the same shift (End-all clears the pause; per-chat
`chat:end` never does). The teacher client's local 1s clock tick stands
down while paused.

## Shared context: the deploy race

Benign in both directions — no defensive splitting needed. Client ahead
of server: the pause emits are unhandled events Socket.IO drops
silently, and the missing `paused` payload fields land `undefined`,
which every reader treats as false (`=== true`) — enabled-but-inert
buttons for the deploy window, acceptable pre-launch. Server ahead of
client: extra payload fields are ignored. The standing rules apply: poll
`/healthz` for the new server commit before testing, and confirm
Vercel's production deployment is Ready for the SHA.

---

## Prompt 1 — The teacher pauses the class for real (end to end)

**Goal:** a teacher taps Pause on a real activity and every student
freezes where they stand — chat members get the banner and locked
composer, lobby waiters get the paused pill, the teacher's clocks hold,
auto-match waits — and one Resume tap puts everything back with no clock
jumping; the demo is untouched.

1. **Shared.** The wire additions above, docblocks included.

2. **Store** (`activityStore.ts`): `pausedAt: number | null`, init
   `null` in `createActivity`.

3. **Server pure logic** (`matching.ts`): `pauseChats(activity, now)` /
   `resumeChats(activity, now)` — boolean returns as the idempotency
   signal, the shift formula above.

4. **Projections** (`projections.ts` + `seats.ts`): the `clockNow`
   split; `toLobbyWelcome` gains the activity arg + `paused`;
   `chatsPayload` gains `paused`.

5. **Server handlers** (`lobby.ts`, teacher branch, beside
   `chats:end-all`): `chats:pause-all` / `chats:resume-all` in the
   `chat:end` idiom, fanning `activity:paused` via a `sendActivityPaused`
   helper (every connected seat — the pause is activity-wide);
   `chats:end-all` gains the resume shift; guards in `chat:send`,
   `chat:typing`, and `autoMatchTick`.

6. **Client teacher.** `useHostActivityLive`: `paused` from
   `chats:snapshot`, bare emitters, the held tick. `hostEngine` /
   `useHostActivityDemo` / `ChatsInProgressSection` /
   `HostActivity/index`: `pausingEnabled` deleted, hint deleted. The
   confirm flow and Resume were already wired.

7. **Client student.** `useLobbyPresence`: `paused` state from
   `lobby:welcome` + `activity:paused`, welcome destructured so the flag
   never reaches sessionStorage. `JoinActivityPage`: live value to
   `WaitingLobby` and `LiveChatStage`; the demo's page-level
   `classPaused` stays demo-only. `LiveChatStage`: real `isPaused` prop
   (Chatbox already applies ended-wins).

8. **Tests — minimal (founder call).** `matching.test.ts`: one shift
   test (pre-pause shifts, mid-pause clamps, ended chat untouched,
   idempotency booleans). `lobby.test.ts`: one happy path (pause reaches
   two chat members + a lobby waiter, mid-pause welcome carries it, a
   paused send dies silently, resume lets the next send land) plus the
   pause pair on the student-boundary test. `projections.test.ts`: the
   forced pin updates (`pausedAt` in the fixture, `paused` in the
   welcome allowlist).

9. **Docs.** `docs/api.md`, `docs/architecture.md`, `AGENTS.md` (the
   seam bullet replaced by the `pausedAt` invariant), `README.md`,
   DECISIONS.md (the new entry + amendment/supersession notes on the
   2026-07-17 spec and the feature-6 entry). Feature 3–6 plan docs
   untouched — plan history is never rewritten.

**Edge cases, all verified benign:** a grace expiry mid-pause can end a
chat below-2 — ended wins over paused on every client surface; an
in-flight send against a fresh pause dies on the new guard exactly like
any other silent rejection (no optimistic echo exists to roll back); a
typing dot in flight when the pause lands expires on its normal ≤5s TTL
(the server relays nothing new); `lobby:back` during a pause re-queues
at a frozen wait of 0 (its fresh `joinedAt` sits past the anchor, and
the resume clamp lands it at now); wrappingUp students hear the flip but
their ended screen outranks it.

**Done when:** `pnpm typecheck` and `pnpm test` green; a browser pass —
teacher hosts a real activity, three students join, two pair: Pause →
confirm → both chat members land on the frozen room (banner, locked
composer, a typed send goes nowhere), the lobby waiter shows the paused
pill, the teacher shows Resume + paused badges + wait/elapsed clocks
that hold still, auto-match pairs nobody; a mid-pause join enters a
paused lobby; a mid-pause refresh resumes into the frozen room; Resume →
the next send lands and every clock continues from its frozen value;
re-pause → End all chats → the pause clears with the round; the `1234`
demo unchanged with zero `/socket.io/` traffic. **Then the production
pass**: push, poll `/healthz` for the new server commit, confirm Vercel
Ready, rerun the flow on chaverola.com. `pnpm format`, one commit,
checkbox ticked.
