# Process & tooling

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### AGENTS.md is a router: a status table, invariants, and a task router, not a narrative

_2026-07-22_

**Decision:** `AGENTS.md` is a lean router (~200 lines), not a running
history. It carries a preamble, a status TABLE (one cell per feature —
completion flips the cell, replacing the old per-feature narrative), a docs
map that gives every fact one home, the overview and commands, an
architecture core, the invariants block, a task router ("I'm touching X" →
files, invariants, decisions file, verify steps), the conventions, and the
working rules. Operational runbooks moved to
[operations.md](../operations.md); the client component geography moved to
[architecture.md](../architecture.md); the per-feature narrative and any
prose that merely restated a decision entry were deleted, with the router
pointing at the decision instead. The per-feature doc tax is now: the plan
doc (frozen at completion), a decisions entry only if a decision was made,
`api.md` only if the wire changed, `architecture.md` only if topology or
geography changed, and one status-table cell.

**Why:** Product-owner call. At nearly 600 lines AGENTS.md had become a
reading assignment every feature paid twice — once to load, once to
rewrite — and its status narrative duplicated facts whose real home was a
decision entry or a plan doc. A router an agent can load per task, where
every fact has exactly one home, cuts both: the file stops growing with
each feature (a cell flips instead of a paragraph appended), and "I'm
touching X" resolves to the files, invariants, and decisions for X without
reading the whole file.

### DECISIONS.md is an index; entries live in docs/decisions/ per area

_2026-07-22_

**Decision:** The root `DECISIONS.md` is an index only — a preamble, the
add-and-supersede how-to, and one linked line per entry. Every entry's body
lives in a per-area file under `docs/decisions/` (one file per `##` area that
used to divide the single log). Adding an entry is two touches made in one
change: the body at the top of its area file, and its line in the index.

**Why:** Product-owner call, reversing
[DECISIONS.md stays one file, with a linked table of contents](#decisionsmd-stays-one-file-with-a-linked-table-of-contents).
At ~4,300 lines the single file cost more to load than its greppability saved —
an agent touching one surface paged in the whole log to add a line. The split
keeps every `see DECISIONS.md → "<title>"` pointer resolving (they cite titles,
never line numbers, and nothing linked `DECISIONS.md#anchor`), which was the
original entry's own survival criterion; an agent now loads the ~300-line index
plus one area file instead of 4,300 lines. Pre-split history lives in
`git log -- DECISIONS.md`.

### The per-feature prod pass trims to cold-wake, a smoke, and one network leg

_2026-07-22_

**Decision:** The once-per-feature production pass is a short, fixed sequence,
not a replay of every prior gauntlet:

1. `coldwake --prod` **first**, before any other prod contact — a naturally
   asleep instance is the only place the cold-start path is exercisable.
2. `smoke --prod` — the deployed-build smoke.
3. **one** feature-specific, network-sensitive leg, written fresh in
   `tools/verify/scratch/` — the single thing about this feature that only
   Render's proxy and real reconnect backoff can prove.
4. a handset ask **only** when the feature touches offline/disconnect paths;
   otherwise the ask goes to `docs/pending-manual-tests.md`.

Prior features' gauntlets are **not** re-run over areas the feature didn't
touch. A fuller regression sweep runs only when the code it guards changes —
the leave/flush logic (`LEAVE_FLUSH_MS`), seat teardown, or demo gating — and
once more as the launch-readiness gate before the end of August 2026. No cron,
no scheduled sweep. The per-push deploy checks (`/healthz` for the new server
commit, Vercel Ready for the expected SHA) are unchanged — they are deploy
discipline, not feature verification.

**Why:** Founder call (2026-07-21, speedup plan). Once slices verify on
localhost, the feature-end prod pass exists to prove the handful of things
localhost structurally can't (Render's lazy close frames, coalesced
emit-then-disconnect, the cold start, the deploy pipeline, a genuinely offline
handset) — and those are few and feature-specific. Re-running an era-specific
gauntlet over unchanged code costs real prod minutes and proves nothing new;
worse, committed gauntlets rot against current UI copy (two dead assertions
were already on record). Tying each regression sweep to a change in the code
it guards keeps the coverage honest without the standing tax. The accepted
risk, named out loud: a regression in an untouched area waits for the
launch-readiness sweep to surface — acceptable pre-launch, with no live
classes.

