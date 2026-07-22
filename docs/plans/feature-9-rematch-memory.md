# Feature 9 — Rematch memory (server-side)

The "warn before a rematch" heads-up and the demo's rematch-avoidance work **only in the `1234` demo**. On a real activity the live teacher engine hard-codes the feature off — [`useHostActivityLive.ts:287-292`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts) ships `isExactRematch: () => false`, `rematchNotice: null` — so pairing two students, ending their chat, and re-selecting them shows no warning. The server tracks no last-partner memory at all ([`matching.ts:29-35`](../../server/src/live/matching.ts)), so live auto-match and Pair-everyone also silently re-pair the same group.

This was a **deliberate deferral** recorded in `docs/decisions/teacher-live.md` ("Server pairing keeps no rematch memory this feature", 2026-07-19): rematch memory was punted until chat-ending shipped, on the reasoning that reruns were structurally impossible until students could return to the queue. Ending shipped (feature 6); the memory was never picked up — the code comment already admits "Now that chats end, exact-rematch is reachable." Ending a chat does **not** delete anything: `endChat` flips `status` to `"ended"` and keeps membership; the check simply never runs live.

This feature adds the missing middle: one `StoredActivity` field maintained one-round-deep in `createChat`, the pure rematch rules promoted into `shared/` so server and client run one implementation, the memory (and a stuck-pair notice) projected to the teacher, and the three live-engine stubs lit up.

**Founder calls:** the whole presentation layer already shipped in the demo era — the amber heads-up ([`index.tsx:95-111`](../../client/src/components/Teacher/HostActivity/index.tsx), [`PairingPanel.tsx:177-203`](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)) and the dismissible rail notice are engine-agnostic and start working the moment the engine returns real values. **Ship fast: minimal tests, no new machinery beyond the memory itself.** The demo engines stay behaviorally byte-identical (the existing `hostWorld.test.ts` is the guard) and zero-network.

**Load-bearing fact (verified):** the normal end → "back" flow reuses the same seat — `returnToQueue` ([`seats.ts:266-270`](../../server/src/live/seats.ts)) keeps the studentId, only resetting `wrappingUp`/`joinedAt` — so memory keyed on studentId matches on re-selection. A student who _disconnected mid-chat_ and rejoins fresh gets a new `randomUUID()` id ([`seats.ts:136`](../../server/src/live/seats.ts)) and correctly has no history — an accepted, principled gap.

**No new user-facing copy:** the warning and "still in line" strings are reused verbatim from the demo (`hostWorld.ts`), so no humanizer pass is needed.

## How to use this document

