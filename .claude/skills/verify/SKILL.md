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
  your activity…" beat — and boots an empty, truthful world: queue shows
  "No students yet", chats "No chats yet", no banner, no demo panel. The
  live-settings panel IS present on real activities, but its edits are
  local-only until edit-sync ships (they never reach student lobbies and a
  refresh refetches the server copy — expected, not a bug). Dead host
  links (garbage keys, stale 4-digit codes) render "That activity isn't
  running" with no demo redirect; an unreachable server renders "We can't
  reach Chaverola" whose Try again refetches in place. The desktop pairing rail is
  the `aside`; queue rows are `ul li button[aria-pressed]` (tap-to-select), each
  row's remove control is `button[aria-label="Remove <name> from the
activity"]`. Section headers are buttons whose `innerText` carries the
  count pill (e.g. "Chats in progress 2"). All confirmations are one shared
  dialog: scope to `getByRole("dialog")`, match the title with
  `getByRole("heading")` (button labels repeat the title words), cancel is
  "Never mind". Live-settings edits propagate ~1s after typing pauses
  (assert on "Hosted by <new name>" in the header after ~1.6s).
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

## Gotchas

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

## Production

The feature-1 prod pass script lives at
`$env:TEMP\chaverola-verify\prompt7-prod.mjs` — `node prompt7-prod.mjs`
runs the full desktop + phone sweep against chaverola.com (`--phone-only`
skips the desktop half). It creates real activities (in-memory, 12h TTL),
so keep it out of school hours. Its homepage check reads the `/healthz`
warm-up response for timing and the deployed server commit. Two traps it
already ate: assert phone-width text via `>> visible=true` (the hidden
desktop rail duplicates lines), and never probe a bundle for a BOM with
.NET's default `IndexOf` — culture-sensitive comparison skips zero-width
characters; pass `[StringComparison]::Ordinal`.

- **StrictMode double-fires data effects in dev**: the join-code lookup
  fetches twice on mount. A Playwright `route` that aborts only the FIRST
  `/activities` request to fake an outage silently lets the duplicate
  through and the page loads fine — gate the abort on a flag you flip when
  the "server" should come back, not on a request count.
