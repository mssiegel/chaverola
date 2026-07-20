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
