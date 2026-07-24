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

## The emoji dock swap on a real phone (feature 21, asked 2026-07-24)

**Why it can't be scripted:** headless Chrome has no software keyboard, so the
one promise the feature exists to keep — the composer does not move when the
keyboard is swapped for the emoji panel — has no on-broadband proof. The local
driver (`tools/verify/scratch/emoji-dock.mjs`) confirms everything the swap is
_built_ from (the dock is in-flow, the chrome stays collapsed across the blur,
focus never leaves the field, inserts land, every dismissal path works), but in
headless the composer rides up by the dock's height because there was never a
keyboard down there to replace.

**Android Chrome, on a full-screen student chat:**

1. Join the demo (`chaverola.com/activity/join/1234`), sign in, get matched
   into a chat.
2. Tap the message field so the keyboard is up, then tap the 🙂 button.
   - **Expect:** the emoji grid appears where the keyboard was and the composer
     row does **not** jump — no visible lurch up or down. The top corner chrome
     (name badge, language pill) stays hidden throughout.
   - **If it jumps:** the constant dock height (`clamp(240px, 42dvh, 336px)`)
     is off for that handset's keyboard, and it's time to build the
     `visualViewport`-tracking follow-up named in the feature-21 plan.
3. Tap several emoji in a row.
   - **Expect:** no flicker, the keyboard stays gone, each emoji lands at the
     caret.
4. Tap the ⌨ button.
   - **Expect:** the keyboard returns and the composer again doesn't jump.
5. Send a message with the panel open.
   - **Expect:** the panel stays open (WhatsApp behavior).

**iPhone Safari, same steps.** WebKit ignores `interactive-widget`, so the card
never shrank for the keyboard and Safari pans the page instead. The swap is
expected to show a small settle here rather than a pixel-frozen composer —
confirm it's a _settle_, not a lurch, and that the panel and keyboard toggle
both work. A visibly bad settle is the trigger for the same follow-up.

**Coverage in the meantime:** the two scratch drivers above, run at phone and
desktop widths against `verify:up --scale 10`.

---

_Older batch cleared. The last set — five real-handset tests accumulated across
features 3–9 — ran in one sitting on 2026-07-23 and every entry was deleted:
outcomes live in the feature-3, feature-4, feature-5, and feature-8 plans'
pass records, and the one bug found (the survivor of a student's leave
blamed the teacher) in DECISIONS.md → chat-behavior, fixed the same day._
