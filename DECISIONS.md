# Product & UX Decisions

A running log of **product, UX, and business decisions** for Chaverola — the choices
behind how the app behaves and _why_. It exists so contributors (people and AI agents)
don't undo intentional behavior that looks like a bug or an oversight.

**Add an entry** whenever a decision is made about how the product should behave,
especially when the reasoning isn't obvious from the code. Record the _decision and its
reasoning_, newest first. Keep implementation detail in the code and docs; keep the _why_
here.

---

## The hero demo goes quiet after two Armstrong lines

**Decision:** After the Moon's "you could've knocked first 😤", Neil Armstrong
sends exactly **two one-sentence lines** and then the demo stops talking until
the visitor types: the hero scenario's `ambientLines` pool is empty, and the
demo engine skips ambient scheduling entirely when the pool is empty. The
founder's caps: at most 4 Armstrong sentences after that line in the student
view, at most 2 in the teacher card. The teacher card mirrors the same live
feed and always shows its newest lines, so it can never show _less_ of
Armstrong's tail than the hero does — the tighter cap therefore governs the
shared script.

**Why:** Founder feedback (2026-07-12): Armstrong "keeps talking and talking"
— the endless ambient banter pushed the Moon's zinger out of view in both
previews, and visitors forgot the Moon (the seat they're invited to play) had
said anything. The quiet after the script also works as an invitation: "so
maybe act natural" hangs there waiting for the visitor to answer.

_Implemented in [heroChatDemo.ts](client/src/mockData/heroChatDemo.ts); the
empty-pool guard is in
[useChatDemo.ts](client/src/components/Student/Chatbox/useChatDemo.ts)._

---

## Demo students have short names, and the teacher is never one of them

**Decision:** The hero chat's students are **"Dana K"** (the Moon) and
**"Sam A"** (Neil Armstrong) — short first name plus last initial. The Moon's
`realName` used to be "You", which made the homepage teacher card read "You
as the Moon". That's wrong: the teacher assigns chats to classmates and never
plays a character. The page now frames the visitor as borrowing Dana K's seat
("say something as the Moon up top… the message shows up with her name on
it").

**Why:** Founder corrections (2026-07-12): "the teacher is not the moon", and
"Sam Alvarez" should be the shorter "Sam A". Short names also keep the card
header comfortable at phone widths.

_Implemented in [heroChatDemo.ts](client/src/mockData/heroChatDemo.ts) and
the copy in
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx)._

---

## Solid grape is reserved for Join; both Host buttons are outline

**Decision:** The how-it-works section's "Host an Activity" CTA uses the same
outline style as the hero's Host button (grape graduation cap on white), not
the solid grape fill. Solid grape belongs to the student "Join an Activity"
button only.

**Why:** Founder call (2026-07-12): the two Host buttons should be the same
color. Keeping solid grape unique to Join also preserves the page's visual
hierarchy — students told to "tap Join" look for the one filled purple button.

_Implemented in
[HowItWorksSection](client/src/components/home/HowItWorksSection.tsx)._

---

## The teacher section stays light, and never points at "this card"

**Decision:** The teacher-view pitch is one two-sentence paragraph plus three
bullets (names are secret, one live card per chat, transcripts by email). The
assessment bullet ("the chats double as a quick check for understanding…")
was cut the same day it was added — right idea, but too much to parse in a
skim. And the paragraph must not refer to "this card" or use similar spatial
pointing: on phones the card renders well below the text, so readers don't
know what "this" is. The caption sitting directly above the card ("This is
the teacher side, live. Same chat, now with names.") does the pointing
instead.

**Why:** Founder feedback (2026-07-12): people won't realize what "this card"
refers to, especially on mobile, and the left column felt "too dense, too
much words" — the assessment sentence in particular took "too much energy to
understand."

_Implemented in
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx)._

---

## The teacher pitch sells in-character talk, not a guessing game

**Decision:** The teacher-view bullet claiming students "keep guessing until
you reveal the pairs" is gone. Students are supposed to talk **in character**
about the lesson; guessing identities is not the activity. The replacement
bullet pitched assessment (know the material to stay in character) but was
cut for density the same day — see "The teacher section stays light" above;
the no-guessing rule stands regardless. Relatedly, how-it-works step 1 no
longer says "Tell Chaverola what your class is studying" — teachers create
the activity and pick the characters themselves; nothing ingests a topic
description.

**Why:** Founder corrections (2026-07-12). "Guessing" misstates the product
and nudges students toward playing detective instead of playing their part.
"Tell Chaverola" implied the app consumes a topic and does something with it,
which it doesn't — and that framing edges toward the AI vibe this page
deliberately avoids (see "The hero looks hand-made and never mentions AI").

_Implemented in
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx) and
[HowItWorksSection](client/src/components/home/HowItWorksSection.tsx)._

