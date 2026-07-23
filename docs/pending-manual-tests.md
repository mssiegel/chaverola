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

## 1. Confirm the offline-leave fix on a real handset

**Asked:** 2026-07-20. **Blocked:** no cellular service where the founder
was. **Blocked again** 2026-07-21 (the feature-4 Prompt 4 sweep — no phone at
hand this session).

**Needs:** a phone with a working cellular connection, and a laptop for the
teacher page plus one browser tab as the second student.

### Why it's worth doing

The bug this confirms was found by a real handset on 2026-07-20 and was the
worst one this project has had: a student who left a chat while their socket
was down stranded their partner in a dead room permanently. Every scripted
test had missed it, because a headless browser on a wired connection never
genuinely loses its connection.

The fix is verified — but through a _simulated_ offline, which is the same
kind of coverage that missed the bug in the first place. That's the gap.

### Steps

1. Make an activity at `chaverola.com/activity/create`. Join it from the
   laptop as one student, and from the phone (**wifi off, cellular on**) as
   another.
2. Pair them from the teacher page.
3. On the phone: **airplane mode on**.
4. **Wait a full minute.** This is the part that matters — the socket has to
   actually give up, not merely look offline. Under a minute you are not
   testing the thing that broke.
5. Tap **End** and confirm, still in airplane mode.
6. **Airplane mode off.**

### What should happen

The laptop student lands on the ended screen within a second or two of step
6, and the teacher's card moves to Completed.

Acceptable: they're freed within 120 seconds even if step 6 never happens —
that's the server's backstop, which needs nothing from the phone.

**Bug:** they're still sitting in the chat a few minutes later. That's the
original failure returning.

### What covers it in the meantime

- The server half was measured directly on production: a student who
  vanishes with no goodbye at all frees their partner at **120.2s**. That
  path needs no client cooperation, so it holds on any device.
- The client half — the part that makes it instant rather than 120s — was
  verified with a CDP-simulated offline (`f3p5-leave-offline-repro.mjs`,
  6/6).

So the residual risk is a **slower** path, not a stranded student: if the
client half is silently broken, the symptom is a partner freed in two
minutes instead of immediately. Worth confirming, not worth losing sleep
over.

Background: DECISIONS.md →
[A matched seat gets the same 2 minutes as any other](../DECISIONS.md), and
the pass record in
[the feature-3 plan](plans/feature-3-real-matching.md).

## 4. The peer-drop banner against a phone that really loses its radio

**Asked:** 2026-07-21 (feature 8, Prompt 1's "Done when"). **Blocked:** the
prompt ran in an autonomous session with no founder at hand to drive a
phone. Same setup as entry 1 — run all three remaining entries in one
sitting. (Entries 2 and 3 — messaging and typing on a real handset — ran
2026-07-23 and passed; the one bug found, the survivor of a student leave
seeing the teacher-ended copy, is recorded in DECISIONS.md → chat-behavior
and fixed.)

**Needs:** a phone on cellular (wifi off), a laptop tab as the second
student, and the teacher page open somewhere.

### Why it's worth doing

The banner exists precisely for devices that vanish without a goodbye, and
that path is untestable from a headless browser: every scripted drop closes
the socket cleanly, so detection is instant-to-fast. A locked phone sends no
close frame — detection is the ~45s ping cycle — and that's the version of
the story real classrooms will see.

### Steps

1. Make an activity, join from the phone and a laptop tab, pair them from
   the teacher page.
2. **Airplane mode on** (or lock the phone) — watch the laptop student.
3. Wait for the laptop's banner, then **airplane mode off** within the
   window — watch the laptop.
4. Once settled, put the phone in a pocket for two or three seconds of
   screen-off and back — watch the laptop.
5. Keep the teacher's host page in view throughout.

### What should happen

- Step 2: the laptop shows "«character» lost connection… ~1:56 to come
  back" — allow up to ~50s for it (ping-cycle detection plus the 4s gate),
  at the same moment the teacher's card tags the member. The countdown
  ticks once a second.
- Step 3: the banner flips to "«character» is back! 🎉" for ~2.5s, then
  clears; the phone lands back in the chat with the missed lines.
- Step 4: nothing shows on the laptop at all (a sub-4s blip is invisible).
- Throughout: the banner names the character, never the real name, and the
  teacher's own page shows no `chat:peer-connection` artifact (it has its
  own reconnecting tag).

