---
name: verify
description: How to launch and drive Chaverola for runtime verification (browser-surfaced Vite SPA on Windows).
---

# Verifying Chaverola

## Launch

- `pnpm dev` from the repo root → Vite dev server at `http://localhost:5173` (ready in <1s, SPA fallback covers `/he/*` deep links).

## Drive (headless browser)

No Playwright in the repo, and no bundled browsers needed: install
`playwright-core` in a scratch dir (`npm i playwright-core`, ~1s) and launch
the **system** browser via channel:

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
  "Host the Activity" buttons exist (desktop rail + mobile dock) — click the
  visible one. Success = `waitForURL(/\/activity\/host\/\d{4}$/)`.
- Host page (`/activity/host/1234`): the desktop pairing rail is the
  `aside`; queue rows are `ul li button[aria-pressed]` (tap-to-select), each
  row's remove control is `button[aria-label="Remove <name> from the
activity"]`. Section headers are buttons whose `innerText` carries the
  count pill (e.g. "Chats in progress 2"). All confirmations are one shared
  dialog: scope to `getByRole("dialog")`, match the title with
  `getByRole("heading")` (button labels repeat the title words), cancel is
  "Never mind". Live-settings edits propagate ~1s after typing pauses
  (assert on "Hosted by <new name>" in the header after ~1.6s).
- Student join (`/activity/join`): code input accepts Enter; the name step
  swaps in-place — wait for `getByPlaceholder("Your name")`, then click
  "Join Activity"; lobby shows "Waiting for your match". Auto-match keeps
  the host-page queue moving (~20s waits), so re-query rows right before
  clicking and avoid exact queue-count assertions.
- Demo entry URLs: `/demo` and `/demo/teacher` redirect to
  `/activity/host/1234`; `/demo/student` redirects to `/activity/join`
  (locale-preserving: `/he/demo` → `/he/activity/host/1234`). The DEMO
  lobby also auto-pairs the student ~20s after it renders — take lobby
  assertions before that fires, or expect to land in a chat.

## Gotchas

- **Port 5173 may belong to another project.** Other repos' Vite servers
  (e.g. LetsGo) often hold the default port; a 200 response proves nothing.
  Launch with `pnpm dev --port <free port> --strictPort` and confirm the page
  actually says Chaverola before asserting anything.
- The chat demo engine keeps **one** pending "typing" timer: a scripted line
  can replace a queued reply if you type during the opening script. Wait for
  the last scripted line (hero: ends with "act natural", ~9s after load)
  before asserting on replies to typed messages.
- The hero scenario has **no ambient lines** — after its two scripted lines
  the chat stays quiet until the visitor types, so exact message-count
  assertions are safe there. Other demo scenarios do keep ambient chatter.
- Full-page mobile screenshots paint the sticky navbar mid-page — artifact of
  `fullPage: true`, not a layout bug. Check
  `document.documentElement.scrollWidth` for real overflow.
- Demo join code `1234` always works for flows behind `/activity/join`.
