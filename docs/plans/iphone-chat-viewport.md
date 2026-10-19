# iPhone chat clipping and keyboard sizing

State: **Return and focus retention confirmed in a teacher-created activity on a physical iPhone. The keyboard-opening blank flash persists; fixing it is deferred at the founder's request. The earlier newline failure was on BrowserStack.**

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

## Real-iPhone Send result and Return-key follow-up — 2026-10-19

After deployment of `b0d95fb`, the founder confirmed on a real iPhone that
sending kept the message field focused. The remaining report: its keyboard
Return inserted a newline, while Android and desktop Enter sent the message.
The iPhone's exact keyboard/event sequence was not captured.

The follow-up retains the hardware keydown path and adds a native
`beforeinput` listener for cancelable `insertLineBreak` / `insertParagraph`
requests outside composition. Both paths cancel the default insertion and
use the existing synchronous send handler. The native listener is registered
in a layout effect; its Effect Event reads the latest committed draft and
pause state without replacing the listener. Shift+Enter
still inserts a newline, pasted newlines remain text, and Enter during IME
composition does not send. `enterKeyHint="send"` asks the software keyboard
to label the action; the hint is not the send implementation.

Verification must separately exercise native beforeinput with no keydown
and actual browser Enter/Shift+Enter. Dispatching an input event in desktop
WebKit tests the fallback handler; it is not a physical iPhone Return press.
The device retest is to type a message, press the iPhone's Return/Send key,
and type the next message without touching the field again.

**Return follow-up verification:** `iphone-return.mjs` passed **32/32**
across Chromium and desktop WebKit: both native input types without keydown
sent once and canceled newline insertion; hardware Enter still sent once;
the next draft accepted typing without refocusing; Shift+Enter inserted a
newline; paste/composition were left alone; empty and paused Return inserted
no newline; resume sent the saved draft; phone demo Return sent and returned
its controls. Typecheck, production build, and lint pass, with only the
existing presence-hook lint warning. The native fallback checks dispatch
InputEvents; they do not replace the final real-iPhone keyboard check.

