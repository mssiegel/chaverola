# Pending manual tests

Manual tests that were **asked for and not performed**, because at the time
the founder couldn't run them — no cellular service in the room, no second
device to hand, wrong time of day. Each one is written down here so it can be
picked up later instead of quietly disappearing.

## What goes in this file

Only tests that were requested and blocked. That's the whole rule.

- **In:** a test an agent asked the founder to run, that couldn't be run then,
  for a practical reason.
- **Out:** tests that were run — whatever the result. A test that ran and
  passed needs no entry; a test that ran and found a bug belongs in
  DECISIONS.md and the feature's plan, not here.
- **Out:** things nobody has got round to asking for. This is a record of
  unmet asks, not a wishlist of good ideas. A general "what should we test"
  list would grow without bound and stop being read.

**When you run one, delete its entry** and record the outcome wherever that
feature's verification lives (the plan's pass record, DECISIONS.md if it
changed a decision). An empty file is the goal state, not a sign of neglect.

**For agents:** when you ask the founder to run something manual and they
can't, add it here before the session ends, with enough detail that it can be
run cold months later — the exact steps, what should happen, what it would
mean if it doesn't, and what coverage exists in the meantime. Don't assume
the next reader has the conversation you had.

---

## iPhone chat viewport — confirm the clipping fix on a real device

_Asked 2026-10-19; blocked because the borrowed iPhone had been returned
before the founder could check scroll/reload behavior or try a fix._

**Steps** (3 minutes, after the viewport fix is deployed, or on its dev build):

1. Use Safari on an iPhone and note its model and iOS version. Create a real
   activity on a laptop, join from the iPhone and another student device,
   and pair them. Leave the iPhone's keyboard closed.
2. The student's name badge and the whole chat must be visible immediately,
   without scrolling or pinching. Reload the seated chat and check again.
3. Focus the composer, type a draft, and send/receive several messages.
   The header, conversation, and input must fit above the keyboard. Only
   the conversation area should shrink; nothing should slide off the top,
   sit under the keys, or acquire a large blank gap above the keys.
4. Dismiss/reopen the keyboard twice. The name badge must return on blur,
   and the chat must fit on every cycle. Also check the student demo at
   `/activity/join/1234`: sending returns its controls, which remain reachable
   by scrolling.

**If it fails:** record which transition fails and whether scrolling to the
top, reloading, or pinching out changes it. The visual-viewport measurements
or Safari's keyboard animation still need a real-device adjustment. The
original failure is recorded in the
[iPhone viewport plan](plans/iphone-chat-viewport.md), not counted as a pass
of the separate pause or safe-area tests below.

**Coverage in the meantime:** local Chromium and desktop WebKit checks
exercise a shorter, panned visual viewport while leaving layout height
unchanged, alongside Android-style layout resizing. Neither is a real iPhone
keyboard or a nonzero safe-area inset. See the plan for the final pass record.

## Hebrew prompt 5 — the transcript email in a real Outlook

_Asked 2026-07-27. The Gmail half ran the same day and is not pending: a real
Hebrew transcript was sent through the live SMTP path to the founder's Gmail.
Outlook was blocked for the ordinary reason — no Outlook account to hand._

Outlook is the client that matters most here and the one least like a browser.
Outlook for Windows renders mail through Word, which does not implement `<bdi>`
and treats `dir` as a per-paragraph property rather than something a block
inherits from an ancestor. Every other client we can reach implements both.

**Steps** (3 minutes, once an Outlook account exists):

1. Run `pnpm preview:email` and mail yourself the Hebrew file, or end a real
   Hebrew activity with a teacher email set. Open it in **Outlook for Windows
   (classic)** and in **outlook.com**.
2. **The cast line is the whole test.** It reads
   `Dana Fallback בתפקיד הרצל 🎩 · יונתן בתפקיד גולדה 🕊️`. Each student must be
   paired with the character immediately after their own name. A line that
   pairs Dana with `יונתן`, or `הרצל` with `גולדה`, is the failure.
3. The body must be right-aligned and right-to-left throughout, not just the
   first paragraph.
4. The subject in the message list: `חברולה · הפעילות של רבקה לוי (קוד 4321)`,
   with the parentheses around `קוד 4321` mirrored and the digits in order.
5. If Outlook is set to show the plain-text alternative, check no line opens
   with a visible box or question mark, and that each line reads right to left.