Same rules as features 4–7: each prompt is sized for one agent session, ends green (`pnpm typecheck` + `pnpm test` + its own verification, production pass included), gets **one commit straight to `main`**, and is safe to push on its own. Server-touching (`server/**` is in Render's build filter) — fine at any hour pre-launch (no real classes until end of August 2026). Run `pnpm format` before committing; record newly-made decisions in `DECISIONS.md`; verify at the cheapest gate that catches the mistake.

The prompts are sequential (2 and 3 build on the memory prompt 1 establishes) but each is self-contained and independently shippable — after prompt 1 the reported bug is fixed and the rest is optional-to-defer.

- [x] Prompt 1 — The rematch warning fires on real activities (end to end)
- [x] Prompt 2 — Auto-match stops re-pairing the same partners (end to end)
- [ ] Prompt 3 — Pair-everyone avoids reruns and shows the "still in line" notice (end to end)

## Shared context: the memory model

`StoredActivity.lastPartners: Record<string, string[]>` — studentId → everyone in their **previous** chat, overwritten each time a chat starts (one round deep). Mirrors `HostWorld.lastPartners` ([`hostWorld.ts:78-79`](../../client/src/components/Teacher/HostActivity/hostWorld.ts)). Maintained **incrementally** in server `createChat` ([`matching.ts:135-169`](../../server/src/live/matching.ts)) — after `chat.members` is built, overwrite each seated member's entry with the room's others (byte-identical to demo `createChat`, `hostWorld.ts:196-199`). Not reconstructed from `activity.chats`: incremental reuses the seat identity that survives end→back and keeps the demo's start-time snapshot semantics. In-memory only — a deploy wipes it, like chats and seats.

`StoredActivity.rematchNotice: string | null` (added in prompt 3) — Pair-everyone left an exact-rematch pair/trio in line: the dismissible rail notice, projected on `chats:snapshot`. Set by `match:pair-everyone`, cleared by a manual `chat:start` or by `match:dismiss-rematch-notice`.

## Shared context: the pure rules move to `shared/`

The genuinely-pure predicates and planners move out of `hostWorld.ts` into [`shared/src/matchRules.ts`](../../shared/src/matchRules.ts) (the zero-dep module both engines already import — the documented "One implementation of the pure matching rules" precedent, which currently names these as the demo-only divergence). Each prompt moves exactly the symbols it needs and rewrites the matching demo function to call the shared version; the existing `hostWorld.test.ts` guards byte-identical behavior.

- Prompt 1: `isExactRematchIn` (`hostWorld.ts:132-145`).
- Prompt 2: `pickAutoMatchPair(readyIds, lastPartners)` (extract the two-pass selection from `findAutoMatchPair`, `hostWorld.ts:255-270`), plus its helpers `isFreshPair`/`wereLastPartnersIn` (`hostWorld.ts:107-125`).
- Prompt 3: `pairEveryonePlan(ids, characterCount, lastPartners) → { groups, leftoverId, stuckIds }` (the pure decision half of `pairEveryoneIn`, `hostWorld.ts:283-370`) and `stuckInLineNotice(names)` (`hostWorld.ts:389-394`); `listNames` (`hostWorld.ts:148-151`) moves here too since the server now needs it.

Repoint the demo import sites as symbols move: `useHostActivityDemo.ts` (`isExactRematchIn`), `index.tsx` (`listNames`), `hostWorld.test.ts` (`isExactRematchIn`) → `@chaverola/shared`. Keep the "live engine imports only types from `hostWorld`" invariant ([`useHostActivityLive.ts:31-32`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)): the live engine gets its predicate from `shared/`.

## Shared context: the wire contract additions

In `shared/src/socket.ts`, documented in `docs/api.md`:

```ts
// chats:snapshot payload (ServerToClientEvents, ~line 104) gains:
lastPartners: Record<string, string[]>;   // prompt 1 — waiting seats' previous partners (teacher truth)
rematchNotice: string | null;             // prompt 3 — the stuck-pair rail notice (teacher truth, multi-device coherent)

// ClientToServerEvents (~after line 219) gains:
"match:dismiss-rematch-notice": () => void; // prompt 3 — teacher only; idempotent
```

## Shared context: the deploy race

Benign both directions (same pattern as feature-7's `paused`). Client ahead of server: the missing `lastPartners`/`rematchNotice` land `undefined`; the live engine reads `payload.lastPartners ?? {}` and `payload.rematchNotice ?? null`, so the warning/notice are simply inert for the deploy window — acceptable pre-launch. Server ahead of client: extra payload fields are ignored; the dismiss emit is an unhandled event Socket.IO drops. Standing rule: poll `/healthz` for the new server commit and confirm Vercel Ready before the production pass.

---

## Prompt 1 — The rematch warning fires on real activities (end to end)

**Goal:** on a real activity, a teacher who pairs two students, ends their chat, and re-selects the same two sees the amber "…just chatted with each other. You can still pair them, this is only a heads-up." banner (respecting the "Warn before a rematch" setting), and can still pair them. The demo is untouched.

1. **Shared** (`matchRules.ts`): move `isExactRematchIn` here (exported, docblock kept). Repoint `useHostActivityDemo.ts`, `hostWorld.test.ts`, and `hostWorld.ts`'s internal callers to import it from `@chaverola/shared`; delete the local copy.
2. **Store** (`activityStore.ts`): add `lastPartners: Record<string, string[]>` to `StoredActivity`; init `{}` in `createActivity`.
3. **Server memory** (`matching.ts`): in `createChat`, after `chat.members` is built and before the return, overwrite each seated member's `activity.lastPartners` entry with the room's other studentIds (the fold in the memory-model context).
4. **Projection** (`projections.ts`): add `toRematchPartners(activity)` — `activity.lastPartners` filtered to `eligibleWaiting` studentIds (payload stays scoped to selectable students). Add `lastPartners: toRematchPartners(record)` to `chatsPayload` ([`lobbyContext.ts:114-132`](../../server/src/live/lobbyContext.ts)) and the field to the `chats:snapshot` wire type.
5. **Client** (`useHostActivityLive.ts`): add `lastPartners` state; set it in the `chats:snapshot` handler (`payload.lastPartners ?? {}`); reset in cleanup; import `isExactRematchIn` from `@chaverola/shared`; replace the stub with `isExactRematch: (ids) => isExactRematchIn(lastPartners, ids)`. No change to `index.tsx` / `PairingPanel.tsx`.
6. **Tests — minimal.** `matching.test.ts`: add `lastPartners: {}` to the `makeActivity` fixture; one test that `createChat` writes one-round `lastPartners` and **overwrites** on the next chat (A+B then A+C → `lastPartners.a === ["c"]`) — pins the reset rule everything depends on. `projections.test.ts`: add `lastPartners` to the `fullRecord` fixture; confirm the existing exact-key student/setup allowlists still pass (proves `lastPartners` doesn't leak off the teacher room). `hostWorld.test.ts` must pass unchanged (only the import line moves).
7. **Docs.** `docs/api.md` (the `lastPartners` field), `docs/decisions/teacher-live.md` + `DECISIONS.md` (supersede the "no server rematch memory" deferral), and the "what diverges" note in `matching.ts:29-35` (server now tracks last-partners); update the stub comment in `useHostActivityLive.ts:287-289`.

**Edge cases (benign):** a pair carved from a prior trio is not an exact rematch (length mismatch, already pinned by `hostWorld.test.ts:124-128`); a student who chatted with someone else in between has their entry overwritten, so no warning; a mid-chat-disconnect returner gets a fresh id and no history; a deploy wipes memory (no warning until fresh chats form).

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — host a real activity, two students join, pair them, End chat, both tap back, re-select the same two → amber heads-up appears and pairing still works; pair one of them with a third and end that, then re-select the original pair → **no** warning; toggle "Warn before a rematch" off → no heads-up; the `1234` demo unchanged with zero `/socket.io/` traffic. **Then the production pass**: push, poll `/healthz`, confirm Vercel Ready, rerun on chaverola.com. `pnpm format`, one commit, checkbox ticked.

---

## Prompt 2 — Auto-match stops re-pairing the same partners (end to end)

**Goal:** with auto-match on, a real activity prefers fresh partners and never auto-forms an exact rerun — matching the demo. (Depends on prompt 1's `lastPartners`.)

1. **Shared** (`matchRules.ts`): move `isFreshPair`, `wereLastPartnersIn` (`hostWorld.ts:107-125`) here; add `pickAutoMatchPair(readyIds, lastPartners)` — the two-pass rule (first fully-fresh pair; else first non-exact-rematch pair; else null) extracted from `hostWorld.ts:255-270`.
2. **Server** (`matching.ts`): rewrite `findAutoMatchPair` body to compute `ready` as today (eligible + past threshold), map to ids, and return `pickAutoMatchPair(readyIds, activity.lastPartners)`. Signature unchanged — caller [`autoMatch.ts:35-42`](../../server/src/live/autoMatch.ts) untouched.
3. **Client demo** (`hostWorld.ts`): rewrite `findAutoMatchPair` to filter/ready as today, map to ids, call the shared `pickAutoMatchPair`, map back to `WaitingStudent`. Behavior byte-identical.
4. **Tests — minimal.** `matching.test.ts`: one test — `findAutoMatchPair` prefers a fresh pair, falls back to a non-exact repeat, and returns `null` when only an exact pair is past threshold (set `joinedAt`/`connected` + `activity.lastPartners`). `hostWorld.test.ts` `findAutoMatchPair` suite passes unchanged.
5. **Docs.** Update `matching.ts:29-35` (auto-match no longer greedy/memoryless).

**Edge cases:** below-2 ready → null (unchanged); everyone mutually exact → null, so nobody is auto-paired into a rerun (they wait for someone new), matching the demo.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — real activity with auto-match on and a short threshold, three students; after a round ends and two return, auto-match pairs a returner with the _fresh_ third rather than rerunning the ended pair; demo unchanged. Production pass on chaverola.com. `pnpm format`, one commit, checkbox ticked.

---

## Prompt 3 — Pair-everyone avoids reruns and shows the "still in line" notice (end to end)

**Goal:** on a real activity, Pair-everyone repairs around exact reruns exactly like the demo, and when a stuck exact pair/trio is the only thing left it stays in line with the dismissible "…just chatted…, so they're still in line." rail notice; the X dismisses it and it does not resurrect on the next snapshot. (Depends on prompt 1.)

1. **Shared** (`matchRules.ts`): add `pairEveryonePlan(ids, characterCount, lastPartners) → { groups, leftoverId, stuckIds }` — the pure decision half of `pairEveryoneIn` (`hostWorld.ts:283-370`: greedy fresh-first loop, pair/trio/leftover swap-repair, exact-trio repair). Move `stuckInLineNotice(names)` and `listNames` here.
2. **Store** (`activityStore.ts`): add `rematchNotice: string | null` to `StoredActivity`; init `null`.
3. **Server** (`matching.ts`): extend `planPairEveryone` to run `pairEveryonePlan(pool, activity.characters.length, activity.lastPartners)` and return `stuckStudentIds` alongside `groups`/`leftoverStudentId`. Stays pure (reads pre-round memory; `createChat` writes after).
4. **Wire** (`socket.ts`): add `rematchNotice` to `chats:snapshot`; add `match:dismiss-rematch-notice` to `ClientToServerEvents`.
5. **Projection** (`lobbyContext.ts`): add `rematchNotice: record.rematchNotice` to `chatsPayload`.
6. **Server handlers** (`handlers/teacher.ts`): in `match:pair-everyone`, after pairing, set `current.rematchNotice = plan.stuckStudentIds.length ? stuckInLineNotice(names via seats.byId) : null`; in `chat:start`, clear `current.rematchNotice = null` on success; add an idempotent `match:dismiss-rematch-notice` handler (clear + `broadcastState`, in the `chats:pause-all` idiom). Dismiss is **server-side** so `broadcastState` doesn't resurrect it and a second host device stays coherent.
7. **Client** (`useHostActivityLive.ts`): add `rematchNotice` state from the snapshot (`?? null`); wire `rematchNotice` and `dismissRematchNotice: () => socketRef.current?.emit("match:dismiss-rematch-notice")`, replacing the last two stubs.
8. **Client demo** (`hostWorld.ts`): rewrite `pairEveryoneIn` to filter the connected pool, call the shared `pairEveryonePlan`, fold `createChat` over `groups`, and set `leftoverStudentId`/`rematchNotice` from the plan. Byte-identical.
9. **Tests — minimal.** `matching.test.ts`: one test — `planPairEveryone` returns `stuckStudentIds` for an exact pair, and empty for a stranded pair it swap-repairs. `lobby.test.ts` (optional, one happy path if cheap): Pair-everyone on an exact pair yields a non-null `rematchNotice` on the next `chats:snapshot`, and `match:dismiss-rematch-notice` clears it. `projections.test.ts`: add `rematchNotice` to the fixture / any `chats:snapshot` key pin. `hostWorld.test.ts` `pairEveryoneIn` suite passes unchanged.
10. **Docs.** `docs/api.md` (`rematchNotice` + dismiss event), `socket.ts` `match:pair-everyone` docblock (no longer "greedy in queue order"), `DECISIONS.md`.

**Edge cases:** a stranded pair always swap-repairs unless the queue is exactly that pair/trio (the only stuck case → notice); notice shows even with "Warn before a rematch" off (it explains a visible skip, matching the demo, `hostWorld.test.ts:218-234`); groups of 3–4 handled by `pairEveryonePlan`'s trio path.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — real activity, exactly two students who just chatted, hit Pair everyone → they stay in line with the dismissible notice; the X clears it and it stays cleared through the next snapshot; with a fresh third present, Pair-everyone repairs around the rerun; demo unchanged. Production pass on chaverola.com. `pnpm format`, one commit, checkbox ticked.
