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

_Older batch cleared. The last set — five real-handset tests accumulated across
features 3–9 — ran in one sitting on 2026-07-23 and every entry was deleted:
outcomes live in the feature-3, feature-4, feature-5, and feature-8 plans'
pass records, and the one bug found (the survivor of a student's leave
blamed the teacher) in DECISIONS.md → chat-behavior, fixed the same day._
