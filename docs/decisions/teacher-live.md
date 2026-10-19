# Teacher live activity page

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The pause notice focuses on sending

_2026-10-19_

**Decision:** The teacher's paused-state notice says students can read their
chat but cannot send new messages until the teacher resumes. It omits the
ability to draft messages.

**Why:** Founder wording and rationale: the teacher needs to know what the
pause controls. Whether students can draft is irrelevant to that decision
and distracts from the sending restriction. The English and Hebrew notices
follow the same focus.

_Implemented in the `chats.pausedNotice` entries in the
[English](../../client/src/i18n/locales/en/teacher.ts) and
[Hebrew](../../client/src/i18n/locales/he/teacher.ts) catalogs._

### A chat seats as many students as the palette has colors

_2026-08-10_

**Decision:** A chat is no longer capped at four students. It seats
`min(MAX_CHAT_SEATS, roster length)`, and `MAX_CHAT_SEATS` is defined as
`CHARACTER_COLOR_VARS.length` — currently eight — rather than typed out as a
number. A teacher with fifteen characters can put eight students in one room; a
teacher with three still gets chats of three. Three supporting calls:

- **Big chats are made by hand.** "Pair everyone 1:1" and the auto-match timer
  are untouched: they still produce pairs, plus one trio for an odd student.
  `pairEveryonePlan` reads the roster size only to choose between a trailing
  trio and a leftover, and `pickAutoMatchPair` returns a two-tuple by type. The
  bigger room is reached by tapping students in the rail, which is the only
  place the new ceiling is visible ("or up to 8 for a group").
