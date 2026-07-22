# Homepage & hero

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The highlighter mark appears once on the homepage, under "In character"

_2026-07-16_

**Decision:** `HighlightMark` (the yellow highlighter sweep) is used exactly
once on the homepage: the hero's "In character." The section headings that
briefly had their own marks ("who's who", "live class") are plain text.
Future homepage sections don't get one either — one mark, hero only.

**Why:** Product-owner feedback (2026-07-16): a yellow highlight on every
section heading is "so obviously AI generated" — repetition turns a hand-made
touch into a template tell. Used once, the mark reads like someone ran a real
highlighter over the one phrase that matters. This extends
[The hero looks hand-made and never mentions AI](#the-hero-looks-hand-made-and-never-mentions-ai).

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx) (the keeper);
removed from
[TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx) and
[DemoSection](../../client/src/components/home/DemoSection.tsx)._

### The homepage has a "see it in action" section with doorways into both demos

_2026-07-16_

**Decision:** Between the teacher-view section and how-it-works sits a demo
section — eyebrow "See it in action", heading "Poke around a live class." —
with two plain text-and-button blocks: "Open the teacher demo"
(→ `/activity/host/1234`) and "Try the student side" (→ `/activity/join`).
Secondary buttons on purpose, so the hero's reserved styles stay unique
([Solid grape is reserved for Join](#solid-grape-is-reserved-for-join-both-host-buttons-are-outline)).
The hero's own CTA pair is untouched.

**Why:** Founder call (2026-07-16), choosing a dedicated section over a
third hero CTA (crowds the two real conversion buttons) and over quiet text
links (too easy to miss). Teachers should reach a full running classroom in
one click, and the founder opens the same doorways in live pitches. It sits
right after the teacher-view section because that section shows one mirrored
chat — the natural next thought is "show me the whole room."

_Implemented in [DemoSection.tsx](../../client/src/components/home/DemoSection.tsx)._

### On phones the live chat comes before the setup steps

_2026-07-15_

**Decision:** The hero section is three grid items — pitch + CTAs, the live
chat block (caption, chatbox, sticky note), and the "Setup takes about a
minute" steps — so phones read pitch → CTAs → live chat → setup steps, while
desktop looks exactly as before (the chat spans both rows of the right
column; pitch and steps stack in the left one). This does not touch
[Hero CTAs sit right under the pitch at every width](#hero-ctas-sit-right-under-the-pitch-at-every-width):
the buttons still sit directly under the pitch everywhere — only the steps
moved below the chat on phones.

**Why:** Founder call (2026-07-15, picking from a proposed improvement list).
The live chatbox is the single most convincing thing on the page, and on a
phone it sat below the pitch, both buttons, and the steps — a full scroll
before the proof. Now the chat header lands near the first fold.

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx)._

### The how-it-works footer answers cost, accounts, and devices

_2026-07-15_

**Decision:** The microcopy under the how-it-works Host CTA is a one-row
facts list: "Free to use · No student accounts · Works on anything with a
browser" (stacked without the dots on phones). It replaces "There's nothing
to print and nothing to install." The claims are founder-approved facts —
free for teachers, students enter a code and a name with no accounts or
emails, any device with a browser. Don't add pricing tiers or soften "free"
without a new founder call.

**Why:** Founder call (2026-07-15). Cost, student accounts, and devices are
the first practical questions teachers check before trying a classroom tool,
and the page answered none of them. One compact row removes that hesitation
without adding a section (a longer FAQ was considered and rejected — the page
should stay short).

_Implemented in
[HowItWorksSection](../../client/src/components/home/HowItWorksSection.tsx)._

### The teacher bullets say the safety part out loud

_2026-07-15_

**Decision:** The first teacher-view bullet states the reassurance plainly:
students only see each other's characters, nobody is anonymous to the
teacher, and anyone who gets out of line is identifiable. It replaced "Only
you see the names. Students talk to each other in character until you reveal
who was who." — the reveal is still covered by the hero paragraph and
how-it-works step 4.

**Why:** Founder call (2026-07-15). A middle/high school teacher's first
worry about anonymous chat is misbehavior. The page showed the answer (real
names on every message, live) but never said it as a safety fact, so the
bullet now carries it. Keeps the section at three bullets per
[The teacher section stays light](#the-teacher-section-stays-light-and-never-points-at-this-card).

_Implemented in
[TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx)._

### The homepage has no footer, and the demo-links line is gone

_2026-07-15_

**Decision:** The page ends with the founder's note. The temporary "Poking
around? Peek at the…" demo-links line was removed, and no footer replaces it.
The `/demo/*` routes still exist and are reachable by URL (they're listed in
the README).

**Why:** Founder call (2026-07-15): remove the bare demo-links line, and
"don't add a footer at all." A footer was proposed for credibility and
declined — the founder's note with the contact email already closes the page.

_Note (2026-07-16): the footer part stands. The demo-links part is revisited
by [The homepage has a "see it in action" section with doorways into both demos](#the-homepage-has-a-see-it-in-action-section-with-doorways-into-both-demos)
— a designed section the founder chose, not the bare links line this entry
removed._

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx)._

### The teacher preview mirrors the hero chat live

_2026-07-13_

**Decision:** The homepage's "teacher's view" section renders the real teacher
monitoring card (`ChatCard`) fed by the **same `useChatDemo` instance** as the
hero chatbox — one shared conversation shown from two seats. Type as the Moon
in the hero and the message appears in the teacher card with the sender's name
prefixed. The homepage card gets no `onEndChat`, and `ChatCard` hides its End
chat button whenever that handler is absent.

**Why:** The strongest proof of "only the teacher sees who's who" is watching
your own anonymous message show up further down the page with a name attached.
A single source of truth also means the student and teacher previews can never
drift out of sync — same reasoning as
[The hero chatbox is the product running live](#the-hero-chatbox-is-the-product-running-live-not-a-mockup).
The End chat button is hidden because a landing page shouldn't offer a
destructive-looking control that kicks no one out of anything.

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx) (owns the chat),
[TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx),
[HeroChatbox](../../client/src/components/home/HeroChatbox.tsx) (chat is now a prop),
and [ChatCard](../../client/src/components/Teacher/ChatCard/index.tsx)._

### No testimonials on the homepage

_2026-07-13_

**Decision:** The homepage has no testimonials or social-proof section. The
flow is hero → teacher's view → how it works → founder's note → contact.

**Why:** Product-owner call. Pre-launch there are no real teacher quotes to
show, and invented praise would clash with the hand-made honesty the page is
built on (see
[The hero looks hand-made and never mentions AI](#the-hero-looks-hand-made-and-never-mentions-ai)).
Revisit once real teachers have run real activities and said real things.

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx)._

### The hero demo goes quiet after two Armstrong lines

_2026-07-12_

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

_Implemented in [heroChatDemo.ts](../../client/src/mockData/heroChatDemo.ts); the
empty-pool guard is in
[useChatDemo.ts](../../client/src/components/chat/useChatDemo.ts)._

### Demo students have short names, and the teacher is never one of them

_2026-07-12_

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

_Implemented in [heroChatDemo.ts](../../client/src/mockData/heroChatDemo.ts) and
the copy in
[TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx)._

### Solid grape is reserved for Join; both Host buttons are outline

_2026-07-12_

**Decision:** The how-it-works section's "Host an Activity" CTA uses the same
outline style as the hero's Host button (grape graduation cap on white), not
the solid grape fill. Solid grape belongs to the student "Join an Activity"
button only.

**Why:** Founder call (2026-07-12): the two Host buttons should be the same
color. Keeping solid grape unique to Join also preserves the page's visual
hierarchy — students told to "tap Join" look for the one filled purple button.

_Implemented in
[HowItWorksSection](../../client/src/components/home/HowItWorksSection.tsx)._

### The teacher section stays light, and never points at "this card"

_2026-07-12_

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
[TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx)._

### The teacher pitch sells in-character talk, not a guessing game

_2026-07-12_

**Decision:** The teacher-view bullet claiming students "keep guessing until
you reveal the pairs" is gone. Students are supposed to talk **in character**
about the lesson; guessing identities is not the activity. The replacement
bullet pitched assessment (know the material to stay in character) but was
cut for density the same day — see
[The teacher section stays light](#the-teacher-section-stays-light-and-never-points-at-this-card);
the no-guessing rule stands regardless. Relatedly, how-it-works step 1 no
longer says "Tell Chaverola what your class is studying" — teachers create
the activity and pick the characters themselves; nothing ingests a topic
description.

**Why:** Founder corrections (2026-07-12). "Guessing" misstates the product
and nudges students toward playing detective instead of playing their part.
"Tell Chaverola" implied the app consumes a topic and does something with it,
which it doesn't — and that framing edges toward the AI vibe this page
deliberately avoids (see
[The hero looks hand-made and never mentions AI](#the-hero-looks-hand-made-and-never-mentions-ai)).

_Implemented in
[TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx) and
[HowItWorksSection](../../client/src/components/home/HowItWorksSection.tsx)._

### Hero CTAs sit right under the pitch at every width

_2026-07-12_

**Decision:** The hero pitch column reads pitch paragraph → CTA buttons →
"Setup takes about a minute" list at **every** breakpoint. Desktop previously
put the list between the pitch and the buttons; the founder unified the order,
so the `order` utilities are gone (this supersedes
[Hero CTAs sit above the fold on phones](#hero-ctas-sit-above-the-fold-on-phones)
— the mobile outcome is unchanged). The helper line under the buttons ("Your
students tap Join. You do the hosting.") was removed at all widths.

**Why:** Founder call (2026-07-12): the buttons belong right after the pitch
everywhere, and the helper line was extra chrome the button labels already
cover.

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx)._

### Founder photo loads from `/founder-moshe.jpg` with a marked placeholder fallback

_2026-07-12_

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

_Implemented in [FounderNote](../../client/src/components/home/FounderNote.tsx)._

### The hero looks hand-made and never mentions AI

_2026-07-12_

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

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx) and
[HeroChatbox](../../client/src/components/home/HeroChatbox.tsx)._

### The hero chatbox is the product running live, not a mockup

_2026-07-12_

**Decision:** The homepage hero's sample chat is the real student chatbox
(conversation feed + composer) driven by the same demo engine as
`/demo/student-chat`, playing a scripted scene (you're the Moon 🌕, chatting
with Neil Armstrong 🚀). Visitors can type and get in-character replies. It
deliberately omits the End chat controls — they'd be noise on a landing page.

**Why:** A teacher deciding in seconds needs proof, not promises: a chat that
moves (typing indicator, replies) sells "students will love this" better than
a screenshot. Reusing the real components also means the sample can never
drift out of sync with the actual product.

_Implemented in [HeroChatbox](../../client/src/components/home/HeroChatbox.tsx) with
its scenario in [heroChatDemo.ts](../../client/src/mockData/heroChatDemo.ts)._

## Superseded

Replaced decisions, kept for history. Don't apply these; each date line links
to what replaced it.

### Hero CTAs sit above the fold on phones

_2026-07-12 · Superseded by
[Hero CTAs sit right under the pitch at every width](#hero-ctas-sit-right-under-the-pitch-at-every-width)_

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

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx)._