References: [React's beforeinput limitation](https://react.dev/reference/react-dom/components/common#props),
[Input Events](https://www.w3.org/TR/input-events-2/), and
[enterkeyhint](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/enterkeyhint).

## Return retest failed: capture the actual Safari events — 2026-10-19

The founder retested `48404d8`: Return still inserted a newline on the iPhone,
using Safari and Apple's keyboard. Android continued to send. The synthetic
beforeinput checks proved only that the two supplied event formats were
handled, not that the iPhone emitted either format with the assumed flags.
No iOS version or native event sequence is known yet.

An opt-in `?input-debug=1` recorder observes the actual chat composer. It
records native key, beforeinput, input, legacy textInput, and composition
events before/after app handling. The report has event types, flags,
newline classification, length/counts, and browser version; it excludes
typed characters, names, messages, and activity URLs. It stays in memory
and is copied only by the tester. Normal links do not load the recorder.
This deployment deliberately changes no send behavior. The next fix will
use the physical-device trace rather than another assumed event format.

The recorder's local browser checks passed **26/26** across Chromium and
desktop WebKit, in both locales: it preserved an unhandled newline edit,
captured raw input formats/flags and post-edit state, excluded typed text
and character keycodes, uploaded no report, and copied the displayed JSON.
Ordinary URLs showed no report control and fetched no recorder chunk.

The temporary recorder was subsequently removed in the cleanup described below.

## Physical iPhone versus BrowserStack clarification — 2026-10-19

The founder clarified that the preceding Return failure and screenshot were
from a BrowserStack iPhone session. The screenshot showed only Enter's keyup
with `shift: true`; it did not establish the earlier keydown/beforeinput
sequence or its cause. Treat the earlier references to that retest as a
BrowserStack result, not a direct physical-handset result.

On a physical iPhone, the founder then confirmed that keyboard Return sent
the message, but the input lost focus. A follow-up established that this run
used the diagnostic demo, code `1234`. Its `ChatStage` explicitly passes
`releaseKeyboardOnSend` so a phone send dismisses the keyboard and restores
access to demo controls. `LiveChatStage` does not pass that flag; live sends
keep focus synchronously. No focus implementation change is needed for the
reported demo behavior. The intent remains recorded in
[chat-behavior.md](../decisions/chat-behavior.md#return-sends-from-both-physical-and-software-keyboards).

The attached `input-trace-v1` report contains 80 records of text editing,
with no Enter or line-break event. It cannot identify the successful Return
path or measure focus after sending. The physical-device Return success is
the founder's observed result. At that point the combined Return/focus
interaction in a teacher-created activity had not yet been reported.

## Live Return confirmed; keyboard-opening transition — 2026-10-19

The founder then tested a teacher-created activity on a physical iPhone and
confirmed that Return sent and the message input retained focus. That closes
the live Return/focus retest. The remaining report is visual: focusing the
previously unfocused composer in iPhone Safari briefly moves the entire
chat offscreen, leaving blank space, before the chat fits above the keyboard.
Android shrinks the chat directly.

The viewport hook previously waited for resize/scroll notifications and
then deferred measurement to another animation frame. A new scratch driver
advances visual-viewport measurements between frames without notifications;
the old hook failed all six opening/closing/immediate-update checks in
desktop WebKit across English and Hebrew. This demonstrates a notification
gap in our handling, not a reproduction of Safari's native keyboard animation.

The follow-up samples the available viewport measurements before each paint
for one second after composer focus or blur. Delivered viewport and window
resize/scroll events update the boundary immediately. Unchanged measurements
do not rewrite styles, and the frame loop stops after the transition or on
cleanup. Phone scope, pinch-zoom behavior, and normal join/lobby scrolling
remain as before. Focus, taps, selection and keyboard gestures are not
intercepted, and no keyboard height is guessed.

Safari's delayed viewport notifications are a plausible contributor, not a
confirmed device-specific cause. The
[WebKit report on delayed visual-viewport scroll events](https://bugs.webkit.org/show_bug.cgi?id=218465)
documents related timing behavior. Sampling cannot recover measurements
the browser itself has not yet exposed; the physical-iPhone opening/dismissal
transition still needs a retest after deployment.

**Local verification:** `iphone-keyboard-transition.mjs` passed **24/24**
across Chromium and desktop WebKit in English/Hebrew: every simulated opening
and closing frame followed metrics without viewport events, delivered events
updated synchronously, pinch zoom retained its layout, polling stopped after
the bounded transition, and desktop released the phone boundary.
`iphone-viewport.mjs` passed **44/44**, covering live send/focus, pause/draft,
viewport pan/resize, Android-style layout resize, desktop/portrait, return to
lobby, and demo controls in both locales. Typecheck and lint pass, with the
existing presence-hook cleanup warning. These simulated transitions still
require the physical-iPhone check described above.

## TODO — iPhone Safari blank scroll when opening the keyboard

_Deferred at the founder's request, 2026-10-19._

- [ ] Fix the brief blank-screen scroll when an unfocused chat composer gains
      focus in iPhone Safari.

**Reproduce:** On a physical iPhone in Safari, join a teacher-created activity
and enter a chat. With the keyboard dismissed, tap the message input. The
whole chat briefly scrolls upward/out of view, exposing a blank page, before
settling at the correct height above the keyboard. Dismiss and refocus to
repeat. Android reduces the chat height without this flash.

**Expected:** The chat stays visible throughout keyboard opening and shrinks
to the available height. Preserve the already confirmed Return-to-send and
input focus retention after sending.

**Known result:** The founder retested deployed commit `950837d` on a physical
iPhone and confirmed the blank flash still happens. Sampling viewport
measurements during the transition did not resolve it, despite passing the
simulated browser checks above. The native focus-scroll cause remains
unconfirmed. No further fix was implemented after this failed retest.

**When resumed:** Capture the actual Safari keyboard-opening transition and
its scroll/viewport timing, then verify the fix on a physical iPhone. Desktop
WebKit and simulated viewport changes alone have not reproduced this flash.

## Cleanup after deferral — 2026-10-19

At the founder's request, remove the temporary keyboard-event recorder,
its query-controlled UI, composer marker, English/Hebrew strings, and
operations instructions. Diagnostic links no longer activate a recorder.
The earlier reports and verification above remain a historical record.

Restore `useStudentChatViewport` to the event-driven implementation from
`fee785c`: one scheduled measurement per resize/scroll update, without the
unsuccessful focus/blur frame polling added by `950837d`. Preserve the original
viewport sizing fix and the working send-focus and Return fixes from
`b0d95fb` and `48404d8`. The blank-scroll TODO above remains deferred.

This is a forward cleanup commit; the previously pushed commits and their
diagnostic history are retained.

**Cleanup verification:** The client source exactly matches `48404d8`,
retaining all three confirmed fixes. Typecheck, production build, and lint
pass (the existing presence-hook warning remains). The viewport driver passes
**44/44** across Chromium/WebKit and both locales; the WebKit Send-tap driver
passes **11/11**, including consecutive sends without blur, paused drafting,
and the distinct phone/desktop demo behavior. No recorder references remain
in client source or the operations runbook.
