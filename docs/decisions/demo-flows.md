# Demo flows & demo furniture

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The student demo skips the code screen and joins you as Rachel

_2026-07-16_

**Decision:** Every student-demo doorway (the homepage's "Try the student
side" and `/demo/student`) lands directly on `/activity/join/1234` — the
name step — with the name field prefilled "Rachel" (`DEMO_STUDENT_NAME`), so
the lobby is one click (or one Enter) away. The name stays editable, and the
demo's teacher-removes-you event refills it so rejoining is one click too.
The code screen's "Demo code 1234 always works" pill is gone: nothing points
the demo at code entry anymore, so the screen real students use carries no
demo advertising. On phones a prefilled name doesn't autofocus — the
keyboard must not bury the world before it's been seen. "Rachel" belongs to
no pretend roster, so the demo never shows two Rachels.

**Why:** Founder call (2026-07-16), reversing the earlier "walk the full
trip from its first step" choice recorded in
[`/demo`, `/demo/teacher`, and `/demo/student` are thin redirects, never pages](routes.md#demo-demoteacher-and-demostudent-are-thin-redirects-never-pages).
Typing a code and inventing a name is the boring part of the trip, and a
homepage visitor gives a demo seconds before deciding — the interesting part
(the lobby, the matching, chatting in character) should be one click away.
Anyone curious about code entry can still visit `/activity/join` and type
`1234` by hand.

_Implemented in [App.tsx](../../client/src/App.tsx),
[DemoSection.tsx](../../client/src/components/home/DemoSection.tsx),
[JoinActivityPage.tsx](../../client/src/pages/student/JoinActivityPage.tsx), and
[activityDemo.ts](../../client/src/mockData/activityDemo.ts)._

### The demo notice is a banner you can't miss

_2026-07-16_

**Decision:** The pretend-students notice is a golden (brand-sun) banner on
both views, promoted from a small pill. Teacher host page: a full-width bar
pinned directly under the navbar for the whole scroll — "This is the demo
class. The students are pretend." with the "Start your own" link — and
HostHeader's condensed waiting bar stands down on the demo so the two never
fight over that band (the desktop pairing rail still shows the count).
Student world: a solid golden card at the top of the column from the name
stage on, pinned below the corner pills so the stages scroll underneath it;
same wording as before, still label-only — no teacher nudges inside the
student experience. Supersedes
[Demo surfaces say so: a pretend-students chip on both views](#demo-surfaces-say-so-a-pretend-students-chip-on-both-views).
(**2026-07-16, later the same day:** the teacher notice is a centered
floating golden card — rounded, shadowed, hugging its text — instead of an
edge-to-edge bar, matching the student world's card. Everything else holds:
solid gold, sticky under the navbar for the whole scroll, "Start your own"
link kept.)

**Why:** Founder feedback (2026-07-16): the wording was right, but the chip
was too easy to miss — the notice must be big and obvious, and it must stay
visible while scrolling (asked first for the teacher page, then extended to
the student world the same day). Honesty about the demo is
load-bearing (a visitor who realizes late that the students are pretend
feels tricked), and the always-visible "Start your own" is the sales exit.
The full-width bar was then softened to a centered card (founder pick,
2026-07-16): edge-to-edge reads like a system warning or cookie notice,
while the floating card keeps the can't-miss size and persistence, looks
friendlier, and makes the two demo surfaces visually consistent.

_Implemented in [DemoBanner.tsx](../../client/src/components/demo/DemoBanner.tsx)
(which replaced `DemoChip.tsx`), rendered by
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx) and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx); the
stand-down lives in
[HostHeader](../../client/src/components/Teacher/HostActivity/HostHeader.tsx)._

### When the backend arrives: real activities get strictly real, and `1234` stays the only demo

_2026-07-16_

**Decision:** Recorded now so backend work builds toward it. Once `server/`
is real: (1) join code `1234` is reserved forever as the only simulated
activity — the backend must never hand it out (the client's
`mockGenerateJoinCode` already refuses it). (2) A teacher's real activity
shows only real students; the simulated classroom never leaks into it.
(3) An unknown host code becomes a friendly not-found —
[An unknown host code redirects to the demo activity](teacher-live.md#an-unknown-host-code-redirects-to-the-demo-activity)
is right only while every live code is fake and a dead link can't exist.
(4) The demo control panels leave real activities and stay on the demo ones.

**Why:** Founder call (2026-07-16). The demo flows are product, permanently
— they're the homepage pitch and the founder's sales tool. But demo blending
into real flows (pretend students on a teacher's own activity, unknown codes
resurrecting as the demo) is scaffolding that only makes sense while nothing
is real. Writing the split down now means no future agent has to guess which
side a behavior belongs to — a wrong guess looks broken in both directions:
real students mixed with pretend ones, or a teacher's dead link opening
someone else's demo.

**Update (2026-07-18):** point (1)'s server half is real: the server never
mints `1234` and 404s any lookup of it unconditionally — it doesn't even
know the demo exists, so a compromised server can't impersonate it.
`mockGenerateJoinCode` itself is deleted in feature-1 Prompt 6, when the
server becomes the only join-code issuer. Points (2)–(4) land with
Prompts 5–6.

**Update (2026-07-19):** all four points are now real (Prompts 5–6):
`mockGenerateJoinCode` is gone (the server is the only issuer), a real
activity boots an empty host world with no pretend students, unknown host
links get the friendly not-found (see
[Unknown host links get a friendly not-found, and the demo redirect is gone](teacher-live.md#unknown-host-links-get-a-friendly-not-found-and-the-demo-redirect-is-gone)),
and the demo control panels render only on `1234`.

_The client-side seams are the engine hooks
([useChatDemo.ts](../../client/src/components/chat/useChatDemo.ts),
[useHostActivityDemo.ts](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts))
behind the `ChatRoomState`/`ChatRoomActions` contract in
[chat.ts](../../client/src/types/chat.ts)._

### The demo control panels are teacher-facing and permanent (on demo flows)

_2026-07-16_

**Decision:** The dashed panels are titled "You're driving this demo" (a
joystick icon, no more wrench or "dev only" badge) with a one-line caption
saying who does this in real life — host page: "A real class does all this
by itself."; lobby: "In a real activity, your teacher does this part.";
chat: "In a real chat these happen on their own." — and human button labels
("Pair me 1-on-1", "Partner drops off"). The panels are permanent furniture
of the demo flows; when the backend arrives they disappear from real
activities only. The dashed border stays, so demo furniture never passes
for product UI. (This replaces the in-code plan that the panels would "go
away once a real backend drives the events they trigger.")

**Why:** Founder call (2026-07-16). In a pitch these buttons are the
steering wheel — "watch, I'll pair the class now" — and homepage visitors
read "dev only" as "not for me" and skip the best part. Keeping buttons
beat autopilot-only: the founder keeps control of the big moments.

_Implemented in
[DemoControls.tsx](../../client/src/components/demo/DemoControls.tsx),
[ChatDemoControls.tsx](../../client/src/components/demo/ChatDemoControls.tsx),
and their consumers._

### The demo lobby pairs you by itself after 20 seconds

_2026-07-16_

**Decision:** In the demo activity's waiting lobby, if the visitor presses
no demo button for ~20 seconds, the pretend teacher pairs them anyway — a
random 1:1 or group of 3. A manual match cancels the pending timer; coming
back to the lobby starts a fresh one. Demo activity only: on a real
activity, matching belongs to the real teacher, through the backend, later.

**Why:** Founder call (2026-07-16), and the founder picked 20 seconds over
the proposed ~10. The lobby only advances by demo triggers, so a homepage
visitor who didn't spot the buttons would wait forever and leave — while in
a live pitch the founder clicks first, so the fallback stays out of the
way. The wait also mirrors reality: a real teacher takes a moment to pair
people, and it gives the lobby screen a chance to land.

_Implemented in
[JoinActivityPage.tsx](../../client/src/pages/student/JoinActivityPage.tsx)._

## Superseded

Replaced decisions, kept for history. Don't apply these; each date line links
to what replaced it.

### Demo surfaces say so: a pretend-students chip on both views

_2026-07-16 · Superseded by
[The demo notice is a banner you can't miss](#the-demo-notice-is-a-banner-you-cant-miss)_

**Decision:** When the activity on screen is the demo (join code `1234`),
the teacher host page shows a small sun-tinted chip — "This is the demo
class. The students are pretend." with a quiet "Start your own" link — next
to the For-teachers badge, and the student world shows a glass variant
("This is the demo. The other students are pretend.") at the top of the
column from the name stage on. Never on a teacher's own hosted activity.
Not on the student code screen (no activity is resolved yet, and the
demo-code pill covers it) and not on the homepage hero (its captions
already say it's a sample). The student-world variant carries no link — no
teacher nudges inside the student experience.

**Why:** Founder call (2026-07-16), picking the subtle chip on both views
over a full-width banner, a teacher-only chip, or nothing. Once real
activities exist, a demo host page and a real one look identical — a
teacher shouldn't have to wonder whether "Daniel Katz" is a real kid. A
banner would eat phone space and make pitch demos look less like the
product; the chip also doubles as the sales exit.

_Implemented in `DemoChip.tsx` (since replaced by
[DemoBanner.tsx](../../client/src/components/demo/DemoBanner.tsx)), rendered by
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx) and
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._
