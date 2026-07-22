# tools/verify — the browser verification harness

Repo home of the Playwright harness that drives Chaverola end to end
(browser-surfaced Vite SPA + socket server). Plain `.mjs` on purpose:
no build, no typecheck, no lint ceremony.

## What lives here

- `lib.mjs` — the shared helpers every driver imports: result
  collection (`check`/`summary`/`exitWith`), activity minting, teacher
  and student page openers, the aside-scoped queue selectors, chat-card
  locators, `waitForQueueRows`, `dropConnection`,
  `watchForSocketTraffic`. Target selection lives here too: localhost
  5199/3001 by default, `--prod` on any driver's argv for
  chaverola.com, `CHAVEROLA_WEB`/`CHAVEROLA_API` env for anything else.
- `up.mjs` — the launcher (`pnpm verify:up`): client on 5199, server on
  3001 at `--scale <n>` (default 10, `--scale 1` for real timings).
  Prints one `READY web=... api=... scale=...` line; refuses a
  wrong-scale squatter on 3001 with the exact kill command. Run it in
  the background.
- `smoke.mjs` — the everyday driver (`pnpm verify:smoke`): a full
  activity end to end — create, two students, pair, a message each way,
  teacher transcript, End all. Local or `--prod`.
- `coldwake.mjs` — prod cold-start wake UX
  (`node tools/verify/coldwake.mjs --prod`); the first contact of every
  per-feature prod pass. Opportunistic: a warm server is reported, not
  failed.
- `shots/` (gitignored) — screenshots, via `lib.mjs`'s `SHOT(name)`.
- `scratch/` (gitignored) — one-shot and rarely-triggered drivers.

## Scratch drivers

Era-specific gauntlets rot when committed (they assert stale UI copy),
so one-shot drivers are born in `scratch/` when their trigger fires,
import `../lib.mjs`, and die with their era. Author them with file
tools only — never round-trip `.mjs` through PowerShell text cmdlets
(cp1252 mangles multibyte characters). Regenerate a driver from these
selector notes rather than reviving a rotted one from git history.

Several selector lessons below already live in code, so prefer the
helper over re-deriving the rule:

| Helper (`lib.mjs`)                      | The lesson it encodes                                                                                                          |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `waitForQueueRows(page, n)`             | The lobby renders before the seat lands, so a row asserted right after a join is a race.                                       |
| `rail(page)` / `selectRow` / `queueRow` | The pairing panel is mounted twice; every queue selector must scope to the `<aside>`.                                          |
| `liveCard` / `endedCard`                | Chat cards are `section.shadow-md`; an ended one adds `.opacity-95`.                                                           |
| `seated(page)`                          | A seated student is proven by `getByPlaceholder(/Talk as/)` — not the stale `/No messages yet/` probe (cost a run 2026-07-21). |
| `dropConnection(page)`                  | `setOffline` never severs an established websocket in this Chromium; `goto("about:blank")` is the prod-proven drop.            |
| `watchForSocketTraffic(page)`           | Attach before navigating, then ask whether any `/socket.io/` traffic ever left the page (demo zero-socket sweeps).             |

## Selector map & stable handles

- **Navbar** = the first `header` element — but the student join routes
  (`/activity/join`, `/activity/join/:joinCode`) render **no `header` at
  all**: they live in `StudentWorldLayout` (purple backdrop + drifting
  `.doodle` elements, `aria-hidden`, `pointer-events: none`). The language
  dropdown trigger keeps `aria-label="Change language"` everywhere (a
  floating pill on join routes); its options are `role=menuitemradio` named
  `EN` / `עב` (Radix portal — query from `page`, not the header). The
  "Chaverola home" link on join routes is the gradient pill.
- **Doodle motion:** `emulateMedia`/context `reducedMotion: "reduce"` freezes
  doodles into static transforms (`animation: none`) — assert on that, not on
  absence.
- **Hero chatbox composer:** `getByPlaceholder(/Talk as the Moon/)`; press
  Enter to send. The conversation feed scroll region has class `.scroll-soft`.
  Hero lines appear **twice** (the teacher preview card mirrors the hero chat
  live) — `.first()` to dodge strict mode.