**What it would mean if it fails:** step 2 is the one case where the email
would show a teacher _wrong data_ rather than ugly data, and it can only happen
in a renderer that honors `<bdi>` while dropping the container's `dir`. If it
does happen, the fix is to stamp `dir` on every block the formatter emits
rather than only the container — don't debug the Hebrew. Step 3 failing alone
is a `dir`-inheritance problem with a visible, harmless symptom. Step 4 failing
means the brand-first subject isn't doing its job and the client wants an
explicit mark after all, which the entry in
[teacher-live.md](decisions/teacher-live.md#the-transcript-email-is-written-in-the-activitys-language-and-lays-itself-out-right-to-left-without-css)
explains was rejected on purpose. Step 5 failing means the per-line RLM didn't
survive the transfer encoding.

**Coverage in the meantime:** the Gmail send landed and the founder confirmed
it renders correctly — right to left, brand-first subject, the Latin-named
student's line intact. That covers the Blink/WebKit family; Outlook's Word
renderer is a different engine and is what this entry is for. `pnpm test`
asserts the mechanisms are present — a brand-first subject, `dir="rtl"` in the
HTML, `<bdi>` around a Latin name, and U+200F on every non-empty plain-text
line — which is not the same as a client honoring them. `pnpm preview:email`
writes both locales for eyeballing in a browser, and a browser is exactly the
engine Outlook for Windows does not use.

## Doc 27 — a pause landing mid-word on a real iPhone, keyboard up

_Asked 2026-07-26; the founder said up front that no handset would be in the
room when the change ran, which is why the implementation avoids `readOnly` —
its iOS keyboard behavior is exactly what only a device can answer._

**Steps** (3 minutes, on any iPhone; production chaverola.com, or the phone
pointed at a dev server):

1. Open `/activity/join/1234` — the demo, so this needs no activity and no
   second device. Type any name, tap **Join Activity**, and wait out the
   auto-pair (about 20 seconds) to land in a chat.
2. Tap the message box and type half a sentence — stop mid-word, leave the
   keyboard up, and don't send. The corner pills and the yellow demo banner
   should have stood down while you type; that's the state the pause has to
   leave alone.
3. Without dismissing the keyboard, reach the demo steering panel and tap
   **Teacher pauses the class**. (It's hidden while the field has focus — scroll
   or tap once outside the field to reveal it, then tap straight back into the
   field and retype a word or two so the keyboard is up when you pause. If
   that's fiddly, do it from a second device on `/activity/host/<key>` with a
   real activity instead and tap **Pause all chats** → **Pause chats**.)
4. **The whole test is this moment.** When the amber "Your teacher paused the
   chat" banner lands: the keyboard must stay up, the chat card must not move,
   and the corner pills and demo banner must stay hidden. Any jump or any
   keyboard dismissal is the failure.
5. Your half-sentence must still be in the box, and still editable — type
   another word and it should appear. Tap the send button: nothing sends, and
   the keyboard still doesn't close.
6. Tap **Teacher resumes the class**. Keep typing without tapping the field
   again — the characters must go into your draft. Send it; it goes.

**What it would mean if it fails:** step 4 is the change itself. The field is
left fully enabled precisely so no browser can force a blur, so a keyboard
that closes anyway means iOS is dropping focus for a reason we haven't found —
and the ~72px chrome-collapse chain
(`max-sm:group-has-[textarea:focus]` in `StudentWorldLayout`, `DemoBanner`,
`ChatStage`) will follow it every time. Step 5's send tap is the second guard:
the send button is `aria-disabled` rather than `disabled` and cancels its own
mousedown while locked, and a keyboard that closes there means Safari focuses
buttons on touch through a prevented mousedown — in which case that button
needs the real `disabled` back. Step 6 failing means the draft or the focus
didn't survive the resume re-render, which is the "costs a tap" complaint the
whole doc was written about.

**Coverage in the meantime:** ran headless on 2026-07-26 at 390×844 with touch
— `tools/verify/scratch/doc27-pause-lock.mjs` (24/24, live activity) and
`doc27-demo-parity.mjs` (10/10, the demo flow), alongside `verify:smoke` 7/7
and the full unit suite. Those assert the observable half of every step above:
`document.activeElement` is still the textarea across the pause, the world
column's computed `padding-top` stays 8px, the corner bar stays
`display: none`, the draft survives and keeps taking input, a forced tap on the
locked send button sends nothing and drops no focus, and resume sends without a
re-tap. What headless cannot do is show a keyboard at all — Chromium has none,
so "the keyboard stays up" is inferred from focus never moving, which is the
one link in the chain this entry exists to check.

## Doc 25 — the composer clear of the home indicator, on a notched iPhone

_Asked 2026-07-26; the founder said up front that no handset would be in the
room when the change ran, so logging it was part of the prompt rather than a
fallback._

**Steps** (2 minutes, on an iPhone with a home indicator — X or later, no home
button; production chaverola.com, or the phone pointed at a dev server):

1. Open `/activity/join/1234` — the demo, so this needs no activity and no
   second device. Type any name, tap **Join Activity**, and wait out the
   auto-pair (about 20 seconds) to land in a chat.
2. **Keyboard closed, look at the bottom of the screen:** the text field and
   the send button must sit fully above the home-indicator strip. Swipe up from
   the very bottom edge — that should be the system gesture, not a tap on send.
3. Tap the text field to open the keyboard. There must be **no gap** between
   the composer and the top of the keys. A band of purple or card-coloured
   space there is the failure.
4. Send a message, dismiss the keyboard, and check step 2 again — the clearance
   has to come back.
5. **Rotate to landscape** while still in the chat. The language pill (top end)
   and the name badge (top start) must both clear the notch bar rather than sit
   under it.
6. Back in portrait, tap **Leave**, then **Back to the lobby**. Neither screen
   may run under the notch or the indicator.
7. The teacher side, same phone: on the homepage, the Chaverola logo and the
   language pill must sit below the status bar, not behind the clock and
   battery. Then `/activity/create`, scrolled to the bottom — the **Host
   activity** dock must clear the home indicator too.

**What it would mean if it fails:** step 2 means either `viewport-fit=cover`
isn't reaching the device or the world column's
`pb-[max(0.5rem,env(safe-area-inset-bottom))]` isn't resolving. Those two are
one mechanism, and `cover` without the pad is worse than neither, so a failure
here is the whole change not landing. Step 3 now checks the visual-viewport
fix above too: focused bottom padding is explicitly 8px, without depending
on iOS reporting a zero home-indicator inset. A remaining gap points at the
viewport measurement or keyboard transition. Step 5 means the corner bar's left/right insets
aren't landing; note the deliberate limit, that the content column below keeps
plain `px-4`, so a card edge a few pixels into the notch strip is expected
there rather than a bug. Step 7 means `cover` un-letterboxed the teacher routes
without the navbar's own top pad taking effect, which would put the one link
home behind the status bar on every route that has a navbar.

**Coverage in the meantime:** the regression half ran headless on 2026-07-26
(`tools/verify/scratch/doc25-safe-area.mjs`, 18/18, alongside `verify:smoke`
7/7 and the full unit suite). Desktop Chromium reports every inset as 0, so
what those 18 checks prove is only this: each padded edge still computes to its
pre-change number — 80px above the world column, 8px below it, 16px around the
corner pills — which is what catches a mistyped Tailwind arbitrary value
silently emitting nothing. What headless cannot do is
produce a non-zero inset at all, so every number above 0 in this change is
unexercised until this entry runs. `/activity/join/1234` needs no server and no
second device, which is why it's step 1.

## Feature 18 — a roster edit landing on a real student's phone, and a phone as the stale second host

_Asked 2026-07-26; the founder chose to log it rather than run it in the
session, so the whole feature was driven headless against production instead._

**Steps** (4 minutes, on production chaverola.com, two devices):

1. On a laptop, create a real activity with **three** characters and land on
   the host page. Join from a phone on **cellular** (not the room's wifi) with
   the real join code, and leave the phone sitting in the lobby, screen on.
2. On the laptop, open **Edit activity settings** and rename character 3.
   Pause typing and wait about two seconds.
3. **Look, don't touch the phone:** its lobby's character list must show the
   new name, with no refresh and no flicker of a loading state.
4. Lock the phone for ten seconds, unlock it, and check the lobby again: still
   the new name.
5. Pair the phone's student into a chat. While that chat is live, rename the
   same character again on the laptop. The phone's chat must **not** relabel:
   it keeps the name it was dealt.
6. Now make the phone the second **host** device: open the same
   `/activity/host/<hostKey>` URL on it. On the laptop, remove a character.
   The phone's panel keeps showing the old cast, which is correct. On the
   phone, tick three students and press **Start their chat** — nothing should
   start, and an amber notice should say the cast only has two characters.

**What it would mean if it fails:** step 3 not updating means
`activity:details-changed` isn't reaching a real handset's socket, which would
also mean feature 17's name and instructions sync is broken on phones (the
roster rides the same event). Step 4 failing but step 3 passing points at the
lobby's copy being lost across a background/foreground cycle rather than at the
event. Step 5 relabelling means the frozen cast isn't reaching the phone's
client, so a student would watch their character get renamed mid-roleplay,
which is the exact thing feature 18 promises never happens. Step 6 seating two
students instead of refusing means the all-or-nothing rule regressed and a
student is silently sitting out a round again.

**Coverage in the meantime:** all six steps passed headless against production
on 2026-07-26 (`tools/verify/scratch/f18-prod.mjs`, 19/19, plus coldwake 4/4
and `verify:smoke --prod` 7/7). What headless can't imitate is a phone's radio,
its background/foreground cycle, and a small viewport rendering the notice on a
real device rather than an emulated 390px one.

## The language lock, on a phone whose system language really is Hebrew

_Asked 2026-08-13; blocked because the only Hebrew-set handset wasn't to hand.
Headless Chrome can emulate `navigator.language`, and did (16/16 locally, 6/6
on production), but it can't reproduce what a real device reports or how a real
mobile browser treats a backgrounded tab's sessionStorage._

**Steps** (3 minutes, on production chaverola.com), on a phone whose **system
language is Hebrew**:

1. On a laptop, create an activity at `chaverola.com/activity/create` with
   **Language Settings - Keep students in English** left **on** (its default).
   Note the join code.
2. On the phone, open `chaverola.com` and confirm it comes up in **Hebrew**
   (right-to-left). This is the check that the handset's language actually
   reaches the app.
3. Type the join code. The phone should flip to **English, left-to-right** at
   the moment the code resolves, and the floating **language pill should be
   gone**.
4. Enter a name and land in the lobby. **Reload the page.** It must come back
   in English, with no Hebrew flash on the first frame, and the student must
   still be seated — the teacher's queue on the laptop must not lose and
   regain the row.
5. Background the browser for a minute or two (open another app, lock the
   screen), come back, and reload again. Same result.

**What it would mean if it fails:** step 2 showing English means the device
reports a tag `localeFromNavigator` doesn't recognize — some Android builds
still send the retired `iw` for Hebrew, which is normalized in
`lib/localePreference.ts`, and that normalization has never run on real
hardware. Step 3 leaving the pill up, or step 4 coming back Hebrew, means the
per-tab pin (`chaverola.activityLocale`) didn't survive — mobile browsers
discard backgrounded tabs aggressively, and sessionStorage going with one is
exactly the case step 5 is for. A student stranded in the wrong language with
no switcher is the failure this feature has to not have; see DECISIONS.md →
"A teacher can lock an activity to its language".

**Coverage in the meantime:** `tools/verify/scratch/locale-lock.mjs` (16/16,
including the seated reload with the teacher's queue as witness),
`locale-lock-midchat.mjs` (7/7, a mid-chat reload leaving the partner's chat
open), and `prod-lock.mjs` (6/6 against the deployed build) — all with an
emulated `he-IL` context rather than a real handset.

## Feature 14 — the two-device settings wake, with a real phone as the sleeper

_Asked 2026-07-24; blocked because the founder's laptop was running on the
phone's hotspot — airplane mode on the phone would have severed both devices._

**Steps** (2 minutes, on production chaverola.com):

1. On a laptop, create a real activity and land on the host page. Open the
   same host URL in the phone's browser — one teacher, two devices.
2. Put the phone in **airplane mode**.
3. On the laptop, turn **Match students 1:1 automatically** off (rail or
   panel switch — either).
4. Airplane mode off, phone tab back to the foreground. The amber
   "Reconnecting to your class…" banner should appear and clear within a few
   seconds.
5. **Look, don't touch:** the phone's auto-match switch must now read **off**
   on its own.
6. On the phone, flip any **other** switch (e.g. "Reveal names when a chat
   ends"), then check the laptop: auto-match must **stay off**.

**What it would mean if it fails:** step 5 showing on means the reconnect
fold isn't firing on a real handset's radio cycle (the fix rides the first
`chats:snapshot` after each socket connect — see the 2026-07-24 entry in
`docs/decisions/teacher-live.md`). Step 6 flipping auto-match back on for the
laptop means the stale full-replace bug survived on real hardware — the exact
regression feature 14 closed.

**Coverage in the meantime:** the same two-tab sequence passed headless
against production on 2026-07-24 (feature 14's pass record;
`tools/verify/scratch/f14-settings-wake.mjs`, 14/15 with the one FAIL being a
deliberately over-strict determinism check on the separately documented
offline-edit corner). What headless can't imitate is a real radio dropping
and re-associating, which is why this entry exists.

_Older batch cleared. The last set — five real-handset tests accumulated across
features 3–9 — ran in one sitting on 2026-07-23 and every entry was deleted:
outcomes live in the feature-3, feature-4, feature-5, and feature-8 plans'
pass records, and the one bug found (the survivor of a student's leave
blamed the teacher) in DECISIONS.md → chat-behavior, fixed the same day._
