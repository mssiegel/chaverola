# Navbar

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### The brand home link disappears mid-chat and while hosting

_2026-07-15_

**Decision:** The Chaverola brand mark in the top-left — the navbar logo in
AppLayout, the ChaverolaPill in the student world — is a link home, and it is
**removed entirely** (not just made non-clickable) on two screens: while a
student has a chat on screen (the chatting **and** just-ended stages, until
they tap back to the lobby), and on the teacher's live host page
(`/activity/host/:hostKey` — the rule follows the page, not the param).
The language switcher stays and keeps its end-aligned spot via `ms-auto`.

**Why:** Product-owner call. One stray tap on the brand would dump the user
on the homepage: for a student that kills a live conversation (chat state is
memory-only, so there's no way back into it), and for a teacher it walks them
away from an activity their class is actively using. On those screens no
shortcut to the homepage should exist at all. The student's chat stage lives
in page state rather than the route, so the page reports it to the layout
through the router Outlet context (`setChatStudentName`).

**Update (2026-07-15):** in the student world the vacated corner no longer
sits empty — the student's name badge takes the brand pill's spot mid-chat
(see
[Mid-chat, the student's name is a corner badge](student-join.md#mid-chat-the-students-name-is-a-corner-badge)).

**Update (2026-07-18):** the **demo** host page (`/activity/host/1234`) is
exempt — it keeps the clickable brand, logo and wordmark both, on phones
too. Nothing real is at stake in the demo, and a visitor poking at it needs
a way back to the homepage. (The homepage's scroll-away wordmark collapse
doesn't apply here; that swap only exists to make room for the navbar Join
CTA, which is homepage-only.) Real hosted activities are unchanged.

_Implemented in [AppLayout](../../client/src/components/layout/AppLayout.tsx),
[StudentWorldLayout](../../client/src/components/layout/StudentWorldLayout.tsx),
and [JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx)._

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

_Implemented in [AppLayout](../../client/src/components/layout/AppLayout.tsx)._

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

_Implemented in [AppLayout](../../client/src/components/layout/AppLayout.tsx) via
[useHeroCtaPassed](../../client/src/lib/useHeroCtaPassed.ts), watching the id on
the hero CTA in [HomePage](../../client/src/pages/HomePage.tsx)._

### The navbar has one CTA: Join an Activity

_2026-07-12_

**Decision:** Only the student "Join an Activity" button lives in the navbar.
"Host an Activity" was removed from it — teachers start from the hero's
secondary CTA instead. The freed space lets the wordmark show at all widths.

**Why:** Students arrive being told "go to the site and tap Join", so that
action must be the single unmissable button on every page. Two navbar CTAs
competed for that tap and crowded the bar at phone widths.

_Implemented in [AppLayout](../../client/src/components/layout/AppLayout.tsx)._

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

_Implemented in [AppLayout](../../client/src/components/layout/AppLayout.tsx) and
[LanguageSwitcher](../../client/src/components/layout/LanguageSwitcher.tsx)._
