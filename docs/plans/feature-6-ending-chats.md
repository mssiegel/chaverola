# Feature 6 — Ending chats

The teacher's "End chat" (per card) and "End all chats" (the round-closer)
work on live activities. Everything around them shipped long ago and works
on the `1234` demo: the buttons, both confirmation dialogs, the Completed
section's muted cards, the auto-match hold on End-all, the wire's
`ChatSnapshot.status`/`endReason`, the server→student `chat:ended` event,
and the student's "Your teacher ended the chat" screen. This feature adds
the missing middle: two teacher commands on the wire, server handlers that
end chats outright, and real emitters in the live engine. **Pausing stays
out** (founder call, 2026-07-21 — recorded in DECISIONS.md): "Pause all
chats" keeps rendering disabled behind the engine flag, renamed
`endingEnabled` → `pausingEnabled`, with the hint "Pausing chats comes in
a later update." The auto-end clock, rematch memory, and the name reveal
also stay out, and the `1234` demo stays behavior-identical and
zero-network.

One prompt, because it is one working thing: a wire event pair, one pure
store function, two thin handlers that reuse `settleMembershipChange`, and
an engine whose UI was already fully wired to it.

## How to use this document

Same rules as features 4 and 5: the prompt is sized for one agent session,
ends green (typecheck + tests + its own verification, production pass
included), gets **one commit straight to `main`**, and is safe to push on
its own. Server-touching (`server/**` is in Render's build filter) — fine
at any hour pre-launch (no real classes until end of August 2026).

- [x] Prompt 1 — The teacher ends chats for real (end to end)

Repo rules that apply (details in `AGENTS.md`): run `pnpm format` before
committing; record newly-made decisions in `DECISIONS.md`; verify at the
cheapest gate that catches the mistake. The one piece of new user-facing
copy — the pause-only hint — went through the humanizer pass.

## Shared context: the wire contract additions

In `shared/src/socket.ts`, documented in `docs/api.md` by this prompt:

```ts
// ClientToServerEvents additions:
/** Teacher only; idempotent — an already-ended or unknown chat is a
 *  no-op. Every member is still active when this fires, so all of them
 *  go wrappingUp and hear chat:ended. */
"chat:end": (payload: { chatId: string }) => void;
/** Teacher only: the round-closer — ends every active chat at once. A
 *  class with none active is a no-op. Plural like chats:snapshot. */
"chats:end-all": () => void;
```

No new server→client events: `chat:ended` (`{ reason: "teacher" }`)
already exists, is already re-sent on resume for wrappingUp seats, and the
student client fully handles it. `ChatSnapshot.status`/`endReason` already
carry ended state to the teacher, so the card flips to Completed on the
handler's own `chats:snapshot` — no optimistic client state.

## Shared context: the flag split

`endingEnabled` gated three controls (End chat, End all, Pause all) plus
one shared hint. After this feature ending is real on both engines, so a
constant-true `endingEnabled` would be dead code — the flag is **renamed**
`pausingEnabled` and gates only "Pause all chats" (demo `true`, live
`false`). The End buttons carry no flag at all; `ChatCard` loses its
`endChatDisabled` prop entirely (its only setter was
`ChatsInProgressSection`). The hint renders on `!pausingEnabled` with the
narrowed copy.

## Shared context: the deploy race

Benign in both directions — no defensive splitting needed. Client ahead of
server: `chat:end` / `chats:end-all` are unhandled events and Socket.IO
drops them silently — enabled-but-inert buttons for the deploy window,
acceptable pre-launch. Server ahead of client: nothing emits them. The
standing rules apply: poll `/healthz` for the new server commit before
testing, and confirm Vercel's production deployment is Ready for the SHA.

---

## Prompt 1 — The teacher ends chats for real (end to end)

**Goal:** a teacher taps End chat on a card (or End all chats) on a real
activity and every student in the room lands on the ended screen, on
production; the card moves to Completed; Pause stays honestly disabled;
the demo is untouched.

1. **Shared.** The two events above, docblocks included.

2. **Server pure logic** (`matching.ts`): `endChat(activity, chatId)` —
   find the chat, `undefined` unless `status === "active"` (idempotent),
   flip to `status: "ended"` / `endReason: "teacher"`, return
   `{ ended: true, chat }` — the same result shape as `markInactive`, so
   `settleMembershipChange` serves both. Update the module header: chats
   end two ways now; rematch memory still deliberately untracked.

3. **Server handlers** (`lobby.ts`, teacher branch, beside `chat:remove`):
   `chat:end` — payload shape-check → `getByHostKey` refetch → `endChat`
   → `log.info` → `settleMembershipChange` → `broadcastState`.
   `chats:end-all` — loop every chat through `endChat` (already-ended ones
   skip), settle each, one broadcast at the end; zero ended = silent
   no-op. `settleMembershipChange` is reused untouched: it already marks
   each active member wrappingUp, emits `chat:ended` to connected seats,
   and arms a fresh 120s grace for disconnected ones — and a teacher-end
   marks nobody inactive, so `activeMembers` covers everyone.

4. **Server tests.** `matching.test.ts`: `endChat` ends with reason
   "teacher" leaving `inactiveStudentIds` empty (load-bearing — settle
   must reach everyone), and no-ops on already-ended/unknown chats.
   `lobby.test.ts` (the file's idiom — real sockets, store-direct setup,
   collector arrays for negatives): `chat:end` reaches both members and
   marks both seats wrappingUp; `chats:end-all` closes two chats at once
   and a repeat emits nothing; the student-boundary test grows the two new
   events; ending around a dropped member arms a fresh grace and their
   resume re-delivers `chat:ended`.

5. **Client engines.** `hostEngine.ts`: the rename, doc comment updated to
   "the pausing-era seam". Demo: `pausingEnabled: true`. Live
   (`useHostActivityLive.ts`): `endChat`/`endAllChats` become bare emits
   beside the other command emitters; `pauseAllChats`/`resumeAllChats`
   stay `noop`; `pausingEnabled: false`; header + rematch comments
   updated.

6. **Client UI.** `ChatsInProgressSection`: prop renamed, Pause keeps its
   gate, End-all drops `disabled`, hint condition `!pausingEnabled` with
   the narrowed copy, `endChatDisabled` pass-through removed. `ChatCard`:
   the prop deleted. `HostActivityDashboard`: passes `pausingEnabled`;
   `confirmPendingAction` untouched — the End-all → auto-match-hold chain
   already flows through `updateSettings` → `settings:update` on live.

7. **Docs.** `docs/api.md` (events, the student-ignored boundary sentence,
   a teacher-end bullet under matching truths, the header's shipped list);
   `docs/architecture.md` (ending off the still-simulated list, seam
   renamed); `AGENTS.md` (status paragraph + the seam bullet);
   `README.md`'s scope note; DECISIONS.md (the new entry + supersession
   notes on the two placeholder-era entries). Feature 3–5 plan docs
   untouched — plan history is never rewritten.

**Races, all verified benign:** an in-flight `chat:send`/`chat:typing`
against a just-ended chat dies on the existing `status === "active"`
guards; End tapped on a card the below-2 rule ended a beat earlier is an
`undefined` no-op the snapshot already fixed; the End-all confirm's
`chats:end-all` → `settings:update` pair is ordered on one socket, and the
sub-second auto-match tick between them could only pair two _waiting_
students (ended ones are wrappingUp-ineligible).

**Done when:** `pnpm typecheck` and `pnpm test` green; a two-window
browser pass — teacher hosts a real activity, two students join and chat:
per-card End chat → confirm → both students land on "Your teacher ended
the chat", the card moves to Completed with its transcript, and each
student re-queues only via their own Back-to-the-lobby tap; re-pair with
auto-match on → End all chats → confirm → every chat ends, auto-match
flips off with the hold banner, and the banner's undo re-arms it; Pause
still renders disabled with the narrowed hint; kill a student tab, end
their chat, reopen → the resume returns them to the lobby queue (the
deliberate post-refresh `chat:ended` path — the client shows no ended
screen for a chat the page no longer holds); the `1234` demo unchanged
with zero `/socket.io/` traffic. **Then the production
pass**: push, poll `/healthz` for the new server commit, confirm Vercel
Ready, rerun the two-window flow on chaverola.com. `pnpm format`, one
commit, checkbox ticked.
