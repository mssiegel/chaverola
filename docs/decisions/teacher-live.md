# Teacher live activity page

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

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
(`pauseChats`/`resumeChats`), [lobby.ts](../../server/src/live/lobby.ts) (the
handlers, guards, and `sendActivityPaused`),
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
[lobby.ts](../../server/src/live/lobby.ts) (the two handlers),
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

_Implemented in [lobby.ts](../../server/src/live/lobby.ts) (the `chat:send`
handler's room emit) and
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

_Implemented in [lobby.ts](../../server/src/live/lobby.ts) (`armSeatTimers`'s grace
expiry now settles chat membership before reaping; the disconnect handler
arms the grace unconditionally) and
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
working: tap-to-select (2 up to `min(4, roster)`), "Pair everyone 1:1", the
auto-match switch, random character dealing, live "Chats in progress" cards,
and each matched student's phone moving into a real chat room. **No messages
travel yet.** The student's composer renders disabled with honest copy, and
"End chat", "End all chats", and "Pause all chats" render disabled with a
short hint; no auto-end clock runs. One structural exception: when a chat's
active membership would drop below 2 — the teacher removed someone, or a
student left — the chat ends with reason "teacher": the remaining peer gets
the ended screen and can rejoin the queue, and the card moves to "Completed
chats" (demo semantics kept).

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
socket wiring in [lobby.ts](../../server/src/live/lobby.ts), the student's room
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

_Implemented in [lobby.ts](../../server/src/live/lobby.ts) — the `joinCode →
{ timer, teacherCount, nextAt }` map, armed on the 0→1st teacher socket
and cleared on the last disconnect — with the pairing itself in
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

_Implemented in [lobby.ts](../../server/src/live/lobby.ts) and
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

**Why:** Real auto-match forces the question: the switch and its seconds
must reach the server or the rail lies. Syncing the whole settings object is
one event and stops the panel silently reverting on refresh; syncing only
the two auto-match fields was rejected — it leaves the panel half-real with
no user-visible logic to the split. Roster/scenario sync stays out because
those propagate to students' lobbies — a bigger feature than a settings
echo. Founder call (feature-3 planning).

_Implemented in the `settings:update` handler in
[lobby.ts](../../server/src/live/lobby.ts) (zod-validated against the same
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
tap 2–4 names, then confirm — and with Start their chat on top, the button
nearest the selecting finger was Pair everyone 1:1, a mis-click that throws
away the selection and pairs the whole room. Rejected (tried, then pulled
back the same day): moving Start below the queue and pinning it to the
rail's bottom edge — closest possible to the names, but it split the two
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

### A character in a live chat shows the Live dot, and its hint says who

_2026-07-16_

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

_Implemented in
[CharacterRowsField](../../client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)
(the indicator) and
[LiveSettingsPanel](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(the named message)._

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

**Why:** A teacher glancing from across a classroom must catch the number
instantly, and it must visibly react when it changes — students sitting
unmatched is the one thing this page exists to prevent. The condensed bar
keeps the number on screen while the teacher is deep in the chat cards. A
status label was dropped because it states the obvious; the live count
already says the activity is running.

_Implemented in
[HostHeader](../../client/src/components/Teacher/HostActivity/HostHeader.tsx)._

### Pairing is tap-to-select, and characters are dealt randomly

_2026-07-15_

**Decision:** Waiting students render as rows in **join order** — new
joiners append at the bottom, each with a subtle wait time. Tapping selects;
with two selected the start-chat action activates, and a 3rd/4th can be
selected only when the roster has that many characters. There is **no
character-assignment step**: a chat of N uses the roster's first N
characters (the promise the setup form makes about characters 3 and 4), and
who gets which is random — the teacher sees who got whom on the chat card.
Each row's remove control is separate from the select target.

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

_2026-07-15_

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
rendered in the UI. The spoken instructions keep saying www.chaverola.com.
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
