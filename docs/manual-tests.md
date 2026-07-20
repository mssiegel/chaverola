# Manual tests — the ones a machine can't run

Everything in this file needs a human and a real device. That is the whole
point of it: there is a scripted production pass (see
[the verify skill](../.claude/skills/verify/SKILL.md)) that runs hundreds of
assertions in a headless browser, and it is genuinely thorough — and it has
now missed a serious bug twice, both times for the same structural reason.

**A headless browser on a wired connection never actually loses its
connection.** It can be told to pretend, but it never has a radio that
fades, a screen that locks, an OS that suspends the tab, or a user who taps
a button while the network is quietly gone. Both production bugs found so
far lived in exactly that gap:

- **2026-07-19** — `lobby:leave` died when the leave and close frames
  coalesced into one TCP read over real wifi. Invisible over loopback.
- **2026-07-20** — a student left a chat while their socket was down; the
  goodbye died in a send buffer and their partner was stranded in a dead
  room permanently.

So this is not a backup for the automated pass. It is the part of the
testing the automated pass structurally cannot do.

You do not need to run all of it. The three tests under
[If you only have five minutes](#if-you-only-have-five-minutes) are where the
bugs have actually been.

---

## Before you start

**Make an activity the normal way.** Go to
`chaverola.com/activity/create`, fill in a couple of characters and your
name, and tap "Host the Activity". The host page shows the join code. Use
three characters if you want to test trios.

**You need a second student for anything involving a chat.** A tab on your
laptop is fine — the phone is a separate device, which is the part that
matters. So: laptop with two tabs (teacher + a student), phone with one.

**Two practical gotchas.**

- Activities live in memory with a 12-hour TTL, but the free-tier server
  **spins down after about 15 minutes of inactivity and takes every activity
  with it**. If you set something up and come back an hour later, the code
  will be dead. Make the activity when you are ready to test.
- The first request of the day takes ~30 seconds while the server wakes.
  That is the "Chaverola is just waking up" copy, not a hang.

**When something fails, capture this before you touch anything:** what
screen the phone is on, what the teacher page shows, the join code, and
roughly what time it was. The server logs disconnect reasons
(`client namespace disconnect` = a deliberate close, `transport close` /
ping timeout = the connection died), and the timestamp is what makes them
findable.

---

## If you only have five minutes

1. [Leave a chat while offline](#1-leave-a-chat-while-offline) — found the
   2026-07-20 bug.
2. [Drop mid-chat and come back](#2-drop-mid-chat-and-come-back) — the
   resume path, the most common real event in a classroom.
3. [The demo in airplane mode](#14-the-whole-demo-in-airplane-mode) — ten
   seconds, and it protects the thing you show people.

---

## A. Losing the connection

This section has the worst track record, which makes it the best section.

### 1. Leave a chat while offline

_Found a real bug on 2026-07-20. Fixed; a confirming run has not been done._

1. Get paired into a chat on the phone.
2. Airplane mode **on**.
3. **Wait a full minute.** This matters — the socket has to actually give up,
   not merely look offline. Under a minute you are testing nothing.
4. Tap **End** and confirm, still in airplane mode.
5. Airplane mode **off**.

**Should happen:** your partner lands on the ended screen within a second or
two of step 5, and the teacher's card moves to Completed.

**Acceptable:** the partner is freed within 120 seconds even if step 5 never
happens. That is the server's backstop and it needs nothing from your phone.

**Bug:** the partner is still sitting in the chat a few minutes later. That
is the 2026-07-20 failure returning.

### 2. Drop mid-chat and come back

1. Get paired. Airplane mode on for ~30 seconds. Airplane mode off.

**Should happen:** you land back in the same chat with the same character.
The teacher's card tags you "lost connection" while you are away (allow up to
~50 seconds for that to appear — the server only notices a dark drop through
its ping cycle) and clears the tag when you return.

### 3. Stay away longer than the grace window

1. Get paired. Airplane mode on for **three minutes**. Airplane mode off.

**Should happen:** the chat ended without you. Your partner was freed at the
two-minute mark.

**Worth watching:** what _you_ see on return. Your seat was reaped, and its
nonce mapping went with it, so you are treated as a brand-new student. Nobody
has checked whether that transition reads honestly or just dumps you
somewhere confusing. If it looks wrong, it probably is.

### 4. Walk out of range

Airplane mode is a clean cut. Real signal loss is not — it degrades, retries,
and half-succeeds. Get paired, then walk somewhere with no service (a lift, a
basement, the room you were in earlier today), wait a minute, and walk back.

**Should happen:** same as test 2. The interesting failure is a phone that
thinks it is online while nothing gets through.

### 5. Wifi to cellular handoff

Get paired while on building wifi, then walk out of range so the phone hands
off to cellular. The IP address changes underneath a live socket. No
automated test does this, ever.

_Never tested by anyone._

### 6. The phone dies

Get paired, then force-quit the browser (or genuinely let the battery die).

**Should happen:** your partner is freed 120 seconds later. There is no
goodbye in this case and there never can be, so this is purely a test of the
server's backstop.

---

## B. The phone doing phone things

Mobile browsers suspend timers, discard tabs, and throttle background work.
None of that happens in headless Chrome.

### 7. Lock the screen

Get paired, lock the phone for five minutes, unlock.

**Should happen:** you are still in your chat. A locked screen may or may not
drop the socket depending on the phone; either way the return should be
seamless.

### 8. Switch apps and come back

Get paired, switch to another app for a few minutes, return to the browser.
Same expectation as test 7.

On iOS especially, the tab may have been **discarded** rather than
backgrounded, meaning a full reload. That should still land you in your chat.

### 9. Low power mode

Repeat test 7 with iOS Low Power Mode (or Android battery saver) on. It
throttles timers hard, which is exactly what the reconnect logic runs on.

_Never tested._

### 10. Pull to refresh, and the back button

Mid-chat: pull down to refresh. Then, separately, press the browser back
button.

**Should happen:** the refresh puts you straight back in your chat. The back
button is a deliberate exit — it should sign you out and end the chat for
your partner, same as tapping End.

_The back-button path has never been tested on a real handset._

---

## C. More than one real device

### 11. An actual small class

The most valuable test in this file and the least convenient: get three or
four real phones on real networks into one activity at the same time. Pair
them, use "Pair everyone 1:1", let auto-match run.

Everything else here tests one device in isolation. This is the only test
that resembles a classroom, and school wifi with thirty phones on one access
point is a genuinely different environment from your desk.

_Never tested with more than one real handset._

### 12. The same student twice

Open the same activity in two tabs on the phone, or on two devices with the
same join.

**Should happen:** the newer connection takes the seat and the older one is
dropped. You should never end up as two students.

### 13. Teacher on a phone

Run the host page from the phone while a student is on the laptop. The
pairing rail collapses into a section on narrow screens rather than the
desktop sidebar.

Then try two teacher devices at once and change a setting on one — the other
should follow within a second or two.

---

## D. The demo must never need the network

### 14. The whole demo in airplane mode

Airplane mode on, then visit `chaverola.com/demo/student` and
`chaverola.com/demo/teacher`.

**Should happen:** everything works. The demo is entirely client-simulated
and makes zero network calls by design — scripted chats, the seeded
classroom, auto-pairing, all of it.

**Bug:** anything that hangs, errors, or shows a loading state. The demo is
what you show people, sometimes on conference wifi.

Note that the demo's timers run at real speed in production: the lobby
auto-pairs after a real 20 seconds. The `?fast` trick only works in local
development.

---

## E. Awkward input

Quick to run, and the sort of thing that breaks in front of an audience.

### 15. Names

Join with an emoji name, a Hebrew (right-to-left) name, a very long name, a
name with leading and trailing spaces, and two students with the _same_ name.
Check the teacher's queue rows, the chat cards, and the remove confirmation
dialog — the dialog quotes the name back.

### 16. Rotation

Rotate the phone mid-chat and mid-lobby.

---

## When messaging ships

Messaging is the next feature, and it turns several placeholders real. Once
it lands, this file needs new tests for the parts that only a real phone
exercises: typing with the on-screen keyboard up, sending while the
connection is dropping, messages arriving while the app is backgrounded, and
the mid-chat reconnect window becoming a real clock the student can see.

Until then the rooms are silent by design, the composer is deliberately
disabled, and "End chat" / "End all chats" / "Pause all chats" are honest
placeholders — not bugs.