- **Nothing is trimmed to fit, at all.** A `chat:start` payload naming more
  students than there are seats dies at the wire without a word — no real
  client can send one, since the dashboard clamps the selection. Within the
  cap, a start the roster can't seat is refused whole, as it already was. This
  makes [A start the cast can't seat is refused whole, not trimmed to
  fit](#a-start-the-cast-cant-seat-is-refused-whole-not-trimmed-to-fit) total:
  the slice in `createChat` is now a structural backstop nobody can reach.
- **The teacher's chat card just grows.** Eight students means eight name rows
  above the transcript excerpt, with no collapse control and no scroller. A
  card that hides who is in it would defeat the card.

**Why:** A teacher asked for it, right after
[the shuffled roster](teacher-setup.md#the-teacher-picks-how-characters-get-handed-out-and-a-roster-can-hold-a-hundred)
shipped: once a roster can hold a hundred names, a four-person ceiling is the
thing standing between her and a group scene. The number eight is not a product
opinion, which is why it is derived rather than chosen. Every speaker's name is
colored from the `--char-*` tokens, and `assignCharacterColors` wraps when it
runs out, so a ninth speaker would wear the first speaker's color **in the same
room** — the one thing the color scheme exists to prevent. Deriving the cap
from the palette means the only way to seat more students is to add more
colors, and the two can never drift apart.

That bound is exact rather than roomy, and it holds for a reason worth writing
down: a chat's cast is always N _distinct_ characters, because the schema
rejects duplicate character ids and `dealCast` slices a roster instead of
drawing with replacement. So seeding a card's own cast first (what
`rosterCharacterColors` does past the palette) always gives every speaker on
that card its own color, with nothing to spare.

One consequence stays unfixed and is worth naming: the student's reconnect
banner has a single slot, so when several peers drop at once only the
soonest-to-expire is announced. That was already true of a trio; a room of
eight on classroom wifi makes it likelier. Left alone rather than solved badly.

_Implemented in [constants.ts](../../shared/src/constants.ts) (`MAX_CHAT_SEATS`),
[matching.ts](../../server/src/live/matching.ts) and
[teacher.ts](../../server/src/live/handlers/teacher.ts) (the seat slice and the
wire guard),
[HostActivity/index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx)
(`maxGroupSize`), and
[characterColor.ts](../../client/src/lib/characterColor.ts) (the exactness
argument). The cast block in
[transcript.ts](../../server/src/email/transcript.ts) went to one member per
line and the roster popover in
[ChatHeader](../../client/src/components/chat/ChatHeader.tsx) learned to scroll,
both because eight is where the old layouts stopped reading._

### The transcript email is written in the activity's language, and lays itself out right to left without CSS

_2026-07-27_

**Decision:** `formatTranscriptEmail` composes the subject and both bodies from
`EMAIL_COPY[record.locale]` — the language the teacher set up in, frozen on the
record at create. Nothing reads a header or a browser preference, so a class
that ran in Hebrew gets a Hebrew transcript wherever it is opened. The catalog
is a hand-rolled `Record<Locale, EmailCopy>` in `server/src/email/copy.ts`: a
missing string is a compile error, and the server still takes no i18n
dependency.

Four calls make the Hebrew actually render, none of which is CSS:

- **The subject leads with the brand** — `חברולה · הפעילות של {host} (קוד {code})`.
  A subject line has no `dir` mechanism at all, so the client guesses direction
  from the first strong character; opening with חברולה makes it right-to-left
  even when the teacher's name is Latin, and the trailing `(קוד 5678)` then
  comes out with mirrored parentheses and in-order digits with no control
  characters. No RLM at position 0 — one there confuses the column-alignment
  heuristics some clients use in the message list. **Do not move the brand off
  the front.**
- **The HTML part carries `dir` as an attribute**, with `text-align` alongside:
  Gmail strips `<html>`, `<body>`, and much of a `<style>` block but keeps the
  container and its attributes, and older Outlook honors `dir` for reordering
  while ignoring it for block alignment. The three untrusted runs — character
  label, real name (parentheses inside), message text — each sit in a `<bdi>`.
  The font stack is system Hebrew faces, **not Rubik**: mail clients don't load
  webfonts reliably.
- **The plain-text part prefixes every non-empty line with U+200F RLM.** It has
  no `dir` mechanism, a renderer judges each line's base direction separately,
  and `\n` is a paragraph separator — so one mark at the top would not reach
  line 2. Without it, `רחל בתפקיד ברוטוס 🔪 (יצא באמצע)` is fine until the
  student's name is Latin, at which point the line is judged left-to-right, the
  parentheses stop being mirrored, and the Hebrew lays out backwards. RLM rather
  than an isolate because RLM is Unicode 1.0 and universally handled, while an
  isolate can render as a visible box in a plain-text client.
- **Grammar that dodges agreement.** `hostedBy` is `מנחה: {name}`, a label
  rather than a verb, so it agrees with nothing whatever the teacher is called.
  `participant` is `{name} בתפקיד {character}`, the playbill connective; בתור
  was rejected because תור also means "queue" and the pairing rail owns that
  word. Plurals are hand-written per noun (שיחה feminine, תלמיד masculine, 1 and
  2 spelled out).

The From-name stays Latin `Chaverola` in every language. `createMailer` runs
once at boot from config, before any activity exists, so it has no record and
no locale to read; a per-locale From would mean building a transport per send.
This looks like an oversight next to a fully translated body, which is why
`mailer.ts` says so in place.

Every human-typed run is also folded to one line before either part reads it.
A message may legally contain a newline (the composer lets Shift+Enter through
and `chat:send` only trims), and the plain-text part joins on `\n` — so an
unfolded message could forge a transcript line attributed to another student,
with the two parts of the same email then disagreeing about who said what. The
same pass drops bidi overrides and embeddings, which `<bdi>` contains in the
HTML part but nothing contains in the plain-text one.

**Why:** Founder calls, 2026-07-27, as prompt 5 of the Hebrew plan. A Hebrew
teacher who ran a Hebrew lesson getting an English record of it was the last
English surface in the product. Every mechanism above is chosen against what
mail clients actually do rather than what a browser would do: `dir` attributes
over CSS because Gmail sanitizes, system fonts over the app's Rubik because
webfonts don't arrive, RLM over isolates because a 1991 control is safe
everywhere. English is untouched throughout — `EMAIL_COPY.en` reproduces the
previous constants exactly, and its plain-text part is byte-identical.

_Implemented in [copy.ts](../../server/src/email/copy.ts) and
[transcript.ts](../../server/src/email/transcript.ts); previewed in both
languages by [emailPreview.ts](../../server/scripts/emailPreview.ts). Extends
[The transcript email is HTML that reads like the app, with plain text riding along](#the-transcript-email-is-html-that-reads-like-the-app-with-plain-text-riding-along).
The catalog mechanism is
[react-i18next is the client's i18n layer; the server takes no i18n dependency](backend-api.md#react-i18next-is-the-clients-i18n-layer-the-server-takes-no-i18n-dependency);
the Latin From-name is
[The brand is חברולה in Hebrew, and the logo mark never mirrors](branding.md#the-brand-is-חברולה-in-hebrew-and-the-logo-mark-never-mirrors).
Plan in [docs/plans/hebrew](../plans/hebrew/README.md)._

### Seat events stop re-shipping ended transcripts; full snapshots heal

_2026-07-27_

**Decision:** A `chats:snapshot` triggered by seat churn — a student
connecting or resuming, the 4s disconnect gate, a "Back to the lobby" tap, a
`lobby:leave` from the queue, a `chat:leave` that leaves the room going —
sends already-ended chats **without their `messages`**. The teacher's page
reads an absent transcript as "unchanged" and keeps the lines it holds.
Anything that changes a chat's status or lines still sends everything: every
teacher command, every ending (including a student exit or a grace expiry
that empties a room), and the snapshot a teacher device gets on connect.
Active chats always carry their transcript, in either mode.

**Why:** Chats never expire from an activity, so a class doing three or four
rounds accumulates 45–60 of them, and every seat event was re-sending all of
their transcripts. The worst moment was the worst possible one: a round ends
and thirty students tap "Back to the lobby" within seconds, each tap
shipping the whole lesson to one laptop on school wifi. The dashboard got
slower the further into the lesson you were — exactly backwards. A two-line
ended chat drops from 755 to 366 bytes on the wire; a 200-line one from
about 20 KB to the same 366.

Snapshots-over-deltas is untouched, and that's the point: this is a smaller
snapshot, not a delta. Ended transcripts are immutable, and the ending
itself always ships full, so the lines are complete on the wire at the
moment they stop changing. Every ordering worry answers the same way — the
next full snapshot heals it, and a teacher's own connect is full. When a
call site is ambiguous, it stays full; slim is an optimization, never a
correctness rule. Extends [Message lines are the one delta on the teacher
wire](#message-lines-are-the-one-delta-on-the-teacher-wire) rather than
replacing it: the transcript delta still keeps live cards moving.

_Implemented in
[lobbyContext.ts](../../server/src/live/lobbyContext.ts) (`SnapshotMode`,
`chatsPayload`, `broadcastState`),
[projections.ts](../../server/src/store/projections.ts)
(`toChatSnapshot`'s `transcript` argument), and
[hostChats.ts](../../client/src/components/Teacher/HostActivity/hostChats.ts)
(the merge that holds what the payload didn't repeat)._

### A selection survives a reconnect; only leaving the queue clears it

_2026-07-26_

**Decision:** A tick in the pairing queue clears when the student actually
leaves the queue (matched away, removed, seat expired) or when the cast
shrinks below the selection. A student who drops and comes back keeps their
tick. While they're down the row dims and carries its "lost connection" tag
with the tick still showing, **Start their chat** counts only the students
who can pair right now, and a line under the button reads "Waiting on Maya
to reconnect." Tapping a dimmed row that's already ticked still unticks it;
a dimmed row that isn't ticked can't be ticked.

**Why:** A phone sleeping for a second is the most ordinary event in a
classroom, and it was silently deleting the teacher's tap. The teacher looks
up to quiet the room, looks back, and the pair they set up is gone with
nothing on screen saying why. The permanence was there to stop a real
problem (a student who leaves and returns arriving still selected from the
round before), but that problem is about absence from the queue, not about a
connection state on a row still sitting in it. Splitting the two keeps the
round-trip protection and stops the blip from costing a tap.

Untick stays live on a dimmed row because the alternative strands the
teacher: with a two-character cast, one blip on a full selection would leave
them unable to pair anybody until the phone woke up.

_Implemented in
[HostActivity/index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx)
and
[PairingPanel](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)._

### The wrapped-up card gives up on the email after 25 seconds and says so

_2026-07-26_

**Decision:** The card's "Sending your transcripts…" state is optimistic and
now bounded. If no `activity:end-result` arrives within 25 real seconds, the
card flips to an honest unknown: the message may still have gone out, we
never heard back, check your inbox. The exit CTA appears with it, and a
result that lands later still settles the card to sent or failed.

**Why:** The sending state hides the only way off the page, and the host
route has no brand link in the navbar, so a teacher whose answer never
arrives has no exit at all. The server now always answers within its own
budget, which means this timer fires only when the answer is genuinely lost:
a socket that dropped during the send, or the second-host-device case. In
both, the truthful thing to show is that we don't know. Guessing "sent"
would be a lie a teacher acts on; leaving the spinner up strands them.

25 seconds sits above the server's worst case (SMTP timeouts of roughly half
a minute answer with a failure rather than silence), so a healthy End never
sees it. It's a real-millisecond timer: live socket timers never pass through
`scaledMs`.

### End activity answers the device that pressed it, and a second host device pressing End mid-send gets no answer

_2026-07-26_

**Decision:** `activity:end` now always answers the pressing socket — the send
is bounded by SMTP timeouts, a throw anywhere in the wrap-up still emits
`activity:end-result` with the email marked failed, and the activity is torn
down either way. The one case deliberately left unanswered: a **second** host
device pressing End while the first device's send is still in flight. It hits
the send-once guard
([`teacher.ts`](../../server/src/live/handlers/teacher.ts)) and returns
without an emit, so that second device sits on "Sending your transcripts…"
until doc 03 prompt 2's client-side escape flips it.

**Why:** Founder call, 2026-07-26 — in 99% of classes there is one host
device, and the guard is what keeps one activity from mailing two transcripts.
Answering the second device properly means teaching the guard to remember who
else is waiting, which is real state for a case that barely happens. The
client-side escape covers it well enough: the second device gets its exit
after a bounded wait, and the transcript the first device triggered still
sends exactly once.

Recorded because the missing emit looks like an oversight in the handler and
reads like a bug worth "fixing" — don't change the `"sending"` guard's early
return without reopening this.

### The homepage's "full transcript" claim stands: the 200-line cap is per chat

_2026-07-26_

**Decision:** The homepage keeps promising teachers "the full transcript of
every chat"
([TeacherViewSection](../../client/src/components/home/TeacherViewSection.tsx)),
and the setup form keeps "We'll email you every chat from the activity once it
wraps up". Neither is softened.

**Why:** Founder call, 2026-07-26. Feature 11 flagged this as copy drift
against `CHAT_TRANSCRIPT_MAX_LINES` and handed it to feature 20; checking the
code first showed the premise was wrong. The cap is **200 messages per chat**,
not 200 across the activity — `appendLine` splices each chat's own `lines`
([matching.ts](../../server/src/live/matching.ts)) — so every chat in the class
is in the email however many there are, and only a single chat that runs past
200 messages loses its oldest lines. At a classroom round's length that is
close to unreachable, and the email marks it honestly when it happens
("Showing the most recent 200 messages", per chat, in
[transcript.ts](../../server/src/email/transcript.ts)). Copy that hedges
against an unreachable edge case costs every reader something to protect
nobody.

Recorded because this was flagged as drift once already and would otherwise be
re-flagged by the next agent who greps the constant without reading the splice.

### A start the cast can't seat is refused whole, not trimmed to fit

_2026-07-26_

**Decision:** When a teacher starts a chat for more students than the
server's roster has characters, the whole start is refused. Nobody is
seated, the selection stays exactly as tapped, and the rail shows a
dismissible notice naming the cast size the server actually holds and
pointing at the refresh that shows it. Two supporting calls:

- **The teacher's selection is trimmed to the cast as the roster shrinks
  under it.** Removing a character while three students are already ticked
  drops the newest tap, so the Start button's count can never offer a chat
  the roster has no seats for.
- **The rail's notice slot now carries two unrelated messages** — this
  refusal and pair-everyone's "they just chatted" skip — so its icon goes
  neutral. The slot means "here's why that didn't do what you expected".

**Why:** Founder call, 2026-07-26. `chat:start` used to clamp the request
to the roster and return a chat for whoever fit, and nothing marked the
student who didn't: `createChat` only ever _clears_ `leftoverStudentId`,
and the teacher's selection is wiped the moment a chat starts. A student
sat out a round the teacher believed they had started, with no trace of it
on either screen. Refusing keeps the teacher's intent intact — they asked
for a trio, and a pair is not a trio — and leaves the selection on screen
as the thing to fix.

Marking the unseated student as the leftover was the smaller change and was
rejected on two counts: `leftoverStudentId` is a single field, so a request
that overshoots by two can only ever explain one of them, and the tag it
renders reads "first in line", which promises the opposite of what
happened. Clamping with a notice bolted on was rejected because the chat it
starts is still not the one the teacher asked for, and once it exists the
only way out is to end it.

Worth naming so the refusal isn't mistaken for dead code: the client can
outrun the server's roster in three ways, and only one of them is a race.
A second host device never hears another's edit (no echo, by the call
below), so its panel can sit a character ahead for the rest of the lesson.
An added character is in flight for a round trip. And a roster shrinking
under an existing selection was the widest path of the three — reachable on
one device with no race at all — which the trim above closes at the source.
That is what makes the notice worth its words: what remains is mostly the
teacher whose own panel disagrees with the server, so the copy states the
server's count rather than guessing at a cause.

Two consequences. `rematchNotice` is one slot, so the last writer wins and
a successful manual start still clears it, exactly as before. And the
four-seat chat size is unaffected: a request over four is still trimmed to
four, because that is the product's chat size and has nothing to do with
the roster.

_Implemented in [matching.ts](../../server/src/live/matching.ts)
(`requestedSeats`, and `createChat` refusing instead of clamping),
[teacher.ts](../../server/src/live/handlers/teacher.ts) (the notice),
[matchRules.ts](../../shared/src/matchRules.ts) (its copy),
[HostActivity/index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx)
(the selection trim), and
[PairingPanel](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(the neutral icon); plan in
[docs/plans/feature-18](../plans/feature-18-character-roster-syncs-live.md)._

_Update (2026-08-10): the second consequence no longer holds. The chat size
is `MAX_CHAT_SEATS`, eight — the length of the character-name color palette,
since a ninth speaker would wear the first speaker's color in the same room.
Nothing is trimmed down to it either: a `chat:start` payload naming more
students than that dies at the wire without a word, and anything within the
cap is seated whole or refused whole, exactly like the roster rule this entry
records. A chat therefore seats `min(MAX_CHAT_SEATS, roster length)`, and the
teacher fills the rooms past three by tapping names — pair-everyone and the
auto-match timer still make pairs._

### Removing a character is never blocked, and its row carries no live marker

_2026-07-26_

**Decision:** A character's remove button on rows 3 and 4 works at every
moment of an activity, including while a chat is using that character. The
row gets no special treatment either: the pulsing Live dot that used to
stand in for the remove button is gone, and nothing informational replaces
it. The removed character keeps its place in every chat already running and
every chat that ended, and simply stops being dealt.

**Why:** Founder call, 2026-07-23. The lock existed for one reason: a
removed character would vanish from the roster a live chat's labels were
resolved against, and the card would fall back to rendering a raw id. Since
[A chat freezes its cast the moment it starts](#a-chat-freezes-its-cast-the-moment-it-starts)
that resolution doesn't happen — the chat holds its own labels — so the
lock guards nothing and only stops a teacher from tidying a roster between
rounds.

The dot goes with it rather than staying on as an "in a live chat" marker,
because a marker on a row that behaves like every other row is noise: the
teacher already sees which characters are chatting on the cards below, and
a second signal on a control that no longer changes its behavior only
invites the question of what it is stopping. There is deliberately **no**
server-side twin of the guard: a removal is a plain roster edit riding the
same event as a rename.

Two consequences worth naming, both correct. Dropping to two characters
flips pair-everyone's odd-count rule from seating a trailing trio to marking
the newest joiner the leftover, so an odd queue starts leaving one student
in line. And removing a character then re-adding one with the same name
mints a different id, so old chats keep resolving to their captured label
while new chats get the new id.

This fully supersedes
[A character in a live chat shows the Live dot, and its hint says who](#a-character-in-a-live-chat-shows-the-live-dot-and-its-hint-says-who).

_Implemented in
[CharacterRowsField](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)
(the guard hook and the dot deleted) and
[LiveSettingsPanel](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(the named message, and the `characterIdsInUse` engine field that fed it,
deleted with it); plan in
[docs/plans/feature-18](../plans/feature-18-character-roster-syncs-live.md)._

### The character roster reaches the lobby and every future chat, and its ids are minted client-side

_2026-07-26_

**Decision:** A character rename, an emoji swap, an added character and a
removed one all reach the server on the panel's 1-second pause, riding
feature 17's `activity:update-details` beside the host name and the
instructions. The stored roster stops being write-once: it is what students'
lobby chips render, what a student joining ten minutes later fetches, and
what the next chat is dealt from. A chat **already running** is untouched —
it keeps the cast it froze at start. Three sub-calls settle with it:

- **No teacher-room echo, for the roster too.** A second host device keeps
  its copy until its next load, exactly as the name and instructions already
  behave on this event. Last write wins per device, so a device that slept
  through another's edit overwrites it on its next commit.
- **Character ids are minted client-side and stored as given.** The server
  slugs ids at create; the live panel mints its own for rows added
  mid-activity, and the server never remints them. `mintLiveCharacterId`
  moved from a module counter to a random id in the same change.
- **The panel's promise line widens now**, rather than waiting for feature
  18's last prompt, and says what the roster does _not_ do as plainly as what
  it does.

**Why:** Founder call, 2026-07-26. This is the "bigger feature" the
2026-07-19 local-only call named and deferred, and it lands only because
[A chat freezes its cast the moment it starts](#a-chat-freezes-its-cast-the-moment-it-starts)
made a mutable roster safe: with every running chat holding its own labels,
the edit has nowhere disorienting to land.

No echo because almost every class runs on one host device, so the echo leg
plus the merge guard it would then require is code without a customer — the
same reasoning that settled it for the name and instructions, applied to the
same event. Client-side ids because the alternative (server remaps unknown
ids and echoes the canonical roster back) needs exactly that rejected echo,
breaks the panel's standing "an id never changes once a row exists" rule by
re-keying an open draft mid-typing, and buys less than it looks: once names
are mutable, a server slug goes stale against its own name on the first
rename, so "every id is a slug of its name" stops being true the day this
ships. The counter had to go regardless — it reset on every page load, so
refreshing the host page and adding a row minted an id the stored roster was
already using, which would deal two chat members the same characterId and
collapse a student's peer labels into each other. A duplicate-id zod refine
backs the new scheme up.

The copy moved early for the reason it moved early in feature 17: after this
ships, "Characters only change this page for now" is not merely incomplete
but false, and a panel that lies about what travels is worse than one that
under-promises.

This supersedes the characters half of
[Settings edits sync for real; characters, scenario, and host name stay local](#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local)
and the remaining local-only clause of
[The live-settings panel stays on real activities, editing the teacher's local view](#the-live-settings-panel-stays-on-real-activities-editing-the-teachers-local-view)
— both are now fully retired, their name/instructions halves having gone in
feature 17.

_Implemented in [socket.ts](../../shared/src/socket.ts) (the roster on both
sides of the event), [activity.ts](../../server/src/schemas/activity.ts)
(the live-character schema and its duplicate-id refine),
[teacher.ts](../../server/src/live/handlers/teacher.ts) (the store's roster
becomes mutable), [projections.ts](../../server/src/store/projections.ts)
(`toActivityDetails` carries it),
[hostActivity.ts](../../client/src/lib/hostActivity.ts) (`mintLiveCharacterId`,
`sameRoster`),
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx) (the
roster diff), and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx) (the
lobby fold); plan in
[docs/plans/feature-18](../plans/feature-18-character-roster-syncs-live.md)._

### A chat freezes its cast the moment it starts

_2026-07-26_

**Decision:** When a chat forms, each seat's character is captured onto the
chat's stored members, and every surface that shows a character **inside a
chat** reads that snapshot: the teacher's in-progress and completed cards,
both students' bubbles and peer labels, the end-of-chat reveal rows, and the
emailed transcript. The student wire carries it as `cast` on `chat:started`
(and every resume re-delivery). Character edits reach the waiting lobby and
every chat that starts **after** the edit (feature 18 prompt 2 makes the
roster mutable); a chat already in progress keeps the cast it started with,
always. The teacher-page-only relabel (`withCurrentCharacters`), which
re-resolved card labels against the local roster on every render, is retired
— cards render the captured truth.

**Why:** Founder call, 2026-07-23. Renaming the cast is a between-rounds
move, not a mid-conversation one: two students deep in a scene as Brutus and
Cassius should not watch their names rewrite themselves under them, and the
teacher and both students must always agree on who is in that room. The
alternative — following a rename into a live chat, which earlier drafts of
the feature planned — was rejected as disorienting for no gain. The snapshot
also makes removing a character label-safe at any time (its label lives on
in the chats that used it), which feature 18 prompt 3 leans on. This revises
[Live edits propagate after a 1-second pause, and invalid states never do](#live-edits-propagate-after-a-1-second-pause-and-invalid-states-never-do):
its promise that valid edits apply to "in-progress chat cards, student
surfaces" no longer describes character edits.

_Implemented in [matching.ts](../../server/src/live/matching.ts) (the
capture at chat start),
[projections.ts](../../server/src/store/projections.ts) (`toChatSnapshot`
reads the snapshot; `toChatStarted` ships `cast`),
[transcript.ts](../../server/src/email/transcript.ts) (the email reads it
too), and
[useActiveMatch](../../client/src/pages/student/join/useActiveMatch.ts)
(in-chat labels resolve against `payload.cast`); plan in
[docs/plans/feature-18](../plans/feature-18-character-roster-syncs-live.md)._

### Students' lobbies follow name and instructions edits live, and the swap is silent

_2026-07-26_

**Decision:** A student sitting in the lobby now watches "Hosted by" and the
Instructions block change when the teacher edits them mid-activity — feature
17's `activity:details-changed` finally has a client listener. The swap is
**silent**: the copy re-renders in place with no banner and no highlight, the
same manner `activity:paused` arrives in (founder call, 2026-07-26). Cleared
instructions remove the block entirely rather than leaving an empty one. And
the settings panel's promise line folds the name and instructions into the
"saves as you type" half **now**, instead of waiting for feature 18 to widen
it in one pass (founder call, same day): after the server half shipped, the
old sentence — "refreshing undoes those edits" — was actively false.
Characters stay this-page-only until feature 18, and the promise line still
says so.

**Why:** This retires the name-and-instructions half of two standing
decisions —
[Settings edits sync for real; characters, scenario, and host name stay local](#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local)
and
[The live-settings panel stays on real activities, editing the teacher's local view](#the-live-settings-panel-stays-on-real-activities-editing-the-teachers-local-view)
— whose characters half stands for feature 18. An announcement was on the
table and rejected as the bigger build for a moment students mostly aren't
watching; a lobby student is waiting, not studying the instructions, and the
paused banner precedent says world-state changes may just happen. The client
lands the event by rebuilding the activity and settling it into the existing
lookup (settled state already outranks the hand-off map and any refetch), so
no new state, no reducer — nothing about a chat changes, which is also why a
mid-chat student is undisturbed and simply finds the new copy if they return
to the lobby. A disconnected student misses the event and heals on reload;
the next joiner always gets fresh truth from the lookup.

_Implemented in
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts) (the
relay), [useActiveMatch](../../client/src/pages/student/join/useActiveMatch.ts)
(forwarded untouched), and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx) (the
rebuild + `deliver`); plan in
[docs/plans/feature-17](../plans/feature-17-host-name-and-scene-sync-live.md)._

### Name and instructions edits sync with no second-device echo, and an emptied box clears

_2026-07-26_

**Decision:** `activity:update-details` (feature 17) carries the host name and
the student instructions to the server, which stores them and fans
`activity:details-changed` out to connected student seats only — never the
teacher room. A second host device keeps its copy until its next refetch:
silent last-write-wins, the email's idiom, not the settings echo. And an
emptied instructions textarea travels as `null` and deletes the stored
instructions — the block disappears from students' lobbies, matching how the
teacher's own page already treats empty as "no instructions"
(`activityFromLiveDraft` omits it).

**Why:** Founder call (2026-07-26): almost every class runs on one host
device, so the echo leg — the room emit plus a `mergeExternalDetails` guard so
an arriving echo can't clobber a half-typed draft — is code without a
customer. If the echo is ever added, that guard becomes mandatory:
`LiveSettingsPanel` seeds its draft once and never re-reads these fields, so a
bare echo would overwrite whatever the teacher is mid-typing. The clear-means-
remove call keeps one meaning for an empty box on every surface.

_Implemented in [teacher.ts](../../server/src/live/handlers/teacher.ts) and
[lobbyContext.ts](../../server/src/live/lobbyContext.ts)
(`sendActivityDetails`); plan in
[docs/plans/feature-17](../plans/feature-17-host-name-and-scene-sync-live.md)._

### A return to the host page refetches, behind the normal loading screen

_2026-07-25_

**Decision:** The create → host hand-off entry is one-shot: the mount that
receives it renders fetch-free as before, then its mount effect settles the
activity into hook state and deletes the map entry. Any later mount of the
same host key — Back to the create page and Forward again is the real path —
fetches `GET /activities/host/:hostKey` and renders the server's copy, with
today's "Finding your activity…" screen showing while the fetch is in
flight. The founder chose that visible beat over rendering the last-known
copy and folding the fresh one in (2026-07-25): it is the smallest change,
it is honest, and the stall is brief now that the API is on a paid instance
that never spins down.

**Why:** The entry used to live forever, and the lookup skipped its fetch
whenever the entry existed — so a teacher who tapped Back and then Forward
mid-class remounted onto the create-time copy: zero network, the email field
blank minutes after they'd set it (the email rides no snapshot, so nothing
heals it), and the next settings flip based on a stale object could roll the
class back within the sub-second window before the reconnect fold lands.
Reproduced in-browser 2026-07-25 (feature 16). The language switcher, the
audit's suspected path, turned out not to be one: `/` and `/he` render the
same components at the same positions in the route tree, so React keeps the
page instance across an EN⇄HE switch — no remount, no socket churn, state
intact (watched: zero GETs, email survives). One accepted wart: StrictMode's
second effect run in dev finds the map already consumed and fetches once on
create → host — one extra dev-only GET, not a loop; production stays
fetch-free since StrictMode's double-invocation is a development behavior.
The student-side map keeps the old forever-entry shape for now — its
reachable remount (home, Back/Forward into the join page) is noted in the
code and accepted.

_Implemented in
[useHostedActivityLookup](../../client/src/lib/useHostedActivityLookup.ts)
(the consume-in-effect); makes
[Settings edits sync for real; characters, scenario, and host name stay local](#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local)'s
no-silent-revert guarantee hold across in-session navigation too. Plan in
[docs/plans/feature-16](../plans/feature-16-the-host-page-never-serves-a-stale-snapshot.md)._

### The transcript email is HTML that reads like the app, with plain text riding along

_2026-07-24_

**Decision:** `formatTranscriptEmail` composes two bodies from one record —
the original plain-text part and an HTML alternative, sent as one multipart
message through nodemailer's `text` + `html` fields (feature 22). The HTML
mirrors the teacher's live cards: `(Ana) Herzl 🎩: text`, real name muted
gray, character name bold in its roster color from `CHARACTER_EMAIL_COLORS`
(`shared/src/colors.ts`), seeded by the same rule as the grid's
`rosterCharacterColors` — roster-first, so the email and the live page agree
on every character's color, falling back to that chat's own cast first when a
roster long enough to outrun the eight-color palette would otherwise print two
of its speakers in one color. Chats sit under a hairline `border-top` with a small
uppercase gray `CHAT 1 OF 3` label where the plain text draws `──────────`;
a summary line (`3 chats · 6 students` — distinct students across the chats)
joins the header of **both** bodies so they can't disagree. The quiet notes
— `(No messages in this chat.)`, `(left partway)`, the 200-message cap —
render small and gray, never full-weight body copy. Every interpolated value
passes a local `escapeHtml`; student text is untrusted input meeting markup
for the first time. **No background color on any element**, inline styles
only, no images, one 640px container. Log mode keeps logging the text part
only; the design check is `pnpm preview:email`, which renders a fixture
class to a temp file and prints the path.

**Why:** Founder calls (2026-07-24). A teacher scanning fifteen stacked
pairings needs the anchors the live grid already gives them — color and
weight on character names; the plain-text wall gave every line the same
weight. No backgrounds because a teacher may print the email, and a page of
colored blocks is a page of wasted ink. Inline styles because they survive
more mail clients than `<style>` blocks, and a real class is nowhere near
Gmail's ~102KB clipping limit anyway. The plain-text part stays as the
multipart alternative so plain-text clients, screen readers, the dev log,
and the existing formatter tests all keep working.

### A woken host device reads the class settings back before it can write them

_2026-07-24_

**Decision:** `chats:snapshot` now carries the stored `ActivitySettings`,
projected through `toActivitySettings` — an exact-allowlist field literal
like every other projection, pinned in `projections.test.ts`. The client
folds that copy into its activity state on the **first** snapshot after each
socket connect, through the same `onSettingsSync` path `settings:changed`
uses — never through the commit wrapper, so a fold can't echo back out as an
edit. Later snapshots in the same connection don't fold: an unconditional
fold would bounce a just-flipped switch whenever an unrelated seat or chat
broadcast was already in flight. The sync is silent — no note — matching how
`settings:changed` already behaves on a second device (founder call,
2026-07-24).

**Why:** `settings:update` is a full replace, and its echo only reaches
sockets connected at that instant. A host laptop that slept through a
settings change woke holding its old copy, and the next thing the teacher
touched — any switch, the stepper — shipped that whole stale object and
silently reverted the class (reproduced two-tab, 2026-07-24; auto-match
flipping back on for everyone was the sharp case). The snapshot is the
natural carrier: it's already where teacher-wide world truth rides at
connect (`paused`, `lastPartners`, `rematchNotice`), and the lobby room's
only members are teacher sockets, so students can't receive it — the
`toActivity` pin keeps settings off the student wire as before.

**The offline-edit corner, observed and accepted:** an edit made while the
socket is down does land — socket.io-client buffers the emit and flushes it
at reconnect (watched on the wire, 2026-07-24: the buffered
`settings:update` rides the first packet burst at wake; this corrects the
older working assumption that such an edit is simply lost). The join
snapshot is built before that flush is applied, so the woken device's own
screen can briefly show the pre-edit server copy while the server holds the
edit; the two reconverge on the device's next edit or sync. Making that
corner deterministic would take a buffer-aware fold; the founder chose
least-code — keep what naturally happens and record it (2026-07-24).
[Feature 15](../plans/feature-15-the-panel-respects-a-dropped-connection.md)
owns the offline settings-panel treatment that makes an offline edit
reachable at all.

**The demo needs nothing and cannot show this:** `1234` is structurally
zero-network — there is no socket to drop, so no reconnect exists to fold on
(re-verified: zero `/socket.io/` traffic).

_Extends
[Settings edits sync for real; characters, scenario, and host name stay local](#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local)
— the whole-object replace and the room-minus-sender echo stand unchanged;
this only makes sure a reconnecting device holds current settings before it
can send any. Implemented in
[projections.ts](../../server/src/store/projections.ts)
(`toActivitySettings`),
[lobbyContext.ts](../../server/src/live/lobbyContext.ts) (`chatsPayload`),
and
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(the connect-latched fold)._

### A click in the live settings panel commits alone and immediately

_2026-07-24_

**Decision:** The live settings panel's commit gate splits by input kind.
Clicks — the three settings switches, the auto-match seconds stepper, and a
character row's remove button — commit the moment they happen, each carrying
only its own change: the commit spreads from the committed activity, so a
half-typed name, scene, or email elsewhere in the panel can neither hold the
click back nor ride along with it. Typed fields keep the 2026-07-15 rule
verbatim: they commit on the 1-second pause and only while the whole draft is
valid, with the inline field error as the only signal that an edit is being
held (founder call, 2026-07-24 — no extra "waiting" copy). Removal commits
even while another field is invalid (same call); the Live-dot guard on a
character in a live chat still blocks those removals.

**Why:** One all-or-nothing gate froze the four controls that are wired to
the server end to end. A teacher with `ms.cohen@` half-typed could flip
auto-match off in the panel and nothing would happen — the rail's switch,
the same setting a few inches away, stayed on and the class kept being
paired, falsifying the "two switches can never disagree" guarantee. Worse
for transcripts: a corrected email couldn't reach the server while any other
field had a problem, so sends kept going to the old address with nothing on
screen to say so. And a remove click with any unrelated field invalid made
the row vanish from the panel while the roster still counted it — a phantom
slot. The typing half of the 2026-07-15 rule stands because it protects
students from half-typed names flashing across chat cards; a switch, a
stepper, or a remove button has no invalid in-between state to protect
anyone from.

_Implemented in
[LiveSettingsPanel](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(`changeSettings`, `removeCharacter`); amends
[Live edits propagate after a 1-second pause, and invalid states never do](#live-edits-propagate-after-a-1-second-pause-and-invalid-states-never-do)._

### The live settings panel only claims the edits that actually travel

_2026-07-23_

**Decision:** Every sentence in the **Edit activity settings** panel is now
scoped to what the app really does. The lead paragraph says settings and the
teacher's email save on the typing pause, and that characters, the scene and the
host name only change this page for now, with students keeping the setup copy and
a refresh undoing the edit. The old promise that changes reach everyone
"including what students see mid-chat" is gone, and so is the "the natural time
to switch up the characters or the scene is between rounds" line that implied a
cast switch reaches the class. The **Match students 1:1 automatically** row
admits the hold: while chats are paused it opens with the pairing rail's exact
sentence, "Auto-match is on hold while chats are paused.", then says what happens
on resume. It follows the rail's off > paused > on precedence, so a switched-off
row keeps describing what turning it on will do rather than reporting a hold that
isn't the reason nothing is pairing. The collapsed hint's email nudge became an
invitation ("Add your email and we'll send you every chat when the activity wraps
up") instead of the old "No email yet." assertion. One paragraph serves both
engines: no `1234` variant.

**Why:** The panel was describing the host page as it worked in July when it was
client-side, and had kept saying so through the 2026-07-19 founder call that made
roster, scene and host name local-only. A teacher who renames a character and
watches nothing happen on any student screen has been told the app is broken by
the app itself. The auto-match row and the pairing rail sit six inches apart on
desktop and disagreed outright, which is worse than either one being wrong alone,
so the row borrows the rail's sentence verbatim rather than saying the same thing
differently. The email nudge fired off this tab's copy of a value that lives on
the server and has no echo event
([The teacher's email syncs live; the rest of the roster still doesn't](#the-teachers-email-syncs-live-the-rest-of-the-roster-still-doesnt)),
so a second host device kept nudging long after the first one set an address;
softening it to an invitation drops the claim about state while keeping the nudge
where a teacher who skipped email at setup will actually meet it (the panel opens
collapsed). No demo variant because the demo banner already frames the class as
pretend, and a second paragraph would double the surface every later feature has
to keep honest.

**This copy is temporary, and it does not widen back to where it started.**
Features 17 and 18 widen it as their sync ships, to their own narrower scope:
host name and scene reach everyone live, character edits reach the lobby and
future chats, and a chat already in progress deliberately keeps its cast. Whoever
finishes 18 widens the copy to _that_, never back to "what students see
mid-chat".

_Done 2026-07-26: 17 and 18 shipped and the paragraph was widened to exactly
that scope — every edit reaches the server on the pause, lobbies follow, and
a running chat keeps its cast. The instruction above is closed; the "never
widen back to mid-chat" half is the part that still binds._

_Implemented in
[LiveSettingsPanel](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(the paragraph and the collapsed hint) and the `paused` prop on
[SettingsSection](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx),
fed `engine.paused` from
[index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx) — the
value the rail already had. Presentational only: `paused` never enters the draft,
so the panel still emits on a settings or email diff and nothing else._

_Update (2026-07-26): feature 17's widening happened, on the schedule this
entry set — the lead paragraph now counts the host name and the instructions
among what saves and says lobbies see those changes live, leaving characters
as the one this-page-only edit. See
[Students' lobbies follow name and instructions edits live, and the swap is silent](#students-lobbies-follow-name-and-instructions-edits-live-and-the-swap-is-silent).
Feature 18 widens it once more, to its own scope._

### A best-effort fallback emails the transcript if the teacher just closes the laptop

_2026-07-23_

**Decision:** If a teacher never clicks End and just closes the tab, the server
sends the transcript on its own about 10 minutes after the last teacher socket
for that activity disconnects. The "is a teacher really gone?" question is
answered when the timer fires, not when it is armed: a reconnect, or a second
host tab that stayed open, means a teacher is still connected at that point, so
the fallback does nothing. It only emails. It does not end the activity or move
students off their chats (any open chats keep running until students leave or the
12h TTL), and it is completely silent in the UI, so teachers are never told the
net exists. The send-once guard (prompt 2) means a later explicit End cannot
produce a second email. It survives anything the process itself survives: an
in-memory timer dies with a restart or a deploy, so a push mid-window still
loses that send.

**Why:** The whole point of the transcript email is that a teacher does not have
to remember to trigger it, but the explicit End button still asks them to. The
common miss is closing the laptop at the bell, so a fallback catches exactly that
case. Ten minutes is long enough to absorb a bathroom break or a wifi blip
(either reconnects, and a present teacher cancels the send at fire time) while
still landing the transcript close enough to the lesson to be useful. It was
originally also bounded by the free tier's idle spin-down, which could kill the
timer before it fired; moving to a paid instance
([the API runs on a paid Render instance](../decisions/backend-api.md#the-api-runs-on-a-paid-render-instance-because-free-web-services-block-outbound-smtp))
removed that failure mode, so the ten minutes is now a product choice rather
than a race against the process. Email-only, not a full end, because a
fallback firing means a real ten-minute absence, not necessarily the end of
class, and quietly nuking a class that is still productively chatting would be
worse than leaving it be. Silent, because promising a safety net we cannot always
honor (the spin-down case) would be a worse experience than a net that simply
works when it can. Keeping the presence check at fire time rather than juggling
cancel-on-connect and a disconnect-time socket scan puts the whole thing in one
place and avoids depending on Socket.IO's removal ordering during a disconnect.

_Implemented as [transcriptFallback.ts](../../server/src/live/transcriptFallback.ts),
armed on teacher disconnect in
[handlers/teacher.ts](../../server/src/live/handlers/teacher.ts) and cancelled on
activity removal in [lobby.ts](../../server/src/live/lobby.ts), reusing the
prompt-2 `sendTranscriptEmail` guard._

### End activity is the terminal wrap-up, and it emails the class transcript

_2026-07-23_

**Decision:** The live page has an **End activity** button, behind a confirm
dialog, at the bottom of the chats column below the completed chats. Ending is
terminal: every chat ends, students land on the existing activity-over screen,
the join code stops resolving, and the whole class transcript is emailed to the
teacher's address (or nothing is sent, if they left the email blank). One
activity ends at most once. It is deliberately a page-level action, kept apart
from "End all chats" in the chats toolbar: that one closes a round and the class
keeps going, this one closes the class. The button is disabled while the
teacher's own connection is down, since the emit couldn't reach the server. The
confirm copy names the three consequences and where the transcript goes, with a
live chat count.

**Why:** The email was promised at setup ("We'll email you every chat once it
wraps up") but never had a moment to fire. A concrete, teacher-driven event is
the only reliable send point on a free-tier instance that spins down when idle,
so "send it later" would usually lose the email to a dead process. Ending the
whole activity by hand is also the honest counterpart to the no-timer decision
([Chats show no timer or clock](#chats-show-no-timer-or-clock--the-teacher-ends-them-by-hand)):
the teacher decides when the class is over, and that decision is what sends the
transcript.

_Implemented as `activity:end` / `activity:end-result` in
[handlers/teacher.ts](../../server/src/live/handlers/teacher.ts) (reusing the
prompt-2 `sendTranscriptEmail` guard), the `endActivity` seam across
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
and [useHostActivityDemo](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts),
and the End button + wrapped-up screen in
[the dashboard](../../client/src/components/Teacher/HostActivity/index.tsx) and
[WrappedUpCard](../../client/src/components/Teacher/HostActivity/WrappedUpCard.tsx)._

### Ending removes the activity right away; the wrapped-up screen is local to the tab

_2026-07-23_

**Decision:** On End, once the transcript send settles, the activity is removed
immediately through the store's normal removal path, with no retention machinery
in V1. The wrapped-up confirmation (sending, then sent / failed / nothing to
send) lives only in the clicking tab's local state. A refresh after ending shows
the normal not-found page, and a second host device just sees the activity
vanish. If the send fails, the activity is still removed and the failure card
tells the teacher to copy the chats that are still readable below before closing
the tab. Accepted.

**Why:** Keeping the activity alive to back a durable "you already ended this"
screen would mean a retention state machine, a way to re-fetch after refresh, and
a second-device story, for a terminal action a teacher takes once. The tab that
ended it shows the outcome, and every other path (refresh, second device) resolves
to the same honest not-found the store already serves for a gone activity. The
failed-send case leans on the same readable transcripts rather than a retry,
because the record is already gone.

_Implemented via `removeActivity` in
[activityStore.ts](../../server/src/store/activityStore.ts) (reusing
`onActivityRemoved`'s teardown) and the terminal latch in
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
that keeps the wrapped-up screen from flipping to not-found when the server
removes the activity underneath it._

### The teacher's email syncs live; the rest of the roster still doesn't

_2026-07-23_

**Decision:** Editing "Your email" in the live settings panel now reaches the
server (`activity:update-email`), which validates it and stores it on the
activity — or deletes it when the teacher empties the field. It is the second
thing that syncs from that panel, and the list stops there: characters, the
scene, and the host name stay local to the teacher's page. The event has no
echo: a second host device is not told, so last write wins. An edit made while
the socket is down is buffered by the client and lands at reconnect, exactly
like a settings edit (this corrects the original "is lost" wording — see the
offline-edit corner under
[A woken host device reads the class settings back before it can write them](#a-woken-host-device-reads-the-class-settings-back-before-it-can-write-them);
browser-verified 2026-07-25, feature 15).

**Why:** Feature 11 makes the email do something — the server mails every
transcript there when the activity ends, quite possibly after the teacher has
closed the tab. So the value that matters is the server's, and an edit that
only ever lived in React state would silently mail the address from setup (or
nothing at all, for the teacher who took the panel's "No email yet. Add yours
to get every chat sent to you afterward" nudge). That nudge had been writing
to a dead end since the panel shipped. No echo because the settings echo
exists for controls that live in three places at once (the rail's switch,
End-all's hold, the panel); the email lives in exactly one field the teacher
is looking at, and a mid-typing overwrite from another device would be worse
than a stale copy.

_Implemented in the `activity:update-email` handler in
[handlers/teacher.ts](../../server/src/live/handlers/teacher.ts) (validated by
`teacherEmailUpdateSchema`, which is the create request's email rules plus an
explicit null for clearing) and the same `onActivityChange` wrapper in
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx) that
already catches every settings commit. Extends
[Settings edits sync for real; characters, scenario, and host name stay local](#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local)._

### Chats show no timer or clock — the teacher ends them by hand

_2026-07-22_

**Decision:** Chats have no auto-end timer, and the teacher's cards have no
clock. There's no "End chats on a timer" setting, no countdown in the student
chat header, no ⏰ "Time's up!" ending, and no count-up "elapsed" clock on the
chat cards. A chat ends only when someone acts on it: the teacher (per chat or
"End all chats"), a student who leaves or ends it, or a 1:1 partner whose
disconnect grace runs out. Gone with it — the `autoEndChats`/`autoEndMinutes`
settings, the `"timer"` end reason, and the wire's `elapsedSeconds`.

**Why:** Product-owner call (2026-07-22). A teacher usually can't tell up front
how long an activity will run, so a countdown students can see promises
something the teacher can't keep: end the activity early while a student's chat
still shows time left, and that student feels cheated. The game-like appeal
wasn't worth the risk. The teacher's own elapsed clock came out for a simpler
reason — it's not something the teacher acts on, so it was just noise on the
card.

_Removed from
[useChatDemo](../../client/src/components/chat/useChatDemo.ts),
[useHostActivityDemo](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts),
[hostWorld](../../client/src/components/Teacher/HostActivity/hostWorld.ts), the
[teacher chat card](../../client/src/components/Teacher/ChatCard/ChatCardHeader.tsx),
and the
[setup form](../../client/src/components/Teacher/ActivitySetup/SettingsSection.tsx).
Supersedes
[Every chat runs its own auto-end clock, and students watch it tick](#every-chat-runs-its-own-auto-end-clock-and-students-watch-it-tick),
[Auto-end edits: new minutes wait for new chats; the toggle acts immediately](#auto-end-edits-new-minutes-wait-for-new-chats-the-toggle-acts-immediately),
and
[The live card's count-up clock appears only after the first minute](#the-live-cards-count-up-clock-appears-only-after-the-first-minute)._

### Pausing ships end to end; the grace window keeps running through it

_2026-07-21_

**Decision:** "Pause all chats" / Resume work on live activities, to the
2026-07-17 spec ([Pause is one world-level switch](#pause-is-one-world-level-switch-chats-freeze-clocks-hold-matchmaking-waits))
with one amendment: **the 120s disconnect grace window keeps running
through a pause.** The server stores a single `pausedAt` timestamp —
both the flag and the freeze anchor. While set: `chat:send` and
`chat:typing` refuse silently, the auto-match tick stands down, and
snapshots compute `waitSeconds`/`elapsedSeconds` against the anchor, so
every clock the teacher sees is frozen — but "reconnecting" tags keep
real time, since their grace clock is still running. Resume (and
End-all, which still clears the pause) shifts every seat's `joinedAt`
and every active chat's `startedAt` forward by the pause duration,
clamped to now: pre-pause time is preserved, mid-pause arrivals resume
at zero, and no clock jumps. Every connected student hears one
`activity:paused` flip — chat members freeze in place (banner, locked
composer), lobby waiters get the "Class is paused" pill — and
`lobby:welcome` carries the state so a refresh mid-pause stays frozen.
The `pausingEnabled` engine seam and its "comes in a later update" hint
are deleted.

**Why:** Founder calls (feature-7 planning, 2026-07-21): freeze
everything the old spec froze EXCEPT the grace window — a pause must
never stop a dead phone from being reaped and its partner freed; the
teacher would discover the stuck room only at resume. And the pause
reaches everyone, not just chat members — a lobby student watching
auto-match do nothing deserves the why. One field instead of a boolean
plus bookkeeping: the anchor makes the freeze a projection detail and
the resume shift one loop, with no per-entity offset state to leak.
Sends refused at the activity level (not per chat) mean a chat manually
paired mid-pause is born frozen with zero extra code. The pause state
rides `lobby:welcome` for connects and one broadcast for flips, and the
client keeps it out of the persisted session on purpose — sessionStorage
must never outlive the truth that minted it. Client display components
needed no changes at all: the whole paused UI shipped back in the demo
era and was waiting on real state.

_Implemented in [matching.ts](../../server/src/live/matching.ts)
(`pauseChats`/`resumeChats`),
[handlers/teacher.ts](../../server/src/live/handlers/teacher.ts) (the two
handlers and their guards) with `sendActivityPaused` in
[lobbyContext.ts](../../server/src/live/lobbyContext.ts),
[projections.ts](../../server/src/store/projections.ts) (the clockNow split),
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(the emitters, `paused`, and the held tick), and
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts) (the
student side); plan in
[docs/plans/feature-7-pausing.md](../../docs/plans/feature-7-pausing.md)._

### Ending ships for real; pausing keeps the placeholder seam

_2026-07-21 · The pausing half is superseded by
[Pausing ships end to end; the grace window keeps running through it](#pausing-ships-end-to-end-the-grace-window-keeps-running-through-it):
the `pausingEnabled` seam and its hint line are gone — pause is real on
both engines. The ending half stands as written._

**Decision:** "End chat" (per card) and "End all chats" work on live
activities. Two new teacher commands — `chat:end { chatId }` and
`chats:end-all` — flip the chat to `status: "ended"` with reason
`"teacher"` while membership stays intact (nobody is marked inactive).
Every member's seat goes wrappingUp with the same semantics as a below-2
end: connected members hear `chat:ended` and land on the ended screen, a
dropped member gets a fresh 120s grace and hears it on resume (a cold
resume then returns them to the lobby — the existing post-refresh path,
which shows no ended screen for a chat the page no longer holds), and
the return to the queue is otherwise each student's own "Back to the
lobby" tap, never automatic. "Pause all chats"
stays a disabled placeholder behind the engine flag, renamed
`endingEnabled` → `pausingEnabled` (demo `true`, live `false`), and the
shared hint now reads "Pausing chats comes in a later update."

**Why:** Founder call (feature-6 planning, 2026-07-21): ending only —
pausing is its own machinery (world-level freeze, composer disabling,
resume behavior) and stays behind rather than shipping half-real. The
flag was renamed, not kept: with ending real on both engines a
constant-true `endingEnabled` is dead code, and the seam that remains is
pausing's. Teacher ends reuse `settleMembershipChange`, so a
teacher-ended chat behaves exactly like a below-2 end — one ending
experience for students, no new states. End-all is **one server command**
(one loop over active chats, one broadcast), not N client emits, so the
round closes in a single handler tick. Deliberately not added: `endedAt`
on the stored chat (ended cards never render the clock, so the growing
`elapsedSeconds` is invisible), rematch memory (teacher-initiated ends
make rematches reachable for the first time, but tracking last-partners
is its own feature), and any auto-return to the queue. One known benign
window: the End-all confirm emits `chats:end-all` then `settings:update`
(the auto-match hold) in order on one socket; an auto-match tick landing
between the two handlers could still pair two _waiting_ students —
sub-second, and the just-ended students are wrappingUp-ineligible either
way.

_Implemented in [matching.ts](../../server/src/live/matching.ts) (`endChat`),
[handlers/teacher.ts](../../server/src/live/handlers/teacher.ts) (the
`chat:end` and `chats:end-all` handlers),
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(the emitters and `pausingEnabled: false`), and
[ChatsInProgressSection](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
(the pause-only hint); plan in
[docs/plans/feature-6-ending-chats.md](../../docs/plans/feature-6-ending-chats.md)._

### The teacher reads every chat, and that ships with messaging — not after it

_2026-07-20 · Shipped 2026-07-21: `chat:transcript-line` to the teacher
room per message, the whole capped transcript on `ChatSnapshot.messages`,
and the homepage's teacher bullet is true again._

**Decision:** Live chat cards fill with the real transcript as students type,
each line prefixed with the sender's real name in the established format
(`(Rachel) Brutus 🔪: text`). Read-only — the teacher still has no composer.
It ships as its own prompt in
[feature-4-messaging.md](../../docs/plans/feature-4-messaging.md), immediately after
the prompt that lets students send, and is not deferrable past it.

**Why:** Founder call (2026-07-20). The homepage already promises this: the
teacher-view bullet says students only see each other's characters, "nobody
is anonymous to the teacher, and anyone who gets out of line is
identifiable"
([The teacher bullets say the safety part out loud](homepage.md#the-teacher-bullets-say-the-safety-part-out-loud)).
Teacher oversight is also the **only** moderation mechanism the product has,
by deliberate choice
([The server never inspects what students write](chat-behavior.md#the-server-never-inspects-what-students-write)).
So student messaging without a teacher transcript wouldn't just be an
incomplete feature — it would make a live marketing claim untrue and remove
the thing that makes anonymous student chat defensible in a classroom.

It is a separate prompt only because every prompt has to be one working thing
(see
[Features ship as end-to-end slices, not layers](process.md#features-ship-as-end-to-end-slices-not-layers)).
The gap between the two prompts is acceptable **only** while no real classes
are running on production; if that changes, the second prompt becomes urgent
rather than next.

_Implemented in
[useHostActivityLive.ts](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(the snapshot mapping and the delta merge) and
[ChatCard](../../client/src/components/Teacher/ChatCard/), which has rendered
transcripts with real names since the demo._

### Message lines are the one delta on the teacher wire

_2026-07-21_

**Decision:** The teacher wire stays snapshots-over-deltas everywhere
except message lines: each accepted `chat:send` emits one
`chat:transcript-line` to the teacher room, and the client appends it to
the matching card. Everything else about a chat still arrives only whole,
via `chats:snapshot` — which **also** carries the full capped transcript
(`ChatSnapshot.messages`).

**Why:** A full `broadcastState` per message would be far too fat — a
classroom of chatting students would re-send every card's whole state on
every keystroke's worth of talk. The deviation is safe precisely because
the snapshot remains authoritative: a dropped delta heals on the next seat
change or reconnect instead of wedging a card, so the delta is an
optimization, never the only path. The same shape as the student side's
`chat:line` vs `chat:started.lines` — deltas for liveness, a fat resume
payload for truth. Don't extend deltas to membership, status, or clocks;
those stay snapshot-only.

_Implemented in
[handlers/studentChat.ts](../../server/src/live/handlers/studentChat.ts) (the
`chat:send` handler's room emit) and
[useHostActivityLive.ts](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(the id-deduped, cap-mirroring merge)._

### Disabled ending controls share one hint line, not one per card

_2026-07-20 · Copy updated 2026-07-20: messaging shipped, so the line
stopped promising it — it now reads "Ending and pausing chats come in a
later update." The one-shared-line structure stands unchanged._

_Narrowed 2026-07-21 by feature 6: ending shipped, so End chat and End
all chats are live and ungated, and the line covers only the still-disabled
Pause — "Pausing chats comes in a later update." (gated by
`pausingEnabled`). The one-shared-line structure stands for whenever
pause needs company again._

**Decision:** On a live activity, "End all chats", "Pause all chats", and
every card's "End chat" render disabled, explained by a single muted hint
line in the Chats-in-progress toolbar ("Ending and pausing come in the next
update, along with messaging itself."). No per-card hint, no tooltip.

**Why:** Founder call (2026-07-20), choosing between per-card hints,
tooltips, and one shared line. Per-card repeats the same sentence across the
whole grid; tooltips are invisible on touch devices, leaving teachers on
tablets with unexplained dead buttons. One line beside the disabled section
buttons covers all three controls and disappears with them when ending
ships (`endingEnabled`).

_Implemented in [ChatsInProgressSection](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)._

### An empty live transcript explains itself; a finished one doesn't

_2026-07-20 · Superseded 2026-07-20 by the messaging slice, which made both
halves of the copy untrue: students CAN type now (the hint became "Students
can type now. Their messages show up here in the next update."), and a
finished card DOES need a line — ended chats are reachable and their cards
would otherwise show a blank box under copy promising a reread, so
`CompletedChatsSection` gained its own `emptyHint` ("You can't read this
chat yet. Transcripts arrive in the next update."). Both hints still ride
`endingEnabled`, now as a bare live-activity proxy; the teacher-transcript
slice decouples them and replaces both with a real empty state._

_Closed out 2026-07-21 by the teacher-transcript slice: both hints are now
real empty states, unconditional, and `endingEnabled` gates only the
ending controls. A silent live card says "No messages yet. They'll show up
here as students type." (also visible for a beat on a freshly paired demo
chat, where it's equally true); an empty ended card says "This chat ended
before anyone said anything." — reachable when the below-2 rule ends a duo
before its first message._

**Decision:** On a real activity, a card in "Chats in progress" with no
messages fills its transcript area with one centered line — "Nothing to read
yet. Students can't type until messaging arrives in the next update."
Completed cards get no such line, and demo cards never show it at all.

**Why:** An empty transcript under a Live badge reads as a broken chat: the
teacher's natural conclusion is that these students aren't talking, not that
nobody in the building can type yet. The hint answers that where the
question actually gets asked. On a completed card the same sentence is
noise — the chat is over, the section header already says so, and nobody is
monitoring it for signs of life. A demo card's silence needs no explanation
either; it's just a beat between scripted lines. The hint rides the same
`endingEnabled` flag as the section's ending hint, so both disappear
together when messaging ships.

_Implemented in
[ChatsInProgressSection](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
(which passes `emptyHint`) and
[ChatCard](../../client/src/components/Teacher/ChatCard/index.tsx)._

### A matched seat gets the same 2 minutes as any other, and leaves its chat when they run out

_2026-07-20_

**Decision:** Every dropped seat arms the same 120s grace, matched or
waiting. When a matched seat's grace expires, it leaves its **chat** as well
as its seat: membership goes inactive, and if that puts the room under two
active members the chat ends for the peer exactly as a removal would. This
replaces the rule that a matched seat armed no timer at all. On the client,
a leave emitted while the socket is down no longer disconnects immediately —
the socket keeps reconnecting for up to 30s so the buffered `lobby:leave` can
land.

**Why:** The old rule was a good idea that a real phone disproved. Matched
seats armed no timer so a student could always resume into their chat, which
is right for a wifi blip. But the server cannot tell "dropped and coming
back" from "left, and the goodbye never arrived" — and on 2026-07-20 the
founder's handset produced exactly the second case: screen-locked, tapped
End, and the `lobby:leave` died in socket.io's send buffer because the socket
was down. The chat stayed `active` with a ghost member and the partner sat in
a dead room. With no grace timer there was nothing to repair it; the chat
would have lived until the 12h TTL.

Two minutes is not a new number — it is what `LOBBY_GRACE_SECONDS` already
is for waiting seats, and what the demo already simulates as the mid-chat
reconnect window. Longer would leave a student waiting on someone who is not
coming back; shorter would destroy working chats every time a phone crosses a
building with bad wifi. The client fix makes the ordinary case instant, so
the grace only ever applies to someone who might genuinely return; the server
fix means no client bug can strand anyone again.

**Still owed:** the partner sees nothing while they wait — the "lost
connection" tag is teacher-only. A silent two minutes is confusing where
"Herzl lost connection, hang tight" would not be. That needs a wire change
(peer connection state on `ChatPeer`, which today is allowlist-pinned to
`characterId` alone) and new copy, so it is its own piece of work rather than
a rider on a safety fix.

**Update (2026-07-21):** Paid — feature 8's `chat:peer-connection` event
gives students the banner and live countdown (`ChatPeer` itself stays
pinned to `characterId`; the connection state rides its own event). See
[Students see a partner's drop and return, on the teacher's own 4s gate](chat-behavior.md#students-see-a-partners-drop-and-return-on-the-teachers-own-4s-gate).

_Implemented in [lobbyContext.ts](../../server/src/live/lobbyContext.ts)
(`armSeatTimers`'s grace expiry now settles chat membership before reaping),
[handlers/studentSession.ts](../../server/src/live/handlers/studentSession.ts)
(the disconnect handler arms the grace unconditionally), and
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts)
(`LEAVE_RETRY_MS`). Reproduction and regression test:
`f3p5-leave-offline-repro.mjs`, described in
[the verify skill](../../.claude/skills/verify/SKILL.md)._

### Matching's production pass reruns the matching story, not the restart story

_2026-07-20_

**Decision:** Feature 3's production verification covered the full matching
gauntlet on chaverola.com but deliberately skipped re-running the restart
story (a redeploy while a chat is live). Feature 2's pass verified that path
on 2026-07-19 and it stands as the record for both features.

**Why:** The restart story tests the server's teardown, and matching didn't
change it. A deploy sends SIGTERM, the process dies, and every client's
auto-reconnect presents a token the fresh instance has never seen and is
rejected with `connect_error: activity_gone` — chats are not consulted on
that path any more than seats were. Re-running it costs a deploy that ends
every live class on the site, and the only way to observe it is to do that
during school hours or wait for the evening. Paying that to re-derive a
known answer about unchanged code is a bad trade. If the teardown path
itself ever changes — an `io.close()` hook, a graceful drain, persistence
behind the store — the restart story stops being settled and gets re-run.

**The handset leg was run, and it paid for itself immediately** — it found a
bug that stranded a student's chat partner permanently, which every scripted
leg had missed. See
[A matched seat gets the same 2 minutes as any other](#a-matched-seat-gets-the-same-2-minutes-as-any-other-and-leaves-its-chat-when-they-run-out).
The confirming run after the fix was not performed (no cellular service
available); the fix's server half was measured directly and needs no client
cooperation, so the residual exposure is a slower path, not a stranded one.
The standing lesson: headless Chrome on broadband never actually loses its
connection, so it cannot test what a user does while offline. Keep sending
real features to a real phone.

_Verified with the `f3p5-*` scripts described in
[the verify skill](../../.claude/skills/verify/SKILL.md)._

### Feature 3 makes matching real; messaging, ending, and pause stay placeholders

_2026-07-19 · Partly superseded 2026-07-20 by feature 4's first messaging
slice: students now send real messages — the composer is live, `chat:send`
→ `chat:line` on the wire, and the transcript survives a refresh. Ending,
pausing, and the auto-end clock remain placeholders exactly as described
below (`endingEnabled` stays `false`); the teacher's read-only transcript
is the next slice._

_Ending shipped 2026-07-21 (feature 6): `chat:end` / `chats:end-all` are
real teacher commands, and `endingEnabled` was renamed `pausingEnabled` —
see
[Ending ships for real; pausing keeps the placeholder seam](#ending-ships-for-real-pausing-keeps-the-placeholder-seam).
Pausing shipped the same day (feature 7), deleting that seam — the
auto-end clock is the placeholder that remains. See
[Pausing ships end to end; the grace window keeps running through it](#pausing-ships-end-to-end-the-grace-window-keeps-running-through-it)._

**Decision:** Real host pages get the demo's full matching experience,
working: tap-to-select (2 up to `min(MAX_CHAT_SEATS, roster)`), "Pair
everyone 1:1", the auto-match switch, random character dealing, live "Chats
in progress" cards, and each matched student's phone moving into a real chat
room. **No messages travel yet.** The student's composer renders disabled
with honest copy, and "End chat", "End all chats", and "Pause all chats"
render disabled with a short hint; no auto-end clock runs. One structural
exception: when a chat's active membership would drop below 2 — the teacher
removed someone, or a student left — the chat ends with reason "teacher":
the remaining peer gets the ended screen and can rejoin the queue, and the
card moves to "Completed chats" (demo semantics kept).

**Why:** Founder call (feature-3 planning, 2026-07-19). Matching alone is a
shippable slice that gets real classes off the placeholder; messaging is the
next feature. A working "End chat" was considered and declined — ending
machinery ships with messaging — but a fully placeholder ending would strand
a student alone in a silent room the moment a working Remove pulls their
only partner, so the below-2 ending is the one exception. When this ships it
replaces
[The chat sections hide entirely on real activities until matching ships](#the-chat-sections-hide-entirely-on-real-activities-until-matching-ships)
and
[Real host pages show an honest placeholder instead of pairing controls](#real-host-pages-show-an-honest-placeholder-instead-of-pairing-controls).

_Implemented across the feature (shipped 2026-07-20, plan in
[docs/plans/feature-3-real-matching.md](../../docs/plans/feature-3-real-matching.md)):
the pairing rules in [matching.ts](../../server/src/live/matching.ts), the
socket wiring in
[handlers/teacher.ts](../../server/src/live/handlers/teacher.ts) and
[lobbyContext.ts](../../server/src/live/lobbyContext.ts), the student's room
in [LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx), and
the teacher's dashboard in
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
— where `endingEnabled: false` is the single flag holding ending and
pausing as placeholders until messaging flips it._

### Auto-match runs on the server, and only while the teacher is connected

_2026-07-19_

**Decision:** Real auto-match is server-side: once two eligible students
have each waited `autoMatchSeconds`, the server pairs the two
longest-waiting, one pair every ~3 seconds — but only while at least one
teacher socket is connected to the activity. The teacher disconnecting (tab
closed, laptop asleep) holds auto-match; reconnecting resumes it,
immediately matching anyone already past the threshold. The rail's switch
keeps being the real setting per
[The pairing rail carries the auto-match switch, and it IS the activity setting](#the-pairing-rail-carries-the-auto-match-switch-and-it-is-the-activity-setting),
now synced to the server.

**Why:** Founder call (feature-3 planning): "as a teacher, if my laptop is
closed I wouldn't expect students to still be getting matched." A classroom
shouldn't run itself with nobody watching. Both alternatives were rejected —
fully unattended pairing puts kids in rooms no teacher is monitoring, and a
placeholder switch makes the rail's footer copy a lie now that the page can
keep the promise.

_Implemented in [autoMatch.ts](../../server/src/live/autoMatch.ts) — the
`joinCode → { timer, teacherCount, nextAt }` map, armed on the 0→1st teacher
socket and cleared on the last disconnect — with the pairing itself in
[matching.ts](../../server/src/live/matching.ts) (`findAutoMatchPair`).
Verified 2026-07-20: with no teacher connected, two students past the
threshold sat unpaired; the teacher's arrival matched them within a
second._

### Mid-chat, drops show and Remove works — nothing happens automatically

_2026-07-19_

**Decision:** Once students are in a chat: a member whose connection drops
dims on the teacher's card with a "lost connection" tag (same ~4s broadcast
delay as queue rows) and recovers on reconnect; the participant × performs
the quiet-exit remove per
[Removing a student mid-chat is a quiet exit](#removing-a-student-mid-chat-is-a-quiet-exit).
Nothing else happens on its own — **a matched seat is never grace-reaped**,
so a dropped student can resume into their chat at any point until the
activity dies. (One bookkeeping exception: if a chat ends underneath an
already-disconnected member, a fresh 2-minute grace starts then, so
abandoned seats don't hold cap slots forever.) Students see none of this: no
peer-connection UI in the live room this feature. The lobby-side rule in
[A dropped student keeps their seat for 2 minutes, marked and unmatchable](#a-dropped-student-keeps-their-seat-for-2-minutes-marked-and-unmatchable)
is unchanged.

**Why:** Founder call (feature-3 planning). The mid-chat 2-minute window
([A disconnected peer gets 2 minutes to come back, and the student watches the clock](chat-behavior.md#a-disconnected-peer-gets-2-minutes-to-come-back-and-the-student-watches-the-clock))
exists to protect a running conversation — but these rooms are silent, so a
timed drop would kick students out of chats that lose nothing by waiting,
and a peer-countdown banner would alarm the remaining student over nothing.
Both activate when messaging ships.

_Implemented in [lobbyContext.ts](../../server/src/live/lobbyContext.ts)
(`armSeatTimers`' 4s broadcast),
[handlers/studentSession.ts](../../server/src/live/handlers/studentSession.ts)
(the disconnect), and
[ChatCardHeader](../../client/src/components/Teacher/ChatCard/ChatCardHeader.tsx)
(the dimmed row and its "lost connection" pill, reusing the queue-row
styling)._

_Partly superseded 2026-07-20 — the "nothing happens automatically" half is
retired. A matched seat now takes the same 120s grace every other seat does,
and leaves its chat when that expires. The reasoning below (silent rooms lose
nothing by waiting) held right up until a real handset proved that "wait
forever" and "we never heard you leave" are the same state to the server. See
[A matched seat gets the same 2 minutes as any other, and leaves its chat when they run out](#a-matched-seat-gets-the-same-2-minutes-as-any-other-and-leaves-its-chat-when-they-run-out).
The rest of the entry — the "lost connection" tag, the quiet-exit ×, no
peer-connection UI for students — still stands._

### Settings edits sync for real; characters, scenario, and host name stay local

_2026-07-19_

**Decision:** A settings edit on a real host page now sends the full
`ActivitySettings` object to the server, which validates and stores it;
other connected host devices receive the change live. `revealNames` and
`autoEndChats` are stored but still act on nothing. Character, scenario, and
host-name edits remain local-only exactly as recorded in
[The live-settings panel stays on real activities, editing the teacher's local view](#the-live-settings-panel-stays-on-real-activities-editing-the-teachers-local-view)
— that entry's settings half retires when this ships.

_Update (2026-07-22): the `revealNames` half no longer holds — feature 10
reveals names at chat-end when the setting is on, see
[The live name reveal fires at chat-end, per the teacher's setting](chat-behavior.md#the-live-name-reveal-fires-at-chat-end-per-the-teachers-setting)._

_Update (2026-07-22): the `autoEndChats` half no longer holds either, in the
other direction — the setting was deleted outright, along with
`autoEndMinutes`, the `"timer"` end reason, and the wire's `elapsedSeconds`.
Nothing stores it and nothing reads it. See
[Chats show no timer or clock — the teacher ends them by hand](#chats-show-no-timer-or-clock--the-teacher-ends-them-by-hand)._

_Update (2026-07-23): the teacher's email joined the synced side — see
[The teacher's email syncs live; the rest of the roster still doesn't](#the-teachers-email-syncs-live-the-rest-of-the-roster-still-doesnt).
Characters, scenario, and host name are still local-only._

_Update (2026-07-24): extended, not superseded — a reconnecting device now
reads current settings off its first `chats:snapshot` before it can send
any, see
[A woken host device reads the class settings back before it can write them](#a-woken-host-device-reads-the-class-settings-back-before-it-can-write-them).
The replace and the room-minus-sender echo stand unchanged._

_Partly superseded 2026-07-26 by
[Students' lobbies follow name and instructions edits live, and the swap is silent](#students-lobbies-follow-name-and-instructions-edits-live-and-the-swap-is-silent):
**the host name is no longer local-only** — it and the student instructions
sync to the server and to students' lobbies (feature 17). Characters and
scenario stay local until feature 18; the settings half of this entry
stands._

_Character half superseded 2026-07-26 by
[The character roster reaches the lobby and every future chat, and its ids are minted client-side](#the-character-roster-reaches-the-lobby-and-every-future-chat-and-its-ids-are-minted-client-side):
**characters sync too now.** This entry's "Why" called roster sync "a bigger
feature than a settings echo" because it propagates to students' lobbies,
and it was right — that is the feature, and it shipped. Nothing local-only
is left in this entry's title. (Scenario is not a live field: the setup
form's scenario became the student instructions, which feature 17 already
syncs.)_

**Why:** Real auto-match forces the question: the switch and its seconds
must reach the server or the rail lies. Syncing the whole settings object is
one event and stops the panel silently reverting on refresh; syncing only
the two auto-match fields was rejected — it leaves the panel half-real with
no user-visible logic to the split. Roster/scenario sync stays out because
those propagate to students' lobbies — a bigger feature than a settings
echo. Founder call (feature-3 planning).

_Implemented in the `settings:update` handler in
[handlers/teacher.ts](../../server/src/live/handlers/teacher.ts) (zod-validated against the same
schema `POST /activities` uses, echoing `settings:changed` to the room
minus the sender) and
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx), whose
one `onActivityChange` wrapper catches every settings commit — the rail's
switch, End-all's auto-match hold, and the panel alike — so no future
control can quietly skip the sync._

### Server pairing keeps no rematch memory this feature

_2026-07-19_

**Decision:** The server's matching keeps no previous-partners memory: live
"Pair everyone 1:1" and auto-match pair greedily in queue order, the live
selection heads-up never fires, and no left-in-line notice can occur. The
demo keeps the full rematch behavior, and the rematch decisions
([A rematch only counts when it's an exact rerun for everyone in it](#a-rematch-only-counts-when-its-an-exact-rerun-for-everyone-in-it),
[The rematch warning remembers one round, and never blocks](#the-rematch-warning-remembers-one-round-and-never-blocks))
stand — they get enforced server-side when ending ships.

**Why:** A rematch needs a previous chat. With ending unbuilt, students
return to the queue only through the rare below-2 ending, and the partner
they'd rerun with has by then left the activity — an exact rerun is
structurally impossible. Porting the memory now would be dead code
pretending to be behavior.

_Implemented in [matching.ts](../../server/src/live/matching.ts) (greedy in
queue order, no `lastPartners`); the client's live engine keeps the stubs
`isExactRematch: () => false` and `rematchNotice: null` in
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts),
so the notices have somewhere to land when ending ships._

**Superseded 2026-07-22 by [feature 9](../plans/feature-9-rematch-memory.md).**
The premise no longer holds: ending shipped (feature 6), so an exact rerun is
reachable. The server now tracks one-round `lastPartners` (maintained in
`createChat`) and projects it on `chats:snapshot`, so the live rematch heads-up
fires (prompt 1); auto-match and Pair-everyone stop re-pairing the same group,
and the left-in-line notice fires (prompts 2–3).

### A dropped student keeps their seat for 2 minutes, marked and unmatchable

_2026-07-19_

**Decision:** When a student's lobby connection drops (dark phone screen,
wifi blip), their queue row survives for 2 minutes, visibly marked "lost
connection", and reconnecting restores it with the original wait clock. While
marked, the student is **fully unmatchable** — excluded from auto-match,
"Pair everyone 1:1", and manual tap-to-pair alike (recorded now so feature 3
enforces it); the marked row's only action is Remove. Two timing truths are
part of the decision: the window starts at _detected_ disconnect (a dark
phone sends no close frame, so detection rides Socket.IO's ping cycle,
roughly 45 seconds), and a short server-side broadcast delay (~4s) keeps a
student's page refresh from flashing the row.

Only an in-app exit removes the seat instantly: browser back to the code
screen (back-as-reset), sign-out, or a teacher remove. Leaving the site any
other way — closing the tab, the home button, back-swiping out of a tab
that opened the lobby as a deep link — sends no signal the client can trust
apart from the socket dying, so it rides this same grace window. That is
not a missing leave event (it tripped up the founder's own phone pass,
2026-07-19): the browser offers no reliable way to tell "left for good"
from "refreshing" or "phone went dark" at page teardown.

**Why:** Founder call (feature-2 planning). Phones go dark constantly
mid-class and wake moments later — dropping the seat instantly would churn
the queue for kids who are still there, while an unmarked row would deceive
the teacher. Matching an absent student starts a chat with an empty seat that
immediately burns the chat's own 2-minute reconnect window, so unmatchable is
the only honest state. Two minutes deliberately matches that chat window —
one reconnect concept across the whole product.

_Implemented in [seats.ts](../../server/src/live/seats.ts) (the grace +
broadcast-delay timers and the `currentSocketId` guard),
[PairingPanel.tsx](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(the marked row), and the `connection` filters in
[hostWorld.ts](../../client/src/components/Teacher/HostActivity/hostWorld.ts)
(unmatchable — pinned by tests); the chat-side window lives in
[A disconnected peer gets 2 minutes to come back, and the student watches the clock](chat-behavior.md#a-disconnected-peer-gets-2-minutes-to-come-back-and-the-student-watches-the-clock)._

### When the teacher's connection drops, the queue dims under a reconnecting banner

_2026-07-19_

**Decision:** When the host page loses its socket (wifi blip, server waking,
redeploy), an honest "Reconnecting to your class…" banner appears and the
queue dims slightly to signal the data may be stale — but the last-known
queue stays readable underneath. Everything restores on reconnect (the
server sends a fresh snapshot the moment a teacher socket joins). No
blocking overlay.

**Why:** Founder call (feature-2 planning). Mid-class, the last-known queue
is still useful information — a full overlay would take it hostage exactly
when the teacher is juggling thirty kids. Dimming without the banner was
rejected too: staleness needs words, not just opacity.

_Implemented in
[HostActivity/index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx),
driven by the connection state in
[useHostActivityLive](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)._

_Extended 2026-07-20 (feature 3): now that the page has a pairing rail and
chat cards, the dim covers the **whole** grid, not just the queue — and it
also turns the grid non-interactive (`pointer-events-none`). Readable but
not actionable is the point: a tap on a stale rail would emit into a dead
socket and appear to do nothing. The demo never reaches this state; its
connection can't drop._

_Extended 2026-07-25 (feature 15): the settings panel joins the treatment.
It used to render above the banner with full color and interactivity, so
the page showed the same auto-match setting twice — the rail's switch dead,
the panel's identical one live. Now the banner sits at the top and the
panel dims under it like the grid. Not because a panel edit would vanish —
a browser pass confirmed an offline edit is buffered and lands at reconnect
— but because one live control beside its dead twin reads as two truths,
and the post-reconnect screen can briefly show the pre-edit value anyway
(the snapshot-before-flush corner), so "your edits will send" could not be
promised honestly on screen. Both wrappers are `inert`, not
`pointer-events-none` alone: the same pass showed a focused rail switch
still toggled on Space. No flush-on-unmount for the panel's typing debounce
— the debounce fires regardless of connection, so only a sub-second
type-then-unmount race would ever hit it (founder call, 2026-07-25)._

### A rematch only counts when it's an exact rerun for everyone in it

_2026-07-18_

**Decision:** Every rematch feature shares one definition of "rematch": a
selection or pairing counts only when **every** student in it just came from a
chat made up of exactly the other students in it. A partial overlap is not a
rematch. Concretely:

- The selection heads-up fires only on an exact rerun, and names the whole
  group ("Maya, Ella, and Noa just chatted together…"). It still never blocks.
- "Pair everyone 1:1" and auto-match prefer **fully fresh** partners (no
  overlap with either student's previous chat), fall back to partial repeats
  silently, and **never create an exact rerun**. Auto-match just waits;
  Pair everyone repairs a stranded exact pair by swapping members with a
  pairing it already made, so only a queue consisting of exactly that pair
  (or an exact trio) is left in line — with a dismissible notice saying why.
- That left-in-line notice shows even when the rematch-warning setting is
  off: it explains why the button visibly left students unpaired, which is
  behavior, not advice. Only the heads-up is gated by the setting.

**Why:** Founder call (2026-07-18), with the defining example: Bob chats
Rachel, then Bob chats Shlomo. Pairing Bob and Rachel now is a repeat for
Rachel but not for Bob — his last chat was Shlomo — so nobody in the new pair
would be rerunning their own last chat, and warning about it reads as a false
alarm. Leaving an unresolvable exact pair waiting was chosen over
force-pairing them with a notice (founder call, same day): the teacher can
still pair them manually, and the heads-up covers that path. This narrows the
trigger conditions in
[The rematch warning remembers one round, and never blocks](#the-rematch-warning-remembers-one-round-and-never-blocks)
and
[Pair everyone avoids fresh rematches, and seats the odd one out when it can](#pair-everyone-avoids-fresh-rematches-and-seats-the-odd-one-out-when-it-can);
the one-round memory and never-blocking are unchanged.

_Implemented in
[hostWorld.ts](../../client/src/components/Teacher/HostActivity/hostWorld.ts)
(`isExactRematchIn`, `pairEveryoneIn`, `findAutoMatchPair`), with the
heads-up in
[index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx)._

### The live-settings panel stays on real activities, editing the teacher's local view

_2026-07-19_

**Decision:** Real activities keep the host page's live-settings panel,
fully editable — reversing, at implementation time, the plan to hide it
until edit sync ships. Until a settings-edit endpoint exists the edits are
**local-only**: they update the teacher's own dashboard (header, roster
labels, clocks) but never reach students' lobbies, and a refresh refetches
the server's copy. The pairing rail's auto-match switch stays interactive
on the same terms. The edits become real when the edit-sync feature lands.

**Why:** Founder call (2026-07-19), made with the split-brain caveat on
the table: an edit a student never sees, and a refresh that quietly
undoes it. The panel is also where the teacher sees the activity's
settings and email at all — hiding it would remove that view with nothing
in its place, and make the real page a stripped-down stranger to the demo
the teacher first learned. Supersedes
[Real activities hide the live-settings panel until edit sync ships](#real-activities-hide-the-live-settings-panel-until-edit-sync-ships).

_Implemented in
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx) (local
state is the only edit target) and
[index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx)._

_Partly superseded 2026-07-20 by
[Settings edits sync for real; characters, scenario, and host name stay local](#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local):
**settings edits are no longer local-only** — they reach the server and
the teacher's other devices, and survive a refresh. The rest of this
entry stands unchanged: the panel keeps rendering on real activities, and
character, scenario, and host-name edits are still local to the
teacher's page until roster sync ships._

_Further superseded 2026-07-26 by
[Students' lobbies follow name and instructions edits live, and the swap is silent](#students-lobbies-follow-name-and-instructions-edits-live-and-the-swap-is-silent):
**host-name and instructions edits are no longer local-only either** —
feature 17 syncs them to the server and to students' lobbies. What still
stands: the panel renders on real activities, and character edits stay
local until feature 18._

_Local-only clause fully retired 2026-07-26 by
[The character roster reaches the lobby and every future chat, and its ids are minted client-side](#the-character-roster-reaches-the-lobby-and-every-future-chat-and-its-ids-are-minted-client-side):
**nothing on this panel is local-only anymore.** Every field reaches the
server on the 1-second pause and survives a refresh. All that survives of
this entry is the part that was never about syncing: the panel renders on
real activities, fully editable, and the pairing rail's auto-match switch
stays interactive on the same terms._

### Start their chat sits below Pair everyone 1:1, nearest the names

_2026-07-18_

**Decision:** In the Pair-your-students panel's CTA cluster, **Pair
everyone 1:1** renders first and **Start their chat** second, so the
confirm button is the one adjacent to the student queue. The two buttons
stay together in the cluster (still pinned at the top of the desktop rail,
per
[The pairing CTAs pin at the top of the desktop rail while the queue scrolls](#the-pairing-ctas-pin-at-the-top-of-the-desktop-rail-while-the-queue-scrolls)).
Start keeps the solid-grape primary style and Pair everyone stays outline:
the confirm going from disabled to filled purple as the second name is
tapped is the "you can go now" signal, and its position doesn't change
which button is primary.

**Why:** Founder call (2026-07-18): the teacher's flow is scan the list,
tap two to eight names, then confirm — and with Start their chat on top, the
button nearest the selecting finger was Pair everyone 1:1, a mis-click that
throws away the selection and pairs the whole room. Rejected (tried, then
pulled back the same day): moving Start below the queue and pinning it to
the rail's bottom edge — closest possible to the names, but it split the two
pairing actions to opposite ends of the card, and they belong side by side
as one "pair students" control group.

_Implemented in
[PairingPanel.tsx](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)._

### The pairing CTAs pin at the top of the desktop rail while the queue scrolls

_2026-07-17_

**Decision:** On desktop, **Start their chat** and **Pair everyone 1:1** stay
pinned at the top of the pairing rail's internal scroll while the teacher
scrolls a long waiting list. Only those two buttons pin — the section title,
the amber auto-match banner, and the helper text scroll away, and the
auto-match switch stays at the panel's bottom, unpinned. On phones nothing
pins: the section has no internal scroll there, and a teacher scrolling the
page may be heading _past_ the pairing section, not through it.

**Why:** Founder call (2026-07-17): with a full class waiting (~18 names)
the two primary actions scrolled out of the card, and they should always be
in reach. Rejected: pinning the whole header block (it eats half the card's
height whenever the banner shows) and pinning the switch as a footer (the
banner already offers a one-tap "Turn auto-match back on" when it matters).
If this looks like the buttons "float" over the list mid-scroll, that's the
point — don't unstick them.

_Implemented in [PairingPanel.tsx](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx);
the rail's top padding moved onto its header in
[index.tsx](../../client/src/components/Teacher/HostActivity/index.tsx) because
Chrome insets sticky offsets by the scroll container's own padding._

### Pause is one world-level switch: chats freeze, clocks hold, matchmaking waits

_2026-07-17 · Shipped live 2026-07-21 by
[Pausing ships end to end; the grace window keeps running through it](#pausing-ships-end-to-end-the-grace-window-keeps-running-through-it),
with one amendment: the "reconnect windows hold" clause below is
superseded — on live activities the 120s disconnect grace deliberately
runs THROUGH a pause. Everything else shipped as written._

**Decision:** One **Pause all chats** button (confirm first, in the default
color — pausing isn't destructive) sits next to End all chats; while paused
the same slot is a one-tap **Resume**, no confirmation. There is **no
per-chat pause**. Paused means: no new messages anywhere (student input
disabled, a banner over the transcript — still readable, never a full-screen
takeover), per-chat auto-end clocks hold, the auto-match countdown and the
queue's wait times hold, reconnect windows hold, and the lobby tells students
the class is paused. Still moving: joining, returning to the lobby, manual
pairing (a chat started mid-pause is born frozen), ending chats, and a
student's own Leave/End — never trap a student in a frozen room. **End all
chats clears the pause** (the round is over; the next starts unpaused);
ending a single chat doesn't, so a paused room that empties out keeps a
Resume button in the section's empty state. The pause button itself only
appears while live chats exist — with an empty room, holding students is the
auto-match switch's job.

**Why:** Founder call (2026-07-17): "eyes up front" needs one switch, not
per-room bookkeeping — a teacher will never want to pause a single chat.
Wait times freeze with everything else so resume can't fire a burst of
auto-matches for students who silently crossed the threshold during a long
announcement, and a pause never eats chat time. Rejected: a third
`ChatStatus` value — it would imply per-chat pause exists and break the
active/ended distinction. Pause is a boolean beside the status (`isPaused`
in the ChatRoomState contract); a real backend broadcasts one activity-wide
event, and `isEnded` always wins over `isPaused`.

_Implemented in
[hostWorld](../../client/src/components/Teacher/HostActivity/hostWorld.ts) and
[useHostActivityDemo](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
(teacher engine),
[useChatDemo](../../client/src/components/chat/useChatDemo.ts) (student engine),
[ChatsInProgressSection](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
(the buttons), and
[ChatPausedBanner](../../client/src/components/chat/ChatPausedBanner.tsx) (the
student banner)._

### The pairing rail carries the auto-match switch, and it IS the activity setting

_2026-07-17_

**Decision:** The Pair-your-students panel's auto-match footnote is now a
switch row that renders in **both** states ("Auto-match is on: students pair
up on their own after waiting N seconds." / "Auto-match is off: students wait
here until you pair them."). It reads and writes `settings.autoMatch` — the
same setting the setup form and Edit activity settings show — with **no
separate hold flag**. The seconds stepper stays in the settings panels only.
External flips reach the settings panel's draft through a keyed merge
([mergeExternalSettings](../../client/src/lib/hostActivity.ts)): only settings keys
that actually moved fold in, so a half-typed edit elsewhere in the panel
survives, and the panel's next debounced commit can no longer resurrect a
stale value it captured on mount.

**Why:** Founder call (2026-07-17). Between rounds the teacher needs to stop
matching while explaining the next scene, and the only switch was buried in
the collapsed settings section — invisible exactly when it mattered (the old
footnote rendered nothing at all when auto-match was off). One real setting
with multiple views was chosen over a transient session "hold" so two
controls can never disagree about whether matching runs.

_Implemented in
[PairingPanel](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(the switch row),
[LiveSettingsPanel](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(the draft merge), and
[hostActivity](../../client/src/lib/hostActivity.ts) (`mergeExternalSettings`)._

### End all chats holds auto-match by turning the real setting off

_2026-07-17_

**Decision:** Confirming **End all chats** while auto-match is on flips
`settings.autoMatch` off for real — every surface shows off — and the pairing
rail shows a dismissible amber banner ("N students are waiting, and
auto-match is off.") with a one-tap **Turn auto-match back on**. The confirm
dialog says the hold out loud ("Auto-match goes on hold too, so students wait
in the lobby until you pair them or turn it back on."). Only the explicit
End-all does this: chats ending naturally (timer, students, a single chat
ended from its card) never touch the setting, and End-all with auto-match
already off changes nothing extra and shows the plain confirm copy.

**Why:** Founder call (2026-07-17): End-all means "the round is closed."
Without the hold, auto-match re-pairs returning students within seconds —
with the round's old characters — while the teacher is still explaining the
next scene, silently undoing the close. Flipping the real setting keeps every
surface honest (rejected: a shadow hold flag that could disagree with the
switches), and the banner plus the confirm copy make the flip loud, so a
teacher is never surprised that matching stopped.

_Implemented in
[HostActivityDashboard](../../client/src/components/Teacher/HostActivity/index.tsx)
(the flip and the notice state),
[confirmCopy](../../client/src/components/Teacher/HostActivity/confirmCopy.ts), and
[PairingPanel](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(the banner)._

### The host page is never projected — it's the teacher's private control room

_2026-07-15_

**Decision:** The host page (`/activity/host/:hostKey`) is
designed on the assumption that
**no student ever sees it**. Unlike Kahoot, the teacher never projects or
shares this screen; anything students need (the pin, instructions) the
teacher relays out loud or writes on the board. The joining-instructions
copy says this in the UI itself ("this screen stays with you").

**Why:** The page shows who's waiting and who's paired with whom. A student
who can see the queue knows exactly who they're about to be matched with —
and the who-am-I-chatting-with mystery is the whole game. Don't add
"present mode", full-screen pin views, or anything else that invites
projecting it.

_Implemented across
[HostActivityDashboard](../../client/src/components/Teacher/HostActivity/index.tsx);
the in-UI wording lives in
[JoiningInstructions](../../client/src/components/Teacher/HostActivity/JoiningInstructions.tsx)._

### Host page layout: stacked sections on phones, a sticky pairing rail on desktop

_2026-07-15_

**Decision:** On phones the page is stacked minimizable sections in a fixed
order — joining instructions, edit settings, pair your students, chats in
progress, completed chats — all built on one shared collapsible component.
Settings starts **collapsed** (it's already filled in from setup); every
other section starts open. Collapsed sections carry a useful subtext (the
waiting count, the add-your-email nudge). On `lg` and up, "Pair your
students" becomes a fixed-width **sticky left rail** (20rem) with the chats
sections owning the rest, while instructions and settings stay full-width
above the split. The rail is deliberately not balanced against the chats
column and never disappears at zero waiting.

**Why:** Watching the queue refill and monitoring chats are the teacher's
two core mid-round jobs — side by side beats scrolling between them. The
rail is a persistent queue (full at round start, empty mid-round, refilling
as chats end); hiding it at zero would make its reappearance feel like a
layout glitch. Settings collapses because it begins in a known-good state;
the other sections are where the action is.

_Implemented in
[HostActivityDashboard](../../client/src/components/Teacher/HostActivity/index.tsx)
on [CollapsibleSection](../../client/src/components/Teacher/HostActivity/CollapsibleSection.tsx)._

### The waiting count is the hero stat, and it never leaves the screen

_2026-07-15_

**Decision:** The count of students waiting to chat renders poster-sized in
the page header, re-animating on every change; when it scrolls out of view
it condenses into a slim bar fixed under the navbar (count + pin). The page
has no "Activity in Progress" status label. (Product-owner pick,
2026-07-15, over a static header stat and over a floating HUD pill.)
(**2026-07-16:** on the demo activity the condensed bar stands down — the
sticky demo banner owns the under-navbar band there; see
[The demo notice is a banner you can't miss](demo-flows.md#the-demo-notice-is-a-banner-you-cant-miss).)
(**2026-07-26:** the number counts students who can pair _right now_ —
connected seats only. Students riding out a dropped connection get a quiet
"+2 reconnecting" line under it instead of being folded into the big number,
and every other count and pairing gate on the page follows the same rule:
the phone section's collapsed hint, the auto-match hold notice, and both
**Pair everyone 1:1** buttons. The queue list itself still shows every seat,
amber tags and all.)

**Why:** A teacher glancing from across a classroom must catch the number
instantly, and it must visibly react when it changes — students sitting
unmatched is the one thing this page exists to prevent. The condensed bar
keeps the number on screen while the teacher is deep in the chat cards. A
status label was dropped because it states the obvious; the live count
already says the activity is running. Counting dropped seats in the hero
number made it lie in the one way that costs the teacher a tap: a class of
sleeping phones read "2 waiting", lit up **Pair everyone 1:1**, and the
server — which only pairs connected seats — did nothing at all. Splitting
the reconnecting count onto its own line keeps the drop visible without a
big number that quietly means something the buttons don't.

_Implemented in
[HostHeader](../../client/src/components/Teacher/HostActivity/HostHeader.tsx)._

### Pairing is tap-to-select, and characters are dealt randomly

_2026-07-15_

**Decision:** Waiting students render as rows in **join order** — new
joiners append at the bottom, each with a subtle wait time. Tapping selects;
with two selected the start-chat action activates, and a 3rd/4th can be
selected only when the roster has that many characters. There is **no
character-assignment step**: a chat of N is dealt N of the roster's
characters, and who gets which is random — the teacher sees who got whom on
the chat card. Each row's remove control is separate from the select target.

_Amended 2026-08-10:_ which N the chat is dealt is now the teacher's
`characterMode` — the roster's first N in order mode (the default), or N drawn
at random from the whole roster in shuffled mode. See
[teacher-setup → The teacher picks how characters get handed out](./teacher-setup.md#the-teacher-picks-how-characters-get-handed-out-and-a-roster-can-hold-a-hundred).
Neither mode has an assignment step, which is what this entry is about.

**Why:** Join order means the longest-waiting students sit on top and the
list never reshuffles under the teacher's cursor. Assigning characters by
hand would turn every pairing into a form; random assignment keeps pairing
one gesture, and the roleplay doesn't care who plays whom. Keeping remove
(✕) out of the select target means the two taps can never collide.

_Implemented in
[PairingPanel](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)
and `assignCharacters` in
[useHostActivityDemo](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)._

### Pair everyone avoids fresh rematches, and seats the odd one out when it can

_2026-07-15_

**Decision:** "Pair everyone 1:1" pairs the whole queue in join order, but
**shuffles around fresh rematches**: previous-round partners get someone new
whenever the math allows, and only when no valid arrangement remains does a
pair repeat — that forced pair is named in a dismissible notice instead of
silently rematched (product-owner call, 2026-07-15, over pair-blindly-and-warn).
Odd count: with 3+ characters the last three students form a group of 3 so
nobody sits out; with only 2 characters the newest joiner stays behind,
highlighted as "first in line".

**Why:** A bulk action should be at least as smart as the teacher doing it
by hand — pairing the same two kids twice in a row when a swap was
available reads as a bug. The newest joiner (not the longest-waiting) is
the one left over because wait time is the queue's fairness currency.

**Update (2026-07-18):** the forced-repeat fallback is gone — per
[A rematch only counts when it's an exact rerun for everyone in it](#a-rematch-only-counts-when-its-an-exact-rerun-for-everyone-in-it),
partial repeats now pair silently and an exact rerun is never created; an
unresolvable exact pair or trio stays in line with a notice. The odd-count
handling is unchanged.

_Implemented in `pairEveryone` in
[useHostActivityDemo](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)._

### The rematch warning remembers one round, and never blocks

_2026-07-15_

**Decision:** The rematch warning (setting #3) fires the moment a selected
combo contains students **whose previous chat was with each other** — the
memory is one round deep, not the whole activity. It's a heads-up only:
pairing anyway stays one tap. Auto-match (setting #4) uses the same
one-round memory to skip fresh rematches on its own.

**Why:** Chaverola runs several rounds with the same class, so "these two
already met once tonight" stops being interesting after a round — a
whole-activity memory would eventually flag every possible pair. Never
blocking keeps the teacher in charge: sometimes a rematch is exactly the
point (continuing a scene).

**Update (2026-07-18):** the trigger narrowed — the warning now fires only
when the selection is an exact rerun of everyone's previous chat, not when
any two selected students overlap. See
[A rematch only counts when it's an exact rerun for everyone in it](#a-rematch-only-counts-when-its-an-exact-rerun-for-everyone-in-it).
The one-round memory and never-blocking stand.

_Implemented in
[useHostActivityDemo](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
(`lastPartners`), rendered by
[PairingPanel](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)._

### Removing a student mid-chat is a quiet exit

_2026-07-15_

**Decision:** Each live chat card carries a per-participant remove control
(with a confirmation modal). Removal is **never announced to students as a
removal**, so classmates can't tell it from a dropped connection: in a
group chat a neutral notice appears ("{character} left the chat", composed
via `characterLabel`) and the chat continues — the removed student's lines
and colors persist, mirroring the group disconnect-drop rule; in a 1:1 the
peer's chat ends with the existing 🎓 teacher copy. The removed student
lands on the name step signed out, exactly like a lobby removal.

**Why:** Teachers remove students for behavior, and broadcasting "so-and-so
was removed by the teacher" turns discipline into a class spectacle — the
neutral exit protects the removed student and keeps the room's energy
intact. A student being inappropriate mid-chat shouldn't be unstoppable
just because the chat already started.

_Implemented in `removeFromChat` in
[useHostActivityDemo](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts);
the control lives in
[ChatCardHeader](../../client/src/components/Teacher/ChatCard/ChatCardHeader.tsx)._

### Live edits propagate after a 1-second pause, and invalid states never do

_2026-07-15 · Partly superseded 2026-07-23 by
[The live settings panel only claims the edits that actually travel](#the-live-settings-panel-only-claims-the-edits-that-actually-travel):
**the "applies everywhere at once" half is retired**, along with the in-UI
promise that changes reach everyone instantly. It was written when the host page
was client-side and every surface read one object; since the 2026-07-19 founder
call only settings and the teacher's email leave the tab. The rest of this entry
stands: the 1-second debounce, last-valid-wins on an invalid in-between state,
and re-labeling by stable character id are all unchanged._

**Decision:** The host page's settings panel reuses the setup form's field
components and validation, and every valid edit applies **everywhere at
once** — roster rows, pairing, in-progress chat cards, student surfaces —
re-labeling by stable character id. Propagation is **debounced 1 second**
(the input updates per keystroke; the change spreads when the teacher
pauses). An invalid in-between state — a name cleared to empty, a
duplicate, a bad email — shows the setup form's inline error while the
**last valid value stays in effect**. The remove control on rows 3–4 is
disabled with a hint while a live chat uses that character; a completed
removal stops future pairings from offering the character immediately. The
panel says in-UI that changes reach everyone instantly and that between
rounds is the natural time to switch characters or scene.

**Why:** The whole class shares one character set and one scene — that's
what lets a teacher rename the cast between rounds without restarting. The
debounce keeps half-typed names from flashing across live chat cards;
last-valid-wins means students can never see a blank or duplicate label,
even while the teacher is mid-edit.

**Update (2026-07-16):** the in-use row's disabled remove control became
the Live dot with a hint that names the character — see
[A character in a live chat shows the Live dot, and its hint says who](#a-character-in-a-live-chat-shows-the-live-dot-and-its-hint-says-who).

**Update (2026-07-24):** "invalid states never propagate" narrowed to the
fields the teacher types in. Clicks — the settings switches, the seconds
stepper, a row's remove button — now commit alone and immediately, valid
draft or not; see
[A click in the live settings panel commits alone and immediately](#a-click-in-the-live-settings-panel-commits-alone-and-immediately).
The 1-second debounce and last-valid-wins for typed fields are unchanged.

**Update (2026-07-26):** revised for characters specifically — a character
edit now deliberately stops at the door of a running chat (feature 18's
frozen cast, founder call 2026-07-23), so the phrase "in-progress chat
cards, student surfaces" no longer describes character edits. See
[A chat freezes its cast the moment it starts](#a-chat-freezes-its-cast-the-moment-it-starts).

_Implemented in
[LiveSettingsPanel](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
with the draft model in [hostActivity](../../client/src/lib/hostActivity.ts)._

### No reveal-names control in Chats in progress

_2026-07-15_

**Decision:** The "Chats in progress" section has **no** reveal-names
toggle. The only reveal control is setting #1 ("Reveal names when a chat
ends") in the settings panel. A mid-chat "reveal now" action was considered
and rejected (product-owner call, 2026-07-15).

**Why:** The prompt originally placed a reveal toggle inside the chats
section, on the thought that teachers might want to reveal names mid-chat —
the owner concluded teachers won't ever do that mid-chat, and a second
toggle mirroring the same setting would just invite confusion about whether
they're different things.

_The section header in
[ChatsInProgressSection](../../client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
deliberately has count + End-all only._

### Unknown host links get a friendly not-found, and the demo redirect is gone

_2026-07-19_

**Decision:** The host route is `/activity/host/:hostKey` (feature-1
Prompt 6). `1234` still hosts the Rome demo, fully client-simulated, and
the `/demo` redirects keep working verbatim. Every other param resolves
over `GET /activities/host/:hostKey`, with the same visible outcomes as
the student lookup: a loading beat ("Finding your activity…", patience
copy after ~5s), found, a friendly **not-found** screen, or a distinct
**unreachable** screen whose Try again button refetches without a reload
("Your activity may well still be running" — a teacher hits this
mid-class). A param that can't be a real key — stale 4-digit links from
the mock era included — settles as not-found with no network trip. The
not-found copy says out loud that activities only stay up while class is
happening, and offers "Set up a new activity" and "Back home". Supersedes
[An unknown host code redirects to the demo activity](#an-unknown-host-code-redirects-to-the-demo-activity):
that redirect was right only while every live code was fake and a dead
link couldn't exist.

**Why:** Now that real host links exist, a dead link resurrecting as the
demo would look like YOUR activity with pretend students in it — worse
than any dead end. The not-found screen is honest about the free tier's
reality (activities expire, deploys wipe them) and routes the teacher to
the one-minute fix. The create flow hands its response straight to the
host page (no refetch flash), and the host lookup is also what refreshes
the activity's TTL, so an open host page keeps its class alive.

_Implemented in
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx) over
[useHostedActivityLookup](../../client/src/lib/useHostedActivityLookup.ts)._

### The copyable student link carries the current origin, and is never printed

_2026-07-15_

**Decision:** The joining instructions include styled link-text ("Copy the
student join link") that copies `<current origin>/activity/join/:joinCode`
to the clipboard with a brief "Copied!" confirmation. The raw URL is never
rendered in the UI. The spoken instructions keep saying chaverola.com.
(Product-owner call, 2026-07-15, over copying the literal branded URL.)

**Why:** Nothing on these pages may be a dead end — a copied link must
open the real join page wherever the app is running (localhost today, the
real domain once deployed; `window.location.origin` does the right thing in
both worlds). Printing the raw URL would tempt teachers to read it out,
when the pin is the classroom-friendly way in.

_Implemented in
[JoiningInstructions](../../client/src/components/Teacher/HostActivity/JoiningInstructions.tsx)._

## Superseded

Replaced decisions, kept for history. Don't apply these; each date line links
to what replaced it.

### Every chat runs its own auto-end clock, and students watch it tick

_2026-07-15 · Superseded by
[Chats show no timer or clock — the teacher ends them by hand](#chats-show-no-timer-or-clock--the-teacher-ends-them-by-hand)_

**Decision:** The auto-end timer is **per chat**: it starts when the chat
starts, counting down the activity's auto-end minutes, and ends the chat
with reason `"timer"` (⏰ "Time's up!") at zero. The countdown is part of
the chat-engine contract (`ChatRoomState.autoEndSecondsLeft`, ticked by
`useChatDemo`). Students see a quiet m:ss clock in the chat header that
shifts to amber and pulses in the final 60 seconds; on narrow widths the
End chat pill compresses to icon + "End" so the clock fits. Teacher chat
cards show the same per-chat remaining time. Demo panels get a staged
fast-forward (first press → the finale, second press → the expiry).

**Why:** Before this, the ⏰ ended screen was the first students heard of a
time limit — a scene deserves a wrap-up, not a trap door. Per-chat (rather
than per-round) clocks mean a chat started late still gets its full time;
when the teacher pairs everyone at once the chats naturally end together
anyway, and "End all chats" is the round-closer for everyone-done-now.

_Was implemented in `useChatDemo` and `useHostActivityDemo`, rendered by the
`AutoEndCountdown` component (all since removed)._

### Auto-end edits: new minutes wait for new chats; the toggle acts immediately

_2026-07-15 · Superseded by
[Chats show no timer or clock — the teacher ends them by hand](#chats-show-no-timer-or-clock--the-teacher-ends-them-by-hand)_

**Decision:** Changing the auto-end **minutes** mid-round affects only
chats started after the change — running chats keep the clock they started
with. Flipping the auto-end **toggle** is different (product-owner call,
2026-07-15): turning it off clears the clocks on running chats right away,
and turning it on starts a fresh full clock on running chats.

**Why:** A shortened duration must never instantly kill a live chat
mid-sentence — that's why minutes changes wait for the next round. The
toggle is the teacher's blunt instrument: "off" means "stop rushing them"
and should grant relief now, "on" means "these chats need an ending" and a
fresh clock is the only fair one to give them.

_Was implemented in the settings-change effect in `useHostActivityDemo`
(since removed)._

### The live card's count-up clock appears only after the first minute

_2026-07-20 · Superseded by
[Chats show no timer or clock — the teacher ends them by hand](#chats-show-no-timer-or-clock--the-teacher-ends-them-by-hand)_

**Decision:** Live chat cards carry an m:ss count-up clock (how long the
chat has been going) in the same header spot the demo's auto-end countdown
uses — but it stays hidden for the chat's first 60 seconds and fades in at
1:00.

**Why:** Founder call (2026-07-20). A fresh card full of chrome (Live badge,
names, hint line) doesn't need a `0:07` ticking at the teacher; the elapsed
time only becomes information once a chat has been running a while. The
threshold lives in one place (`ElapsedClock.SHOW_FROM_SECONDS`). The demo
keeps the auto-end countdown instead — real chats have no auto-end clock
yet.

_Was implemented in the `ElapsedClock` component (since removed)._

### The chat sections hide entirely on real activities until matching ships

_2026-07-19 · Superseded by
[Feature 3 makes matching real; messaging, ending, and pause stay placeholders](#feature-3-makes-matching-real-messaging-ending-and-pause-stay-placeholders)_

**Decision:** Until matching ships, a real activity's host page renders no
"Chats in progress" and no "Completed chats" section. The page is the header
with the waiting count, the joining instructions, the settings panel, and
the live "Who's joined" queue with its matching-is-coming note. The demo
keeps both sections; they return to real pages with feature 3.

**Why:** Founder call (2026-07-19, the prompt-3 session). The sections'
empty states invite actions the page can't take yet ("Pair two students in
the queue…" above a Pair everyone button), and two permanently empty boxes
under a note that already says matching is coming read as broken rather
than honest. The rejected alternative — keeping them with forward-looking
copy — previews the eventual layout but charges every real class
screen-space for it today.

_Both sections returned to real activities on 2026-07-20 with feature 3,
and the demo/live layout split went with them: one grid now serves both
(`Teacher/HostActivity/index.tsx`). The sibling call for the pairing
controls is
[Real host pages show an honest placeholder instead of pairing controls](#real-host-pages-show-an-honest-placeholder-instead-of-pairing-controls)._

### Real host pages show an honest placeholder instead of pairing controls

_2026-07-19 · Superseded by
[Feature 3 makes matching real; messaging, ending, and pause stay placeholders](#feature-3-makes-matching-real-messaging-ending-and-pause-stay-placeholders)_

**Decision:** Until matching ships (feature 3), real host pages render none
of the pairing UI — no tap-to-select on queue rows, no "Pair everyone 1:1",
no "Start their chat", no auto-match switch, and no auto-match footer copy.
In its place stands one short copy block: matching is coming in the next
update, and right now this page shows who's joined, live. Queue rows on real
activities keep exactly two affordances — the name + wait clock display and
Remove. The demo keeps the full pairing UI.

**Why:** Founder call (feature-2 planning), choosing honest placeholder over
the two alternatives: hiding the rail leaves an unexplained hole where the
product's core action belongs, and disabled controls in front of a live class
invite taps that do nothing. The auto-match footer had to go with the
controls — "students pair up on their own after waiting 20 seconds" is a
promise the page cannot keep yet, and the switch it explains edits a setting
nothing consumes.

_The placeholder and the `pairing` prop that gated it were both deleted on
2026-07-20 when matching shipped — the rail now renders its real controls
on every activity
([PairingPanel.tsx](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)).
The auto-match footer's promise is one the page can finally keep, per
[Auto-match runs on the server, and only while the teacher is connected](#auto-match-runs-on-the-server-and-only-while-the-teacher-is-connected)._

### Real activities hide the live-settings panel until edit sync ships

_2026-07-17 · Superseded by
[The live-settings panel stays on real activities, editing the teacher's local view](#the-live-settings-panel-stays-on-real-activities-editing-the-teachers-local-view)_

**Decision:** When teachers host real activities (from feature-1
Prompt 6), the host page's live-settings panel does not render. It stays
fully functional on the `1234` demo, and it returns for real activities
with the edit-sync feature — a real settings-edit endpoint plus
propagation to students.

**Why:** Founder call. There is no edit endpoint yet, so on a real
activity the panel could only change the teacher's local copy —
invisible to students and gone on refresh. That's teacher/student
split-brain: a teacher who flips "reveal names" off would believe the
mystery holds while students still get the reveal. A control that
silently does nothing is worse than no control. (Reversed at
implementation time — the founder weighed the same caveat and picked
keeping the panel.)

_Was scheduled in
[feature-1 Prompt 6](../../docs/plans/feature-1-create-and-join.md); the panel
lives in
[Teacher/HostActivity](../../client/src/components/Teacher/HostActivity/)._

### An unknown host code redirects to the demo activity

_2026-07-15 · Superseded by
[Unknown host links get a friendly not-found, and the demo redirect is gone](#unknown-host-links-get-a-friendly-not-found-and-the-demo-redirect-is-gone)_

**Decision:** `/activity/host/1234` always hosts the Rome demo activity —
the same one the student side mocks, seeded with no teacher email so the
settings section's add-your-email nudge stays exercised. A teacher arriving
from the create flow gets their just-hosted activity from the
`chaverola.hostedActivity` stash (refresh keeps it; live edits write back
to the stash — but only for the stashed code, never for the Rome demo, so
playing with the demo can't clobber a real activity). Any other code with
no matching stash **redirects to `/activity/host/1234`**.

**Why:** The pin on screen, the URL, and the copyable student link must
always agree — and the pin must actually work on `/activity/join`. Showing
a dead activity page for a stale link (an old code opened in a new tab)
would put a pin on screen that rejects every student who types it. The
redirect was right only while every live code was fake and a dead link
couldn't exist; real host links ended it.

_Was implemented in
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx)._

### A character in a live chat shows the Live dot, and its hint says who

_2026-07-16 · Superseded by
[Removing a character is never blocked, and its row carries no live marker](#removing-a-character-is-never-blocked-and-its-row-carries-no-live-marker)_

**Decision:** While a live chat uses a character, that row in the host
page's settings panel swaps its remove button for the same pulsing mint
Live dot the chat cards wear (extracted to a shared
[LiveDot](../../client/src/components/ui/live-dot.tsx)), and the hint under the
input names the character: "Cleopatra is in a live chat right now. You can
remove them once that chat ends." The name is the **committed** one — what
running chats actually display — so a mid-rename draft never changes who
the message claims is chatting.

**Why:** Founder feedback (2026-07-16): the anonymous hint ("In a live
chat right now…") rendered in the gap between two character rows and named
nobody, so it read as ambiguous — which character is it about? — and the
disabled × at 35% opacity was faint enough that the locked row looked like
it had no remove control at all, while the neighbor's crisp × drew the eye
to the wrong row. Naming the character makes the message unambiguous
wherever it sits, and the Live dot marks the locked row with the exact
signal that already means "chat running right now" on the cards below.

_Was implemented in
[CharacterRowsField](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)
(the indicator) and
[LiveSettingsPanel](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(the named message). The shared LiveDot lives on for the chat cards._
