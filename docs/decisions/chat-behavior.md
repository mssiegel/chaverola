# Chat behavior

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### Ending your own chat keeps your seat, and the ender gets a wrap-up screen

_2026-07-23_

**Decision:** The chat room's exit — **End chat** in a duo, **Leave** in a
group — no longer signs a student out of the activity. It rides its own wire
event, `chat:leave`, which keeps the seat: the student lands on their own
wrap-up screen (🎬 "And… scene!" after ending a duo, 👋 "You left the chat"
after stepping out of a group) and rejoins the queue with the same "Back to
the lobby" tap everyone else takes. Three founder calls make it up:

- **The ender's screen reuses the demo's existing copy** rather than
  mirroring the partner's "«Character» ended the chat" wording. No new
  strings ship, and the demo and a real room now read identically.
- **A group leaver gets the same treatment** — seat kept, own screen, own
  tap — but **no name reveal**, whatever the teacher's setting says: that
  room is still going, so the mystery has to hold (the rule already recorded
  in [In a group the student leaves; only a 2-person chat can be ended](#in-a-group-the-student-leaves-only-a-2-person-chat-can-be-ended),
  now true on real activities and not just the demo).
- **Leaving the activity is a lobby act.** There is no second exit inside
  the chat; a student who is really done ends the chat, then leaves from the
  lobby. `lobby:leave` keeps its old mid-chat behavior as the backstop for
  any other way out.

Mechanically, a duo's `chat:leave` takes the **`chat:end` shape** — the room
ends for everyone with membership intact — recorded as `"peer"` plus who, so
both students stay resumable members of the ended chat. The ender's own
`chat:ended` says `"student"`, decided **per recipient inside `toChatEnded`**
(the one projection that already knows who's listening, which is how the
reveal excludes self). A group's `chat:leave` drops just that membership and
sends the leaver a bare `"self-left"`.

**Why:** Founder calls, 2026-07-23, for two reasons. A student who ends the
chat should still learn who they were really talking to when the reveal is
on — before this they were the only participant who never saw it. And the
lobby should be entered deliberately: the tap is what says "I'm ready for
another chat", instead of a student being dumped at the join-code screen for
using the only exit in the room. This closes the slice that
[Leaving a live chat means leaving the activity (until messaging ships)](#leaving-a-live-chat-means-leaving-the-activity-until-messaging-ships)
deferred and named exactly — "a leave-the-chat-but-keep-your-seat path…
its own wire event". Putting the per-recipient reason in the projection
rather than at the emit sites is what makes a refresh honest for free: both
seats resume into the ended chat and each is told the truth from where they
sat.

_Implemented in [socket.ts](../../shared/src/socket.ts) (`chat:leave`, plus
`"student"` / `"self-left"` on `chat:ended`),
[matching.ts](../../server/src/live/matching.ts) (`endChat` records the
reason and who), [projections.ts](../../server/src/store/projections.ts)
(`toChatEnded`'s per-recipient reason),
[studentSession.ts](../../server/src/live/handlers/studentSession.ts) (the
handler and the group leaver's resume), and on the client
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts) /
[LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx),
which also drops its live-only confirm copy — Chatbox's own "head back to
the lobby whenever you're ready" is now the truth._

### While a student types on a phone, the world's chrome gets out of the way

_2026-07-23_

**Decision:** Below the `sm` breakpoint, focusing the chat composer collapses
the student world's chrome: the corner pills (name badge, language switcher)
and the `pt-20` that reserves their band, and in the demo the golden "This is
the demo" banner and the "You're driving this demo" panel. Everything returns
on blur. It's one CSS `:has()` rule keyed off the composer's focus — the
student world's only `<textarea>` — not React state, and it's scoped to phones
so a desktop click into the input changes nothing. Extends
[On phones the chat fills the screen and hugs the keyboard](#on-phones-the-chat-fills-the-screen-and-hugs-the-keyboard-desktop-keeps-the-fixed-card).

**Why:** Two founder screenshots (2026-07-23). In the demo, focusing the input
threw the chat card off the top of the screen entirely: the steering panel sits
_below_ the composer, so with the keyboard open the document was still ~750px
against a ~300px viewport and the browser was free to pan the focused input
anywhere. The rule that makes an input hug a keyboard is simply that the
composer is the last thing in the document — this makes that true in the demo
too. In a live chat nothing was broken, just cramped: fixed chrome was renting
80px of the ~300px left above the keys, a quarter of the visible world spent on
a name badge while typing. Hiding the chrome for the _whole_ chat was rejected
(it would strand the language switcher and contradict
[Mid-chat, the student's name is a corner badge](student-join.md#mid-chat-the-students-name-is-a-corner-badge));
a `fixed inset-0` chat overlay was rejected because iOS pins `fixed` to the
layout viewport, which would break the pan-to-input path V1 leans on.

_Implemented in
[StudentWorldLayout](../../client/src/components/layout/StudentWorldLayout.tsx)
(the `group` hook and both collapses),
[DemoBanner](../../client/src/components/demo/DemoBanner.tsx) (the `onWorld`
variant), and [ChatStage](../../client/src/components/Student/ChatStage.tsx)
(the steering panel)._

### A student's own leave ends a 1:1 as "peer", and the survivor's screen names their character

_2026-07-23_

**Decision:** When a student's `lobby:leave` drops a room below two, the
ending records `"peer"` — not `"teacher"` — and remembers who: the wire
(`chat:ended`) carries `endedBy`, the leaver's characterId, and the store
keeps their studentId so the wrappingUp resume re-delivery stays honest.
The survivor lands on the 🎭 "«Character» ended the chat" wrap-up — the
founder chose the character name over a generic "Your partner" (matching
what the demo engine already showed). Teacher-caused endings — `chat:end`,
`chats:end-all`, `chat:remove` — keep `"teacher"`; a grace expiry keeps
`"peer-timeout"`. This reverses the lobby:leave clause of
[A grace expiry ends a 1:1 as "peer-timeout"; the group notice is a client heuristic](#a-grace-expiry-ends-a-11-as-peer-timeout-the-group-notice-is-a-client-heuristic),
which had kept a student's leave on `"teacher"` as demo semantics.

**Why:** Found on the first real-handset run of the messaging tests
(2026-07-23): the survivor's screen blamed the teacher for a partner's own
exit — the same wrong-blame class the `"peer-timeout"` decision fixed for
grace expiries, and just as misleading in a classroom. The client's
`"peer"` copy branch already existed (the demo produced it); only the wire
never did. The id on the wire is a characterId the survivor already knows
from `chat:started` — the privacy pin holds.

_Implemented in [socket.ts](../../shared/src/socket.ts) (the widened wire),
[matching.ts](../../server/src/live/matching.ts) (`markInactive` records
who), [studentSession.ts](../../server/src/live/handlers/studentSession.ts)
(the `lobby:leave` call site),
[projections.ts](../../server/src/store/projections.ts) (`toChatEnded`
projects studentId → characterId), and
[useActiveMatch](../../client/src/pages/student/join/useActiveMatch.ts) /
[LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx) (the
plumbing into the existing 🎭 branch)._

### On phones the chat fills the screen and hugs the keyboard; desktop keeps the fixed card

_2026-07-23_

**Decision:** Below the `sm` breakpoint the student chat card stretches to
fill the world — top chrome to screen bottom, ~8px from every edge, with a
tighter composer bar — instead of the desktop's centered `min(70dvh,620px)`
card, which stays as-is on `sm+`. The keyboard is handled by layout, not
script: `interactive-widget=resizes-content` in the viewport meta makes the
Android keyboard shrink the viewport (so the composer lands on the keys),
and iOS relies on Safari's default pan-to-input — good enough once the
composer is the last thing in the document. No `visualViewport` JS and no
body overflow lock for V1; the hook is the known follow-up only if a real
iPhone still shows a gap. The feed re-pins to the newest line whenever its
own size changes, so the keyboard opening never strands new messages below
the fold.

**Why:** On phones the floating-card look put the input mid-screen with a
purple void between it and the keyboard — the browser was panning the page
and exposing the empty 30% below the card (founder screenshot, 2026-07-23).
Students chat on small screens; every row of pixels should be conversation,
which is also why the margins shrank. A keyboard-watching script that
stretches the card only while typing was rejected as moving parts for the
same result; a body overflow lock was rejected because the demo stage must
scroll to its controls.

_Implemented in [ChatStage](../../client/src/components/Student/ChatStage.tsx),
[LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx),
[Chatbox](../../client/src/components/Student/Chatbox/index.tsx),
[StudentWorldLayout](../../client/src/components/layout/StudentWorldLayout.tsx),
[MessageComposer](../../client/src/components/chat/MessageComposer.tsx),
[Conversation](../../client/src/components/chat/Conversation.tsx), and
[index.html](../../client/index.html)._

### A timed-out student returns to their ended chat, never silently to the lobby

_2026-07-21_

**Decision:** Two product calls (2026-07-21, feature 9):

- A student whose own grace expired mid-chat comes back to the chat page,
  not the lobby: the server replays the chat they were reaped out of —
  transcript and all — followed by the ended notice with the wire reason
  `"self-timeout"`, so the existing 📶 "You lost connection" wrap-up
  renders on the same path as the survivor's 🔌 screen. They're re-seated
  under a fresh identity but wrapping up — off the queue and unmatchable
  until their own Back-to-the-lobby tap, like every other ended screen.
  The reason is per-recipient at emit and never stored: the stored 1:1
  reason stays `"peer-timeout"` (the survivor's perspective), and a
  group's chat may still be running when its reaped member returns.
- The activity remembers reaped-from-chat students for the **rest of the
  activity** — the same lifetime as removed students' tombstones. This
  supersedes the "at most 30 minutes" direction recorded under
  [A grace expiry ends a 1:1 as "peer-timeout"; the group notice is a
  client heuristic](#a-grace-expiry-ends-a-11-as-peer-timeout-the-group-notice-is-a-client-heuristic).
  The boundary: only a grace expiry inside an **active chat** earns the
  screen. A student reaped while waiting (or while already on an ended
  screen) still lands back in the lobby as a silent fresh join, and if
  the whole activity ended meanwhile, the activity-ended screen wins.

**Why:** Landing silently in the lobby after a two-minute drop read like
the app had erased what happened — the student's conversation was simply
gone, with the queue where it used to be. Replaying the transcript under
the honest 📶 reason tells them what happened and that it wasn't their
fault, and it reuses the survivor's ended-screen path wholesale: a bare
message screen was rejected because the chat page needs the room data to
render anyway, so "lighter" would actually have been a new render path.
Activity-lifetime memory won over the recorded 30-minute cap because the
entries are a few bytes, the activity's own TTL is the real bound, and a
timer would be machinery for a distinction students would rarely hit.
The wrapping-up seat matters: without it the returner would be silently
re-queued and could be auto-matched into a new chat while still reading
about losing the last one.

_Implemented in [seats.ts](../../server/src/live/seats.ts) (the reap memory),
[lobby.ts](../../server/src/live/lobby.ts) (the return replay), and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx) (the
burst-safe ended handler)._

### Students see a partner's drop and return, on the teacher's own 4s gate

_2026-07-21_

**Decision:** The peer-drop UI is real on live activities (feature 8): when
a chat partner's connection drops, the other members see the banner and its
live countdown ("Brutus 🔪 lost connection… 1:56 to come back"). Four rules,
all founder calls (2026-07-21):

- The banner appears past the **same 4-second gate** that flips the
  teacher's "lost connection" tag — never sooner. A partner who reconnects
  inside the gate (a quick refresh) shows nothing to anyone.
- The return is **only** a "X is back! 🎉" green flash (~2.5s). The demo's
  old "Reconnecting…" spinner phase is retired everywhere — a real socket
  never observes a "reconnecting" phase, just gone → back, and the UI
  doesn't invent one. (The demo engine sheds it in feature 8's prompt 4.)
- In a trio with **both** partners out, the banner shows the
  soonest-to-expire peer — the first-dropped clock is the urgent one — and
  switches to the other when the first resolves.
- The countdown **keeps ticking through a class-wide pause**, because the
  grace itself does (see
  [Pausing ships end to end; the grace window keeps running through it](teacher-live.md#pausing-ships-end-to-end-the-grace-window-keeps-running-through-it)).
  A frozen clock would lie: the partner can time out and vanish mid-pause.

The wire mechanics that make this safe: `chat:peer-connection` is
characterId-only (the same privacy pin as every student payload), the
"dropped" emit carries the server-computed seconds left so client clocks
can't drift the product window, and EVERY resume announces a "returned" —
the server can't know whether the drop was ever shown — with clients
ignoring a return for a peer they don't have marked offline, which is what
keeps sub-4s blips, duplicate-tab takeovers, and StrictMode double-mounts
invisible.

**Why:** A silent two minutes reads as "the app froze" and the student
bails (the gap called out as **Still owed** in
[A matched seat gets the same 2 minutes as any other, and leaves its chat when they run out](teacher-live.md#a-matched-seat-gets-the-same-2-minutes-as-any-other-and-leaves-its-chat-when-they-run-out)).
Sharing the teacher's gate keeps the two surfaces telling one story and
reuses the delay that already exists to absorb refreshes; an immediate
banner would flash "lost connection" at children on every partner refresh.
The spinner cut and the pause-ticking rule are both the same principle: the
banner shows what is actually true on the wire, not theater.

_Implemented in [lobby.ts](../../server/src/live/lobby.ts) (`sendPeerConnection`,
fanned from the 4s broadcast timer and the resume handler),
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx) (the
offline map + 🎉 flash state), and
[LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx) (the
real-time countdown derivation). Ships with
[feature 8](../../docs/plans/feature-8-peer-drop.md), prompt 1._

### A grace expiry ends a 1:1 as "peer-timeout"; the group notice is a client heuristic

_2026-07-21_

**Decision:** Three founder calls (2026-07-21, feature-8 prompt 2):

- A 1:1 chat ended by a partner's expired grace carries the wire reason
  `"peer-timeout"` (`chat:ended` and `ChatSnapshot.endReason` widen to
  `"teacher" | "peer-timeout"`), so the survivor lands on the 🔌 "Your
  partner lost connection… Not your fault!" wrap-up instead of the wrong
  🎓 teacher copy. Every teacher-caused ending keeps `"teacher"`:
  `chat:end`, `chats:end-all`, `chat:remove`, and a below-2 ending from
  `lobby:leave`. _(The `lobby:leave` clause was reversed 2026-07-23 — a
  student's own leave now ends the room as `"peer"` naming the leaver; see
  [A student's own leave ends a 1:1 as "peer", and the survivor's screen
  names their character](#a-students-own-leave-ends-a-11-as-peer-and-the-survivors-screen-names-their-character).)_
- A group's drop notice is a **client heuristic**: a peer vanishing from
  `chat:update` while marked offline reads "X couldn't get back in and
  left the chat"; otherwise "X left the chat". No reason rides the wire.
  Accepted imprecision: a teacher removing an already-disconnected
  student mid-window also gets the timeout copy — from the survivors'
  view the peer was gone and never came back.
- The self-timeout screen ("You lost connection 📶", for the student who
  ran out the window themselves) is **deferred** to its own later
  feature. Direction recorded: the server will remember reaped seats for
  at most 30 minutes, so a late returner can learn what happened instead
  of silently landing back in the lobby. _(Shipped 2026-07-21 — see
  [A timed-out student returns to their ended chat, never silently to the
  lobby](#a-timed-out-student-returns-to-their-ended-chat-never-silently-to-the-lobby);
  the memory became activity-lifetime, not 30 minutes.)_

**Why:** The wrong copy was worse than no copy: telling a child "Your
teacher ended the chat" when a partner's phone died points the blame at
the teacher and hides the one thing the student could act on (this wasn't
anyone's doing — go get re-paired). The 1:1 reason must ride the wire
because only the server knows why the room dropped below two; the group
notice needs no wire change because the survivors already watched the
countdown run out — the offline map is the evidence — and a reason
channel for one string would be machinery for nothing. Storing the reason
on the chat (rather than picking it at emit time) also makes the
wrappingUp resume re-delivery honest for free: a survivor whose own
socket blipped around the ending still gets the 🔌 screen.

_Implemented in [matching.ts](../../server/src/live/matching.ts)
(`markInactive`'s reason parameter — the grace-expiry path in
[lobby.ts](../../server/src/live/lobby.ts) is the only `"peer-timeout"` call
site), [projections.ts](../../server/src/store/projections.ts) (`toChatEnded`
projects the stored reason), and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)
(`liveEndReason` + the `shrinkToPeers` notice heuristic). Ships with
[feature 8](../../docs/plans/feature-8-peer-drop.md), prompt 2._

### The teacher never sees typing

_2026-07-21_

**Decision:** The typing indicator is a student-room signal only. When a
student types, the other students in the chat see the dots; the teacher's
chat cards show nothing — no dots, no "is typing" hint, no typing event on
the teacher wire at all.

**Why:** Founder scope call (2026-07-21, feature-5 planning). The teacher's
oversight surface is the transcript — what was said, under real names — not
keystroke pressure. A typing flicker per card across a classroom of
concurrent chats is noise, and the teacher wire stays snapshots-plus-one-
delta (message lines) on purpose. Recorded so nobody "completes" the teacher
side later without a founder call — the omission is the feature.

_Implemented in [lobby.ts](../../server/src/live/lobby.ts)'s `chat:typing` relay,
which fans out only to the chat's other students (ships with
[feature 5](../../docs/plans/feature-5-typing-indicator.md))._

### Typing is a heartbeat that dies in five seconds, never a stored fact

_2026-07-21_

**Decision:** The typing wire is a heartbeat with no stop event: the client
re-emits `chat:typing` at most once per 2 seconds while keys flow, the
server relays it statelessly (volatile, best-effort), and each receiver
expires the indicator 5 seconds after the last heartbeat — or instantly, the
moment that peer's own message lands. Nothing is stored: no store field, no
resume-backlog entry, so a student who refreshes mid-someone-typing simply
waits ≤2s for the next heartbeat.

**Why:** An explicit stop event was rejected because every failure mode
still needs the TTL backstop — a stop packet lost on school wifi, a socket
that dies mid-typing, a locked phone — so start/stop would be two mechanisms
where heartbeat-plus-TTL is one that self-heals them all. Statelessness
means the leave, remove, and end paths owe typing nothing, and the worst
artifact possible is an indicator lingering ≤5s after an abandoned draft.
If undone (typing stored or snapshotted), a refresh could replay a stale
"is typing" as fact.

_Implemented in [socket.ts](../../shared/src/socket.ts) (`TYPING_HEARTBEAT_MS`,
`TYPING_INDICATOR_TTL_MS`), [lobby.ts](../../server/src/live/lobby.ts), and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)'s TTL
timer (ships with feature 5)._

### One typing slot per room, last writer wins

_2026-07-21_

**Decision:** A room shows at most one typist. The client keeps a single
`typingPeerId`; when two peers type at once in a 3+-person room, the newest
heartbeat takes the slot.

**Why:** Structurally invisible: a duo has exactly one possible typist, and
every 3+-person room already collapses the indicator to "someone is
typing…", so per-peer slots would change nothing on screen while
complicating the state. If group UI ever names concurrent typists, this
reopens.

_Implemented in
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)
(`LiveMatch.typingPeerId`, ships with feature 5) — the group collapse ships
already in [Conversation.tsx](../../client/src/components/chat/Conversation.tsx)._

### The server never inspects what students write

_2026-07-20_

**Decision:** Messages are capped in length (75 characters, the composer's
own limit, enforced server-side from the same shared constant) and in rate
(10 per 10 seconds per socket), and that is the whole of it. The server never
reads a message for content — no profanity list, no blocked words, no
masking, no held-for-review. Whatever a student types, their peers get.

**Why:** Founder call (2026-07-20), and it matches the safety model already
on the homepage: the teacher watches every chat live with real names attached
([The teacher bullets say the safety part out loud](homepage.md#the-teacher-bullets-say-the-safety-part-out-loud)),
and Remove is the discipline tool
([Removing a student mid-chat is a quiet exit](teacher-live.md#removing-a-student-mid-chat-is-a-quiet-exit)).
Oversight by a present adult beats a wordlist: lists are trivially evaded by
anyone who wants to, they punish false positives (a student quoting Caesar's
assassination shouldn't be blocked), and this product mirrors every route
under `/he` — an English-only filter would be security theatre in half the
app. A filter would also need a "your message didn't send" path back to the
client, and no socket event has one; every rejection today is a silent no-op.

What would change this: messaging without a teacher present (homework mode,
async play). That removes the oversight this decision leans on, and the
question genuinely reopens.

_Implemented in [lobby.ts](../../server/src/live/lobby.ts)'s `chat:send` handler._

### Leaving a live chat means leaving the activity (until messaging ships)

_2026-07-19 · **Superseded 2026-07-23** by
[Ending your own chat keeps your seat, and the ender gets a wrap-up screen](#ending-your-own-chat-keeps-your-seat-and-the-ender-gets-a-wrap-up-screen)
— the deferred slice below shipped, wire event and all, so the chat room's
exit keeps the seat and the confirm's copy no longer mentions the activity.
Kept in place for the reasoning that held for four days, and because its
browser-back half still stands: back mid-chat opens the same confirm._

_The original deferral, 2026-07-20: the "until messaging ships" clause came
due — messaging shipped — and was **deliberately left open** rather than
resolved: leaving a live chat still left the activity. The server already
ended a duo and continued a trio on `lobby:leave`; what was missing was a
leave-the-chat-but-keep-your-seat path (return to the queue instead of
signing out), which is its own slice with its own wire event, not a rider
on messaging. Until it shipped, the confirm's copy stayed honest about
leaving the activity._

**Decision:** In the real chat room, the header's exit control and browser
back both open a confirm that says the student will leave the activity;
confirming releases their seat (the same back-as-reset flow as the lobby).
If that empties a duo, the partner's chat ends with the teacher-reason ended
screen. The demo chat keeps the recorded End-vs-Leave semantics
([In a group the student leaves; only a 2-person chat can be ended](#in-a-group-the-student-leaves-only-a-2-person-chat-can-be-ended))
— those return to real rooms with messaging.

**Why:** Founder call (feature-3 planning). Browser back can't be blocked,
so an exit path exists regardless; a dead exit pill next to it would be the
one button in the room that does nothing. With no messages to protect,
"leave the chat" and "leave the activity" are honestly the same act — the
confirm just has to say so.

_Implemented in
[LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx) (the exit
pill and the back-guard confirm both route to the leave flow) and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)
(back-as-reset → `lobby:leave`); the partner's chat ends server-side in
[lobby.ts](../../server/src/live/lobby.ts)._

### The live ended screen returns to the lobby only on a tap, and shows no reveal

_2026-07-19_

**Decision:** When a live chat ends under a student, their seat leaves the
teacher's queue and stays unmatchable until the student taps "Back to the
lobby", which re-queues them with a fresh wait clock — extending
[End of chat requires a tap to return to the lobby](#end-of-chat-requires-a-tap-to-return-to-the-lobby)
to the real world. The live ended screen shows a neutral wrap-up with no
name reveal (reveal ships with a later feature). A student who refreshes
while on the ended screen returns to the lobby immediately — the client has
nothing left to show them there.

**Why:** Auto-returning the seat would show the teacher a "waiting" student
who is still reading the ended screen — and auto-match could pair them
before they've looked up. The reveal is suppressed because claiming "your
teacher hasn't revealed names yet" would be false: there is no reveal to
wait for yet.

_Implemented in [seats.ts](../../server/src/live/seats.ts) (the seat's
`wrappingUp` flag and `returnToQueue`), the `lobby:back` handler in
[lobby.ts](../../server/src/live/lobby.ts), and
[LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx) (the
neutral ended screen and its back CTA)._

_Superseded in part (the reveal) by
[The live name reveal fires at chat-end, per the teacher's setting](#the-live-name-reveal-fires-at-chat-end-per-the-teachers-setting)
— feature 10, 2026-07-22. The tap-to-return half still holds._

### The live name reveal fires at chat-end, per the teacher's setting

_2026-07-22_

**Decision:** On a real activity, when the teacher's "Reveal names when a chat
ends" setting is on, a chat's end reveals each student's peers by real name on
the ended screen — the same panel the demo has always shown. The reveal is
decided **per chat-end, from the setting's value at that moment**: for an
end-of-class reveal a teacher flips the setting on, then ends the chats. Chats
that already ended stay as they were — no retroactive reveal to students back
in the lobby, and no separate "reveal now" control (extending
[No reveal-names control in Chats in progress](teacher-live.md#no-reveal-names-control-in-chats-in-progress)).
Every ending reveals — teacher-ended, round-closed, and the connection-loss
endings (`peer-timeout`, `self-timeout`) alike — and the list is everyone ever
in the room, including a member who dropped or was removed earlier (their name
was captured at chat start). A refresh on the ended screen keeps the reveal:
the resume replay re-reads the setting.

**Why:** Founder calls, 2026-07-22. Per-chat-end keeps the change to a single
sanctioned exception to the characterIds-only student wire — `chat:ended`
carries the names only when the setting is on, pinned by `toChatEnded`'s
allowlist test — instead of a new whole-class reveal channel that would have to
reach students who already moved on. Revealing on every ending and listing
everyone-ever both match the long-standing demo, so a teacher learns no new
behavior.

_Implemented in [projections.ts](../../server/src/store/projections.ts)
(`toChatEnded`'s gated `reveal`), the three `chat:ended` emit sites
([lobbyContext.ts](../../server/src/live/lobbyContext.ts),
[studentSession.ts](../../server/src/live/handlers/studentSession.ts)), and the
client reveal path
([liveMatchState.ts](../../client/src/pages/student/join/liveMatchState.ts)
`applyReveal`,
[LiveChatStage](../../client/src/components/Student/LiveChatStage.tsx)). See
[feature-10](../plans/feature-10-name-reveal.md)._

### In a group the student leaves; only a 2-person chat can be ended

_2026-07-16 · Extended to real activities 2026-07-23: the End-vs-Leave swap
below was demo-only on the live path (both buttons signed the student out).
Since [Ending your own chat keeps your seat, and the ender gets a wrap-up screen](#ending-your-own-chat-keeps-your-seat-and-the-ender-gets-a-wrap-up-screen)
it holds in real rooms too — including the suppressed reveal — with the
server re-reading the room's size at confirm time, so its count is the one
that decides._

**Decision:** The student's exit action depends on who's still in the room.
With 3+ active people, the header button is **Leave** (door icon) and browser
back asks "Leave this chat?" — confirming removes just that student, while
the others keep chatting and see a centered "«character» left the chat"
notice. With exactly 2 active people — a 1:1, or a group that dwindled — the
button is **End chat** and works as before, ending the room for everyone.
Only one button ever shows, and it swaps live as the group shrinks: the rule
reads the room's current size, not how the chat started, and the open
confirmation re-reads it at confirm time, so a group dwindling to two
mid-dialog can never turn a Leave tap into a silent end (the dialog's copy
morphs with it). A leaver lands on a "You left the chat" screen and returns
to the lobby by their own tap, per
[End of chat requires a tap to return to the lobby](#end-of-chat-requires-a-tap-to-return-to-the-lobby);
their name reveal is suppressed regardless of the teacher's setting — the
chat is still running for the others, so the mystery holds.

**Why:** Founder call.
[Ending a chat ends it for everyone in the room](#ending-a-chat-ends-it-for-everyone-in-the-room)
exists because a chat without partners is dead air — but in a group,
partners remain, so one student stepping out shouldn't cost the others their
conversation (the same reasoning as
[A group chat drops a timed-out peer instead of ending](#a-group-chat-drops-a-timed-out-peer-instead-of-ending)).
Showing Leave and End side by side was rejected as clutter — one exit, one
decision. The accepted consequence: in a 3+ group, ending for everyone is a
teacher/timer-only action.

_Implemented in [useChatDemo](../../client/src/components/chat/useChatDemo.ts),
[the student chatbox](../../client/src/components/Student/Chatbox/index.tsx), and
[ChatEndedSection](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)._

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
[MessageComposer](../../client/src/components/chat/MessageComposer.tsx),
with the shared lazy loading in
[LazyEmojiPicker](../../client/src/components/chat/LazyEmojiPicker.tsx)._

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
[ChatEndedSection](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)
(copy map) and [useChatDemo](../../client/src/components/chat/useChatDemo.ts)
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

_Implemented in [ChatHeader](../../client/src/components/chat/ChatHeader.tsx),
with the popover primitive in
[popover](../../client/src/components/ui/popover.tsx)._

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

**Update (2026-07-21):** The window is real on live activities now (feature
8), and the return flow lost its "Reconnecting…" phase — the "is back! 🎉"
flash is the whole return. See
[Students see a partner's drop and return, on the teacher's own 4s gate](#students-see-a-partners-drop-and-return-on-the-teachers-own-4s-gate).

**Why:** Classroom devices drop constantly (the same reality behind
refresh-keeps-the-lobby), so a vanished partner needs a grace period rather
than an instant kill — but the student left waiting deserves to see how long
they're expected to hang on, or they'll assume the app froze and bail. Two
minutes is long enough to hop back on the wifi, short enough that a 1:1
student isn't held hostage by an empty seat. The disconnect-specific ended
copy exists because "Great roleplay! 👏" after your partner evaporated reads
like the app didn't notice what happened.

_Implemented in [useChatDemo](../../client/src/components/chat/useChatDemo.ts)
(window + countdown), with the copy in
[PeerReconnectBanner](../../client/src/components/chat/PeerReconnectBanner.tsx)
and [ChatEndedSection](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)._

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

_Implemented in [useChatDemo](../../client/src/components/chat/useChatDemo.ts);
notice rendering in
[ConversationLines](../../client/src/components/chat/ConversationLines.tsx)._

### Ending a chat ends it for everyone in the room

_2026-07-12_

**Decision:** When a student ends a chat, it ends for **every participant in that chat**,
not just the student who tapped End chat — same as when the teacher ends it. The
confirmation copy on both seats says so explicitly.

> **Scope note (2026-07-16):** the rule itself is unchanged, but per
> [In a group the student leaves; only a 2-person chat can be ended](#in-a-group-the-student-leaves-only-a-2-person-chat-can-be-ended),
> students are only _offered_ End chat when the room has exactly 2 active
> people — in a larger group their exit is Leave.

**Why:** The roleplay needs its partners: once one student leaves, the others would be
sitting in a dead chat with no one to answer. Ending it room-wide moves everyone to the
wrap-up screen at the same moment, so each student can head back to the lobby (and later,
the rematch queue) instead of waiting on a conversation that's already over. This is also
why ending goes through a confirmation step on both seats — the tap affects other people.

_Copy lives in the `description` props passed to
[EndChatConfirmationModal](../../client/src/components/chat/EndChatConfirmationModal.tsx) by
[the student chatbox](../../client/src/components/Student/Chatbox/index.tsx) and
[the teacher chat card](../../client/src/components/Teacher/ChatCard/index.tsx)._

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

_Implemented in [ChatEndedSection](../../client/src/components/Student/Chatbox/ChatEndedSection.tsx)._

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

_Colors live in the `--char-*` tokens in [index.css](../../client/src/index.css) (with brighter
dark-mode variants); assignment is in
[characterColor.ts](../../client/src/lib/characterColor.ts). Pass the viewer's own character
first so it lands on green._