This **refines** the feature-end clause of
[Slices verify on localhost; production driving happens once per feature](#slices-verify-on-localhost-production-driving-happens-once-per-feature):
"the full gauntlet" becomes "one feature-specific leg, prior gauntlets not
re-run", and the rest of that decision stands.

_Reflected in the verify skill's Production section and
[tools/verify/README.md](../../tools/verify/README.md)._

### No CI; the local pre-push typecheck and test are the gate

_2026-07-22_

**Decision:** There is no continuous-integration workflow. Push-to-main stays
ungated beyond what already runs: Render's `tsc --noEmit` on the server build,
and the agent loop's own `pnpm typecheck && pnpm test` before every push. No
GitHub Actions, no pre-push hook, no tripwire job.

**Why:** Founder call (2026-07-21, speedup plan). The single committer is an
agent loop that already runs typecheck and the full suite (~2s) before
pushing, so a CI job would re-run the same checks minutes later and gate
nothing the loop didn't. A CI tripwire was considered and declined for now; it
can be revisited at launch, when human contributors or a heavier merge flow
would make an independent gate worth its keep.

_Reflected in the verify skill and
[docs/plans/speedup.md](../../docs/plans/speedup.md)._

### The verify harness is repo code; one-shot drivers live and die in scratch

_2026-07-22_

**Decision:** The browser verification harness lives in the repo at
`tools/verify/` (a pnpm workspace package with `playwright-core` as a real
dependency), not in `$env:TEMP`. Only the everyday drivers are committed:
`lib.mjs` (shared helpers), `up.mjs` (the stack launcher behind
`pnpm verify:up`), `smoke.mjs` (the end-to-end activity smoke behind
`pnpm verify:smoke`), and `coldwake.mjs` (the prod cold-start check). Everything
else — per-feature gauntlets, occasional regression drivers — is written fresh
in the gitignored `tools/verify/scratch/` when its trigger fires, imports
`../lib.mjs`, and is never committed. The harness stays plain `.mjs` with no
TypeScript, so `pnpm -r typecheck`/`lint` don't see it.

**Why:** Founder call (2026-07-21, speedup plan). The temp-dir harness was
uncommitted, drifting, one Windows cleanup away from gone, and reinstalled
`playwright-core` on the fly; every session also repeated a launch ritual
(CORS env override, stale-port-3001 checks) that `up.mjs` now encodes once.
Committing _all_ drivers was rejected because era-specific gauntlets rot —
they assert stale UI copy, and two dead assertions were already on record
when the call was made. The scratch rule keeps the lessons (in `lib.mjs`
helpers and `tools/verify/README.md`) without keeping the rot.

_Implemented in [tools/verify/](../../tools/verify/); the launch story is in
[tools/verify/README.md](../../tools/verify/README.md)._

### Slices verify on localhost; production driving happens once per feature

_2026-07-21 · Revised 2026-07-22: the feature-end pass is trimmed — no full
gauntlet re-run over unchanged areas; see
[The per-feature prod pass trims to cold-wake, a smoke, and one network leg](#the-per-feature-prod-pass-trims-to-cold-wake-a-smoke-and-one-network-leg)._

**Decision:** A slice's verification runs against the local stack —
`pnpm dev:client --port 5199 --strictPort` plus `pnpm dev:server` with the
`CLIENT_ORIGINS` override — not against chaverola.com. Production is driven
**once per feature**, in the final cross-cutting prompt, which now carries
everything that needs the real deployment: the cold-wake check as the
session's FIRST prod contact, the feature's network-sensitive legs (proxy
close detection, grace timing, emit-then-disconnect), the full gauntlet,
and a deployed-build smoke. Two checks stay per-push because they are
deploy discipline, not feature verification: poll `/healthz` for the new
server commit, and confirm Vercel's latest production deployment is Ready
for the SHA you expect. The restart story still reruns only when teardown
code changes, and the real-handset asks are unchanged.

**Why:** Founder call (2026-07-21), prompted by noticing that every
feature-8 slice ended with a prod run. The per-slice prod pass was the
dominant time cost of a slice — prod budgets real ping cycles (~45s),
grace windows (120s), and reconnect backoff, while localhost verifies the
same behavior in seconds with `?fast` timers and instant sockets. And
every production-only bug class found so far — Render's lazy close frames,
coalesced emit-then-disconnect over real networks, cold starts, the deploy
pipeline, prod env baking, a handset that genuinely goes offline — is
covered either by the feature-end pass or by the per-push deploy checks.
The accepted risk, named out loud: a prod-only breakage introduced
mid-feature can sit on chaverola.com until the feature-end pass catches
it. Pre-launch, with no real classes, that risk costs nothing; it is the
founder's accepted trade.

This **revises** one clause of
[Features ship as end-to-end slices, not layers](#features-ship-as-end-to-end-slices-not-layers)
— "its own production pass" becomes "its own local verification" — and
leaves the rest of that decision standing.

_Reflected in AGENTS.md (the slices rule and the cheapest-gate rule) and
the verify skill's Production section._

### Until launch, server pushes can happen at any hour

_2026-07-21_

**Decision:** The "push server-touching commits outside school hours" rule
is suspended until Chaverola goes live with real classes — planned for the
**end of August 2026**. Until then a server push, and the in-memory wipe
that comes with it, is fine at any hour. The living docs now phrase the
rule conditionally ("once real classes are using it…"), so they stay true
at launch without another sweep.

**Why:** Founder call (2026-07-21): no real students use Chaverola yet, so
the wipe has nobody to hit, and deferring pushes to the evening was pure
friction. Historical plan docs (features 1–4) keep their school-hours
wording — plan history is never rewritten — so anyone reading an old
prompt should read that caution as "protect live classes", not a standing
curfew.

_Reflected in `README.md`, `docs/architecture.md`,
`docs/plans/feature-5-typing-indicator.md`, the verify skill, and the
`activityStore.ts` header comment._

### Features ship as end-to-end slices, not layers

_2026-07-20 · Revised 2026-07-21: the per-slice "production pass" clause —
slices now verify on localhost, and production is driven once per feature;
see
[Slices verify on localhost; production driving happens once per feature](#slices-verify-on-localhost-production-driving-happens-once-per-feature)._

**Decision:** A feature's prompts are cut **vertically**: each prompt is one
working thing delivered all the way through — wire, server, client, docs,
tests, and its own production pass — and is demonstrable on its own when it
lands. Not a server prompt, then a client prompt, then a docs prompt. The
first example is
[feature-4-messaging.md](../../docs/plans/feature-4-messaging.md), whose Prompt 1
is "students send each other messages" rather than "the server learns to
carry messages".

Docs are updated **inside the prompt that changes the behavior**, never
deferred to a docs prompt at the end. A cross-cutting production sweep still
gets its own final prompt — per-prompt verification proves each slice works,
but it cannot cover the seams between slices.

This **refines** rather than replaces
[Features ship as prompt-doc plans in `docs/plans/`, one prompt per session](#features-ship-as-prompt-doc-plans-in-docsplans-one-prompt-per-session):
plan docs, numbered prompts sized for one session, one commit straight to
`main`, and a ticked checkbox all stand. What changes is how a prompt is
_cut_.

**Why:** Founder call (2026-07-20): "test things individually and do one
feature at a time end to end… each prompt adds something end to end, and each
prompt updates the docs accordingly." Layering produced long stretches where
nothing was demonstrable — feature 3's Prompt 2 shipped a whole student chat
client that was deliberately dormant until Prompt 3 armed it — and it let the
docs drift behind the code until a sweep prompt caught up, which is how
`docs/api.md` ended up contradicting itself about the grace window.

**The cost, and it is real:** layering was also buying deploy safety. Feature
2 said so outright — "Ordering is load-bearing: Prompt 1 before everything
(the clients need the deployed socket server)". A vertical slice touches
`shared/` in one commit, and `shared/` is in both deploy triggers (Vercel's
Ignored Build Step and Render's build filter), so one push starts two
independent pipelines that race. Client-lands-first means a UI talking to a
server that lacks the handler, and Socket.IO drops an unhandled event
silently. The replacement rule: **after pushing a slice, poll `/healthz` for
the new server commit before treating the feature as live**, and where a
client-ahead-of-server window would actually hurt a real user, split the
slice into a server commit and a client commit pushed **separately**, waiting
for `/healthz` between. Don't undo this by quietly going back to layered
prompts; the deploy race has a rule, the demonstrability problem didn't.

**A sharper edge found while planning feature 4:** Vercel's skip check diffs
only the **tip commit** of a push, not the range since the last deployment,
while Render's filter diffs against the last **deployed** commit. A push of N
commits is one deployment per side. So a code commit followed by a docs-only
commit, pushed together, deploys the server and silently skips the client —
a permanent split, not a race, with green history on both dashboards.
**The tip commit of any push must itself touch `client/`, `shared/`, or a
root manifest.** `/healthz` does not catch this; only Vercel's deployment
status does. The check lives solely in the Vercel dashboard
(`client/vercel.json` holds nothing but rewrites), so it is invisible to
anyone reading the repo — moving it into a range-correct `ignoreCommand` that
defaults to building whenever it can't tell would retire the discipline
altogether, and is worth doing on its own sometime.

_Recorded in [AGENTS.md](../../AGENTS.md) → Working Rules for AI Agents._

### Agents read Render logs through the CLI, with the API key in `.env.local`

_2026-07-19_

**Decision:** Agent access to the production server's logs goes through
the official Render CLI (`render logs`, non-interactive with
`RENDER_API_KEY` read from the gitignored `.env.local`) rather than
Render's hosted MCP server. The exact commands live in
[docs/operations.md](../operations.md) → "Reading production logs".

**Why:** Render API keys are broadly scoped — they grant access to every
service the account can reach — so where the key lives matters more than
the transport. With the CLI it sits in `.env.local`, which the repo
already gitignores and every agent already knows not to commit; the MCP
path would move it into per-agent config files, one more place to leak
from and one per tool to keep in sync. The CLI is also tool-agnostic:
anything that can run a shell can read the logs.

### The numbered doc standard is retired; technical docs live in `docs/`

_2026-07-18_

**Decision:** `PROJECT_DOCUMENTATION_STANDARD.md` — a friend's template
prescribing a numbered doc flow (Product Vision → Change Log) — is
deleted without ever being adopted; git history keeps it. Technical
documentation lives in `docs/` as plainly named files:
[docs/architecture.md](../../docs/architecture.md),
[docs/api.md](../../docs/api.md) (the API contract's canonical home, kept
current per feature), and feature plans under
[docs/plans/](../../docs/plans/).

**Why:** Founder call (made in the feature-1 plan). The template spent
its whole life saying "don't scaffold these yet," and when the backend
finally arrived, the docs the repo actually needed didn't match its
shape — two files that describe the real system beat nine that follow a
method. The living docs named in AGENTS.md remain the source of truth.

### Features ship as prompt-doc plans in `docs/plans/`, one prompt per session

_2026-07-18 · Partly superseded 2026-07-20 by
[Features ship as end-to-end slices, not layers](#features-ship-as-end-to-end-slices-not-layers)
— the plan-doc format, the one-session sizing, the single commit and the
ticked checkbox all still stand; only the way a prompt is **cut** changed,
from layers to vertical slices._

**Decision:** A feature spanning several work sessions gets a plan
document in `docs/plans/` (the first:
[feature-1-create-and-join.md](../../docs/plans/feature-1-create-and-join.md)):
shared-context sections (the founder's architecture decisions, the wire
contract) followed by numbered prompts, each sized for **one agent
session**, each ending green (typecheck + tests + its own verification)
with **one commit straight to `main`** and its checkbox ticked in the
same commit. Prompts run in order, and ordering constraints are stated
in the doc itself. This is the delivery pattern for future features.

**Why:** Founder + agent working pattern, proven on feature 1. Each
prompt leaves prod deployable, so nothing ever blocks on a half-done
feature; the checkboxes make progress resumable across sessions; and
the shared-context sections keep every session working from the same
recorded decisions instead of re-deriving (or re-litigating) them.
Unlike the deleted Fable prompt series (see
[The Fable prompt series document was deleted, not archived](#the-fable-prompt-series-document-was-deleted-not-archived)),
a plan doc holds decisions and pointers, not a duplicate of the brief —
and decisions still graduate into this file as their prompts land.

### Server tests cover only the safety invariants

_2026-07-17_

**Decision:** The server suite is two small files: a projection test
pinning the **exact key allowlists** of both projections (the student
projection never carries `teacherEmail`, `settings`, or the hostKey),
and four route cases (happy-path create, student projection over the
wire, the `1234` reservation, joinCode-never-unlocks-host). TTL/sweep,
capacity, the dense join-code fallback, 429s, CORS, and body-parser
mapping are deliberately untested — curl smoke and the browser pass
cover them.

**Why:** Founder call, extending
[Testing stays small while the app is UI-only: logic tests, no DOM](#testing-stays-small-while-the-app-is-ui-only-logic-tests-no-dom)
to the server while the product is an MVP. The tested invariants are
the ones whose failure would be **silent and harmful** — a privacy leak
has no visual symptom, so only a pinned allowlist catches a stray
spread. The untested paths fail loudly in smoke, and while the routes
and store are still churning, a broad suite would fight every change.

**Update (2026-07-19):** feature 2 extends the policy to the socket
layer, same shape: the projection test gains the socket-payload
allowlists (`toQueueEntry` never carries the seat token), and one
integration file ([lobby.test.ts](../../server/src/live/lobby.test.ts))
covers the socket editions of the same invariants — occupancy stays a
mystery to students, a join code can't open a teacher socket, a student
`queue:remove` is ignored, and the seat-resume `currentSocketId` race
guard. Grace timing, the broadcast delay, duplicate tabs, the cap, and
shutdown stay deliberately untested — the browser and phone passes
cover them.

_Implemented in
[projections.test.ts](../../server/src/store/projections.test.ts),
[activities.test.ts](../../server/src/routes/activities.test.ts), and
[lobby.test.ts](../../server/src/live/lobby.test.ts)._

### `?fast` compresses the demo clocks — dev builds only, and never to zero

_2026-07-16_

**Decision:** In a dev build (`pnpm dev`), loading any page with `?fast`
compresses every demo-engine timer — the scripted chats and typing beats,
the host page's world tick (joins, wait clocks, auto-match, auto-end,
returns), the chatter drip, the demo lobby's auto-pair, and the countdown
clocks — by a scale factor: bare `?fast` is 10x, `?fast=<n>` clamps to
1–100. The scale is read once per full page load. Delays scale, they never
zero out. Production builds compile the entire mechanism away
(`import.meta.env.DEV`), and real-user timing — the live-settings ~1s
typing debounce, the 2s "copied" reset — is never scaled.

**Why:** Product-owner call, to make AI-agent verification fast: runtime
checks were spending nearly all their wall clock waiting out real-time demo
timers (~9s hero script, ~20s auto-pair, 2-minute reconnect window).
Scaling instead of zeroing keeps message order and typing→reply sequencing
assertable. The double gate (dev build AND an explicit param) means no
deployed link and no default `pnpm dev` session — including the founder's
pitch flow — ever runs fast. The verify skill documents how agents use it.

_Implemented in [demoTime.ts](../../client/src/lib/demoTime.ts); consumed by
[useChatDemo.ts](../../client/src/components/chat/useChatDemo.ts),
[useSecondCountdown.ts](../../client/src/lib/useSecondCountdown.ts),
[useHostActivityDemo.ts](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts),
and [JoinActivityPage.tsx](../../client/src/pages/student/JoinActivityPage.tsx)._

### Verification climbs a ladder: typecheck, then tests, then the browser

_2026-07-16_

**Decision:** Agents verify at the cheapest gate that can catch the
mistake: `pnpm typecheck` on every change; `pnpm test` only when logic in
`client/src/lib/` or `hostWorld.ts` changed; a browser drive (the verify
skill, with fast timers) only when the change shows up in rendered UI —
and then only the surfaces the change touches, at desktop and phone
widths. The CSS-hash double-build proof still covers style-neutral
refactors.

**Why:** Product-owner call. Nothing in the automated suite renders
components, so agents defaulted to driving every surface in a browser for
every change — the slowest check applied to changes the type checker
already proves. The ladder reserves the browser for what only the browser
can show.

_Implemented in [AGENTS.md](../../AGENTS.md) → "Working Rules" and
[SKILL.md](../../.claude/skills/verify/SKILL.md)._

### The repo `memory/` folder is gone — its notes live in AGENTS.md

_2026-07-16_

**Decision:** `memory/MEMORY.md` and `memory/react-compiler-setup.md` were
deleted; the React Compiler guidance moved into AGENTS.md → Conventions,
with its stale typescript-eslint peer-version claim corrected on the way.

**Why:** The folder contradicted the recorded rule that learnings live in
the repo's shared docs, nothing referenced it, and its one load-bearing
fact had already drifted out of date. Recover it from git history if ever
needed.

_Implemented in [AGENTS.md](../../AGENTS.md)._

### The repo is public on GitHub under MIT, and main auto-deploys to Vercel

_2026-07-16_

**Decision:** The repo is public at
[github.com/mssiegel/chaverola](https://github.com/mssiegel/chaverola) under
the MIT license. Hosting is a Vercel project named `chaverola` with Root
Directory `client`; every push to `main` deploys straight to production —
there is no staging branch. `client/vercel.json` holds the SPA rewrite so
deep links (`/activity/host/1234`, `/he/...`) resolve on a direct load. The
GitHub description names no tech stack, on purpose: it describes only what
Chaverola is, so it never goes stale as the stack evolves.

**Why:** Product-owner call. MIT was chosen over the all-rights-reserved
default so others can reuse the code. Deploy-on-main matches the
commit-directly-to-main workflow (no PRs to gate a release train on), and a
UI-only demo app with mock data carries no rollout risk that would justify
one.

_Implemented in [LICENSE](../../LICENSE) and [vercel.json](../../client/vercel.json)._

### Testing stays small while the app is UI-only: logic tests, no DOM

_2026-07-15_

**Decision:** Vitest runs the unit tests (`pnpm test`) in a plain node
environment against the pure logic layer only — the setup validators and
caps (`lib/activitySetup.ts`), the live-edit rules (`lib/hostActivity.ts`),
the host page's world model (`hostWorld.ts`), and the character-color order
rule. No jsdom, no component or snapshot tests, and the suite stays small on
purpose.

**Why:** Product-owner call: this is an MVP and shipping speed wins. The
logic rules (rematch memory, clamps, id stability) are where regressions are
silent; component markup still churns with every design pass and would make
every change fight a wall of snapshots. Revisit the policy when `server/`
becomes real — the engine contract swap is exactly when these tests earn
their keep.

**Update (2026-07-18):** `server/` is real, and the policy extends to it
rather than ending — see
[Server tests cover only the safety invariants](#server-tests-cover-only-the-safety-invariants).
The client-side revisit still waits for the engine contract swap (the
realtime feature).

_Config in [vitest.config.ts](../../client/vitest.config.ts)._

### The Fable prompt series document was deleted, not archived

_2026-07-15_

**Decision:** `chaverola-fable-prompts.md` (the staged build prompts) was
deleted once the build it drove was complete. Recover it from git history if
it's ever needed (`git log --diff-filter=D -- chaverola-fable-prompts.md`).

**Why:** Product-owner call. It embedded a verbatim copy of the project
brief, and two copies drift; every product rule it introduced was recorded
in this file as it was implemented, and the brief itself lives in
[Shared_Project_Context.md](../../Shared_Project_Context.md). The repo's living
docs are the source of truth, not the prompts that produced them.

## Superseded

Replaced decisions, kept for history. Don't apply these; each date line links
to what replaced it.

### DECISIONS.md stays one file, with a linked table of contents

_2026-07-15 · Superseded by
[DECISIONS.md is an index; entries live in docs/decisions/ per area](#decisionsmd-is-an-index-entries-live-in-docsdecisions-per-area)_

**Decision:** Keep appending entries to this single file. The Contents
section at the top links every rule; when you add, move, or retitle an
entry, update its Contents line in the same change.

**Why:** Product-owner call, chosen over splitting into per-area files. One
file stays trivially greppable, and the many "see DECISIONS.md → ..."
pointers in code comments and AGENTS.md keep working. At 1,600+ lines the
table of contents restores scannability without breaking any of that.