**Bug:** a banner that never appears while the teacher's tag does; a
countdown frozen or wildly off ~1:56; a "back!" flash with no partner
actually back; any real name in the banner.

### What covers it in the meantime

- The full scripted pass ran twice on 2026-07-21 — locally (11/11) and
  against chaverola.com (11/11): gate timing, the ~1:56 seed, ticking
  (including through a pause), the return flash and clear, resume, the
  invisible quick refresh, and the character-name privacy pin. The prod
  drop took ~14s to surface (transport detection + the gate), so the
  slow-detection shape is partially exercised — but via a page navigation,
  which still closes the transport, not a dead radio.
- The server test pins the wire: the drop lands past the 4s gate with a
  plausible `secondsLeft`, the resume announces the return, and neither
  the affected seat nor the teacher room ever hears the event.

## 5. The self-timeout screen after a real radio outage

**Asked:** 2026-07-21 (feature 9's "Done when"). **Blocked:** the feature
ran in an autonomous session with no founder at hand to drive a phone.
Same setup as entries 1 and 4 — run all three remaining entries in one
sitting.

**Needs:** a phone on cellular (wifi off), a laptop tab as the second
student, and the teacher page open somewhere.

### Why it's worth doing

The 📶 "You lost connection" screen exists precisely for a phone that
went dark without a close frame and came back after the 2-minute grace
already reaped its seat. Every scripted drop closes the socket cleanly
and every scripted return rides a fresh context on broadband; the real
path is a radio that dies mid-chat and a reconnect (with the OLD token,
through socket.io's backoff, possibly on polling) minutes later. That
reconnect-with-stale-credentials leg is exactly where feature 3's buffer
bug hid.

### Steps

1. Make an activity, join from the phone and a laptop tab, pair them
   from the teacher page.
2. On the phone: **airplane mode on**, and leave it on for a **full
   three minutes** (the ~45s ping-cycle detection plus the 120s grace —
   under that you're testing the resume path, not the reap).
3. Watch the laptop student get the 🔌 "Your partner lost connection"
   wrap-up when the grace runs out.
4. **Airplane mode off**, then reopen the **same tab** on the phone (the
   session lives in the tab — a fully closed browser is a different,
   also-valid test: it should land on the join screen as a stranger).
5. Keep the teacher's host page in view throughout.

### What should happen

- The phone shows the 📶 "You lost connection" screen — "You couldn't
  get back in time, so this chat ended for you. It happens!" — with the
  whole conversation still readable above it, within a few seconds of
  the radio returning.
- The teacher's queue does NOT list the phone student while that screen
  is up; their "Back to the lobby" tap puts them in the waiting lobby
  and the queue row appears with a fresh wait clock.
- The laptop student's screen doesn't react to the return at all.

**Bug:** the phone silently landing back in the waiting lobby with no
explanation — that's the exact pre-feature behavior this shipped to
kill. Also a 📶 screen with no transcript, or any flash on the
partner's screen when the reaped student returns.

### What covers it in the meantime

- A local browser pass (2026-07-21, `f9-selftimeout-local.mjs`, 20/20
  with a shortened grace): the 1:1 story end to end — survivor's 🔌,
  the returner's 📶 with the transcript, hidden from the queue, a
  reload keeping the screen, the tap re-queueing — plus the trio leg
  (the chat survives its reaped member; their return is silent to the
  room).
- The server e2e pins the wire: the return replays exactly
  `lobby:welcome` → `chat:started` (old transcript, old characterIds)
  → `chat:ended {reason:"self-timeout"}` under a fresh identity, with
  the survivor's collectors silent throughout.

So the residual risk is the radio path itself: a dead-radio reconnect
presenting stale credentials through backoff, not the replay logic.
