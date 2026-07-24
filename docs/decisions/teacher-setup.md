# Teacher activity setup

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### On a phone, picking a character's emoji is a bottom sheet, not a popover

_2026-07-24_

**Decision:** Below `sm`, tapping a character row's emoji avatar opens a
full-width bottom sheet — docked to the screen's bottom edge, titled with which
row it's editing, "Remove the emoji" pinned as a footer. Desktop keeps the
anchored popover. The width is read at tap time (the same `(min-width: 640px)`
line the rest of the app draws `sm` at), so only one container is ever mounted
and a rotation is free. The same slot backs the create form and the host page's
live-settings panel, so both get the sheet.

**Why:** On a phone the old popover was the wrong shape. A ~300px picker
anchored to a size-12 avatar had nowhere to go: Radix flipped it up over the
section header, it hung past the card's right edge, and once the row list grew
it was clipped with no way to scroll. The library's autofocused search also
opened a phone keyboard over a picker nobody was typing into. A bottom sheet
sidesteps all of it — it's full width, it can't flip or outdent, it names the
row (which the popover never could), and it parks focus on the sheet so no
phantom keyboard appears.

**Built from the existing Radix Dialog**, via a `variant="bottom-sheet"` on
`DialogContent` — deliberately **not** a new `ui/sheet.tsx`. A primitive with a
single caller is what the lean-dependency policy exists to stop, and Dialog
already portals cleanly past the form's `overflow-hidden` section and its fixed
submit dock. Picking still closes on the first tap, the opposite of the
composer's stay-open picker, because a character has exactly one emoji (see
[Character rows lead with the emoji avatar](#character-rows-lead-with-the-emoji-avatar)).

_Implemented in
[EmojiSlot](../../client/src/components/Teacher/ActivitySetup/EmojiSlot.tsx),
with the `bottom-sheet` variant in
[ui/dialog.tsx](../../client/src/components/ui/dialog.tsx) and `PopoverAnchor`
added to [ui/popover.tsx](../../client/src/components/ui/popover.tsx) so the
avatar can both open the picker and anchor the desktop popover._

### Setup is one scrolling form, and Host the Activity is never disabled

_2026-07-14_

**Decision:** `/activity/create` is a single scrolling form (characters →
about you → scene → settings), not a stepped wizard. Its one action button,
"Host the Activity", is always tappable: if anything is missing or invalid
(fewer than two named characters, a duplicate name, no hosted-by, a non-empty
invalid email), tapping it scrolls to and highlights the first problem field
with an inline error instead of navigating. Problems stay hidden until that
first failed tap, then update live so fixing a field clears its error
immediately. A valid tap mock-generates a 4-digit join code (never `1234`,
the student demo's code), stashes the activity in sessionStorage
(`chaverola.hostedActivity`) for the live host page to pick up, and navigates
to `/activity/host/:joinCode`.

**Why:** Teachers refill this form for every activity in a series — forms
beat wizards for repeat users — and seeing everything at once backs the
homepage's "setup takes about a minute" promise. One flat layout also matches
the live settings accordion planned for the host page, and it keeps
tap-Host-to-find-the-problem coherent: no error can hide on a previous step.
A disabled submit button is a dead end that explains nothing; an
always-tappable one turns every failed tap into directions.

**Update (2026-07-18):** the hand-off in the last sentence of the decision
is mock-era plumbing with a scheduled replacement (feature-1 Prompts 5–6):
the server becomes the only join-code issuer (`mockGenerateJoinCode` is
deleted), the `chaverola.hostedActivity` stash goes away — the private
host URL is the durable hand-off instead — and a valid tap POSTs to the
API, then navigates to `/activity/host/:hostKey`. Everything else here
(one scrolling form, never-disabled submit, tap-to-find-the-problem) is
unchanged.

**Update (2026-07-19):** that replacement landed (Prompt 6). One narrowing
of "never disabled": the button now disables while its own create request
is in flight — deliberately with no client-side timeout, waiting out even
a ~60s cold start, because a retry could mint a second activity (see
[Create is not idempotent in v1](backend-api.md#create-is-not-idempotent-in-v1-a-lost-response-can-orphan-one-activity)).
The pending button reads "Setting up your activity…", swaps in the
"Chaverola is just waking up" patience line after ~5 seconds, and a failed
create shows distinct inline copy for unreachable vs server error, right
above the button. Validation still never disables anything.

**Update (2026-07-24):** the "Chaverola is just waking up" patience line is
gone — it covered the free tier's idle spin-down, and the API now runs on a
paid instance that never sleeps. The pending button and the no-timeout rule
both stand: create still isn't idempotent, so it still waits the request out
however long it takes.

_Implemented in
[ActivitySetupForm](../../client/src/components/Teacher/ActivitySetup/index.tsx)
with validation in [activitySetup](../../client/src/lib/activitySetup.ts)._

### The setup draft lives in the tab, and hosting doesn't clear it

_2026-07-14_

**Decision:** The form auto-saves every change (fields, emojis, toggles) to
sessionStorage: a refresh restores the draft exactly, closing the tab
discards it — the same per-tab spirit as the student session. Hosting
deliberately does **not** clear the draft: returning to `/activity/create`
in the same tab shows the last setup, ready to host again under a fresh code.

**Why:** Classroom devices are flaky (the same reality behind
refresh-keeps-the-lobby on the student side), and losing a half-filled form
to a refresh means retyping it while a class watches. Keeping the draft
after hosting serves the series use case — next period's round of the same
activity starts prefilled instead of from scratch. (Product call made while
building the setup page.)

_Implemented in [activitySetup](../../client/src/lib/activitySetup.ts) (read/save
plus sanitizing), wired in
[ActivitySetupForm](../../client/src/components/Teacher/ActivitySetup/index.tsx)._

### An abandoned character row never blocks hosting; a duplicate name does

_2026-07-14_

**Decision:** The first two character rows are permanent — at least two
characters are required anyway, so a remove control there would be dead-end
UI. Rows 3–4 get a remove button with no confirmation (retyping a name is
cheap). Any row left empty or whitespace-only is silently dropped when
hosting: the activity starts with just the filled characters, and hosting
needs at least two of them — _which_ rows they are doesn't matter.
Duplicate names (trimmed, case-insensitive) block hosting with an inline
error on the **later** row.

**Why:** An abandoned row must never stop a class from starting — the
teacher's attention is on thirty kids, not on tidying form state. Duplicates
are the one name problem worth blocking: labels are just name + optional
emoji, so two "Brutus" rows would give students identical labels with no way
to tell the characters apart. Flagging the later row leaves the one the
teacher filled first alone.

_Implemented in [activitySetup](../../client/src/lib/activitySetup.ts)
(`validateActivityDraft` / `toCreateActivityRequest`) and
[CharacterRowsField](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)._

### Hard caps with quiet counters: 30-character names, 20-word scene

_2026-07-14_

**Decision:** Character names and the hosted-by name hard-block at 30
characters; the scene hard-blocks at 20 words (input that would start word
21 is dropped, and whitespace right after the last word survives so typing
at the cap is a stable no-op instead of mutating the final word). Each cap
shows a counter only near the limit — names from 25 characters, scene from
16 words — the same quiet pattern as the chat composer's 75-char counter.
None of this appears in host-tap validation: the inputs never let a value
go over in the first place.

**Why:** Character names prefix every single chat line, and the hosted-by
renders inside the lobby's "Hosted by …" — long values break both surfaces.
An always-visible counter nags; one that appears near the limit informs.
Blocking at the input beats flagging later, since an over-limit draft can
then never exist.

_Caps in [activitySetup](../../client/src/lib/activitySetup.ts), the clamp helpers
in [text.ts](../../client/src/lib/text.ts), the counter in
[FieldFeedback](../../client/src/components/Teacher/ActivitySetup/FieldFeedback.tsx)._

### Settings ship on, and a toggle's sub-control disables instead of hiding

_2026-07-14_

**Decision:** All three setup toggles — reveal names on chat end, rematch
warning, auto-match 1:1 (20 seconds, 5–120 in 5-second steps) — default to
**on**, and the section hint says out loud that these defaults are the
recommendation and that everything stays editable while the activity runs.
When a toggle with a stepper is off, the stepper stays visible but disabled.
The whole settings block gets a quieter card than the field sections.

**Why:** Recommended defaults make the fastest path (touch nothing) also the
best one. A visible-but-disabled stepper shows what turning the toggle on
will do, and nothing jumps around when toggling — hiding it would resize the
row and shift the page under the teacher's thumb. The quieter card ranks the
sections by required attention: fields need input, settings are already in
their recommended state.

_Implemented in
[SettingsSection](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx)
with
[NumberStepper](../../client/src/components/Teacher/ActivitySetup/NumberStepper.tsx);
defaults live in [activitySetup](../../client/src/lib/activitySetup.ts)._

### The setup form's submit is solid grape

_2026-07-14_

**Decision:** "Host the Activity" on `/activity/create` uses the standard
solid-primary button. This does not contradict
[Solid grape is reserved for Join; both Host buttons are outline](homepage.md#solid-grape-is-reserved-for-join-both-host-buttons-are-outline)
— that rule governs the homepage's marketing CTAs, where the student Join
button must be the one filled purple thing on the page. On the teacher's own
form there is no Join button to compete with, and a form's single submit is
exactly what solid primary is for.

**Why:** Recorded to preempt a well-meaning "fix": don't outline this button
for consistency with the homepage rule. That rule's scope is the homepage.

_Implemented in
[ActivitySetupForm](../../client/src/components/Teacher/ActivitySetup/index.tsx)._

### Wide screens get a live student-lobby preview beside the form

_2026-07-14_

**Decision:** From `lg` up, the setup form shares the page with a sticky
"What students see" rail: a miniature of the real student lobby (the purple
world, the "Waiting for your match" pill, the hosted-by / scene / roster-chip
card) that re-renders from the draft on every keystroke. The rail is
display-only — the Host action lives in
[the bottom dock](#host-the-activity-docks-to-the-bottom-edge-at-every-breakpoint),
not under the preview. It mirrors
[WaitingLobby](../../client/src/components/Student/WaitingLobby.tsx)'s markup
idioms rather than reusing the component — the lobby needs a finished
`Activity` plus a student name, the preview renders a half-finished draft.
Display-only: no live regions, so it never talks over the form in a screen
reader. Phones don't render it at all.

**Why:** Without it teachers type the scene and names blind — the preview
shows where each field lands for students before hosting, and answers "what
do students actually see?" without running a test activity. Sticky keeps
cause (the field) and effect (the lobby) on screen at the same time. Phones
skip it because the single column and the one-minute promise matter more
than a mirror of what's right above.

_Implemented in
[LobbyPreview](../../client/src/components/Teacher/ActivitySetup/LobbyPreview.tsx),
laid out in
[ActivitySetupForm](../../client/src/components/Teacher/ActivitySetup/index.tsx)._

### Host the Activity docks to the bottom edge at every breakpoint

_2026-07-14 · widened to all breakpoints 2026-07-18_

**Decision:** The Host button is fixed to the bottom edge at every width —
the submit's only home. Below `lg` it fills a blur-backed, top-bordered
bar in thumb reach. From `lg` up there is no bar: the button floats
shadowed just off the bottom edge, spanning exactly the form column
(card-edge to card-edge, via the same grid as the page), and the fixed
strip that positions it is `pointer-events-none` so it never blocks the
page behind it. The preview rail carries no button anymore. The old "Your
join code shows up on the next screen." hint is gone at every width — it
restated what the next screen shows immediately. The page keeps matching
bottom padding so the last section always scrolls clear, the submit is
still never disabled, and an invalid tap still scrolls to the first
problem from anywhere. No entrance animation — a permanently visible
solid-grape button is emphasis enough.

**Why:** Originally phones-only, for thumb reach and the one-tap rehost
(the draft survives hosting for the series use case). Widened to desktop
(product-owner call, 2026-07-18) because a first-time teacher works down the
form column and can miss the rail CTA entirely: their eyes never leave the
left column, the button blended into the purple preview above it, and the
form column just ended with no cue about what to do next. A bottom bar stays
in view and crosses the reading path the whole way down, and one home for
the CTA avoids two identical primary buttons on one screen. The first cut
put an auto-width button at the bar's end with the hint across from it —
still miss-able (product-owner call, 2026-07-18): a corner button reads as
secondary, while one spanning the form column reads as the page's primary
action, and cutting the hint leaves nothing competing with it. The desktop
bar chrome went last (product-owner call, 2026-07-18): once the button
stopped at the form column's edge, the full-viewport border and blur read
as an empty shelf running on across the rail column.

_Implemented in
[ActivitySetupForm](../../client/src/components/Teacher/ActivitySetup/index.tsx)._

### Character rows lead with the emoji avatar

_2026-07-14_

**Decision:** Each character row starts with a round emoji slot styled as
the character's avatar — dashed border and a smile-plus when empty, the
emoji on a soft violet circle when set — followed by the name input. "Add a
character" is a dashed full-width row in the same rhythm. The emoji stays
optional; the empty slot is an invitation, not a requirement.

**Why:** Trailing the input, the optional emoji read as an afterthought and
got missed. Leading with a round avatar matches how characters appear to
students (roster chips, chat lines) and makes the tap target obvious without
spending any copy on it. (Product-owner choice, 2026-07-14, over keeping the
input-first row.)

_Implemented in
[CharacterRowsField](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)
and [EmojiSlot](../../client/src/components/Teacher/ActivitySetup/EmojiSlot.tsx)._

### Setup sections each carry one brand accent; settings stays the quiet one

_2026-07-14_

**Decision:** Every section card opens with a small icon chip tinted with
one brand accent: characters = grape (Drama), about you = coral (UserRound),
scene = sky (Clapperboard), settings = mint (SlidersHorizontal). The tint
lives on the chip only — the cards keep calm surfaces (settings keeps its
muted card), and the page adds a soft grape/coral/sun glow behind the
header. The full purple student world stays a student-side identity; the
teacher page only nods at it inside the preview card.

**Why:** The "warm brand pass" direction (product-owner choice, 2026-07-14,
over the full purple-world treatment and over minimal polish): give the
teacher tool real brand personality without making a form loud. One accent
per section also gives each stop a recognizable landmark while scrolling.

_Implemented in
[FormSection](../../client/src/components/Teacher/ActivitySetup/FormSection.tsx)
(accent map) and
[CreateActivityPage](../../client/src/pages/teacher/CreateActivityPage.tsx) (glow)._
