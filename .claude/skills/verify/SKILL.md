---
name: verify
description: How to launch and drive Chaverola for runtime verification (browser-surfaced Vite SPA on Windows).
---

# Verifying Chaverola

The browser is the LAST gate, not the first: per AGENTS.md → "Verify at the
cheapest gate", run `pnpm typecheck` (and `pnpm test` for `lib/` logic)
before driving the app, and drive only the surfaces the change touches.

## Launch

- `pnpm dev:client --port 5199 --strictPort` from the repo root → Vite dev
  server at `http://localhost:5199` (ready in <1s, SPA fallback covers
  `/he/*` deep links). Always pass the port flags: other repos' Vite
  servers (e.g. LetsGo) often hold the default 5173, and a 200 there
  proves nothing — 5199 is Chaverola's designated verification port, and
  `--strictPort` fails fast instead of drifting. Still confirm the page
  says Chaverola before asserting anything.
- Surfaces that call the API (real-code student joins, teacher create,
  real host pages) also need `pnpm dev:server` — and the server's dev CORS
  allowlist is **exact-origin `localhost:5173`/`5174` only** (Vite's
  default and its first fallback), so on port 5199 every API call dies as
  "unreachable" unless you start it with the override:

  ```powershell
  $env:CLIENT_ORIGINS='http://localhost:5199'; pnpm dev:server
  ```

  Mint real activities by driving the create form, or by curl-ing
  `POST /activities` at `http://localhost:3001` (payload shape in
  docs/api.md) — the 201 carries the student joinCode AND the hostKey
  that opens `/activity/host/<hostKey>`. The in-memory store forgets
  everything on every server restart.

  **Check that the server you're driving is YOURS.** A dev server left
  running by an earlier session holds port 3001, your `pnpm dev:server`
  dies with `EADDRINUSE` in the background where you won't see it, and
  the stale process happily serves the OLD code without your
  `CLIENT_ORIGINS` override — which surfaces as the host page rendering
  "We can't reach Chaverola" and looks exactly like a CORS bug in your
  change (cost a debugging detour on 2026-07-20). Confirm the owner
  before diagnosing anything:

  ```powershell
  Get-NetTCPConnection -LocalPort 3001 | Select-Object OwningProcess
  Stop-Process -Id <pid> -Force   # then restart with the override
  ```

## Drive (headless browser)

