# Homepage & hero

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The teacher preview shows disabled management controls

_2026-10-09_

**Decision:** The homepage teacher chat preview shows a disabled End chat
button beside Full chat and disabled X controls beside active participants.
Full chat remains interactive. This applies in English and Hebrew; activity
dashboards retain their working controls.

**Why:** Product-owner request to show that teachers can end chats and remove
students, without unexpectedly changing the homepage's sample conversation.
The controls use their usual positions, with muted disabled styling.

### Chat previews have short captions below the boxes

_2026-10-09_

**Decision:** Both homepage chat boxes have centered, regular-weight, muted
captions below them: "Student chat preview" and "Teacher chat preview", with
equivalent Hebrew wording. Each chat and its caption form a figure.

**Why:** The captions identify whose view is shown and describe a single chat.
The word "demo" stays with the links to the full demo experiences.

### The homepage teacher preview has no Live badge

_2026-10-09_

**Decision:** The homepage teacher chat preview hides its status badge in both
languages. Activity dashboards keep their Live, Paused, and Ended badges.

**Why:** The homepage uses a mock conversation, and a Live badge could make a
visitor think they are watching an actual class.

### Plan names and the founder heading use regular weight in both languages

_2026-10-09_

**Decision:** The Free and Complete Implementation plan names, and the founder
note heading, use regular font weight in English and Hebrew.

**Why:** Product-owner request to reduce the amount of bold text on the homepage.

### Hebrew shares the finished homepage layout and uses natural Hebrew copy

_2026-10-09_

**Decision:** The approved English homepage structure and styling also apply
to Hebrew: the plain hero, four teacher steps, concise demos, plan cards and
contact dialog, founder note, and tighter section spacing. Hebrew follows the
same benefits while using conversational masculine second person. The Hebrew
demo keeps its own cast and dialogue. Homepage metadata follows the same
benefits-first direction, without leading on price.