---

## Hero CTAs sit right under the pitch at every width

**Decision:** The hero pitch column reads pitch paragraph → CTA buttons →
"Setup takes about a minute" list at **every** breakpoint. Desktop previously
put the list between the pitch and the buttons; the founder unified the order,
so the `order` utilities are gone (this supersedes "Hero CTAs sit above the
fold on phones" below — the mobile outcome is unchanged). The helper line
under the buttons ("Your students tap Join. You do the hosting.") was removed
at all widths.

**Why:** Founder call (2026-07-12): the buttons belong right after the pitch
everywhere, and the helper line was extra chrome the button labels already
cover.

_Implemented in [HomePage](client/src/pages/HomePage.tsx)._

---

## The teacher preview mirrors the hero chat live

**Decision:** The homepage's "teacher's view" section renders the real teacher
monitoring card (`ChatCard`) fed by the **same `useChatDemo` instance** as the
hero chatbox — one shared conversation shown from two seats. Type as the Moon
in the hero and the message appears in the teacher card with the sender's name
prefixed. The homepage card gets no `onEndChat`, and `ChatCard` hides its End
chat button whenever that handler is absent.

**Why:** The strongest proof of "only the teacher sees who's who" is watching
your own anonymous message show up further down the page with a name attached.
A single source of truth also means the student and teacher previews can never
drift out of sync — same reasoning as "The hero chatbox is the product running
live" below. The End chat button is hidden because a landing page shouldn't
offer a destructive-looking control that kicks no one out of anything.

_Implemented in [HomePage](client/src/pages/HomePage.tsx) (owns the chat),
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx),
[HeroChatbox](client/src/components/home/HeroChatbox.tsx) (chat is now a prop),
and [ChatCard](client/src/components/Teacher/ChatCard/index.tsx)._

---

## No testimonials on the homepage

**Decision:** The homepage has no testimonials or social-proof section. The
flow is hero → teacher's view → how it works → founder's note → contact.

**Why:** Product-owner call. Pre-launch there are no real teacher quotes to
show, and invented praise would clash with the hand-made honesty the page is
built on (see "The hero looks hand-made and never mentions AI"). Revisit once
real teachers have run real activities and said real things.

_Implemented in [HomePage](client/src/pages/HomePage.tsx)._

---

## Founder photo loads from `/founder-moshe.jpg` with a marked placeholder fallback

**Decision:** The founder note's headshot loads from
`client/public/founder-moshe.jpg`. Until that file exists, a clearly marked
placeholder renders instead (dashed initials circle plus "photo coming soon").
The letter is the founder's story passed through the humanizer skill with his
explicit sign-off ("use your best judgement, i trust you") — the original
draft's rule-of-three lists and brochure phrasing were rewritten in his plain,
warm voice. Future edits should keep that voice; don't formalize it.

**Why:** The photo is delivered outside the repo, so the section loads it from
`public/`: dropping the file in makes it appear with no code change. The
marked fallback keeps the section honest in the meantime instead of shipping a
stock-looking avatar.

**Update (2026-07-12):** the real photo is in the repo at that path and now
renders on the page. The fallback stays as insurance if the file ever goes
missing.

_Implemented in [FounderNote](client/src/components/home/FounderNote.tsx)._

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
what you see. _(Superseded on 2026-07-12 by "Hero CTAs sit right under the
pitch at every width" above — the list now renders after the CTAs at every
breakpoint and the `order` utilities are gone.)_

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
