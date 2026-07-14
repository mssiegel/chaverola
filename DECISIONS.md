# Product & UX Decisions

A log of **product, UX, and business decisions** for Chaverola — the choices
behind how the app behaves and _why_. It exists so contributors (people and AI
agents) don't undo intentional behavior that looks like a bug or an oversight.

## How to use this file

**Before changing behavior**, skim the headings of the section covering the
area you're touching — every entry title states its rule, so the headings alone
work as the index. If a change you're about to make contradicts an entry, the
entry wins until the product owner says otherwise.

**Add an entry** whenever a decision is made about how the product should
behave, especially when the reasoning isn't obvious from the code. Add it at
the **top of the matching section** (entries are newest-first within each
section; add a new `##` section when none fits). Record the decision and its
reasoning; keep implementation detail in the code, keep the _why_ here. Use
this template:

```markdown
### <Title that states the rule — readable without opening the entry>

_YYYY-MM-DD_

**Decision:** What was decided, concretely enough to check the UI against.

**Why:** The reasoning — who made the call (founder feedback, product-owner
call), what alternative was rejected, and what breaks if it's undone.

_Implemented in [File](client/src/path/File.tsx)._
```

**When a decision is replaced:** don't delete or rewrite the old entry. Move it
to the [Superseded](#superseded) section at the bottom, change its date line to
`_YYYY-MM-DD · Superseded by [new title](#its-anchor)_`, and link to it from
the new entry. If only part of it is replaced, leave it in place with a note on
the affected part. Link related entries by title anchor, never by "above" /
"below" — entries move.

---

## Student join flow & lobby

### Back during a live chat asks before ending it

_2026-07-14_

**Decision:** During the chatting stage, browser back does not navigate: it
opens the same end-chat confirmation as the End chat button. Confirming ends
the chat and lands the student on the chat-ended screen — it never continues
out of the page; canceling stays in the chat. The guard arms only while a
chat is live: the lobby keeps its back-as-reset behavior, and the ended
screen doesn't trap the student.

**Why:** This is the guard promised by the lobby-only note in
[Landing on code entry signs the student out](#landing-on-code-entry-signs-the-student-out):
on this route, back lands on code entry, which signs the student out — so
during a live chat a stray swipe would silently kill a conversation that
(per
[Ending a chat ends it for everyone in the room](#ending-a-chat-ends-it-for-everyone-in-the-room))
ends for the partners too. Students on phones swipe screen edges constantly;
an accidental gesture must never cost three people their chat. Routing back
through the existing confirmation reuses a decision the student already
understands instead of inventing a second "are you sure" pattern.

_Implemented in [useBackGuard](client/src/lib/useBackGuard.ts), armed by
[ChatStage](client/src/components/Student/ChatStage.tsx)._

### One URL for the whole student journey

_2026-07-13_

**Decision:** The student stays on `/activity/join/:joinCode` from name entry
through the lobby, the chat itself, and the chat-ended screen. The URL never
changes to reflect the stage (no `/activity/lobby/...` or `/activity/chat/...`).
The UI swaps by stage, exactly as the canonical routes table in
[Shared_Project_Context.md](Shared_Project_Context.md) specifies.

**Why:** The URL identifies the _room_, not the student's progress through it.
`/activity/join/1234` is the link a teacher can project or share, and whoever
opens it lands in the right place for them: a new student gets the name step, a
signed-in student gets their current stage. Stage-specific URLs would be a
second copy of state that already lives in the session and (later) the realtime
backend, and every disagreement between the two needs a redirect rule — a whole
category of sync bugs. Stage transitions are also pushed _to_ the student (the
teacher matches them), so stage URLs would mean programmatic navigations that
pollute browser history and complicate the back-as-reset behavior in
[Landing on code entry signs the student out](#landing-on-code-entry-signs-the-student-out).
A student's chat is not independently addressable anyway: it exists for one
session in one tab, so a chat URL could never be opened, shared, or restored.
Kahoot and Blooket players likewise sit on one URL from name entry to the final
screen. Distinct URLs pay off where pages are addressable and revisitable —
the teacher side — and the route table reflects that (`/activity/create`,
`/activity/host/:joinCode`).

### Landing on code entry signs the student out

_2026-07-13_

**Decision:** Whenever the join page renders the code-entry stage — bare
`/activity/join` or an unknown code in the URL — any stored student session
is cleared. Browser back from the lobby is therefore the way to fix a wrong
name: back → code entry (signed out) → re-enter the code → fresh, blank
name field. Refreshing the lobby URL still keeps the student in the lobby,
and visiting the homepage alone does not sign them out. There is no edit
name button.

**Why:** Without this, a student who mistyped their name was stuck — the
session survived back navigation, so re-entering the code teleported them
straight back into the lobby under the old name. Back-as-reset fixes that
with zero new UI. Refresh must keep the lobby because classroom devices are
flaky, and the homepage can't sign students out because that would make the
Chaverola pill (a decorative-looking logo) a destructive tap. The name
field comes back blank rather than prefilled: computers are shared between
students, and often the whole name is wrong, not just a typo.

**Lobby-only rule:** this applies while waiting for a match. The future
chatting stage must NOT let a stray back-swipe silently kill a live chat —
it needs its own guard (the end-chat confirmation pattern) when it's built.

**Update (2026-07-14):** the chatting stage is built and has that guard —
see [Back during a live chat asks before ending it](#back-during-a-live-chat-asks-before-ending-it).

_Implemented in
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

### Lobby waiting dots are mint, not grape

_2026-07-13_

**Decision:** The three bouncing dots next to "Waiting for your match" are
`brand-mint` green; the pill around them stays grape.

**Why:** Mint is the app's established "live" color — the teacher chat
card's pulsing live dot and the identity bar's stage dot already use it.
Green dots read as "the system is actively working on your match" rather
than decoration, and they pop against the grape pill.

### The lobby shows no identity bar

_2026-07-13_

**Decision:** The white name strip (avatar initial + "Waiting in lobby")
does not render in the waiting lobby. The student's identity is confirmed
only by the lobby heading ("You're in, {name}!"). The `StudentIdentityBar`
component is kept for the chatting stage, which arrives in a later prompt.

**Why:** A floating name bar above the lobby card reads like a roster of
who's in the lobby, and lobby occupancy must stay a mystery — if a student
can tell only two people are waiting, they know exactly who they'll be
matched with, which defeats the anonymous-roleplay premise. The heading
already tells the student they're signed in, so the bar added nothing there.

**Update (2026-07-14):** the chatting stage is built and shows the bar with
stage text ("Chatting with Brutus 🔪", then "Chat ended"); the lobby stays
bar-free.

_Removed from
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

### No emoji bubble row in the waiting lobby

_2026-07-13_

**Decision:** The lobby shows no row of bouncing character-emoji circles
above the heading. Character emojis appear only in the "Characters in this
activity" chips.

**Why:** Round, pale, evenly spaced circles read as buttons — students will
try to tap them and nothing happens. The lobby's energy comes from the
heading and the animated "Waiting for your match" dots instead.

_Removed from [WaitingLobby](client/src/components/Student/WaitingLobby.tsx)._

### The student join flow lives in its own navbar-free "world"

_2026-07-13_

**Decision:** `/activity/join` and `/activity/join/:joinCode` render under
`StudentWorldLayout` — a full-viewport purple gradient with slowly drifting
hand-drawn doodles and navbar-style corner pills (gradient "Chaverola" pill
top-left, language pill top-right) — instead of the navbar shell every
other page uses.
The Chaverola pill (text-only; a face-tile variant lost a visual pick) is
the world's only link home. The language switcher is a solid white pill:
translucent white vanished against the lavender backdrop.

**Why:** Joining is the student's "entering the game" moment, and the
navbar is marketing/teacher chrome that pulls a kid out of it. The whole
flow — code entry, name entry, waiting lobby — stays inside the world so
there's no jarring theme switch mid-flow. The homepage hero stays
deliberately plain and teacher pages keep the navbar; this treatment is the
student flow's own.

_Implemented in
[StudentWorldLayout](client/src/components/layout/StudentWorldLayout.tsx);
routes split into two pathless layout groups in
[App.tsx](client/src/App.tsx)._

### Background doodles are deterministic, and freeze (not hide) under reduced motion

_2026-07-13_

**Decision:** The drifting doodles come from a hardcoded config (position,
speed, drift angle, sway, size per instance) — no randomness. Each takes
45–90 seconds to cross the screen. With `prefers-reduced-motion`, they
render as a static, hand-scattered arrangement rather than disappearing.

**Why:** Slow and varied keeps the page feeling alive without pulling focus
from the join form (a student may sit in the lobby a while). Deterministic
placement is art-directable and keeps screenshots stable for automated
checks. Reduced-motion users should still get the decorated world — just a
still one; stripping the doodles entirely would make it a different,
blander product for them.

_Implemented in
[DriftingDoodles](client/src/components/decor/DriftingDoodles.tsx) and the
`.doodle` rules in [index.css](client/src/index.css)._

### No "use a different code" escape on the name step

_2026-07-13_

**Decision:** The name-entry step (`/activity/join/:joinCode`) has no link
back to code entry. One form serves both gate steps; only the input and the
button label ("Continue" vs "Join Activity") change.

**Why:** A student on the name step got there with a code that checks out —
wanting a _different_ activity at that moment is vanishingly rare, and the
browser back button already covers it. Dropping the link leaves one action
on screen, which is the right amount for a kid joining a class activity.

_Implemented in
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

### One page serves both join routes; a wrong code never changes the URL

_2026-07-13_

**Decision:** `/activity/join` and `/activity/join/:joinCode` render the same
`JoinActivityPage`, and the stage is **derived, not stored**: no code param
(or an unknown one) means code entry, a known code without a session means
name entry, a matching session means the lobby. Submitting a wrong code shows
"Activity was not found. Recheck the Join Code you entered." and stays on
`/activity/join` — only a valid code navigates. A shared link with a bad code
falls back to code entry with the code prefilled and that same message
already showing.

**Why:** The brief wants the code input replaced **in-place** by the name
input when a code checks out; one component across both routes makes that a
state change instead of a page swap. Deriving stage from URL + session means
a refresh or a directly shared link always lands on the right screen with no
stored stage to go stale. Not navigating on a wrong code keeps not-found URLs
out of the address bar and browser history, so students can't share or
re-open a dead link they think worked.

_Implemented in
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx); routes in
[App.tsx](client/src/App.tsx)._

### Student sign-in lives in the tab, and removal sends you to the name step

_2026-07-13_

**Decision:** The student's "session" (name + joined activity code) is kept
in **sessionStorage**: a refresh keeps them signed in, closing the tab signs
them out, as does landing back on code entry (see
[Landing on code entry signs the student out](#landing-on-code-entry-signs-the-student-out)).
(The identity bar that used to display the signed-in name on every stage no
longer appears in the lobby — see
[The lobby shows no identity bar](#the-lobby-shows-no-identity-bar).) When
the teacher removes a student (mock event for now), they are signed out
on the spot and land on the **name step** of the same activity — not code
entry — with a notice that the teacher removed them; joining again clears it.

**Why:** Per-tab storage fits shared classroom computers — the next student
at the machine shouldn't inherit a classmate's name, but a mid-activity
refresh shouldn't dump anyone back to the start either. Removal clears only
the identity: the join code in the URL is still a real activity, so making
the student retype a code they're looking at would be pure friction. The
notice tells them why they got bounced; rejoining stays possible because
removal is sometimes a mix-up (and the teacher can always remove them again).

_Implemented in [studentSession.ts](client/src/lib/studentSession.ts),
[StudentIdentityBar](client/src/components/Student/StudentIdentityBar.tsx),
and [JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

---

## Chat behavior

### The composer's emoji picker stays open across inserts

_2026-07-14_

**Decision:** In the message composer, picking an emoji inserts it at the
caret and leaves the picker open, so a student can drop in several emojis
without reopening it each time; focus never leaves the textarea. Escape,
an outside tap, and sending the message all close it. The teacher setup's
emoji slot is the opposite on purpose: a character has exactly one emoji,
so picking closes the popover immediately.

**Why:** Kids chain emojis — close-on-pick would turn "😀😀😀" into three
round trips. Technically the picker is a non-modal Radix popover, and the
insert flow refocuses the textarea, which Radix counts as focus leaving the
popover and normally dismisses it. The composer therefore prevents the
Radix defaults (`onOpenAutoFocus`, `onFocusOutside`, `onCloseAutoFocus`) —
those preventDefaults are load-bearing, not leftovers; "fixing" them makes
the picker close after the first emoji or yank focus off the textarea.

_Implemented in
[MessageComposer](client/src/components/Student/Chatbox/MessageComposer.tsx),
with the shared lazy loading in
[LazyEmojiPicker](client/src/components/chat/LazyEmojiPicker.tsx)._

### Every chat end explains itself

_2026-07-14_

**Decision:** The chat-ended screen's tile, title, and body are keyed by the
end reason — no two causes share copy. You ended it: 🎬 "And… scene!", with
the body scoped to the room ("You ended this chat" in a 1:1, "…for the whole
group" in a group, since ending kills it for everyone). Another student
ended it: the title names their **character** — "Brutus 🔪 ended the chat" —
never their real name; the mystery holds until the reveal. The teacher
ending it (🎓), the activity timer running out (⏰ "Time's up!"), a partner's
2-minute window expiring (the existing 🔌 copy), and the student's own
missed window (📶 "self-timeout": you lost connection, two minutes passed,
and you got back to find the chat over) each get their own copy too. The
engine tracks who ended a chat (`endedByPeerId`) alongside the reason.
Reveal behavior and the manual back-to-lobby button are identical for every
reason.

**Why:** Product-owner call (2026-07-14): the shared "Nicely played 👏" for
every cause read like the app didn't notice what happened — the same
reasoning that gave the 1:1 disconnect timeout its own copy, now applied
across the board. Naming the ender by character keeps a group ending from
feeling arbitrary ("who killed our chat?") without leaking identities. The
self-timeout copy says the chat "ended **for you**" because in a group the
room actually keeps going after a drop — only your seat ended.

_Implemented in
[ChatEndedSection](client/src/components/Student/Chatbox/ChatEndedSection.tsx)
(copy map) and [useChatDemo](client/src/components/chat/useChatDemo.ts)
(`peerEndsChat` + `endedByPeerId`)._

### The chat header summarizes the room, and tapping it shows everyone

_2026-07-14_

**Decision:** The chat header's "with …" line is a summary, not a roster. A
1:1 spells out the peer's full label ("with Brutus 🔪"); a group shows the
first active peer plus a count pill ("and 1 other" / "and 2 others") at
**every** screen width — desktop doesn't get the full comma list either.
Tapping the line opens a "Who's in this chat" popover listing everyone in
the room, you included, each with the same color dot their name wears in the
conversation. The popover shows **characters only** — real names stay hidden
until the end-of-chat reveal, same as everywhere else. As a backstop, both
header lines wrap instead of truncating: character names are teacher-authored
and unbounded, so a single long name can outgrow any width.

**Why:** On phones, a group's full peer list collided with the End chat
button and truncated ("with Brutus 🔪, Caesar's ghost…"), silently hiding
who's in the room — the one thing the header exists to say, and the signal
that a peer was dropped. A row per peer was rejected (the header would eat
the chat on phones), and emoji-chip avatars were rejected because emojis are
optional per character — the teacher decides, so chips can't be counted on.
One-name-plus-count never overflows and behaves identically at all sizes; a
count that appeared only on phones would mean two different headers to
reason about. Nothing is lost: every conversation line and the end reveal
still carry full names, the popover answers "who else is here?" on demand,
and in a group of 3 the pill disappearing (back to a plain "with Caesar's
ghost 👻") doubles as a visible drop signal. The pill is styled like the
header's other tappable things so the roster is discoverable; in a 1:1 the
line still opens the popover, just without a pill advertising it.

_Implemented in [ChatHeader](client/src/components/chat/ChatHeader.tsx),
with the popover primitive in
[popover](client/src/components/ui/popover.tsx)._

### A disconnected peer gets 2 minutes to come back, and the student watches the clock

_2026-07-14_

**Decision:** When a peer loses connection, the reconnect banner counts down
a **2-minute** window live ("Brutus 🔪 lost connection… 1:43 to come back").
Reconnecting in time clears the countdown and plays the existing
reconnecting → "is back! 🎉" flow. If the window runs out in a **1:1 chat**,
the chat ends and the chat-ended screen swaps the congratulatory copy for
disconnect copy ("Your partner lost connection" / "They couldn't get back
in, so this chat ended. Not your fault!") — the name reveal and the
back-to-lobby button behave exactly as on a normal end, and every other end
source keeps the standard copy. The window lives in the shared demo engine,
so `/demo/student-chat` behaves identically, and the chat demo panels get a
dev-only "Skip the wait" fast-forward so testing the timeout doesn't mean
standing around for two minutes.

**Update (2026-07-14):** "every other end source keeps the standard copy" is
superseded — every end reason now has its own wrap-up copy, including the
student's own missed window. See
[Every chat end explains itself](#every-chat-end-explains-itself).

**Why:** Classroom devices drop constantly (the same reality behind
refresh-keeps-the-lobby), so a vanished partner needs a grace period rather
than an instant kill — but the student left waiting deserves to see how long
they're expected to hang on, or they'll assume the app froze and bail. Two
minutes is long enough to hop back on the wifi, short enough that a 1:1
student isn't held hostage by an empty seat. The disconnect-specific ended
copy exists because "Great roleplay! 👏" after your partner evaporated reads
like the app didn't notice what happened.

_Implemented in [useChatDemo](client/src/components/chat/useChatDemo.ts)
(window + countdown), with the copy in
[PeerReconnectBanner](client/src/components/Student/Chatbox/PeerReconnectBanner.tsx)
and [ChatEndedSection](client/src/components/Student/Chatbox/ChatEndedSection.tsx)._

### A group chat drops a timed-out peer instead of ending

_2026-07-14_

**Decision:** When the 2-minute reconnect window expires in a group chat
(3–4 participants), the chat does **not** end: the disconnected student is
dropped — a centered notice appears in the conversation ("Caesar's ghost 👻
couldn't get back in and left the chat"), they leave the header's peer list,
and the rest keep chatting. This deliberately does not contradict
[Ending a chat ends it for everyone in the room](#ending-a-chat-ends-it-for-everyone-in-the-room):
**dropping a member is not ending the chat** — nobody chose to end anything,
and the remaining students still have partners to talk to. If the last peer
times out too, the room is down to one student and the chat ends as a 1:1
timeout. The end-of-chat reveal still lists a dropped peer: their lines are
in the transcript, so their mystery gets an answer like everyone else's.

**Why:** The ends-for-everyone rule exists because a chat without partners
is dead air. In a group, partners remain — killing the whole room over one
flaky Chromebook would punish two students for a third's wifi. The notice
keeps the drop from feeling like a glitch ("where did the ghost go?").

_Implemented in [useChatDemo](client/src/components/chat/useChatDemo.ts);
notice rendering in
[ConversationLines](client/src/components/chat/ConversationLines.tsx)._

### Ending a chat ends it for everyone in the room

_2026-07-12_

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

### End of chat requires a tap to return to the lobby

_2026-07-12_

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

### Character-name colors

_2026-07-12_

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

---

## Characters & rosters

### A character's emoji is optional, and labels simply drop it

_2026-07-14_

**Decision:** Whether a character gets an emoji next to its name is the
teacher's call, per character — the data model does not require one. Every
surface that shows a character (chat header, conversation lines, lobby
roster chips, reconnect banner, roster popover, end-of-chat reveal, composer
placeholder) renders "Name emoji" when there is one and plain "Name" when
there isn't: no placeholder glyph, no reserved gap, no trailing space.
`characterLabel` in [characterLabel](client/src/lib/characterLabel.ts) is
the single formatter — nothing may hand-roll `name + emoji` (ConversationLines
used to; it no longer does). The demo data keeps the path visibly exercised:
Marc Antony in the join-flow roster and Julius Caesar on `/demo/student-chat`
have no emoji on purpose.

**Why:** Product-owner call (2026-07-14). Requiring an emoji forces teachers
to decorate characters that don't want decorating (try picking one for
"Brutus's conscience"), and a stock fallback glyph or initials avatar would
invent identity the teacher didn't author — plus a repeated fallback makes
distinct characters look like the same one. This rule is also why
[the chat header summarizes the room](#the-chat-header-summarizes-the-room-and-tapping-it-shows-everyone)
uses a count pill rather than emoji-chip avatars: chips can't be counted on
when some characters have no emoji.

_Implemented in [chat types](client/src/types/chat.ts) and
[characterLabel](client/src/lib/characterLabel.ts)._

---

## Teacher activity setup

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

_Implemented in
[ActivitySetupForm](client/src/components/Teacher/ActivitySetup/index.tsx)
with validation in [activitySetup](client/src/lib/activitySetup.ts)._

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

_Implemented in [activitySetup](client/src/lib/activitySetup.ts) (read/save
plus sanitizing), wired in
[ActivitySetupForm](client/src/components/Teacher/ActivitySetup/index.tsx)._

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

_Implemented in [activitySetup](client/src/lib/activitySetup.ts)
(`validateActivityDraft` / `buildHostedActivity`) and
[CharacterRowsField](client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)._

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

_Caps in [activitySetup](client/src/lib/activitySetup.ts), the clamp helpers
in [text.ts](client/src/lib/text.ts), the counter in
[FieldFeedback](client/src/components/Teacher/ActivitySetup/FieldFeedback.tsx)._

### Settings ship on, and a toggle's sub-control disables instead of hiding

_2026-07-14_

**Decision:** All four setup toggles — reveal names on chat end, auto-end
chats (7 minutes, 1–30 in 1-minute steps), rematch warning, auto-match 1:1
(20 seconds, 5–120 in 5-second steps) — default to **on**, and the section
hint says out loud that these defaults are the recommendation and that
everything stays editable while the activity runs. When a toggle with a
stepper is off, the stepper stays visible but disabled. The whole settings
block gets a quieter card than the field sections.

**Why:** Recommended defaults make the fastest path (touch nothing) also the
best one. A visible-but-disabled stepper shows what turning the toggle on
will do, and nothing jumps around when toggling — hiding it would resize the
row and shift the page under the teacher's thumb. The quieter card ranks the
sections by required attention: fields need input, settings are already in
their recommended state.

_Implemented in
[SettingsSection](client/src/components/Teacher/ActivitySetup/SettingsSection.tsx)
with
[NumberStepper](client/src/components/Teacher/ActivitySetup/NumberStepper.tsx);
defaults live in [activitySetup](client/src/lib/activitySetup.ts)._

### The setup form's submit is solid grape

_2026-07-14_

**Decision:** "Host the Activity" on `/activity/create` uses the standard
solid-primary button. This does not contradict
[Solid grape is reserved for Join; both Host buttons are outline](#solid-grape-is-reserved-for-join-both-host-buttons-are-outline)
— that rule governs the homepage's marketing CTAs, where the student Join
button must be the one filled purple thing on the page. On the teacher's own
form there is no Join button to compete with, and a form's single submit is
exactly what solid primary is for.

**Why:** Recorded to preempt a well-meaning "fix": don't outline this button
for consistency with the homepage rule. That rule's scope is the homepage.

_Implemented in
[ActivitySetupForm](client/src/components/Teacher/ActivitySetup/index.tsx)._

### Wide screens get a live student-lobby preview beside the form

_2026-07-14_

**Decision:** From `lg` up, the setup form shares the page with a sticky
"What students see" rail: a miniature of the real student lobby (the purple
world, the "Waiting for your match" pill, the hosted-by / scene / roster-chip
card) that re-renders from the draft on every keystroke, with the Host button
and its join-code hint directly beneath it. It mirrors
[WaitingLobby](client/src/components/Student/WaitingLobby.tsx)'s markup
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
[LobbyPreview](client/src/components/Teacher/ActivitySetup/LobbyPreview.tsx),
laid out in
[ActivitySetupForm](client/src/components/Teacher/ActivitySetup/index.tsx)._

### On phones, Host the Activity docks to the bottom edge

_2026-07-14_

**Decision:** Below `lg`, the Host button and its join-code hint live in a
fixed, blur-backed bar on the bottom edge, and the page carries matching
bottom padding so the last section can always scroll clear of it. From `lg`
up the same single action renders in the preview rail instead — it's one
submit with two breakpoint homes, still never disabled, and an invalid tap
still scrolls to the first problem from anywhere.

**Why:** The draft deliberately survives hosting (the series use case), so a
returning teacher opens an already-filled form — the docked bar makes "host
it again" one tap with no scroll to the bottom. It also keeps the
always-tappable submit in thumb reach the whole way down the form.

_Implemented in
[ActivitySetupForm](client/src/components/Teacher/ActivitySetup/index.tsx)._

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
[CharacterRowsField](client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)
and [EmojiSlot](client/src/components/Teacher/ActivitySetup/EmojiSlot.tsx)._

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
[FormSection](client/src/components/Teacher/ActivitySetup/FormSection.tsx)
(accent map) and
[CreateActivityPage](client/src/pages/teacher/CreateActivityPage.tsx) (glow)._

## Teacher monitoring view

### Teacher chat cards: collapsed to the last 5 lines, End chat asks first

_2026-07-12_

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

### Teacher view: character colors follow participant order

_2026-07-12_

**Decision:** Teacher chat cards color character names from the same `--char-*` palette
as the student chatbox, assigned by **participant order within each chat** (first student
listed is green, the 2nd golden, and so on). There is no "green = you" rule here because
the teacher isn't a participant.

**Why:** Reuses the learnable palette without inventing a second system. Colors are
per-card: the same character can get a different color on two cards, which is fine — the
teacher reads one card at a time, and per-card distinctness beats global consistency
(the same trade-off as the viewer-relative
[Character-name colors](#character-name-colors) rule).

_Assignment happens in [ChatCard](client/src/components/Teacher/ChatCard/index.tsx) via
[characterColor.ts](client/src/lib/characterColor.ts)._

---

## Homepage & hero

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

_Implemented in [heroChatDemo.ts](client/src/mockData/heroChatDemo.ts); the
empty-pool guard is in
[useChatDemo.ts](client/src/components/Student/Chatbox/useChatDemo.ts)._

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

_Implemented in [heroChatDemo.ts](client/src/mockData/heroChatDemo.ts) and
the copy in
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx)._

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
[HowItWorksSection](client/src/components/home/HowItWorksSection.tsx)._

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
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx)._

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
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx) and
[HowItWorksSection](client/src/components/home/HowItWorksSection.tsx)._

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

_Implemented in [HomePage](client/src/pages/HomePage.tsx)._

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

_Implemented in [HomePage](client/src/pages/HomePage.tsx) (owns the chat),
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx),
[HeroChatbox](client/src/components/home/HeroChatbox.tsx) (chat is now a prop),
and [ChatCard](client/src/components/Teacher/ChatCard/index.tsx)._

### No testimonials on the homepage

_2026-07-13_

**Decision:** The homepage has no testimonials or social-proof section. The
flow is hero → teacher's view → how it works → founder's note → contact.

**Why:** Product-owner call. Pre-launch there are no real teacher quotes to
show, and invented praise would clash with the hand-made honesty the page is
built on (see
[The hero looks hand-made and never mentions AI](#the-hero-looks-hand-made-and-never-mentions-ai)).
Revisit once real teachers have run real activities and said real things.

_Implemented in [HomePage](client/src/pages/HomePage.tsx)._

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

_Implemented in [FounderNote](client/src/components/home/FounderNote.tsx)._

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

_Implemented in [HomePage](client/src/pages/HomePage.tsx) and
[HeroChatbox](client/src/components/home/HeroChatbox.tsx)._

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

_Implemented in [HeroChatbox](client/src/components/home/HeroChatbox.tsx) with
its scenario in [heroChatDemo.ts](client/src/mockData/heroChatDemo.ts)._

---

## Navbar

### The navbar Join CTA appears only on the homepage

_2026-07-13_

**Decision:** The navbar's "Join an Activity" button (and its mobile
scroll-swap variant) renders only on the homepage. Every other page shows
just the logo and the language switcher.

**Why:** The CTA exists to route homepage visitors into the join flow. On
any other page it's noise — most obviously inside the join flow itself,
where a student would see a "Join an Activity" button pointing at the page
they're already on. The homepage is detected by the presence of the hero's
Join CTA (`useHeroCtaPassed` returns `null` elsewhere), so no route list to
maintain.

_Implemented in [AppLayout](client/src/components/layout/AppLayout.tsx)._

### Mobile navbar swaps the wordmark for "Join Activity" on scroll

_2026-07-12_

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

### The navbar has one CTA: Join an Activity

_2026-07-12_

**Decision:** Only the student "Join an Activity" button lives in the navbar.
"Host an Activity" was removed from it — teachers start from the hero's
secondary CTA instead. The freed space lets the wordmark show at all widths.

**Why:** Students arrive being told "go to the site and tap Join", so that
action must be the single unmissable button on every page. Two navbar CTAs
competed for that tap and crowded the bar at phone widths.

_Implemented in [AppLayout](client/src/components/layout/AppLayout.tsx)._

### Navbar: CTA label shortens on phones; language switcher swaps in place

_2026-07-12_

**Decision:** Below the `sm` breakpoint the navbar CTA renders as "Join"
(full "Join an Activity" from `sm` up). The language dropdown's trigger shows
the **active** locale's initials (EN or עב), and picking a language rewrites
the current URL in place (same page, query/hash kept) rather than jumping
home. (Superseded in part by
[The navbar has one CTA](#the-navbar-has-one-cta-join-an-activity) — Host is
gone from the bar and the wordmark now shows at all widths.)

**Why:** The full label plus wordmark and language switcher is a squeeze on a
375px-wide bar; shortening keeps the button roomy and tappable. Switching
language mid-flow shouldn't lose your place, and showing the active locale
tells you at a glance which mode you're in.

_Implemented in [AppLayout](client/src/components/layout/AppLayout.tsx) and
[LanguageSwitcher](client/src/components/layout/LanguageSwitcher.tsx)._

---

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

_Implemented in [HomePage](client/src/pages/HomePage.tsx)._