**Why:** Product-owner approval after the English copy and layout review.
Both languages now use the same components without temporary locale branches.
This extends the English-only decisions below to Hebrew, including
[English uses a plain hero and puts setup in the teacher view](#english-uses-a-plain-hero-and-puts-setup-in-the-teacher-view),
[English explains the activity once and names devices in the join step](#english-explains-the-activity-once-and-names-devices-in-the-join-step),
and the [homepage metadata decision](branding.md#english-homepage-search-copy-leads-with-the-activity-rather-than-its-price).
Their earlier instructions to preserve the old Hebrew homepage no longer apply.

_Implemented in the home components and [Hebrew home catalog](../../client/src/i18n/locales/he/home.ts)._

### English explains the activity once and names devices in the join step

_2026-10-09_

**Decision:** The English homepage goes from Teacher's View to the mock-class
demos, then Plans. Teacher's View carries the setup and activity sequence, so
English has no separate How it works section. The join-code step says students
join from their phones or laptops. The demos have no separate browser note.
The English Plans section opens with its label followed directly by the two
plan cards, without an introductory heading or paragraph.
Their copy connects tools to benefits: seeing student participation, reviewing
chats with transcripts emailed to the teacher, reusing characters and activity
settings, and keeping discussions focused. Complete Implementation explicitly
offers more classroom tools with help from the team.
The English demos use one regular-weight heading, "Try the demo", with no
eyebrow label above it. One short introduction identifies the simulated
classmates. The two choices are "Teacher view" and "Student view", each with a
one-sentence description and a "Try as a teacher/student" button.
Hebrew keeps its existing sections.

**Why:** Product-owner feedback: the second explanation repeats Teacher's
View and makes the page longer. Cost and accounts are already covered by the
plans; phones and laptops are concrete examples that belong in the
step explaining how students join.
This overrides the English placement in
[The how-it-works footer answers cost, accounts, and devices](#the-how-it-works-footer-answers-cost-accounts-and-devices).

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx) and
[DemoSection](../../client/src/components/home/DemoSection.tsx)._

### English uses a plain hero and puts setup in the teacher view

_2026-10-09_

**Decision:** The English hero reads "Get your class excited to learn"
without a highlighter and uses regular font weight. Its first paragraph focuses
on students talking, collaborating, and thinking about what they learn.
The second explains choosing a topic, assigning characters, and exploring the
lesson without knowing who's playing whom. Both paragraphs use regular weight;
the hero carries no accounts or pricing line.
The setup list sits in Teacher's View in place of its
headline and introductory paragraph. Its four numbered steps cover creating the
activity, sharing the code, watching chats with real names, and revealing names
and receiving transcripts. There is no separate benefits list in English.
Both previews use short example captions
and have no sticky-note callouts.

**Why:** Product-owner feedback: the highlight and demo explanations feel
artificial and clutter the page. Moving setup leaves more room for the hero
pitch. Hebrew keeps its current copy and layout until separately approved.
This overrides the English parts of
[The highlighter mark appears once on the homepage, under "In character"](#the-highlighter-mark-appears-once-on-the-homepage-under-in-character),
[On phones the live chat comes before the setup steps](#on-phones-the-live-chat-comes-before-the-setup-steps),
and [The teacher section stays light, and never points at "this card"](#the-teacher-section-stays-light-and-never-points-at-this-card).
Those entries still govern Hebrew.

_Implemented in [HomePage](../../client/src/pages/HomePage.tsx) and
[TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx)._

### The hero demo is cast from the lesson, and it shares the demo activity's world

_2026-07-28_

**Decision:** The homepage hero plays **Cleopatra 👑 ↔ Brutus** in English and
**גולדה 🕊️ ↔ בן־גוריון** in Hebrew, replacing the Moon/Neil Armstrong and
הכנרת/מד המים pairs. The visitor plays Cleopatra and גולדה, the same seat the
demo activity hands a student. Each hero now sits inside its own language's
demo setting: Rome the night before the Ides of March, and Tel Aviv in the
hours before the Declaration. It is a **different room in that world**, not a
preview of the demo's own chat: different students, a different moment, no
shared line, so a visitor who clicks through to `1234` gets something new.

Everything else about the hero holds, and one convention widens:

- The two-scripted-lines cap and the empty `ambientLines` pool stay exactly as
  [The hero demo goes quiet after two Armstrong lines](#the-hero-demo-goes-quiet-after-two-armstrong-lines)
  set them. That entry names a cast that is gone; the cap it records governs
  this one.
- The borrowed seats stay "Dana K" and "דנה" per
  [Demo students have short names, and the teacher is never one of them](#demo-students-have-short-names-and-the-teacher-is-never-one-of-them),
  and the partner's student stays "Sam A" / "יובל".
- **The hero's partner carries no emoji in either language now.** Hebrew
  already did this deliberately (the hero is the first roster a visitor sees,
  and one plain name in it says a teacher doesn't have to add one); English
  joins it, which also keeps 🔪 off the landing page. The demo activity's own
  roster still ships "Brutus 🔪" and "בן־גוריון 📜".

**Why:** Founder call (2026-07-28): an astronaut arguing with the Moon, and a
lake arguing with the man who measures it, are funny but are not what a teacher
would actually assign. The hero's job is to make a teacher picture their own
lesson in it, so the cast should be the kind of characters a history or
literature unit hands out. Reusing the demo activity's cast was the point
rather than a side effect: the homepage now promises the world the demo then
delivers. Writing a fresh scene inside that world (Brutus insisting tomorrow's
senate meeting is normal; בן־גוריון admitting he invited people to a secret
ceremony by note) keeps the two surfaces from reading as the same chat twice.

_Implemented in [heroChatDemo.ts](../../client/src/mockData/heroChatDemo.ts).
The homepage prose interpolates `heroCopyNames` and needed no change, except
`home:how.step2.body` in both catalogs, which is the one place the copy names
the cast in prose. Related:
[The Hebrew demo is re-cast, never translated](demo-flows.md#the-hebrew-demo-is-re-cast-never-translated)._

### The homepage tells a machine it's free, and it will never carry a rating

_2026-07-28_

**Decision:** `/` and `/he` each ship one `application/ld+json` block holding a
three-node `@graph`: an `Organization` (brand name, the apex URL, the square
`logo-512.png`), a `WebSite` (brand name, the page's own URL, `inLanguage` from
the page's locale), and a `SoftwareApplication` (brand name, the homepage's own
meta description, `applicationCategory: "EducationalApplication"`,
`operatingSystem: "Any"`, and an `Offer` of `price: "0"`). Every string comes
from the catalogs, so `/he` describes חברולה in Hebrew.

Three standing bans, none of them "not yet":

- **No `aggregateRating` and no `review`, ever.** There are no testimonials on
  this site ([No testimonials on the homepage](#no-testimonials-on-the-homepage)),
  so a rating here would be invented data about real people — the most-abused
  corner of this vocabulary and a direct route to a manual penalty.
- **No `SearchAction`.** The site has no search, and claiming one it doesn't
  have is how a page gets its structured data distrusted site-wide.
- **The paid tier is not modelled.** "Complete Implementation" has no public
  price ([The homepage has a two-plan section, and the free plan stays the whole product](#the-homepage-has-a-two-plan-section-and-the-free-plan-stays-the-whole-product)),
  and an `Offer` without a price is worse than no `Offer`. The free plan is what
  the page leads with and what the schema says.

**No `HowTo` either, and that one is a judgment call rather than an omission.**
The four `how.step*` keys map onto it cleanly and need no new copy, but Google
retired HowTo rich results in 2023, so it earns no visual treatment in search —
only machine-readable structure for answer engines, which the `<noscript>` block
already gives them in the same words. A future reader finding no `HowTo` on a
page with a visible four-step list is looking at this decision, not a miss.

The other eight URLs get no structured data at all. The join and create gates
are forms and the two demo URLs are pitch-email links; structured data on either
earns no result and is more claims to keep true.

**Why:** Nothing on the site stated in machine-readable form what Chaverola is,
so a search or answer engine had to infer "free, browser-based, no student
accounts" from prose. Those are the three facts that remove a teacher's
hesitation, and the zero-price `Offer` is the single most valuable of them. The
bans are written down because each is a thing a future contributor would
plausibly add for completeness, and each would cost more than it earns.

_Implemented in
[prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts) (`structuredData`);
plan in [docs/plans/seo/05](../plans/seo/05-the-search-result-says-what-this-is.md)._

### The homepage has a two-plan section, and the free plan stays the whole product

_2026-07-26_

**Decision:** Between how-it-works and the founder's note sits a "Plans"
section — heading "The free plan is the whole thing." — with two cards. The
**Free** card lists everything the product does today and ends in the standard
outline Host CTA; it is never described as limited, trial-like, or a tier.
The **Complete Implementation** card (team training on curriculum fit,
Google Classroom-type integrations, teacher accounts with saved characters,
mid-activity tasks pushed into student chats) lists no price — its secondary "Write to Moshe" CTA opens a dialog with a prefilled
mailto to siegel.moshes@gmail.com plus the raw address as select-all text.
The paid card's accent is a grape-tinted border and one rotated sticker tag
("With the Chaverola team") — no badges, ribbons, price columns, or icon
grids, and no `HighlightMark`. The one exception to the no-logos look: the
integrations bullet carries a small inline Google Classroom logo (redrawn as
an SVG in the component, nothing loaded from Google), founder-requested
(2026-07-26). The how-it-works facts row's first item becomes "Free plan for
every teacher".

**Why:** Founder call (2026-07-26). The paid plan is hands-on service priced
per teacher or school (an individual teacher gets an account too — it's not
schools-only), so a contact CTA is honest where a price table would be made
up. Placed above the founder's note so the ask ("write to Moshe")
lands right before the letter signed by the same person. This **amends**
[The how-it-works footer answers cost, accounts, and devices](#the-how-it-works-footer-answers-cost-accounts-and-devices)
— that entry required a founder call before softening "free", and this is
that call (the row structure stands) — and extends
[The hero looks hand-made and never mentions AI](#the-hero-looks-hand-made-and-never-mentions-ai)
and [Solid grape is reserved for Join](#solid-grape-is-reserved-for-join-both-host-buttons-are-outline).

_Implemented in
[PlansSection](../../client/src/components/home/PlansSection.tsx),
[HomePage](../../client/src/pages/HomePage.tsx), and
[HowItWorksSection](../../client/src/components/home/HowItWorksSection.tsx)._

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

_Note (2026-07-26): that founder call happened — see
[The homepage has a two-plan section, and the free plan stays the whole product](#the-homepage-has-a-two-plan-section-and-the-free-plan-stays-the-whole-product).
The row structure stands; its first item is now "Free plan for every
teacher"._

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
