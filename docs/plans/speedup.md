# Speedup — faster verification, cheaper reading

Features take too long to build, and on 2026-07-21 we measured why. It
is **not** the automated tests — 8 files, 92 cases, ~2 seconds; nothing
here cuts real coverage. The wall clock goes to two places:

1. **The verification loop.** The browser harness lives outside the
   repo in `$env:TEMP\chaverola-verify\` (uncommitted, drifting, with
   `playwright-core` installed on the fly), launching the stack is a
   ritual (CORS env override, stale-port-3001 checks), and real socket
   flows wait out real-world clocks even on localhost — ~20s
   auto-match, ~45s ping-cycle disconnect detection, 120s grace.
   `?fast` compresses demo timers only.
2. **Reading.** Two god files (`JoinActivityPage.tsx` at 1,242 lines,
   `lobby.ts` at 876), matching rules duplicated across three
   prose-guarded copies ("mirror, never import"), and 5,000+ lines of
   prose docs with no task→constraint index — which every feature must
   also rewrite (~5 docs per feature).

Eight prompts fix both. Prompts 1–3 make every iteration fast (a
server time-scale knob, the harness moves into the repo, the verify
skill shrinks to match). Prompts 4–5 make the docs a lookup structure
instead of a reading assignment. Prompts 6–8 refactor the three worst
read costs. Every prompt leaves the app working end to end: changes
are behavior-preserving moves or default-off knobs (scale 1 is
byte-identical to today).

## Product & process decisions (founder calls, 2026-07-21)

Each prompt records its own in DECISIONS.md; prompt 3 also records
decisions 3 and 4.

1. **Localhost real flows compress through a server-side
   `CHAVEROLA_TIME_SCALE` knob; production is hard-pinned to scale 1**
   (belt: Render never sets the var; suspenders: `NODE_ENV ===
"production"` forces 1 even if it leaks in). The client needs no
   knob — every real-activity countdown is server-seeded and engine.io
   ping settings ride the handshake.
2. **The verify harness is repo code** (`tools/verify/`), with
   `playwright-core` as a real dependency. Only the everyday drivers
   are committed (launcher, smoke, coldwake); one-shot and
   rarely-triggered drivers are written fresh in a gitignored
   `scratch/` when their trigger fires — committed era-specific
   gauntlets rot (two dead assertions are already on record).
3. **The per-feature prod pass trims to: coldwake first → deployed
   smoke → one feature-specific network leg** (+ a handset ask only
   for offline/disconnect features). Prior features' gauntlets are
   not re-run over unchanged areas. A fuller regression sweep runs
   only when the code it guards changes, plus once as the
   launch-readiness gate before end of August 2026. No cron.
4. **No CI.** Push-to-main stays ungated beyond Render's
   `tsc --noEmit`; the agent loop's local `pnpm typecheck && pnpm
test` before push remains the gate. (Considered and declined — a
   tripwire workflow can be revisited at launch.)
5. **DECISIONS.md becomes an index; entries live in
   `docs/decisions/<area>.md`.** Supersedes "DECISIONS.md stays one
   file" (2026-07-15) through its own process. The index keeps every
   `see DECISIONS.md → <title>` pointer resolvable — the original
   entry's own survival criterion.
6. **AGENTS.md becomes a lean router** (~250 lines): status table,
   invariants, a task router, and a docs map that gives every fact ONE
   home. The per-feature doc tax drops to: the plan doc (frozen at
   feature completion), a decisions entry only if a decision was made,
   api.md only if the wire changed, and one status-table cell.
7. **The genuinely-pure matching primitives move to `shared/`** so
   both engines import one implementation. The simulation machinery
   (`tickWorld`, rematch memory) stays client-side; the "live engine
   imports nothing from hostWorld beyond types" invariant stays true.

## How to use this document

Same rules as features 4–8: each prompt is sized for one agent
session, ends green (typecheck + tests + its own verification), gets
**one commit straight to `main`**, and is safe to push on its own.
Docs-only prompts (3, 4, 5) push standalone — never stacked on top of
an unpushed code commit (the tip-commit deploy rule).

Ordering: 1 → 2 → 3 in that order; 4 → 5 in that order; 6 → 7 in that
order. The three chains are independent of each other. Prompt 8 needs
prompt 2 (its browser pass runs on the new harness).

- [ ] Prompt 1 — Localhost time obeys a dev knob
- [ ] Prompt 2 — The verify harness lives in the repo
- [ ] Prompt 3 — The verify skill tells the new story
- [ ] Prompt 4 — DECISIONS.md becomes an index
- [ ] Prompt 5 — AGENTS.md becomes a router
- [ ] Prompt 6 — One implementation of the matching rules
- [ ] Prompt 7 — lobby.ts becomes a composition root
- [ ] Prompt 8 — The student page splits by stage

Repo rules that apply (details in `AGENTS.md`): run `pnpm format`
before committing; record newly-made decisions in DECISIONS.md; verify
at the cheapest gate that catches the mistake. No new user-facing copy
is planned in any prompt — if one drifts into writing some, the
humanizer pass applies.

---

## Prompt 1 — Localhost time obeys a dev knob

**Goal:** a dev server started with `CHAVEROLA_TIME_SCALE=10` runs
every lobby clock 10× fast — grace 120s→12s, disconnect broadcast gate
4s→0.4s, dead-connection detection ~45s→~4.5s, auto-match ~20s→~2s —
while an unset knob (and production, always) is byte-identical to
today.

1. **Config** (`server/src/config.ts`): add `timeScale: number` to
   `Config`. `readTimeScale(env)`: `NODE_ENV === "production"` returns
   1 unconditionally; otherwise parse `CHAVEROLA_TIME_SCALE`,
   non-finite → 1, clamp to [1, 100]. While here: add
   `http://localhost:5199` and `http://127.0.0.1:5199` to the dev tail
   of `allowedOrigins()` — 5199 is the designated verification port,
   and this deletes the `$env:CLIENT_ORIGINS` launch override forever.
