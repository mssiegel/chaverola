# Student join flow & lobby

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The full-activity screen names the 60-seat cap and offers a retry

_2026-07-19_

**Decision:** A student who hits the seat cap gets the lobby gate's own
screen: copy that says an activity holds up to 60 students and every spot is
taken, a "Try again" button that re-attempts the connection, and a quiet
"Use a different code" link back to code entry. Not a bare copy block, and
not a plain sign-out.

**Why:** Founder call (feature-2 Prompt 2 implementation). Naming the number
turns an arbitrary wall into an explanation a student can repeat to their
teacher. The retry is load-bearing, not a nicety: Socket.IO never re-attempts
a rejected connection on its own, so without the button a freed seat would be
unreachable until a full page reload. The quiet link keeps a way out for a
class that stays full.

_Implemented in
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)
(`ActivityFullCard`) over
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts)._

### A removed student retypes their name — the field is not refilled

_2026-07-19_

**Decision:** When a real teacher removes a student, the student lands on the
name step with the removed notice and an **empty** name field. The demo keeps
refilling "Rachel" (its prefill exists so the demo stays one click deep).

**Why:** Founder call (feature-2 Prompt 2 implementation), choosing blank
over prefill-for-one-tap-rejoin: most real removals target a fake name, and
handing the same name back would make the re-offense friction-free. A student
who mistyped a real name just retypes it.

_Implemented in
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx) (the
presence hook's `onRemoved` callback)._

### The real lobby still says Waiting for your match until matching ships

_2026-07-19_

**Decision:** Feature 2 ships the live lobby before matching exists, and the
real lobby keeps the exact demo copy anyway — "Waiting for your match" with
the mint dots. No forked interim copy on real activities.

**Why:** Founder call (feature-2 planning). Matching arrives in the very next
feature, and real classes won't realistically run an activity until the full
loop exists — so interim copy would be churn, reverted within weeks, and a
fork between demo and real surfaces that deliberately render the same
components. When the student's connection drops, the pill swaps to a
reconnecting variant (same mechanism as the paused pill), so the lobby never
lies about the connection either.

_Implemented in
[WaitingLobby](../../client/src/components/Student/WaitingLobby.tsx) (the
`connection` pill variant), driven by
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts)._

_Resolved 2026-07-20: matching shipped and the copy needed no change —
"Waiting for your match" became literally true, and the lobby now hands
off to a real chat room. The decision to skip interim copy paid for
itself._

### Two students can share a name; the queue tells them apart

_2026-07-19_

**Decision:** The server accepts duplicate student names within one activity.
Every student gets a server-minted unique id; the teacher's queue rows are
disambiguated by their wait clocks, and Remove always targets the exact row
tapped, never a name.

**Why:** Founder call (feature-2 planning). Classes genuinely have two
Joshes, and rejecting the second one ("that name's taken") adds friction at
the worst possible moment — a kid joining while the class waits. The
anonymity design means other students never see the names anyway, so
uniqueness buys nothing on the student side.

_Implemented in [seats.ts](../../server/src/live/seats.ts) (server-minted ids;
no name-uniqueness check anywhere) and
[PairingPanel.tsx](../../client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(rows keyed and removed by id, never by name)._

### A wiped server ends the class honestly on the student's screen

_2026-07-19_

**Decision:** When a student's activity vanishes mid-class (a server deploy
or restart wiped the in-memory store, or the TTL reaped it), the student gets
a dedicated "activity ended" screen — not the "Activity was not found.
Recheck the Join Code you entered." sign-out. Both paths land there: the
socket's ended event, and a page reload whose lookup resolves not-found
**while the session still holds a seat token for that exact code** (the
token is proof the code was real). Sign-out is deferred to the screen's CTA
back to code entry. The teacher side keeps its existing friendly not-found.

**Why:** Founder call (feature-2 planning), same free-tier truthfulness
stance as the distinct not-found/unreachable copy: telling a kid to recheck
a code that worked five minutes ago sends them hunting a typo that doesn't
exist. The seat token is what distinguishes "this code was never real" from
"the class ended under you"; deferring the sign-out matters because clearing
the session immediately would destroy the very evidence the ended screen
renders from.

