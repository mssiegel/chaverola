# iPhone chat clipping and keyboard sizing

State: **Viewport confirmed on a real iPhone; Send-focus fix awaits device confirmation.**

## Report — 2026-10-19

The founder paired a real Android student with a borrowed iPhone student.
The iPhone's newly opened chat clipped the top of the page and its student
name badge. Focusing the composer left the chat taller than the space above
the keyboard, with its header clipped and its input out of view. Android
showed the name before typing and shrank the conversation above the keys.
Three supplied images show the iPhone before/after focus and Android before
focus; the founder also described Android with its keyboard open.

The phone had been returned before follow-up checks. Model, iOS version,
browser, scroll position, and whether reload changes the clipping are
unknown. The photos establish the visible failure, not a device-specific
root cause or a successful run of the other pending iPhone checks.

## Change

- A layout-local `useStudentChatViewport` hook measures the visual viewport's
  height and top offset during phone chats, including ended chats. Resize
  and scroll events update the boundary once per animation frame. Pinch
  zoom keeps the last layout; it is not treated as a keyboard resize.
- The phone world and its name badge share that boundary. Demo controls
  and long content scroll inside it; join/lobby screens retain document
  scrolling, and desktop retains the existing fixed-height card.
- The chat frame's minimum height follows the visible height and releases
  while typing. Its size does not transition, and focusing the composer
  stops the entrance animation. Flex ancestors can shrink so the feed takes
  the reduced space while the header and composer remain visible.
- Phone composer text is 16px to avoid Safari's small-field focus zoom.
  While focused, bottom padding is 8px instead of retaining a home-indicator
  inset above the keyboard. Closed-keyboard safe-area padding remains.

No wire, server, or activity behavior changes. The demo and real student
flows use the same layout and frame.

## Verification

- `pnpm typecheck` and `pnpm build` pass, including public-head prerendering.
- `pnpm lint` passes with the existing `sessionRef.current` cleanup warning
  in `useLobbyPresence.ts:372`; no new warnings.
- `tools/verify/scratch/iphone-viewport.mjs`: **44/44** across Chromium and
  desktop WebKit. Real activity create/join/pair; a 330px visual viewport
  panned 95px inside an unchanged 844px layout; full header/input geometry;
  pause preserves draft/focus and refuses send; resume delivers to the peer;
  pinch zoom guard; scrolling offsets; keyboard dismissal; Android-style
  layout resize; desktop breakpoint and return to portrait; return to lobby;
  English/Hebrew demo sizing and scroll access to controls.
- `tools/verify/scratch/iphone-home.mjs`: **5/5** in WebKit. Shared homepage
  composer at phone/desktop widths in both locales, plus focusing during
  normal entrance motion stops animation and sizing transitions.
- `pnpm verify:smoke`: **7/7** locally. Reused the existing server at scale 1
  rather than interrupting it; demo checks use `?fast=10` / `?fast=100`.
- Inspected rendered phone chat screenshots with/without the simulated
  keyboard.

## Real-iPhone result and Send-button follow-up — 2026-10-19

After deployment of `fee785c`, the founder tested the chat on a real iPhone
and confirmed the viewport experience was good. The remaining issue was
specific to sending: Android returned straight to the message field, but
the iPhone required another tap into it. Device/browser versions and the
individual reload, demo, and safe-area subchecks were not reported. The
viewport report is recorded as confirmed; the separate pause and safe-area
tests remain pending.

The Send button previously allowed focus transfer on an unlocked press and
deferred textarea refocus to `requestAnimationFrame`. The follow-up cancels
mousedown's focus transfer for mouse and touch compatibility events, while
keeping sending on the normal click. Refocus now runs synchronously in the send handler with
`preventScroll`. The phone demo still deliberately blurs on a successful
send to return its steering controls; live chats retain focus.

The earlier regression drivers sent live messages with Enter. They did not
exercise the Send-button tap that the founder found. Follow-up verification
must use actual taps/clicks and check for blur throughout the gesture, plus
immediate focus inside click and keyboard handlers. Desktop WebKit still
cannot certify a physical iPhone keyboard; the final device check is sending
two messages in succession without touching the field between them.

**Follow-up local verification:** `iphone-send-focus.mjs --chromium` and
`--webkit` each passed **11/11**. Actual touch taps delivered messages with
zero textarea blur events; focus ran synchronously inside click, using
`preventScroll`; a second message was typed without refocusing the field.
Paused taps preserved draft/focus, mouse clicks sent normally, an abandoned
press did not send, and both Enter and Space activated the Send button.
Phone demos still released focus after sending, while desktop demos kept it.
Typecheck, production build, and lint pass (the existing presence-hook warning remains).

Desktop WebKit is useful for layout verification but does not provide an
iPhone keyboard, Safari's browser bars, or real notch/home-indicator insets.

References: [WebKit's interactive-widget implementation issue](https://bugs.webkit.org/show_bug.cgi?id=259770)
and [the VisualViewport API](https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport).
The focus follow-up also follows
[WebKit's user-gesture requirement for opening the software keyboard](https://bugs.webkit.org/show_bug.cgi?id=195884).