- **Locale checks:** `waitForURL` with exact URLs (`/he`, `/he/activity/join`).
- **Setup form** (`/activity/create`): character inputs by placeholder
  (`Caesar's ghost`, `Brutus`, …), host name is `#setup-host-name`. Two "Host
  the Activity" buttons exist (desktop rail + mobile dock) — click the visible
  one (`.last()` at phone width). Submitting POSTs to the API. Success =
  `waitForURL(/\/activity\/host\/[A-Za-z0-9_-]{24}$/)`; the button disables
  while the create is in flight and deliberately **never times out** (create
  isn't idempotent). With the server down, a red banner lands above the docked
  button and the sessionStorage draft survives.

### Host page anatomy

Host page routes on `:hostKey`. `/activity/host/1234` is the demo (golden
"This is the demo class…" banner sticky under the navbar, seeded pretend
classroom, demo steering panel — and the condensed "waiting to chat" bar
stands down, so assert that bar only on real activities). A REAL host page
(24-char key) fetches over the API — expect a "Finding your activity…" beat —
and opens a teacher socket (`/socket.io/` traffic; the demo has zero).

**Both render the SAME grid** (sticky desktop pairing rail — `aside`, "Pair
your students" — plus the chat sections), so demo-vs-live is no longer a
layout difference. What still differs on a real page: no golden banner, no
demo steering panel, ending controls disabled ("End all chats" / "Pause all
chats" / each card's "End chat") under one shared hint line, and an
empty-transcript hint on live cards.

- Tap-to-select rows are `ul li button[aria-pressed]` on both; the remove
  control is `button[aria-label="Remove <name> from the activity"]`.
- A dropped student dims with an amber "lost connection" tag — in the queue
  AND on the chat card (allow the ping-cycle detection + broadcast gate; both
  scale with `CHAVEROLA_TIME_SCALE`). The teacher's own drop shows a
  `role="status"` "Reconnecting to your class…" banner, and the whole grid
  below it dims AND goes `pointer-events-none` (clicks won't land — don't read
  that as a broken selector).
- The live-settings panel is present on real activities. **Settings** edits
  are real (they reach the server, survive a refresh, and a second host page
  hears `settings:changed`); character/scenario/host-name edits are local-only
  and a refresh reverts them — expected, not a bug. Edits propagate ~1s after
  typing pauses (assert on "Hosted by <new name>" in the header after ~1.6s).
- Dead host links (garbage keys, stale 4-digit codes) render "That activity
  isn't running" with no demo redirect; an unreachable server renders "We
  can't reach Chaverola" whose Try again refetches in place.
- Section headers are buttons whose `innerText` carries the count pill (e.g.
  "Chats in progress 2"). All confirmations are one shared dialog: scope to
  `getByRole("dialog")`, match the title with `getByRole("heading")` (button
  labels repeat the title words), cancel is "Never mind".

### Driving real matching

- The rail's pairing CTAs only render when the queue is non-empty (an empty
  queue shows the panel's empty state), so join students — through
  `waitForQueueRows` — before asserting on them.
- Auto-match is server-run and **gated on a connected teacher socket**: with
  no host page open, students past the threshold correctly never pair; expect
  one pair per `AUTO_MATCH_GAP_SECONDS` (scaled) once a teacher connects.
- A matched student's phone shows the room by its composer — use `seated`.
  Since feature 8 a partner's drop also shows on the OTHER student's phone: a
  `role="status"` banner ("X lost connection… 1:56 to come back") past the
  same gate as the teacher's tag (the first value can read 1:57 — Windows
  timers can fire the gate a hair early), a "X is back! 🎉" flash on resume,
  and nothing at all for a sub-gate refresh.
- Create activities with a 2-character roster to force the leftover branch
  ("first in line" tag) and 3+ to get trios.

### Student join

- `/activity/join`: code input accepts Enter; the code screen carries no demo
  hint. The name step swaps in-place — wait for `getByPlaceholder("Your name")`,
  then click "Join Activity"; the lobby shows "Waiting for your match".
- `/activity/join/1234`: the name input arrives prefilled "Rachel" (demo only;
  real codes start blank), and the golden demo card is sticky at `top-20`
  (y≈80 while scrolled). The demo lobby auto-pairs the student ~20s after it
  renders (scaled by `?fast`) — take lobby assertions before that fires, or
  expect to land in a chat.
- Real codes resolve over the API: a "Finding your activity…" loading beat on
  direct `/activity/join/<code>` arrivals, the not-found message ("Activity
  was not found…") on dead codes, the distinct unreachable copy ("We can't
  reach Chaverola right now…") when the server is down. Real lobbies render no
  demo banner, no demo controls, and never auto-pair — only `1234` does, and
  it needs zero network.
- Demo entry URLs: `/demo` and `/demo/teacher` redirect to
  `/activity/host/1234`; `/demo/student` redirects to `/activity/join/1234`
  (locale-preserving: `/he/demo` → `/he/activity/host/1234`).

## Host-page selector traps (each cost a run if missed)

- The pairing panel is mounted **twice** — the desktop `<aside>` and a
  `lg:hidden` collapsible. Scope every queue selector to `page.locator("aside")`
  (or use `rail`) or hit strict-mode. `Pair everyone 1:1` appears three times
  on a fresh live page.
- Chat cards are `section.shadow-md`; an ended one adds `.opacity-95`.
  `CollapsibleSection` is `shadow-sm`, so `section.shadow-md` selects cards and
  nothing else — but `locator("section", {hasText})` resolves to the outer
  collapsible and breaks silently with two chats open. Use `liveCard` /
  `endedCard`.
- Anchor the auto-match copy on the **colon** (`/Auto-match is on:/`): the
  paused-hold and returned-here lines both match a looser regex.
- `getByText("Live")` substring-matches the `Your activity is live` h1 —
  always card-scope it.
- `Edit activity settings` is `defaultOpen={false}` and its content stays
  mounted but `inert`; click the header before touching the stepper.

## Timing & network notes for driver authors

- **Render-proxy close is nondeterministic.** `context.close()` /
  `dropConnection` disconnect detection is instant on localhost but over
  Render's proxy the close frames sometimes reach the server ~10s late and
  sometimes never (detection then waits out the ping cycle). Consequences for
  grace-window assertions on prod: wait up to ~60s for a drop to surface, and
  never compute the expected countdown from the moment you dropped — the
  server's clock starts at ITS detection, so your drop time only bounds the
  value from below. Internal-consistency checks (the value ticks down; it
  continues across a reload) are the reliable ones. Allow **117** as a first
  "dropped" reading: the broadcast-gate timer can fire a hair early and `ceil`
  rounds the remaining grace up past 116.
- **The websocket UPGRADE lands after the seat.** `page.on("websocket")` fires
  on the polling→websocket upgrade, ~100–150ms AFTER the seat appears
  (socket.io connects on polling first). A fixed post-seat sample of a "did
  the ws open" flag will intermittently miss it — the seat appearing IS the
  proof the connection is live; assert that, and if you must confirm the
  transport, `await` the websocket event with a few-second timeout rather than
  sampling once.
- **The lobby resumes seats across refreshes.** To observe a fresh join, use a
  new browser context (fresh sessionStorage), not a reload. Restarting the dev
  server is the fast way to force a real disconnect against localhost.
- **StrictMode double-fires data effects in dev.** The join-code lookup
  fetches twice on mount, so a Playwright `route` that aborts only the FIRST
  `/activities` request silently lets the duplicate through — gate the abort
  on a flag you flip when the "server" should come back, not on a request
  count.
- **Localhost hides emit-then-disconnect races.** Over loopback two writes land
  in separate TCP reads; over real wifi they coalesce into one read and
  socket.io silently drops an event it processes in the same tick as the
  disconnect (caught `lobby:leave` dying this way, 2026-07-19). A
  last-words-then-close path is only proven by a real device on the LAN — or by
  checking the server log for the event actually dispatching, not just the UI
  reacting. The disconnect logs carry a `reason`: "client namespace
  disconnect" = the client chose to close; "transport close"/ping timeout =
  the connection died.

## Prod-lessons archive

One line each; the durable record is the linked decision or plan doc. These
are the things a headless browser on localhost structurally cannot prove.

- **`LEAVE_FLUSH_MS = 300` is the only thing between the mid-chat leave race
  and a stranded student** — 20/20 delivered with the real flush, ~40% lost at
  0ms on websocket. Never "simplify" it away. → DECISIONS.md → "A matched seat
  gets the same 2 minutes as any other, and leaves its chat when they run out";
  [feature-3-real-matching.md](../../docs/plans/feature-3-real-matching.md).
- **A flushed send buffer is not a delivered message.** A reconnect whose auth
  callback re-reads a signed-out session is rejected and takes the buffered
  packet with it; freeze credentials into `socket.auth` before reconnecting. →
  [feature-3-real-matching.md](../../docs/plans/feature-3-real-matching.md).
- **Give a probe the real client's auth shape.** `seats.ts` resumes on
  `studentId`+`token` first, then `nonce`; a probe missing both mints a new
  seat and tests a different student than it thinks. →
  [feature-3-real-matching.md](../../docs/plans/feature-3-real-matching.md).
- **The real-handset leg finds what scripts can't.** A phone that goes offline
  mid-chat stranded its partner permanently — a headless browser on broadband
  never actually loses its connection. → DECISIONS.md → "A matched seat gets
  the same 2 minutes as any other"; AGENTS.md → Status.
- **A deploy/restart ends live classes via `connect_error: activity_gone`, not
  `activity:ended`.** SIGTERM drops sockets without the store's removal hook;
  the fresh instance rejects each client's resumed token. Budget ~37s for a
  connected client to land on the ended screen. →
  [feature-2-live-lobby.md](../../docs/plans/feature-2-live-lobby.md).
- **Render is a single free-tier instance** (`numInstances: 1`, no autoscaling,
  virginia) — the in-memory store and seat-resume logic depend on it. Re-check
  before assuming any of this survives scaling. → DECISIONS.md → "Nothing
  persists: activities live in memory for 12 hours".
- **A raw `socket.io-client` driver works fine against prod** (`auth: {role,
hostKey}` / `{role, joinCode, name}`; `lobby:welcome` returns `{studentId,
token}`) — the right tool for anything statistical or timing-sensitive a
  browser can only run once.
- **The pairing UI is not demo-only anymore.** Feature 3 removed the `isDemo`
  gate, so `Pair your students` / `Pair everyone 1:1` render on live host
  pages too; the surviving discriminator is "A real class does all this by
  itself."
- **Don't await a slow-hint selector before the navigation.** Race the "just
  waking up" copy against the URL change, or a warm server reports a cold start
  that is entirely your own timeout; a fast create still flashes the pending
  button, so "pending was seen" is not evidence of a cold start. → coldwake.mjs.
