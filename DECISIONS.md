# Product & UX Decisions

A running log of **product, UX, and business decisions** for Chaverola — the choices
behind how the app behaves and _why_. It exists so contributors (people and AI agents)
don't undo intentional behavior that looks like a bug or an oversight.

**Add an entry** whenever a decision is made about how the product should behave,
especially when the reasoning isn't obvious from the code. Record the _decision and its
reasoning_, newest first. Keep implementation detail in the code and docs; keep the _why_
here.

---

## Mobile navbar swaps the wordmark for "Join Activity" on scroll

**Decision:** On phones, the homepage navbar shows no Join button while the
hero's own "Join an Activity" CTA is on screen — just the logo, wordmark, and
language switcher. Once the visitor scrolls the hero CTA up under the navbar,
the wordmark slides away and a "Join Activity" button slides in on the right
(and the swap reverses when they scroll back up). Animated with width +
opacity + slide transitions, disabled under reduced motion. Pages without a
hero keep a static short "Join" button, and from `sm` up the bar is static
with the full "Join an Activity" label.

**Why:** Product-owner call. At the top of the homepage the hero's big Join
button is right there — a second one in the navbar is duplicate chrome on a
tight bar. Once it scrolls away, the navbar takes over as the always-visible
way in, and hiding the wordmark buys the space (the logo mark still brands
the bar). The trigger is the CTA passing under the sticky navbar, not the
viewport top, because that's when it visually disappears.

_Implemented in [AppLayout](client/src/components/layout/AppLayout.tsx) via
[useHeroCtaPassed](client/src/lib/useHeroCtaPassed.ts), watching the id on
the hero CTA in [HomePage](client/src/pages/HomePage.tsx)._

---

## Hero CTAs sit above the fold on phones

**Decision:** On mobile, the hero's CTA row (Join an Activity / Host an
Activity) renders **above** the "Setup takes about a minute" list, and the
hero's top padding is tighter, so both buttons are visible without scrolling
even on short phones. On `lg` and up the list keeps its natural spot between
the pitch and the CTAs. The swap is a flex `order` utility, which is safe
here because the list contains nothing focusable — tab order still matches
what you see.

**Why:** Product-owner call: the buttons are the point of the page, and on
phones they were landing below the fold. A student told to "tap Join" should
never have to scroll to find it. Desktop has the room, and there the
pitch → how-it-works → act reading order is worth keeping.

_Implemented in [HomePage](client/src/pages/HomePage.tsx)._

---

## The hero looks hand-made and never mentions AI

**Decision:** The hero's pitch column uses deliberately plain, school-flavored
styling: a solid-color headline with a highlighter mark under "In character",
a plain numbered how-it-works list, and no gradient text, glow blobs, badge
pills, or sparkle icons. The copy states the human fact **positively** —
"behind every character is a real classmate", the chatbox header adds "played
by a classmate", the kicker names it "A classroom activity for teachers" —
and the word "AI" appears nowhere. An earlier draft said "not an AI"
explicitly; the product owner cut it.

**Why:** Product-owner feedback, twice. First: a version with gradient-clip
headline, blur blobs, emoji badge, and arrow chips "looked like it was
generated with AI" — the standard template kit undercuts a product whose
whole point is classmates talking to each other, so the design reads
hand-made instead. Second: don't mention AI at all, even to deny it — naming
it plants the comparison and reads defensive; "a real classmate" carries the
fact on its own. Don't reintroduce template styling or AI mentions here.

_Implemented in [HomePage](client/src/pages/HomePage.tsx) and
[HeroChatbox](client/src/components/home/HeroChatbox.tsx)._

---

## The navbar has one CTA: Join an Activity

**Decision:** Only the student "Join an Activity" button lives in the navbar.
"Host an Activity" was removed from it — teachers start from the hero's
secondary CTA instead. The freed space lets the wordmark show at all widths.

**Why:** Students arrive being told "go to the site and tap Join", so that
action must be the single unmissable button on every page. Two navbar CTAs
competed for that tap and crowded the bar at phone widths.

_Implemented in [AppLayout](client/src/components/layout/AppLayout.tsx)._

---

## The hero chatbox is the product running live, not a mockup

**Decision:** The homepage hero's sample chat is the real student chatbox
(conversation feed + composer) driven by the same demo engine as
`/demo/student-chat`, playing a scripted scene (you're the Moon 🌕, chatting
with Neil Armstrong 🚀). Visitors can type and get in-character replies. It
deliberately omits the End chat controls — they'd be noise on a landing page.

**Why:** A teacher deciding in seconds needs proof, not promises: a chat that
moves (typing indicator, replies) sells "students will love this" better than
a screenshot. Reusing the real components also means the sample can never
drift out of sync with the actual product.

_Implemented in [HeroChatbox](client/src/components/home/HeroChatbox.tsx) with
its scenario in [heroChatDemo.ts](client/src/mockData/heroChatDemo.ts)._

---

## Navbar: CTA label shortens on phones; language switcher swaps in place

**Decision:** Below the `sm` breakpoint the navbar CTA renders as "Join"
(full "Join an Activity" from `sm` up). The language dropdown's trigger shows
the **active** locale's initials (EN or עב), and picking a language rewrites
the current URL in place (same page, query/hash kept) rather than jumping
home. (Superseded in part by "The navbar has one CTA" above — Host is gone
from the bar and the wordmark now shows at all widths.)

**Why:** The full label plus wordmark and language switcher is a squeeze on a
375px-wide bar; shortening keeps the button roomy and tappable. Switching
language mid-flow shouldn't lose your place, and showing the active locale
tells you at a glance which mode you're in.

_Implemented in [AppLayout](client/src/components/layout/AppLayout.tsx) and
[LanguageSwitcher](client/src/components/layout/LanguageSwitcher.tsx)._

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
