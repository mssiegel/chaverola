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

- Navbar = first `header` element; language dropdown trigger has
  `aria-label="Change language"`; its options are `role=menuitemradio` named
  `EN` / `עב` (Radix portal — query from `page`, not the header).
- Hero chatbox composer: `getByPlaceholder(/Talk as the Moon/)`; press Enter
  to send. Conversation feed scroll region has class `.scroll-soft`.
- Locale checks: `waitForURL` with exact URLs (`/he`, `/he/activity/join`).

## Gotchas

- The chat demo engine keeps **one** pending "typing" timer: a scripted line
  can replace a queued reply if you type during the opening script. Wait for
  the last scripted line (hero: "so maybe act natural", ~13s after load)
  before asserting on replies to typed messages.
- Full-page mobile screenshots paint the sticky navbar mid-page — artifact of
  `fullPage: true`, not a layout bug. Check
  `document.documentElement.scrollWidth` for real overflow.
- Demo join code `1234` always works for flows behind `/activity/join`.
