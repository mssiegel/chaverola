# Product & UX Decisions

A running log of **product, UX, and business decisions** for Chaverola — the choices
behind how the app behaves and _why_. It exists so contributors (people and AI agents)
don't undo intentional behavior that looks like a bug or an oversight.

**Add an entry** whenever a decision is made about how the product should behave,
especially when the reasoning isn't obvious from the code. Record the _decision and its
reasoning_, newest first. Keep implementation detail in the code and docs; keep the _why_
here.

---

## Ending a chat ends it for everyone in the room

**Decision:** When a student ends a chat, it ends for **every participant in that chat**,
not just the student who tapped End chat — same as when the teacher ends it. The
confirmation copy on both seats says so explicitly.

**Why:** The roleplay needs its partners: once one student leaves, the others would be
sitting in a dead chat with no one to answer. Ending it room-wide moves everyone to the
wrap-up screen at the same moment, so each student can head back to the lobby (and later,
the rematch queue) instead of waiting on a conversation that's already over. This is also
why ending goes through a confirmation step on both seats — the tap affects other people.

_Copy lives in the `description` props passed to
[EndChatConfirmationModal](client/src/components/chat/EndChatConfirmationModal.tsx) by
[the student chatbox](client/src/components/Student/Chatbox/index.tsx) and
[the teacher chat card](client/src/components/Teacher/ChatCard/index.tsx)._

---

## Teacher chat cards: collapsed to the last 5 lines, End chat asks first

**Decision:** On the teacher's monitoring view, each chat renders as a card that is
**collapsed by default**, showing only the last 5 lines. One button toggles between
expanding to the full chat and minimizing back. **End chat** goes through the same
confirmation step the student side uses (with teacher-appropriate copy), even though the
brief only asked for a button — the product owner has since confirmed the confirmation
step should stay. Completed chats reuse the exact same card in a muted,
slightly desaturated look, keep expand/minimize, and lose the End chat button.

**Why:** A teacher watches many chats at once — the newest lines are what matter while
monitoring, and short cards keep the grid scannable. Ending a chat kicks real students
out of their conversation and can't be undone, so one stray tap on a busy grid shouldn't
do it. Completed chats stay on the grid (muted rather than removed) so the teacher can
still review what was said.

_Implemented in [ChatCard](client/src/components/Teacher/ChatCard/index.tsx)._

---

## Teacher view: character colors follow participant order

**Decision:** Teacher chat cards color character names from the same `--char-*` palette
as the student chatbox, assigned by **participant order within each chat** (first student
listed is green, the 2nd golden, and so on). There is no "green = you" rule here because
the teacher isn't a participant.

**Why:** Reuses the learnable palette without inventing a second system. Colors are
per-card: the same character can get a different color on two cards, which is fine — the
teacher reads one card at a time, and per-card distinctness beats global consistency
(the same trade-off as the viewer-relative student rule below).

_Assignment happens in [ChatCard](client/src/components/Teacher/ChatCard/index.tsx) via
[characterColor.ts](client/src/lib/characterColor.ts)._

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