_Implemented in
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx) (the
ended stage, both the socket and REST-404-with-token paths) over
[useLobbyPresence](../../client/src/pages/student/useLobbyPresence.ts); the
server side notifies through the store's removal hook in
[lobby.ts](../../server/src/live/lobby.ts). Extends
[Real codes resolve over the API, and only a resolved miss signs anyone out](#real-codes-resolve-over-the-api-and-only-a-resolved-miss-signs-anyone-out)._

### Real codes resolve over the API, and only a resolved miss signs anyone out

_2026-07-19_

**Decision:** The join flow resolves real codes through
`GET /activities/:joinCode` (feature-1 Prompt 5); the demo code `1234`
keeps resolving synchronously from mock data, with zero network — the demo
works offline forever. The lookup has four visible outcomes, and they are
deliberately not collapsed:

- **Loading** is its own stage ("Finding your activity…"), and it never
  signs the student out. A session is cleared only by a **resolved**
  landing at the code gate: bare `/activity/join`, or a code the server
  answered "doesn't exist" to.
- **Not found** and **unreachable** get distinct copy: "Activity was not
  found. Recheck the Join Code you entered." vs "We can't reach Chaverola
  right now. Check your internet, then try again." An unreachable server
  also keeps the session, so when it answers again the student lands right
  back in their lobby — same name, no re-entry.
- A lookup still running after ~5 seconds swaps in patience copy
  ("Chaverola is just waking up. The first join of the day takes about
  half a minute.") — on the code-entry button while a submit is in
  flight, and on the loading card for direct-link arrivals.
- A 5xx or rate-limited answer reads as unreachable to the student: the
  practical advice (try again shortly) is the same, and a student can't
  act on the difference.

Real lobbies show none of the demo furniture: no banner, no demo control
panel, and no auto-pairing — those stay exclusive to `1234`.

**Why:** The old sign-out rule
([Landing on code entry signs the student out](#landing-on-code-entry-signs-the-student-out))
derived "you're at the code gate" from "no activity resolved", which was
safe only while lookups were synchronous. An async lookup passes through
a no-activity moment on every lobby refresh, and classroom devices refresh
constantly — signing out there would wipe a student's name mid-class. So
the trigger moved from "no activity on screen" to "the server said no".
Unreachable must not sign out either: the free tier spins down and
networks blip, and neither is the student's fault. The distinct copy
matters for the same reason — "recheck the code" sends a kid whose wifi
dropped hunting a typo that isn't there. The ~5s patience line sets an
honest expectation for the ~30s cold start instead of looking frozen, per
the free-tier truthfulness stance. The submit's lookup runs in place so a
wrong code still never changes the URL (that rule predates the API and
survives it), and a found activity is handed to the next screen rather
than refetched, keeping the in-place code→name swap.

_Implemented in
[useActivityLookup](../../client/src/lib/useActivityLookup.ts),
[api.ts](../../client/src/lib/api.ts), and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._

**Update (2026-07-24):** the patience copy is gone. It existed for the free
tier's idle spin-down, and the API now runs on a paid instance that never
sleeps (see [backend-api.md](backend-api.md#the-api-runs-on-a-paid-render-instance-because-free-web-services-block-outbound-smtp)).
The rest of this entry stands: unreachable still never signs a student out,
and the loading card still says "Finding your activity…".

### Stage swaps inside the student route open at the top of the page

_2026-07-16_

**Decision:** When the student's screen swaps without the URL changing —
lobby into a chat (manual trigger or the auto-match), a rematch, or back to
the lobby — the page scrolls to the top, the same way a route change opens a
fresh page. One exception: a chat ending stays put, because that swap happens
in place while the student is reading the conversation.

**Why:** Founder call. Per
[One URL for the whole student journey](#one-url-for-the-whole-student-journey),
these stages are all one route, so the app-wide scroll-to-top (which watches
the URL) never fires — a student scrolled down in the lobby would land in the
chat mid-scroll, with the chat header out of view. A new UI should start at
the top of the page.

_Implemented in
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._

### No identity bar during chat either

_2026-07-15_

**Decision:** The chatting/ended stages no longer show the white identity
strip (avatar initial + name + "Chatting with …") above the chatbox. The
`StudentIdentityBar` component is deleted; the chatbox now stands alone on
the student's screen. This supersedes the original prompt-8 requirement that
the student's real name stay persistently visible while chatting.

**Why:** The strip was too prominent for what it carried, and its stage text
duplicated the chat header one line below it — the gradient header already
says "You're Brutus 🔪 with Caesar's ghost 👻". Two adjacent bars announcing
the same room read as clutter, especially on phones where vertical space is
the scarcest resource in a chat.

**Update (2026-07-15):** the real name came back in a much quieter form — a
non-interactive badge in the world's top-left corner — see
[Mid-chat, the student's name is a corner badge](#mid-chat-the-students-name-is-a-corner-badge).

_Removed from [ChatStage](../../client/src/components/Student/ChatStage.tsx)._

### Mid-chat, the student's name is a corner badge

_2026-07-15_

**Decision:** While a chat is on screen (chatting and just-ended stages), the
student's name appears as a small badge in the top-left corner of the purple
world — the exact spot the Chaverola brand pill vacates mid-chat (see
[The brand home link disappears mid-chat and while hosting](navbar.md#the-brand-home-link-disappears-mid-chat-and-while-hosting)).
The badge is deliberately styled as **not a button**: a flat, translucent
**dark grape** pill (translucent white washed out against the purple world),
no shadow, no hover state, and it sits inside the corner bar's
`pointer-events-none`, so taps pass through to the world. This contrasts
with the solid-white pills up there (language switcher, brand pill), which
are all clickable. It shows **just the name** — no avatar-initial disc,
because students never upload a photo, so a disc with a letter promises an
avatar that doesn't exist. The lobby is untouched: the brand pill still owns
that corner, and the lobby heading ("You're in, {name}!") keeps confirming
identity there.

**Why:** After the in-card identity bar was removed as clutter, mid-chat was
the one stage with no reassurance of whose session this is — which matters on
shared classroom machines. The vacated corner gives the name a persistent
home that costs the chatbox nothing, and mirrors the language pill on the
other side. Product-owner call on the non-pill-like styling: the name is not
clickable, so it must not look tappable.

_Implemented in
[StudentWorldLayout](../../client/src/components/layout/StudentWorldLayout.tsx) and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._

### Back during a live chat asks before ending it

_2026-07-14_

**Decision:** During the chatting stage, browser back does not navigate: it
opens the same end-chat confirmation as the End chat button. Confirming ends
the chat and lands the student on the chat-ended screen — it never continues
out of the page; canceling stays in the chat. The guard arms only while a
chat is live: the lobby keeps its back-as-reset behavior, and the ended
screen doesn't trap the student.

> **Scope note (2026-07-16):** back still opens the header button's
> confirmation, but that confirmation is now contextual — per
> [In a group the student leaves; only a 2-person chat can be ended](chat-behavior.md#in-a-group-the-student-leaves-only-a-2-person-chat-can-be-ended),
> in a 3+ group it asks about leaving, not ending.

**Why:** This is the guard promised by the lobby-only note in
[Landing on code entry signs the student out](#landing-on-code-entry-signs-the-student-out):
on this route, back lands on code entry, which signs the student out — so
during a live chat a stray swipe would silently kill a conversation that
(per
[Ending a chat ends it for everyone in the room](chat-behavior.md#ending-a-chat-ends-it-for-everyone-in-the-room))
ends for the partners too. Students on phones swipe screen edges constantly;
an accidental gesture must never cost three people their chat. Routing back
through the existing confirmation reuses a decision the student already
understands instead of inventing a second "are you sure" pattern.

_Implemented in [useBackGuard](../../client/src/lib/useBackGuard.ts), armed by
[ChatStage](../../client/src/components/Student/ChatStage.tsx)._

### One URL for the whole student journey

_2026-07-13_

**Decision:** The student stays on `/activity/join/:joinCode` from name entry
through the lobby, the chat itself, and the chat-ended screen. The URL never
changes to reflect the stage (no `/activity/lobby/...` or `/activity/chat/...`).
The UI swaps by stage, exactly as the canonical routes table in
[Shared_Project_Context.md](../../Shared_Project_Context.md) specifies.

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
`/activity/host/:hostKey`).

_Implemented in
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx); routes in
[App.tsx](../../client/src/App.tsx)._

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

**Update (2026-07-19):** with real codes resolving over the API, "landing
on code entry" is narrowed to a **resolved** landing — an in-flight lookup
or an unreachable server never signs anyone out. See
[Real codes resolve over the API, and only a resolved miss signs anyone out](#real-codes-resolve-over-the-api-and-only-a-resolved-miss-signs-anyone-out).

_Implemented in
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._

### Lobby waiting dots are mint, not grape

_2026-07-13_

**Decision:** The three bouncing dots next to "Waiting for your match" are
`brand-mint` green; the pill around them stays grape.

**Why:** Mint is the app's established "live" color — the teacher chat
card's pulsing live dot and the identity bar's stage dot already use it.
Green dots read as "the system is actively working on your match" rather
than decoration, and they pop against the grape pill.

_Implemented in
[WaitingLobby](../../client/src/components/Student/WaitingLobby.tsx)._

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

**Update (2026-07-15):** the bar is gone from the chatting stage too, and the
component is deleted — see
[No identity bar during chat either](#no-identity-bar-during-chat-either).

_Removed from
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._

### No emoji bubble row in the waiting lobby

_2026-07-13_

**Decision:** The lobby shows no row of bouncing character-emoji circles
above the heading. Character emojis appear only in the "Characters in this
activity" chips.

**Why:** Round, pale, evenly spaced circles read as buttons — students will
try to tap them and nothing happens. The lobby's energy comes from the
heading and the animated "Waiting for your match" dots instead.

_Removed from [WaitingLobby](../../client/src/components/Student/WaitingLobby.tsx)._

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
[StudentWorldLayout](../../client/src/components/layout/StudentWorldLayout.tsx);
routes split into two pathless layout groups in
[App.tsx](../../client/src/App.tsx)._

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
[DriftingDoodles](../../client/src/components/decor/DriftingDoodles.tsx) and the
`.doodle` rules in [index.css](../../client/src/index.css)._

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
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._

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
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx); routes in
[App.tsx](../../client/src/App.tsx)._

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

_Implemented in [studentSession.ts](../../client/src/lib/studentSession.ts) and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._