No Playwright in the repo, and no bundled browsers needed: install
`playwright-core` in a scratch dir (`npm i playwright-core`, ~1s) and launch
the **system** browser via channel. Use one stable scratch location (e.g.
`$env:TEMP\chaverola-verify\`) and reuse it across sessions — the install
is a no-op when it's already there:

```js
import { chromium } from "playwright-core";
// try "chrome" first, fall back to "msedge" (always present on Windows 11)
const browser = await chromium.launch({ channel: "chrome", headless: true });
```

Useful, stable handles:

- Navbar = first `header` element — but the student join routes
  (`/activity/join`, `/activity/join/:joinCode`) render **no `header` at
  all**: they live in `StudentWorldLayout` (purple backdrop + drifting
  `.doodle` elements, `aria-hidden`, `pointer-events: none`). The language
  dropdown trigger still has `aria-label="Change language"` everywhere (a
  floating pill on join routes); its options are `role=menuitemradio` named
  `EN` / `עב` (Radix portal — query from `page`, not the header). The
  "Chaverola home" link on join routes is the gradient pill.
- Doodle motion: `emulateMedia`/context `reducedMotion: "reduce"` freezes
  doodles into static transforms (`animation: none`) — assert on that, not
  on absence.
- Hero chatbox composer: `getByPlaceholder(/Talk as the Moon/)`; press Enter
  to send. Conversation feed scroll region has class `.scroll-soft`.
- Locale checks: `waitForURL` with exact URLs (`/he`, `/he/activity/join`).
- Setup form (`/activity/create`): character inputs by placeholder
  (`Caesar's ghost`, `Brutus`, …), host name is `#setup-host-name`. Two
  "Host the Activity" buttons exist (desktop rail + mobile dock) — click
  the visible one. Submitting POSTs to the API (needs the dev server +
  CORS override above). Success =
  `waitForURL(/\/activity\/host\/[A-Za-z0-9_-]{24}$/)`; the button
  disables while the create is in flight and deliberately never times out
  (create isn't idempotent). With the server down, a red banner lands
  above the docked button and the sessionStorage draft survives.
- Host page routes on `:hostKey`. `/activity/host/1234` is the demo: a
  golden banner ("This is the demo class…") sticky under the navbar (the
  condensed "waiting to chat" bar stands down for it — assert that bar
  only on real activities), seeded pretend classroom, demo steering panel.
  A REAL host page (24-char key) fetches over the API — expect a "Finding
  your activity…" beat — and opens a teacher socket (`/socket.io/`
  traffic; the demo has zero). **Since feature 3 both render the SAME
  grid** — sticky desktop pairing rail (`aside`, "Pair your students") +
  the chat sections — so demo-vs-live is no longer a layout difference.
  What still differs on a real page: no golden banner, no demo steering
  panel, ending controls disabled ("End all chats" / "Pause all chats" /
  each card's "End chat") under one shared hint line, an empty-transcript
  hint on live cards, and a count-up clock that appears only after a
  chat's first 60s (the demo shows an auto-end countdown instead).
  Tap-to-select rows are `ul li button[aria-pressed]` on both now; the
  remove control is the same everywhere:
  `button[aria-label="Remove <name> from the activity"]`. A dropped
  student dims with an amber "lost connection" tag — in the queue AND on
  the chat card (allow the ~45s ping-cycle detection + 4s broadcast
  delay); the teacher's own drop shows a `role="status"` "Reconnecting
  to your class…" banner, and the whole grid below it dims AND goes
  `pointer-events-none` (clicks won't land — don't read that as a broken
  selector). The live-settings panel is present on real activities and
  its **settings** edits are real now (they reach the server, survive a
  refresh, and a second host page hears `settings:changed`);
  character/scenario/host-name edits are still local-only and a refresh
  reverts them — expected, not a bug. Dead host links (garbage keys,
  stale 4-digit codes) render "That activity isn't running" with no demo
  redirect; an unreachable server renders "We can't reach Chaverola"
  whose Try again refetches in place. Section headers are buttons whose
  `innerText` carries the count pill (e.g. "Chats in progress 2"). All
  confirmations are one shared dialog: scope to `getByRole("dialog")`,
  match the title with `getByRole("heading")` (button labels repeat the
  title words), cancel is "Never mind". Live-settings edits propagate ~1s
  after typing pauses (assert on "Hosted by <new name>" in the header
  after ~1.6s).
- Driving real matching: the rail's pairing CTAs only render when the
  queue is non-empty (an empty queue shows the panel's empty state), so
  join students before asserting on them. Auto-match is server-run and
  **gated on a connected teacher socket** — with no host page open,
  students past the threshold correctly never pair; expect one pair per
  ~3s (`AUTO_MATCH_GAP_SECONDS`) once a teacher connects. A matched
  student's phone shows the room by its disabled composer
  (`getByPlaceholder(/No messages yet/)`) — the handiest "did they get
  seated" probe. Create activities with a 2-character roster to force the
  leftover branch ("first in line" tag) and 3+ to get trios.
- Student join (`/activity/join`): code input accepts Enter; the code
  screen carries no demo hint (the old "Demo code 1234 always works" pill
  is gone). The name step swaps in-place — wait for
  `getByPlaceholder("Your name")`, then click "Join Activity"; lobby shows
  "Waiting for your match". On `/activity/join/1234` the name input arrives
  prefilled "Rachel" (demo only — real codes start blank), and the golden
  "This is the demo…" card is sticky at `top-20` (y≈80 while scrolled). Auto-match keeps
  the host-page queue moving (~20s waits), so re-query rows right before
  clicking and avoid exact queue-count assertions.
- Real codes resolve over the API: expect a "Finding your activity…"
  loading beat on direct `/activity/join/<code>` arrivals, the not-found
  message ("Activity was not found…") on dead codes, and the distinct
  unreachable copy ("We can't reach Chaverola right now…") when the server
  is down. Real lobbies render no demo banner, no demo controls, and never
  auto-pair — only `1234` does, and it needs zero network.
- Demo entry URLs: `/demo` and `/demo/teacher` redirect to
  `/activity/host/1234`; `/demo/student` redirects to `/activity/join/1234`
  (name step, prefilled; locale-preserving: `/he/demo` →
  `/he/activity/host/1234`). The DEMO lobby also auto-pairs the student
  ~20s after it renders — take lobby assertions before that fires, or
  expect to land in a chat.

## Fast timers

Dev builds accept a `?fast` query param that compresses every demo timer —
the scripted chats and typing beats, ambient chatter, the host page's world
tick (joins, wait clocks, auto-match, auto-end, returns), the chatter drip,
the demo lobby's auto-pair, and the countdown clocks (reconnect window,
auto-end). Bare `?fast` = 10x; `?fast=<n>` clamps to 1–100 (10–20x is
plenty). The scale is read once per full page load — e.g.
`page.goto("http://localhost:5199/activity/host/1234?fast=10")` — so SPA
navigation keeps it, but every fresh `goto` needs the param again. At 10x
the hero script settles in ~1s, the demo lobby auto-pairs in ~2s, and the
2-minute reconnect window runs 12s. Delays scale rather than zero out, so
message-ORDER assertions stay valid — but prefer order/content assertions
over exact counts (ambient chatter lands every ~1.5s), don't assert on the
typing indicator (~120ms), and take "Chats in progress" assertions early
(auto-end clocks expire in tens of real seconds). Production builds compile
the whole mechanism out (`lib/demoTime.ts`); real-user timing like the
live-settings ~1s typing debounce is never scaled.

`?fast` reaches **nothing on a real activity** — it's a demo-simulation
knob, and the server has never heard of it. Real auto-match runs at
whatever `autoMatchSeconds` the activity was created with, so create test
activities with a low value (bounds: min 5, max 120, step 5) instead of
trying to hurry matching along from the client.

## Gotchas

- **Never round-trip a scratch script through PowerShell 5.1 text cmdlets.**
  `Get-Content`/`Set-Content`/`-replace` pipelines decode UTF-8 as cp1252,
  silently mangling emoji and arrows in the copy — and on 2026-07-20 two
  mangled copies of a prod socket script hung outright where the
  byte-identical clean file passed 16/16. Author scratch `.mjs` files with
  the agent's file tools and copy them with `node -e
"require('fs').copyFileSync(...)"`, never with PS string surgery. If a
  script that "worked before" hangs or fails oddly after a PS edit,
  suspect the file, not the server.
- **"Waiting for your match" renders before the seat lands.** The lobby
  shows immediately on sign-in while the socket is still handshaking, so a
  script that joins N students and clicks "Pair everyone 1:1" straight
  away can pair a subset (pair-everyone acts on whoever is eligible at
  that instant — cost a prod run on 2026-07-20, invisible on localhost
  where seats land in ms). Wait for the teacher rail to show all N rows
  (`aside li button[aria-pressed]`, `.nth(N-1)`) before pairing.
- The feature-4 messaging scripts live in the same dir:
  `f4p2-prod-socket-dbg.mjs` (raw socket, lifecycle-logged: fan-out with
  sender echo, both cap directions, exactly-10-of-14 through the rate
  limiter, resume backlog, privacy shape, teacher silence) and
  `f4p2-prod-browser2.mjs` (browser: trio messaging, refresh backlog,
  everPeers after a departure, the below-2 ending, the teacher hints).
  Both mint real activities — off-hours only against prod.
- Hero chat lines appear **twice** on the homepage — the teacher preview
  card mirrors the hero chat live — so `getByText` on a message trips
  Playwright's strict mode; use `.first()`.
- The chat demo engine keeps **one** pending "typing" timer: a scripted line
  can replace a queued reply if you type during the opening script. Wait for
  the last scripted line (hero: ends with "act natural", ~9s after load —
  ~1s with `?fast=10`) before asserting on replies to typed messages.
- The hero scenario has **no ambient lines** — after its two scripted lines
  the chat stays quiet until the visitor types, so exact message-count
  assertions are safe there. Other demo scenarios do keep ambient chatter.
- Full-page mobile screenshots paint the sticky navbar mid-page — artifact of
  `fullPage: true`, not a layout bug. Check
  `document.documentElement.scrollWidth` for real overflow.
- Demo join code `1234` always works for flows behind `/activity/join`.
- **Playwright's `context.setOffline(true)` does not sever an established
  WebSocket** (old Chromium limitation), so a connected lobby socket only
  notices the outage when the engine.io ping cycle misses (~45s at default
  settings) — budget waits accordingly when asserting the reconnecting
  pill, and don't read the delay as a client bug. Restarting the dev
  server is the fast way to force a real disconnect. Also note the lobby
  socket resumes seats across refreshes: to observe a fresh join, use a
  new browser context (fresh sessionStorage), not a reload.
- **Localhost hides emit-then-disconnect races.** Over loopback the two
  writes land in separate TCP reads and everything works; over real wifi
  they coalesce into ONE read, and socket.io's server silently drops an
  event it processes in the same tick as the disconnect (the phone pass
  caught `lobby:leave` dying this way, 2026-07-19). A last-words-then-close
  path is only proven by a real device on the LAN — or by checking the
  server log for the event actually dispatching (`student left`), not just
  the UI reacting. The lobby's disconnect logs carry a `reason` field:
  "client namespace disconnect" = the client chose to close, "transport
  close"/ping timeout = the connection died.

## Production

**Scripts are not the whole pass.** Both production bugs found so far lived
where a headless browser structurally cannot go — a device that genuinely
loses its connection. Do not treat a green scripted pass as a verified
feature; ask the founder to drive a real handset on the legs that need one.
If they can't at the time (no cellular, wrong hour, no second device), write
the ask into
[docs/pending-manual-tests.md](../../../docs/pending-manual-tests.md) with
enough detail to run it cold months later. That file holds blocked asks only
— delete an entry once it has been run.

The feature-1 prod pass script lives at
`$env:TEMP\chaverola-verify\prompt7-prod.mjs` — `node prompt7-prod.mjs`
runs the full desktop + phone sweep against chaverola.com (`--phone-only`
skips the desktop half). It creates real activities (in-memory, 12h TTL),
so keep it out of school hours. Its homepage check reads the `/healthz`
warm-up response for timing and the deployed server commit. Two traps it
already ate: assert phone-width text via `>> visible=true` (the hidden
desktop rail duplicates lines), and never probe a bundle for a BOM with
.NET's default `IndexOf` — culture-sensitive comparison skips zero-width
characters; pass `[StringComparison]::Ordinal`. Note that its host-page
assertions ("Your activity is live", "No students yet") describe the
feature-2 LIVE page, which still shows "No students yet" as the empty
state of the real queue — so they held; but it does not exercise the
realtime layer.

The **feature-2 realtime prod pass** is four scripts in the same dir, run
in this order (all mint real activities via a node `fetch` to
`https://api.chaverola.com/activities` — same payload shape that works
against local dev):

- `f2p5-coldwake.mjs` — the cold-start wake-UX check. **Run it FIRST**,
  before any other prod contact, so it lands on a naturally-asleep
  instance: a teacher submits the create form while the server wakes and
  must ride the "Chaverola is just waking up" patience copy into the live
  host page (which opens a real `/socket.io/` websocket). It reports
  whether the server was cold or already warm — if warm, the cold path
  just wasn't exercisable this session (opportunistic, not a failure).
  Caught cold on 2026-07-19: create took ~32s, patience copy at +5s.
- `f2p5-gauntlet.mjs` — the full realtime story with the browser on both
  sides (teacher desktop, students at phone width): live rows + ticking
  clocks, remove + rejoin, a navigate-away drop → "lost connection" →
  resume with the clock kept, back-from-lobby immediate drop
  (`lobby:leave`), a second host device with idempotent remove, and
  duplicate-tab takeover (seed the copied `chaverola.studentSession` into
  a fresh context via `addInitScript`; the newer socket wins).
- `f2p5-demo.mjs` — the demo journey with a socket.io network watch:
  proves ZERO `/socket.io/` traffic on `/demo`, `/demo/teacher`,
  `/demo/student` and that the demo still auto-pairs.
- `f2p5-restart.mjs` — the restart story. Sets up a live class (teacher +
  a connected "live phone" + a "dark phone" that seats then goes to
  about:blank holding its token), then waits on a flag file. Trigger a
  `render restart srv-d9ducu3bc2fs73esrr8g --confirm` (loads
  `RENDER_API_KEY` from `.env.local`), then create the flag; it asserts
  the live phone hits the ended screen, the teacher falls to not-found,
  the dark phone's reload hits the REST 404-with-token → same ended
  screen (not "recheck your code"), and a fresh create works after. This
  is the only feature-2 prod step that deploys — off-hours only.

Two lessons this pass paid for:

- **A deploy/restart ends live classes via `connect_error: activity_gone`,
  not the `activity:ended` event.** SIGTERM kills the process (`io.close()`
  drops sockets, never calls the store's removal hook); the fresh instance
  boots empty, so each client's auto-reconnect presents a token it has
  never seen and is rejected. Budget ~37s for a connected client to land
  on the ended screen — that's socket.io's reconnect backoff plus the new
  instance booting, not a bug. (The `activity:ended` event is only for an
  activity aging out under a still-running server.)
- **`page.on("websocket")` fires on the polling→websocket UPGRADE, which
  lands ~100–150ms AFTER the seat appears** (socket.io connects on polling
  first; the seat is live on polling before the ws object exists). A fixed
  post-seat sample of a "did the ws open" flag will intermittently miss it
  — the seat appearing IS the proof the connection is live; assert that,
  and if you must confirm the transport, `await` the websocket event with
  a few-second timeout rather than sampling once.

- **StrictMode double-fires data effects in dev**: the join-code lookup
  fetches twice on mount. A Playwright `route` that aborts only the FIRST
  `/activities` request to fake an outage silently lets the duplicate
  through and the page loads fine — gate the abort on a flag you flip when
  the "server" should come back, not on a request count.

The **feature-3 (matching) prod pass**, 2026-07-20, is a shared harness plus
six scripts in the same dir. `f3p5-lib.mjs` holds everything common (prod
URLs, `check`/`summary`/`exitWith` fail-soft collection, `createActivity`,
`joinStudent`, `openTeacher`, and the scoped selectors below) — import it
rather than re-deriving any of it:

- `f3p5-coldwake.mjs` — cold-start wake UX; **run first**, same rule as
  feature 2's.
- `f3p5-a-manual.mjs` — tap-to-pair, Pair everyone, card anatomy, the
  characterIds-only privacy pin, duo removal → ended screen → back-to-lobby
  re-queue, the 60s elapsed chip.
- `f3p5-a2-trio.mjs` — the trio split, removing one member (room survives at
  2 active) then a second (below 2 ends it), and the 2-character leftover.
- `f3p5-b-automatch.mjs` — teacher gating, the ≥3s gap, the closed-laptop
  hold and resume, the rail switch.
- `f3p5-c-resilience.mjs` — mid-chat drop/resume, refresh-into-chat, and the
  R1 leave hunt with a 3-minute recheck.
- `f3p5-d-settings.mjs` — settings sync across two host devices, both
  directions, plus a behavioural proof the server really got the update.
- `f3p5-e-demo.mjs` — the feature-3-aware demo sweep (zero `/socket.io/`).
- `f3p5-r1-hammer.mjs` — a raw socket.io-client driver, no browser; see below.

What this pass paid for:

- **A raw `socket.io-client` driver works fine against prod** (`auth: {role:
"teacher", hostKey}` / `{role: "student", joinCode, name}`; `lobby:welcome`
  returns `{studentId, token}`). It is the right tool for anything statistical
  or timing-sensitive — a browser can run a race once, this runs it fifty
  times across the transport matrix.
- **The mid-chat leave race is real on production, and `LEAVE_FLUSH_MS = 300`
  is the only thing standing between it and a stranded student.** Hammering
  `lobby:leave`-then-disconnect: with the client's real 300ms flush, 20/20
  delivered on both transports; with a 0ms flush on **websocket**, only 6/10
  — a probabilistic ~40% loss. Polling was unaffected both ways. This matters
  more than it did in feature 2. Never "simplify" that flush away.
- **The real-handset leg found what the scripts could not** (2026-07-20). A
  phone whose socket was down when the student tapped End emitted
  `lobby:leave` into socket.io's send buffer, and the 300ms flush then called
  `disconnect()` and abandoned it. Because a matched seat armed no grace
  timer, nothing reaped the ghost: the chat stayed `active` with the phone as
  a member and the partner stranded until the 12h TTL. Fixed on both sides —
  matched seats now take the same 120s grace and leave their chat when it
  expires, and a cleanup on an already-down socket keeps reconnecting to
  flush the leave instead of dropping it. `f3p5-leave-offline-repro.mjs` is
  the regression test: it cuts the network with CDP, waits out the ping
  cycle, taps End, and asserts the partner is freed. The lesson generalises —
  **a headless browser on broadband never actually loses its connection, so
  it cannot test what a user does while offline.** Only a real device can.
- **A flushed send buffer is not a delivered message.** The first attempt at
  the client fix looked right and still failed. An isolation probe
  (`f3p5-buffer-probe.mjs`, raw socket.io-client, no browser) showed
  `sendBuffer` going 1 → 0 across the reconnect — the packet genuinely left —
  while the partner still heard nothing. The socket was reconnecting with an
  auth CALLBACK that re-reads the student session on every attempt, and
  leaving had already signed the student out, so the server rejected the
  connection as `invalid` and took the buffered packet with it. The fix is to
  freeze the credentials into `socket.auth` before letting it reconnect. Two
  habits worth keeping: when a client-side fix "should work" but doesn't,
  drop to a raw socket driver to find out which side is dropping the message;
  and remember that anything reading session state lazily will read it
  _after_ the sign-out that leaving performs.
- **Give a probe the same auth shape the real client uses.** That same buffer
  probe initially connected with `{role, joinCode, name}` and no `nonce`, so
  its reconnect fell through `seatStudent`'s resume paths and minted a
  brand-new seat — making a working path look broken. `seats.ts` resumes on
  `studentId`+`token` first, then `nonce`; a probe missing both is testing a
  different student than it thinks.
- **`?fast` reaches nothing on production** — `demoTime.ts` returns 1 unless
  `import.meta.env.DEV`. The demo lobby's auto-pair takes the real ~20s
  (measured 20.4s). Budget real time; don't pass the param and wonder.
- **Don't await a slow-hint selector before you await the navigation.**
  `f2p5-coldwake.mjs` waited up to 20s for the "just waking up" copy and only
  then started timing the URL change, so on a warm server it reported a 20s
  "cold start" that was entirely its own timeout. Race both against the
  navigation. And a fast create still _flashes_ the pending button, so
  "pending was seen" is not evidence of a cold start — only elapsed time and
  the 5s patience hint are.
- **Two `f2p5-demo.mjs` assertions are dead** and must not be carried into new
  demo scripts: the ones asserting the pairing UI is demo-only. Feature 3
  removed the `isDemo` gate, so `Pair your students` and `Pair everyone 1:1`
  now render on live host pages too. The surviving discriminator is
  **"A real class does all this by itself."**
- **Render is a single free-tier instance** (`numInstances: 1`, no
  autoscaling, virginia) — the in-memory store and seat-resume logic depend
  on that. Re-check it before assuming any of this survives scaling.

Selector traps specific to the host page (all cost a run if missed):

- The pairing panel is mounted **twice** — the desktop `<aside>` and a
  `lg:hidden` collapsible. Scope every queue selector to `page.locator("aside")`
  or hit strict-mode. `Pair everyone 1:1` appears three times on a fresh live
  page.
- Chat cards are `section.shadow-md`; an ended one adds `.opacity-95`.
  `CollapsibleSection` is `shadow-sm`, so `section.shadow-md` selects cards
  and nothing else — but `locator("section", {hasText})` resolves to the outer
  collapsible and breaks silently with two chats open.
- Anchor the auto-match copy on the **colon** (`/Auto-match is on:/`): the
  paused-hold and returned-here lines both match a looser regex.
- `getByText("Live")` substring-matches the `Your activity is live` h1 — always
  card-scope it.
- `Edit activity settings` is `defaultOpen={false}` and its content stays
  mounted but `inert`; click the header before touching the stepper.
