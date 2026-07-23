# Feature 20 — The repo docs stop describing a product that no longer exists

[`AGENTS.md:22`](../../AGENTS.md) says: _"Every live feature has shipped: nothing
on a real activity is simulated anymore."_ It is the first thing any agent reads
about this codebase, and it is false twice over.

**Reproduce it in two minutes.** Host a real activity, open the live settings
panel, rename a character. Within a second the teacher's own chat cards relabel —
[`withCurrentCharacters`](../../client/src/lib/hostActivity.ts) re-resolves each
stored participant against the local roster
([`hostActivity.ts:135-144`](../../client/src/lib/hostActivity.ts)) — while the
server's roster, every student's lobby, and every bubble in the live chat keep
the old name. That is a simulation on a real activity: a teacher-facing illusion
with nothing behind it. Second falsehood: feature 11 is in flight (prompt 1 of 4
landed — [`feature-11-transcript-email.md:57-60`](feature-11-transcript-email.md)),
so the promised transcript email still does nothing, and the status table above
that sentence ([`AGENTS.md:9-20`](../../AGENTS.md)) has no row for it.

The same claim has a **second home** —
[`architecture.md:391`](../architecture.md) ends the realtime section with
"Nothing on real activities is simulated anymore." One fact, two docs, both
wrong, which is exactly what [`AGENTS.md:30`](../../AGENTS.md) ("Every fact has
ONE home") exists to prevent.

Two smaller pointers rot the same way. The 2026-07-19 settings decision still
names `autoEndChats` as a stored-but-inert setting
([`teacher-live.md:511-512`](../decisions/teacher-live.md)); that setting was
deleted outright on 2026-07-22
([`teacher-live.md:40-50`](../decisions/teacher-live.md)). And its implementation
pointer sends the reader to `lobby.ts` for the `settings:update` handler
([`teacher-live.md:533-534`](../decisions/teacher-live.md)); the handler lives at
[`handlers/teacher.ts:248-263`](../../server/src/live/handlers/teacher.ts), and
[`lobby.ts`](../../server/src/live/lobby.ts) has not held a `socket.on` since the
handler split. `grep -rn "live/lobby.ts" docs/decisions/` returns 19 hits, so
that pointer has eighteen siblings.

**This doc is the residue, and only the residue.** The panel's user-facing copy
belongs to feature 12; the stale demo comment at
[`ChatStage.tsx:55-56`](../../client/src/components/Student/ChatStage.tsx)
belongs to feature 19; every comment that becomes false when roster or host-name
sync ships belongs to features 17 and 18. The repo's rule is that docs are
updated **inside** the prompt that changes the behavior
([`AGENTS.md:186`](../../AGENTS.md)), so this prompt doesn't pre-empt any of them
— it checks their work and cleans up what no feature owns.

**Decisions this works within, not against.** The local-only split for roster,
scene and host name is a recorded founder call
([`teacher-live.md:505-531`](../decisions/teacher-live.md), extended by the email
entry at [`:8-38`](../decisions/teacher-live.md)). Nothing here supersedes it.
The job is to make the docs say what that decision actually decided, instead of a
blanket sentence that contradicts it.

- [ ] Prompt — Every claim in the live docs matches the code

---

## Prompt — Every claim in the live docs matches the code

**Goal:** an agent who reads `AGENTS.md` cold gets a true picture of what is real
on a live activity and what isn't, and every "implemented in X" pointer in
`docs/decisions/` opens the file that actually holds the code. No behavior
changes; the deliverable is that the next agent stops being lied to.

1. **`AGENTS.md:22`.** Replace the blanket sentence with what is true when you
   run this: which of roster, scene and host-name edits are still the teacher's
   local view, and where feature 11 stands. Point at the decision entry rather
   than restating its reasoning — the one-home rule at
   [`AGENTS.md:28-30`](../../AGENTS.md) applies to this doc too.
2. **The duplicate home.** [`architecture.md:391`](../architecture.md) asserts the
   same thing. Pick one home and delete the claim from the other.
   - **Ask the founder:** does "what is still simulated on a real activity" live
     in `AGENTS.md`'s Status block (read first, changes every feature) or in
     `architecture.md`'s realtime section (where the mechanism is explained)?
3. **The status table** ([`AGENTS.md:9-20`](../../AGENTS.md)). Add a row for
   feature 11 reflecting its real state — check the checkboxes in
   [`feature-11-transcript-email.md`](feature-11-transcript-email.md) rather than
   trusting this doc.
   - **Ask the founder:** should the bug-fix docs (features 12–20) get status
     rows at all, or is the table only for features that add something a teacher
     can see? If they get rows, ask what a row for a fix should say — "Complete"
     reads oddly next to "Create & join."
4. **`teacher-live.md:511-512`.** `autoEndChats` no longer exists. Follow the
   file's own convention: the 2026-07-19 body already carries two dated
   `_Update (…)_` notes at [`:517-523`](../decisions/teacher-live.md) for exactly
   this situation. Add a third pointing at the auto-end removal entry; don't
   rewrite the history.
5. **`teacher-live.md:533-534`.** Repoint `settings:update` at
   [`handlers/teacher.ts:248-263`](../../server/src/live/handlers/teacher.ts).
   Then grep `docs/decisions/` for `live/lobby.ts` — `chat:send`, `chat:typing`,
   the peer-connection emits, the seat-grace handlers and the return replay all
   moved into `handlers/` or `lobbyContext.ts` during the speedup refactor, and
   their pointers didn't follow.
   - **Ask the founder:** fix all of them in this pass, fix only the ones that
     would send a reader to the wrong file for code they're about to change, or
     leave them? Accuracy against a large diff over frozen-feeling prose.
6. **Sweep beyond this list.** The audit that produced this doc covered the
   teacher-live area thoroughly and other areas not at all, so treat items 1–5 as
   a starting sample. Read the **live** prose docs against the code: `README.md`,
   `Shared_Project_Context.md`, `AGENTS.md`,
   [`docs/architecture.md`](../architecture.md), [`docs/api.md`](../api.md),
   `docs/operations.md`, `docs/adding-a-wire-event.md`,
   [`tools/verify/README.md`](../../tools/verify/README.md), and every file in
   `docs/decisions/`. **`docs/plans/` is out of scope** — plan docs freeze at
   completion ([`AGENTS.md:50`](../../AGENTS.md)) and are the historical record.
   The only plan file this prompt writes to is this one, to tick its checkbox.
   ([`docs/pending-manual-tests.md`](../pending-manual-tests.md) was emptied on
   2026-07-23 — confirm, don't assume.)
7. **Check, don't edit — the comments other features own.** These are true today
   and become false only when roster/host-name sync ships:
   [`index.tsx:197-201`](../../client/src/components/Teacher/HostActivity/index.tsx),
   [`HostActivityPage.tsx:182-185`](../../client/src/pages/teacher/HostActivityPage.tsx),
   [`projections.ts:125-128`](../../server/src/store/projections.ts) ("the
   server's copy never changes"), and
   [`tools/verify/README.md:105-107`](../../tools/verify/README.md). The same
   claim also has two homes in the wire contract:
   [`api.md:405-407`](../api.md) and [`api.md:592-595`](../api.md). If features 17
   and 18 have shipped, verify their prompts cleaned all six; if they haven't,
   leave every one alone — a true sentence is not drift. Report anything a
   shipped prompt missed and fix it here in one line.
8. **Decisions.** The founder's answers above are process calls: record each in
   `docs/decisions/process.md` plus its index line in
   [`DECISIONS.md`](../../DECISIONS.md), per [`AGENTS.md:193`](../../AGENTS.md).
   "No rows for fixes" is itself worth writing down — it comes up again at
   feature 21.

**Edge cases:** a doc line that reads wrong but is true because its feature hasn't
shipped is **not** drift — leave it (item 7). Two docs asserting the same fact get
fixed by deleting one, never by syncing both. Features 12–19 may land before or
after this prompt runs, so re-read the state of each before writing a status row
or judging a comment stale. Line numbers cited in _this_ doc will have moved as
those features landed — open each file and confirm before editing. Frozen plan
docs stay wrong on purpose.

**Humanizer:** not applicable. [`AGENTS.md:192`](../../AGENTS.md) exempts code,
comments, and internal docs, and this prompt changes no user-facing string.

**Tests:** none — docs only, no code path changes, so `pnpm test` should be
byte-identically green before and after. Adding a test here would pin prose.

**Done when:** `pnpm typecheck` + `pnpm test` green (unchanged, which is the
point); `pnpm format` run — Prettier covers `.md`; every claim you rewrote was
verified by opening the code file it names, not by trusting this doc; no file
under `docs/plans/` touched except this one's checkbox; no user-facing copy
changed, so no browser pass, no demo pass, and no deploy race to wait on. One
commit straight to `main` — and push it **on its own**, not stacked on a code
commit: a docs-only tip commit touches neither `client/`, `shared/`, nor a root
manifest, so Vercel's skip check fires and any client code sitting under it never
rebuilds ([`AGENTS.md:188`](../../AGENTS.md)). Checkbox ticked.
