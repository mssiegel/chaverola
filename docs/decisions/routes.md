# Routes & app structure

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### Clicking to a new page opens it at the top

_2026-07-16_

**Decision:** In-app navigation scrolls the window to the top of the page it
opens. Two exceptions: browser back/forward keeps the browser's own scroll
restoration, and switching languages (same page, only the `/he` prefix
changes) keeps your place.

**Why:** Founder bug report (2026-07-16): "Open the teacher demo", clicked
from the homepage's demo section, opened the host page scrolled to its
middle. SPA routers keep the window's scroll position across navigations
unless told otherwise, so every link clicked from far down a page inherited
that scroll — and landing mid-page reads as broken.

_Implemented in
[ScrollToTop.tsx](../../client/src/components/layout/ScrollToTop.tsx), mounted in
[App.tsx](../../client/src/App.tsx)._

### `/demo`, `/demo/teacher`, and `/demo/student` are thin redirects, never pages

_2026-07-16_

**Decision:** Three speakable demo URLs: `/demo` and `/demo/teacher` land on
`/activity/host/1234`; `/demo/student` lands on `/activity/join` — the code
screen, so a visitor walks the student trip from its first step.
(**2026-07-16:** that last part changed — `/demo/student` now lands on
`/activity/join/1234`; see
[The student demo skips the code screen and joins you as Rachel](demo-flows.md#the-student-demo-skips-the-code-screen-and-joins-you-as-rachel).)
All three
are locale-aware `<Navigate>` redirects with no page components of their
own, and that's a hard rule:
[The temporary `/demo/*` routes are gone](#the-temporary-demo-routes-are-gone--every-surface-lives-in-its-real-flow)
still stands — a demo URL that grows its own UI recreates the diverging
second path that entry deleted.

**Why:** Founder call (2026-07-16). The demos are a sales surface, and
"chaverola.com slash demo" can be said across a table in a way "slash
activity slash host slash one-two-three-four" can't. Bare `/demo` goes to
the teacher view because pitches are aimed at teachers. Redirects cost
nothing to keep in sync — there is nothing in them to drift.

_Implemented in [App.tsx](../../client/src/App.tsx)._

### The temporary `/demo/*` routes are gone — every surface lives in its real flow

_2026-07-15_

**Decision:** The temporary demo routes `/demo/student-chat` and
`/demo/teacher-chat` are removed, along with everything only they used: their
pages, the `useTeacherChatsDemo` drip engine, the `studentChatDemo` /
`teacherChatDemo` scenario data, the `MonitoredChat` / `TeacherChatScenario`
types, and the demo-only chrome (`DemoPageHeader`, `SegmentButton`). The
student chatbox is exercised through the real join flow (`/activity/join`,
code `1234`) and the teacher chat cards through the real live activity page
(`/activity/host/1234`). Older entries in this file that mention
`/demo/student-chat` describe behavior that now lives at those real routes.

**Why:** The demo routes existed to build the chatbox and chat cards before
their real pages did. Both are now wired into the real flows, so the demo
routes had become a second, diverging path to the same components — extra
code to keep in sync and a misleading entry point. The dev-only "Demo
controls" panels stay, inside the real flows: the routes were duplication,
not the testability.

_Routes live in [App.tsx](../../client/src/App.tsx)._