2. **Timing module** (new `server/src/live/timing.ts`): a module
   singleton `timing` holding the derived numbers — `scale`, `graceMs`
   (`LOBBY_GRACE_SECONDS * 1000`), `broadcastDelayMs`
   (`LOBBY_DISCONNECT_BROADCAST_DELAY_MS`), `autoMatchGapMs`
   (`AUTO_MATCH_GAP_SECONDS * 1000`), `autoMatchTickMs` (1000), and
   engine.io's defaults made explicit so they can scale:
   `pingIntervalMs: 25_000`, `pingTimeoutMs: 20_000` — plus
   `applyTimeScale(scale)` which divides them all (floor 50ms). A
   singleton, not parameter threading, because `projections.ts` is
   pure and widely called. The docblock states what is deliberately
   NOT scaled: the `chat:send` rate-limit window, `TYPING_*`
   heartbeat/TTL, teacher keepalive, store TTL/sweep, and the client's
   `LEAVE_FLUSH_MS`.
3. **Wire it** (`server/src/live/lobby.ts`): `applyTimeScale(
config.timeScale)` first thing in `attachLobby`; pass
   `pingInterval: timing.pingIntervalMs, pingTimeout:
timing.pingTimeoutMs` to `new Server(...)`; the two
   `armSeatTimers(..., LOBBY_GRACE_SECONDS * 1000)` call sites and the
   `armDisconnectTimers(..., LOBBY_DISCONNECT_BROADCAST_DELAY_MS,
...)` site read `timing.*` instead; the auto-match tick uses
   `timing.autoMatchGapMs` / `timing.autoMatchTickMs`; the auto-match
   threshold check divides the activity's `autoMatchSeconds` by
   `timing.scale` so real auto-match compresses too.
4. **Projections** (`server/src/store/projections.ts`) — the
   correctness linchpin: `graceSecondsLeft` and `isReconnecting`
   switch from the shared constants to `timing.graceMs` /
   `timing.broadcastDelayMs`, or countdown payloads desync from the
   actual reap clock.
5. **Healthz** (`server/src/app.ts`): the `/healthz` payload gains
   `pid` and `timeScale` (omit `timeScale` when 1). The harness — and
   a human — can now identify a stale or wrongly-scaled server by
   reading the answer instead of the `Get-NetTCPConnection` ritual.
6. **Test diet** (`server/src/live/lobby.test.ts`): the one test that
   waits out the real 4s broadcast gate (the 15s-timeout
   peer-connection test) gets its **own** `attachLobby` on a second
   http server with `timeScale: 8` — gate 500ms, grace window 15s,
   same both-sides slack logic in the assertions (secondsLeft in
   (10, 15]). This saves ~3.5s and, more importantly, permanently pins
   the scaling mechanism in the automated suite. Do **NOT** put a
   scale in the shared `beforeEach` config — at scale 8 the default
   20s auto-match threshold compresses to 2.5s and quietly auto-pairs
   students mid-test across the rest of the suite. The 12 `sleep(100)`
   calls stay: they are negative-assertion silence windows over real
   sockets; fake timers can't drive real websocket IO. Every
   test-file `Config` literal gains `timeScale: 1`.
