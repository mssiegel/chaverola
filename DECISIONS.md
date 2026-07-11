# Product & UX Decisions

A running log of **product, UX, and business decisions** for Chaverola — the choices
behind how the app behaves and _why_. It exists so contributors (people and AI agents)
don't undo intentional behavior that looks like a bug or an oversight.

**Add an entry** whenever a decision is made about how the product should behave,
especially when the reasoning isn't obvious from the code. Record the _decision and its
reasoning_, newest first. Keep implementation detail in the code and docs; keep the _why_
here.

---

## End of chat requires a tap to return to the lobby

**Decision:** When a student ends a chat, the app shows a "chat ended" screen and waits.
The student returns to the lobby only by tapping **Back to the lobby** — they are not sent
back automatically.

**Why:** Returning to the lobby will (in a later version) automatically place the student
in the teacher's queue to be pulled into the next activity. Making the student tap keeps
that a deliberate, opt-in action — they choose when they're ready for another round rather
than being thrown into the queue the instant a chat ends.

**Implication for later work:** "Back to the lobby" is the moment a student signals
availability. When the lobby/queue is wired up, hang the auto-enqueue behavior off this
action, not off the chat ending.

_Implemented in [ChatEndedSection](client/src/components/Student/Chatbox/ChatEndedSection.tsx)._

---

## Character-name colors

**Decision:** In the chatbox, each character's name is colored **by speaking order within
the room**, not randomly:

1. **The student's own character is always green** ("you").
2. The 2nd character is **golden**.
3. A 3rd character is **bluish**.
4. A 4th character is **purplish**.

The old **orange** name color was dropped — it read too close to the golden.

**Why:** A student should instantly recognize their own voice in the feed (always green),
and the fixed order keeps the other speakers easy to tell apart. Consistent, learnable
colors beat random-but-distinct ones.

**Note:** This makes color **viewer-relative** on the student side — "you" are green from
your own seat. A given character is therefore not guaranteed the same color across two
different students' screens; recognizability from each student's own perspective was
chosen over global consistency.

_Colors live in the `--char-*` tokens in [index.css](client/src/index.css) (with brighter
dark-mode variants); assignment is in
[characterColor.ts](client/src/lib/characterColor.ts). Pass the viewer's own character
first so it lands on green._
