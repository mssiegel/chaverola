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
was.

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

## 2. Messaging's production pass on a real handset

**Asked:** 2026-07-20 (feature 4, Prompt 2's "Done when"); extended
2026-07-21 with Prompt 3's teacher-side checks — same setup, so run both
in one sitting. **Blocked:** both prompts ran in autonomous sessions with
no founder at hand to drive a phone.

**Needs:** a phone on cellular (wifi off), a laptop for the teacher page,
and one browser tab as the second student.

### Why it's worth doing

Messaging is the first feature where a student's screen shows content that
only exists on the wire — and the resume backlog (`chat:started.lines`) is
the only channel that heals a phone that blinked. Every scripted leg passed
(see below), but the standing lesson from feature 3 applies with more force
now: headless Chrome on broadband never actually loses its connection, so
it cannot test what a phone does through a lock screen or a lift.

### Steps

1. Make an activity, join it from the phone and from a laptop tab, pair
   them from the teacher page.
2. Chat both directions. Send an emoji-heavy message from the phone.
3. **Lock the phone for ~60 seconds** while the laptop student sends three
   more lines. Unlock.
4. Refresh the phone's tab mid-chat too.
5. On the phone, paste-and-send a message over 75 characters, then send
   ~14 messages as fast as possible.
6. Have the laptop student leave the chat (browser back → confirm).

### What should happen

- Both directions arrive within a beat; the emoji message lands whole.
- After the unlock AND after the refresh, the three missed lines are all
  there, in order — that's the backlog doing its job. (The unlock may take
  up to ~45s to reconnect — that's ping-cycle detection, not a bug.)
- The over-75 message silently doesn't send (the composer already blocks
  typing past 75 — pasting is the interesting path); of the fast burst,
  exactly 10 land and the rest silently don't. No error UI anywhere —
  silent no-ops are the socket contract.
- The leave puts the phone on the ended screen (duo) with the transcript
  still readable above it.

While the steps run, keep the host page in view (Prompt 3's teacher-side
leg, added 2026-07-21):

- Every message from the phone appears on the chat card within a beat,
  prefixed with the sender's real name — the burst included (exactly the
  10 that landed for the peer, no more).
- Refresh the host page mid-chat: the card comes back with the whole
  transcript, names intact.
- After the leave ends the duo, the card moves to Completed with the
  transcript still readable.

**Bug:** missed lines that never appear after an unlock — that's the
resume-backlog channel failing, the exact class of bug this prompt's plan
warned about. On the teacher side: a card whose lines lag or vanish where
the students' own screens have them.

### What covers it in the meantime

- A scripted production pass ran on 2026-07-20 right after the deploy:
  raw-socket fan-out/cap/rate-limit checks and a browser leg (messages
  both directions, mid-chat refresh with the backlog intact, a peer
  leaving mid-conversation) — all against chaverola.com.
- The teacher-side leg got its own scripted production pass on 2026-07-21
  (13/13, `f4p3-prod-browser.mjs`): lines landing live with names, a
  second host device staying coherent, a teacher refresh restoring the
  transcript, both empty states, and an ended card keeping its transcript.
  What it can't cover is the same radio-path gap as above.
- Locally: 16/16 socket-script checks, 15/15 browser checks, and the
  server suite pins the cap's code-point unit and `appendLine`'s rules.

So the residual risk is specifically the real-radio path: a socket that
died without a close frame resuming with the backlog intact.