7. **Known cosmetic wart, accepted:** `PeerReconnectBanner`'s static
   "2 minutes" sr-only copy reads wrong under dev scaling while the
   window is 12s. Dev-only; prompt 3 notes it in the skill.
8. **Docs:** DECISIONS entry (decision 1 above; Backend & API);
   a paragraph in `docs/api.md`'s constants section.

**Ends green:** `pnpm typecheck && pnpm test` with everything at scale
1 (green = byte-identical proof). Then a manual scaled run: start the
server with `CHAVEROLA_TIME_SCALE=10`, `/healthz` reports
`timeScale: 10`; join a student to a real activity from a second tab,
kill the tab, and watch the teacher's "lost connection" tag land in
under a second and the seat reap in ~12s.

---

## Prompt 2 — The verify harness lives in the repo

**Goal:** `pnpm verify:up` launches the whole verification stack
(client on 5199, server at scale 10) and `pnpm verify:smoke` proves a
full activity end to end in under a minute — no on-the-fly
`playwright-core` installs, no PowerShell env rituals, no scripts
living in `$env:TEMP`.

1. **Workspace:** add `tools/verify` to `pnpm-workspace.yaml`. New
   `tools/verify/package.json`: `@chaverola/verify`, private,
   `"type": "module"`, deps `playwright-core` (pin near 1.61.1 — the
   temp install's known-good) and `socket.io-client` (^4.8.3). Plain
   `.mjs`, no TS — zero build/typecheck/lint ceremony (`pnpm -r
typecheck`/`lint` don't see it). `tools/verify/.gitignore`:
   `shots/`, `scratch/`.
2. **Harvest** — the temp dir exists today (79 scripts) but is one
   Windows cleanup away from gone. Copy byte-safe with
   `node -e "require('fs').copyFileSync(...)"` — never PowerShell
   text cmdlets (the cp1252 mangling gotcha) — then edit with file
   tools:
   - `f3p5-lib.mjs` → `tools/verify/lib.mjs`. Keep
     `check`/`summary`/`exitWith`, `createActivity`, `joinStudent`,
     `openTeacher`, and the selector helpers exactly as they are
     (they already encode the aside-scoping and stale-probe lessons in
     code). Change: screenshot dir becomes repo-relative
     `tools/verify/shots/` (mkdir on demand); target selection keeps
     the `CHAVEROLA_WEB`/`CHAVEROLA_API` env defaults
     (localhost 5199/3001) and gains a `--prod` argv shortcut for
     `https://chaverola.com` / `https://api.chaverola.com`. Add three
     helpers that turn skill prose into code: `waitForQueueRows(page,
n)` (the lobby-renders-before-the-seat-lands race),
     `dropConnection(page)` (`page.goto("about:blank")` — CDP
     `setOffline` never severs an established websocket),
     `watchForSocketTraffic(page)` (for demo zero-socket sweeps).
   - `coldwake.mjs` → `tools/verify/coldwake.mjs` — the one driver
     every per-feature prod pass runs.
   - If the temp dir is already gone: rewrite both from their
     behavioral descriptions in `.claude/skills/verify/SKILL.md`.
3. **`tools/verify/up.mjs`** (new): the launcher. Parse `--scale <n>`
   (default 10; `--scale 1` for real-timing runs). Probe
   `http://localhost:3001/healthz` — if something answers, print its
   `pid`/`timeScale`/commit and, unless it matches the requested
   scale, refuse with the exact `taskkill /PID <pid> /F` line (no
   auto-kill). Spawn the client (`pnpm --filter @chaverola/client
exec vite --port 5199 --strictPort`) and the server
   (`pnpm --filter @chaverola/server exec tsx watch
--clear-screen=false src/index.ts`) with
   `CHAVEROLA_TIME_SCALE` in the spawn env — Node's spawn env is
   cross-platform, so the PowerShell `$env:` dance dies here. Poll
   both until ready, print one `READY web=... api=... scale=...`
   line, tear both down on exit. Agents run it in the background.
4. **`tools/verify/smoke.mjs`** (new): the everyday driver and the
   deployed-build smoke. Create activity → open teacher → join two
   students → `waitForQueueRows(2)` → Pair everyone → both seated →
   one message each way → teacher transcript shows both → End all →
   both students on ended screens. Local (seconds at scale 10) or
   `--prod`.
5. **`tools/verify/README.md`**: skeleton now (what lives here, how
   to run, where scratch drivers go); prompt 3 moves the selector
   map and traps in.
6. **Root `package.json` scripts:** `"verify:up": "node
tools/verify/up.mjs"`, `"verify:smoke": "node
tools/verify/smoke.mjs"`.
7. **Not committed, on purpose:** everything else in the temp dir —
   the ~30 era-specific per-feature gauntlets (they assert stale UI
   copy) and the occasional regression drivers (demo zero-socket
   sweep, leave-offline repro, leave-race hammer, restart story).
   Each gets ported or rewritten into `scratch/` only when its
   trigger fires (prompt 3 records the triggers). Future one-shot
   drivers are born in `tools/verify/scratch/`, import `../lib.mjs`,
   and are authored with file tools — never round-tripped through
   PowerShell text cmdlets.

**Ends green:** `pnpm install` resolves the new workspace;
`pnpm verify:up` (background) prints READY; `pnpm verify:smoke`
passes end to end at scale 10 in well under a minute;
`node tools/verify/coldwake.mjs --prod` still runs (fine for it to
find a warm server — it reports, not fails). DECISIONS entry
(decision 2; Process & tooling).

---

## Prompt 3 — The verify skill tells the new story

**Goal:** `.claude/skills/verify/SKILL.md` shrinks from ~489 lines to
~120 by documenting the world prompts 1–2 built, and the trimmed
prod-pass policy is recorded. Docs-only; push standalone.

1. **Rewrite SKILL.md** in six short sections:
   - Header + the cheapest-gate reminder (AGENTS.md still owns the
     ladder).
   - Launch: `pnpm verify:up` — what it starts, the READY line,
     `--scale 1` when a run needs real timings, what it prints when a
     stale server holds 3001. One paragraph replaces the old
     port/CORS/stale-PID ritual pages.
   - Drive: a one-line-each table of the committed drivers (smoke,
     coldwake; local vs `--prod`), plus: new one-shot drivers go in
     `tools/verify/scratch/`, import `../lib.mjs`, file-tools-only
     authoring.
   - Fast time, two knobs: `?fast` (client demo simulation only,
     unchanged) and `CHAVEROLA_TIME_SCALE` (server real flows: grace,
     broadcast gate, ping cycle, auto-match; what never scales; the
     "2 minutes" banner wart; prod pinned to 1).
   - Production: the once-per-feature rule (DECISIONS pointer), the
     trimmed pass in order — `coldwake --prod` FIRST (opportunistic:
     a warm server just means the path wasn't exercisable) →
     `smoke --prod` → ONE feature-specific network-sensitive leg
     written fresh in `scratch/` → handset ask only when the feature
     touches offline/disconnect paths, else
     `docs/pending-manual-tests.md`. Per-push `/healthz` +
     Vercel-Ready checks stay (deploy discipline, not verification).
   - Reference pointer: "Selector map, host-page traps, prod-lesson
     archive: `tools/verify/README.md`."
2. **Move to `tools/verify/README.md`:** the stable-handles/selector
   sections (navbar, join routes, host-page anatomy, dialog scoping,
   the host-page selector traps), the timing notes a driver author
   needs (Render close-frame nondeterminism, websocket-upgrade-after-
   seat, 117-first-reading), and the prod-lessons list trimmed to one
   line + DECISIONS/plan-doc pointer each. Gotchas that became
   `lib.mjs` helpers get a "use `waitForQueueRows`" one-liner instead
   of a warning paragraph.
3. **AGENTS.md, minimal touch** (the full rewrite is prompt 5): the
   cheapest-gate bullet's "scratch socket.io-client scripts" now
   points at `tools/verify/scratch/` + `lib.mjs`; mention the server
   time-scale knob beside `?fast`.
4. **DECISIONS entries** (Process & tooling): the trimmed prod-pass
   policy (decision 3 — including the regression-sweep triggers:
   `LEAVE_FLUSH_MS`/flush logic, seat teardown, or demo gating
   changes, plus once before launch) and the no-CI call (decision 4).

**Ends green:** `pnpm format:check`; a read-through dry run — an
agent following only the new SKILL.md gets from cold clone to a
passing smoke without touching `$env:TEMP`.

---

## Prompt 4 — DECISIONS.md becomes an index

**Goal:** the 4,300-line, 236 KB log becomes 13 per-area files under
`docs/decisions/` plus an index-only root `DECISIONS.md` (~230
lines), with every entry preserved verbatim and every existing
pointer still resolving. Docs-only; push standalone. This is a **pure
move + link rewrite** — no copyediting, or diff review becomes
impossible.

1. **The mapping** (1:1 from existing `##` sections — mechanical, no
   judgment; counts as of 2026-07-21, recount at execution):
   `student-join.md` (20), `chat-behavior.md` (17), `characters.md`
   (1), `teacher-setup.md` (10), `teacher-live.md` (37),
   `monitoring.md` (2), `homepage.md` (17), `navbar.md` (5),
   `branding.md` (2), `demo-flows.md` (5), `routes.md` (3),
   `backend-api.md` (13), `process.md` (14). The 6 superseded entries
   distribute into a `## Superseded` section at the bottom of their
   own area file — each is superseded by an entry in the same file,
   so those anchors stay intra-file. Each area file opens with a
   3-line header pointing back at the index.
2. **The root file** stays at the repo root under its existing name —
   that is what keeps the ~140 `see DECISIONS.md → <title>`
   references across ~56 files resolving (verified: they all cite
   titles/sections, never line numbers, and nothing links
   `DECISIONS.md#anchor`). It becomes: preamble + how-to (add an
   entry: body to the top of the area file, one index line here, same
   change; supersede: move to the file's own Superseded section) +
   the entry template + one linked line per entry, per area, order
   preserved.
3. **Script the split** (one-off script in the session scratchpad,
   not the repo): split at `##` boundaries; emit area files;
   regenerate the root as an index generated FROM the area files'
   headings (titles/anchors exact by construction). Mechanical
   rewrites only: root-relative links in moved bodies get a `../../`
   prefix (`](client/...` → `](../../client/...`, same for
   `server/`, `shared/`, `docs/`, `Shared_Project_Context.md`,
   `AGENTS.md`, `README.md`); intra-file anchors whose target heading
   now lives in another file become `](<area>.md#anchor)` (~97 anchor
   links, some crossing sections).
4. **Supersede "stays one file" properly** (same commit): new entry
   at the top of `docs/decisions/process.md` — "DECISIONS.md is an
   index; entries live in docs/decisions/ per area" — with the why
   (at 4,300 lines the single file cost more to load than it saved
   in greppability; the index keeps every pointer resolvable, which
   was the original entry's own survival criterion; an agent now
   loads ~300 lines instead of 4,300). Move "DECISIONS.md stays one
   file, with a linked table of contents" (2026-07-15; find it by
   title) into `process.md` → Superseded with the standard date line.
5. **Touch-ups** (same commit): reword the "Record product/UX
   decisions" working rule in AGENTS.md to the new two-touch
   mechanics; update README.md's structural descriptions of
   DECISIONS.md (4 spots); `pnpm format`.
6. **Verify:** a ~40-line link-checker script (scratchpad): every
   `](#a)` / `](path#a)` in the root + area files resolves to a real
   heading; every relative link resolves from its file's directory.
   Entry-count preservation (`###` headings across `docs/decisions/`
   equals the pre-split count). `git grep -n "DECISIONS.md#"` stays
   empty. Spot-diff two large sections against
   `git show HEAD:DECISIONS.md`. Note in the index preamble:
   pre-split history via `git log -- DECISIONS.md`.

**Ends green:** the checker passes, counts match, format clean.

---

## Prompt 5 — AGENTS.md becomes a router

**Goal:** AGENTS.md drops from 579 dense lines to ~250 an agent can
actually load per task: stable core + a task router that maps "I'm
touching X" to files, invariants, decisions file, and verify steps.
Docs-only; push standalone. Prompt 4 must have landed (the router
points at `docs/decisions/` files).

1. **New homes first:**
   - `docs/operations.md` (new): the reading-production-logs runbook,
     the env-var BOM gotcha, Render CLI setup, deploy-check commands,
     and the CSS-hash refactor-verification technique — moved
     wholesale from AGENTS.md.
   - `docs/architecture.md` gains a "Client component geography"
     section: the chatbox engine contract, shared chat pieces,
     demo-engine helpers, hook-by-hook inventory, navbar↔homepage
     contract, mock data, sticky-grid gotchas — moved from AGENTS.md.
2. **Rewrite AGENTS.md** to this skeleton: preamble (canonical file,
   no CLAUDE.md — verbatim) → **Status table** (~14 lines: Feature |
   one-line state | plan-doc link, replacing the 92-line narrative;
   completion now flips a cell) → Project Brief pointer → **Docs map
   & what updates when** (see 3) → Overview (trimmed ~5 lines; fix
   the stale "every screen is driven by mock data" line) → Commands
   (trim the 19-line test-pin inventory to 3 lines + a decisions
   pointer) → Architecture core (~18 lines) → **Invariants** (the
   existing invariants block near-verbatim: live-engine/hostWorld
   isolation, 120s grace incl. matched seats, teacher-gated
   auto-match, characterIds-only wire, `pausedAt` dual role,
   `scaledMs` rule — plus "LiveChatStage is a component split, never
   a conditional hook" and "create submit has no client timeout") →
   **Task router** (see 4) → Conventions (keep; trim hook inventory
   to rules-only) → Working Rules (keep, condensed — the deploy-race
   and tip-commit-must-touch-client rules stay nearly whole; they are
   the most silently-destructive knowledge in the file) → 2-line
   operations pointer.
   Delete outright: the flow-facts prose that restates DECISIONS
   entries — each fact's home is its decision entry; the router
   points there.
3. **Docs map & what updates when** (~18 lines): every fact has ONE
   home; a typical slice touches at most one prose doc besides its
   plan doc. Update-only-when table: decisions area file + index line
   (a product decision was made); `docs/api.md` (wire contract
   changed); `docs/architecture.md` (topology/lifecycle/geography
   changed); AGENTS.md (an invariant, convention, command, router
   row, or rule changed; a feature completed = one cell);
   `docs/plans/feature-N.md` (in flight; frozen at completion);
   `docs/operations.md` (an operational procedure changed); README
   (rare).
4. **Task router** (~50 lines, replaces the surface table and the
   deleted flow-facts): per-surface blocks — files → invariants →
   decisions file(s) → verify. Rows: student join/lobby; host
   dashboard; wire protocol change (includes the deploy-race
   reminder); server lobby/matching/chat logic; teacher setup form;
   shared chat pieces; demo engines & mock data; homepage / navbar /
   branding; styling & tokens; deploy/infra (→ operations.md).

**Ends green:** `pnpm format:check`; the prompt-4 link checker rerun
over AGENTS.md, architecture.md, operations.md; a read-through
confirming AGENTS.md no longer narrates per-feature history and every
router row's paths exist.

---

## Prompt 6 — One implementation of the matching rules

**Goal:** the four genuinely-identical pure rules stop existing in
two-to-three prose-guarded copies and move to `shared/` — both
engines import one implementation; the deliberate divergences stay
and get named.

Why this is safe: the tripwire ("mirror, never import" —
`matching.ts` header, AGENTS invariants, feature-3 plan) guards two
hazards: simulation transitions running against real students, and a
server dependency on client code. A neutral module in `shared/`
(buildless, zero-dep, already imported by both sides) triggers
neither — the precedent is `LOBBY_GRACE_SECONDS`, which already
killed the demo's mirror of the grace window. `tickWorld`, rematch
memory, and all simulation machinery stay in `hostWorld.ts`; the
live engine still imports nothing from it.

1. **`shared/src/random.ts`** (new): `shuffled` (Fisher–Yates,
   `Math.random` — keep shared/ zero-dep, no `node:crypto`).
   `client/src/lib/random.ts` re-exports it (zero call-site churn;
   `nextId`/`randInt`/`randomFrom` stay client-side); `matching.ts`
   deletes its local copy.
2. **`shared/src/matchRules.ts`** (new), exported through
   `shared/src/index.ts`:
   - `activeMembersBy<T>(members, inactiveIds, idOf)` — the three
     copies become one-line wrappers: `matching.ts`'s
     `activeMembers` (export name unchanged — `lobby.ts`,
     `projections.ts`, and the tests keep their imports),
     `hostWorld.ts`'s `activeChatMembers`, and
     `useHostActivityLive.ts`'s local copy (delete its "the tripwire
     forbids importing" comment — it now imports shared, not
     simulation).
   - `dealCast(characters, count)` — "a chat of N uses the roster's
     first N characters, shuffled"; replaces the inline
     `shuffled(slice)` in server `createChat` and client
     `assignCharacters`.
   - `splitOddPool<T>(pool, characterCount)` — the odd-count rule
     (last three become a trio when a third character exists, else
     the newest joiner is the leftover), currently duplicated
     verbatim in `planPairEveryone` and `pairEveryoneIn`.
3. **Deliberately NOT unified** (recorded divergence, not drift):
   `findAutoMatchPair` (demo prefers fresh partners via
   `lastPartners`; server is greedy — rematch memory is its own
   later feature), the pair-everyone pairing loop (demo's
   swap-repair + `rematchNotice`), `tickWorld`/`seedWorld`, id
   minting (`nextId` client / `randomUUID` server).
4. **Rewrite the `matching.ts` header** to say precisely which rules
   are shared imports, which deliberately diverge, and why. The
   AGENTS invariant ("live engine imports only types from
   hostWorld") is untouched — still true.
5. **Docs:** DECISIONS entry (decision 7; Backend & API or Process —
   author's call).

**Ends green:** `pnpm typecheck && pnpm test` — all four suites
(`matching`, `hostWorld`, `projections`, `lobby`) stay green
untouched (the helpers are algorithm-identical; `hostWorld.test.ts`
stubs no randomness — verified). No browser pass (no rendered-UI
change).

---

## Prompt 7 — lobby.ts becomes a composition root

**Goal:** `server/src/live/lobby.ts` (876 lines, ~15 handlers inside
one closure) becomes a ~120-line composition root plus per-concern
modules — an agent editing `chat:send` never reads the teacher
commands. Behavior-preserving verbatim moves; **`lobby.test.ts` is
never edited** — its 15 real-socket tests are the gate, and
`attachLobby(httpServer, config, logger)` plus the
`matching.ts`/`seats.ts` exports it pins keep their signatures. Run
`pnpm --filter @chaverola/server test` after EVERY step; if a step
goes red, only that step's motion is suspect.

1. Move the pure queries `findActiveChatOf`/`findEndedChatOf` into
   `matching.ts` (io-free, fits its charter; both student handler
   modules will need them).
2. New `server/src/live/lobbyContext.ts`: the `SocketData` types,
   `LobbyServer` type, `room()`, and a `LobbyContext` interface —
   `io`, `log`, and the eight broadcast/timer helpers
   (`queuePayload`, `chatsPayload`, `broadcastState`,
   `sendPeerConnection`, `sendChatStarted`, `sendActivityPaused`,
   `settleMembershipChange`, `armSeatTimers`) — built by
   `createLobbyContext(io, log)` as mutually-referencing closures,
   moved **verbatim** from `attachLobby`'s scope into the factory.
   Largest single move, still pure code motion.
3. New `server/src/live/autoMatch.ts`: the timers map stays at
   module scope (it is today); `armAutoMatch(ctx, joinCode)`,
   `releaseAutoMatch`, `clearAutoMatch` (for `onActivityRemoved`),
   identical tick semantics (`nextAt`, one pair per firing,
   `unref()`).
4. New `server/src/live/handlers/teacher.ts`:
   `registerTeacherHandlers(ctx, socket, data)` — room join, initial
   snapshots, keepalive interval, `queue:remove`, `chat:start`,
   `match:pair-everyone`, `chat:remove`, `chat:end`,
   `chats:end-all`, `chats:pause-all`, `chats:resume-all`,
   `settings:update`, disconnect (keepalive clear +
   `releaseAutoMatch`).
5. New `server/src/live/handlers/studentChat.ts` (`chat:send`,
   `chat:typing` — the per-socket send-times array and typing-relay
   throttle live in this function's closure, dying with the socket
   exactly as today), then `handlers/studentSession.ts`
   (`lobby:welcome`, the resume-into-chat / wrappingUp /
   reaped-returner replay block, `broadcastState`, then
   `lobby:leave`, `lobby:back`, disconnect grace arming — and it
   calls `registerStudentChatHandlers` after the welcome block,
   preserving registration order).
6. New `server/src/live/auth.ts`: the zod auth schemas +
   `createAuthMiddleware(io, log)` (it needs `io` for duplicate-tab
   eviction). `lobby.ts` is now: create `Server`, `applyTimeScale`,
   `createLobbyContext`, `io.use(auth)`, the connection dispatch,
   `onActivityRemoved`.

**Ends green:** server suite after every step; final
`pnpm typecheck && pnpm test && pnpm lint && pnpm format:check`. No
browser pass — the suite drives real sockets end to end.

---

## Prompt 8 — The student page splits by stage

**Goal:** `client/src/pages/student/JoinActivityPage.tsx` (1,242
lines — the hottest file in the repo) becomes a ~300-line shell plus
a `join/` directory, with the live-match socket logic extracted into
pure, **newly-tested** reducers. This page has zero unit tests today,
so the safety net is manufactured before the risky move. Needs
prompt 2 (the browser pass runs on the harness). Transcribe, don't
improve: this is the one prompt where subtle semantics live.

Sub-steps, gated by `pnpm typecheck` + `pnpm --filter
@chaverola/client test` from (b) on:

a. **Leaf cards move verbatim** to
`client/src/pages/student/join/`: `LoadingCard.tsx`,
`ActivityGoneCard.tsx`, `ActivityFullCard.tsx`,
`LobbyDemoControls.tsx`. Component-only files (fast refresh).
b. **`join/stageTypes.ts`** (the stage union, `CodeProblem`,
`DemoMatch`/`LiveMatch`/`ActiveMatch`, page titles, copy
constants, timing constants) and **`join/liveMatchState.ts`** —
pure reducers, no React: `toLiveMessage`, `toOfflinePeers` (keep
its `?? []` tolerance), `applyChatStarted` (resume-merge order:
id-dedupe → membership shrink against the OLD offline map →
wholesale offline rebuild → typing-slot clear), `applyChatLine`,
`applyChatUpdate`, `applyPeerDropped`/`applyPeerReturned` (no
offline entry ⇒ no flash), `shrinkToPeers` (the "couldn't get
back in" vs "left the chat" copy choice, checked against the
PREV offline map), character resolution taking the roster as a
parameter. Plus **NEW `join/liveMatchState.test.ts`** pinning
exactly those behaviors — new coverage, not pins to relitigate.
c. **`join/useActiveMatch.ts`**: owns `match`/`chatEnded`/
`liveEndReason`, the typing-TTL and 🎉-flash timer refs (keep the
deliberate no-cleanup pattern AND its comments), and the eight
socket callbacks as one-liners over the reducers; internally
calls `useLobbyPresence` with the same
`active: seated && isRealActivity && !activityGoneFromSocket`
gate. `onRemoved`/`onEnded` stay caller-supplied (they touch
page-level state). `onPeerTyping`'s early return reads the
hook's current-render `match` — identical semantics to today
(`useLobbyPresence` already latest-refs every callback).
d. **`join/JoinGateCard.tsx`** (the one form serving code + name
stages: code state seeded from the URL param prop, submit
machinery, slow-lookup copy; `name`/`removedByTeacher` arrive as
props — they're written by socket/demo flows) and
**`join/useDemoLobby.ts`** (`classPaused`, `demoWifiBlip` +
its `scaledMs` timer, the 20s demo auto-match effect, taking
`startMatch` as an argument).

The shell keeps: params/lookup/stage machine, session + the
sign-out-on-resolved-code-entry effect, the `goneCode` latch,
`name`/`removedByTeacher` state, `setChatStudentName`,
`usePageTitle`, the match-keyed scroll-restore layout effect (keep
the ref-skip-first-mount pattern verbatim), and the render dispatch.
React Compiler rules: everything at module top level, no manual
memo. The demo stays structurally zero-network (`LobbyDemoControls`
still gated on `DEMO_JOIN_CODE`).

**Tail — `docs/adding-a-wire-event.md`** (new): the seven touch
points with paths and `chat:peer-connection` as the worked example —

1. event + payload types in `shared/src/socket.ts`; 2. projector in
   `server/src/store/projections.ts` (field-by-field literal, never
   a spread); 3. allowlist pin in `projections.test.ts` (mandatory);
2. emit in the owning `server/src/live/handlers/*` module;
3. client registration in `useLobbyPresence.ts` (student) or
   `useHostActivityLive.ts` (teacher); 6. a pure reducer in
   `join/liveMatchState.ts` + one wiring line in `useActiveMatch.ts`
   (student) or the live engine's state update (teacher); 7. a
   `lobby.test.ts`-style behavior test. Link it from AGENTS.md's
   router row for wire changes.

**Ends green:** typecheck + client suite (including the new reducer
tests), then the browser pass on the harness at scale 10, desktop
and phone widths: the demo flow (`1234`: code → name → lobby → demo
controls → chat → ended → back, wifi blip, pause, remove) and a live
flow (two student tabs + host page: match, a message each way, one
tab refresh-resumes, the other killed → drop countdown ticks and
resolves ~12s). Full sweep to finish: `pnpm typecheck && pnpm lint
&& pnpm test && pnpm format:check`.

---

## Considered and cut (recorded so nobody re-proposes them)

- **Porting all five temp regression drivers up front** — only the
  launcher, smoke, and coldwake earn a commit; the rest are written
  when their trigger fires (prompt 3 records the triggers).
- **A cross-engine contract-test scenario table** for the residual
  matching mirror — prompt 6's extraction removes the dangerous
  copies; what remains divergent is deliberately divergent. Revisit
  only if drift actually bites.
- **A `useLobbyPresence` handler-object refactor** (collapsing the
  eight callback props into one registration loop) — speculative;
  the HOWTO doc captures the win.
- **`up.mjs --takeover` auto-kill** — it prints the kill command
  instead.
- **CI** — declined (decision 4); revisit at launch.
- **Client-side time scaling** (`?fast` reaching real activities) —
  unnecessary; every real countdown is server-seeded, so scaling the
  server scales the world.
