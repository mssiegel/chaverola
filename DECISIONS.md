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
section; add a new `##` section when none fits), and add its line to
[Contents](#contents) in the same change. Record the decision and its
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

## Contents

- [Student join flow & lobby](#student-join-flow--lobby)
  - [Stage swaps inside the student route open at the top of the page](#stage-swaps-inside-the-student-route-open-at-the-top-of-the-page)
  - [No identity bar during chat either](#no-identity-bar-during-chat-either)
  - [Mid-chat, the student's name is a corner badge](#mid-chat-the-students-name-is-a-corner-badge)
  - [Back during a live chat asks before ending it](#back-during-a-live-chat-asks-before-ending-it)
  - [One URL for the whole student journey](#one-url-for-the-whole-student-journey)
  - [Landing on code entry signs the student out](#landing-on-code-entry-signs-the-student-out)
  - [Lobby waiting dots are mint, not grape](#lobby-waiting-dots-are-mint-not-grape)
  - [The lobby shows no identity bar](#the-lobby-shows-no-identity-bar)
  - [No emoji bubble row in the waiting lobby](#no-emoji-bubble-row-in-the-waiting-lobby)
  - [The student join flow lives in its own navbar-free "world"](#the-student-join-flow-lives-in-its-own-navbar-free-world)
  - [Background doodles are deterministic, and freeze (not hide) under reduced motion](#background-doodles-are-deterministic-and-freeze-not-hide-under-reduced-motion)
  - [No "use a different code" escape on the name step](#no-use-a-different-code-escape-on-the-name-step)
  - [One page serves both join routes; a wrong code never changes the URL](#one-page-serves-both-join-routes-a-wrong-code-never-changes-the-url)
  - [Student sign-in lives in the tab, and removal sends you to the name step](#student-sign-in-lives-in-the-tab-and-removal-sends-you-to-the-name-step)
- [Chat behavior](#chat-behavior)
  - [In a group the student leaves; only a 2-person chat can be ended](#in-a-group-the-student-leaves-only-a-2-person-chat-can-be-ended)
  - [The composer's emoji picker stays open across inserts](#the-composers-emoji-picker-stays-open-across-inserts)
  - [Every chat end explains itself](#every-chat-end-explains-itself)
  - [The chat header summarizes the room, and tapping it shows everyone](#the-chat-header-summarizes-the-room-and-tapping-it-shows-everyone)
  - [A disconnected peer gets 2 minutes to come back, and the student watches the clock](#a-disconnected-peer-gets-2-minutes-to-come-back-and-the-student-watches-the-clock)
  - [A group chat drops a timed-out peer instead of ending](#a-group-chat-drops-a-timed-out-peer-instead-of-ending)
  - [Ending a chat ends it for everyone in the room](#ending-a-chat-ends-it-for-everyone-in-the-room)
  - [End of chat requires a tap to return to the lobby](#end-of-chat-requires-a-tap-to-return-to-the-lobby)
  - [Character-name colors](#character-name-colors)
- [Characters & rosters](#characters--rosters)
  - [A character's emoji is optional, and labels simply drop it](#a-characters-emoji-is-optional-and-labels-simply-drop-it)
- [Teacher activity setup](#teacher-activity-setup)
  - [Setup is one scrolling form, and Host the Activity is never disabled](#setup-is-one-scrolling-form-and-host-the-activity-is-never-disabled)
  - [The setup draft lives in the tab, and hosting doesn't clear it](#the-setup-draft-lives-in-the-tab-and-hosting-doesnt-clear-it)
  - [An abandoned character row never blocks hosting; a duplicate name does](#an-abandoned-character-row-never-blocks-hosting-a-duplicate-name-does)
  - [Hard caps with quiet counters: 30-character names, 20-word scene](#hard-caps-with-quiet-counters-30-character-names-20-word-scene)
  - [Settings ship on, and a toggle's sub-control disables instead of hiding](#settings-ship-on-and-a-toggles-sub-control-disables-instead-of-hiding)
  - [The setup form's submit is solid grape](#the-setup-forms-submit-is-solid-grape)
  - [Wide screens get a live student-lobby preview beside the form](#wide-screens-get-a-live-student-lobby-preview-beside-the-form)
  - [On phones, Host the Activity docks to the bottom edge](#on-phones-host-the-activity-docks-to-the-bottom-edge)
  - [Character rows lead with the emoji avatar](#character-rows-lead-with-the-emoji-avatar)
  - [Setup sections each carry one brand accent; settings stays the quiet one](#setup-sections-each-carry-one-brand-accent-settings-stays-the-quiet-one)
- [Teacher live activity page](#teacher-live-activity-page)
  - [The pairing CTAs pin at the top of the desktop rail while the queue scrolls](#the-pairing-ctas-pin-at-the-top-of-the-desktop-rail-while-the-queue-scrolls)
  - [Pause is one world-level switch: chats freeze, clocks hold, matchmaking waits](#pause-is-one-world-level-switch-chats-freeze-clocks-hold-matchmaking-waits)
  - [The pairing rail carries the auto-match switch, and it IS the activity setting](#the-pairing-rail-carries-the-auto-match-switch-and-it-is-the-activity-setting)
  - [End all chats holds auto-match by turning the real setting off](#end-all-chats-holds-auto-match-by-turning-the-real-setting-off)
  - [A character in a live chat shows the Live dot, and its hint says who](#a-character-in-a-live-chat-shows-the-live-dot-and-its-hint-says-who)
  - [The host page is never projected — it's the teacher's private control room](#the-host-page-is-never-projected--its-the-teachers-private-control-room)
  - [Host page layout: stacked sections on phones, a sticky pairing rail on desktop](#host-page-layout-stacked-sections-on-phones-a-sticky-pairing-rail-on-desktop)
  - [The waiting count is the hero stat, and it never leaves the screen](#the-waiting-count-is-the-hero-stat-and-it-never-leaves-the-screen)
  - [Pairing is tap-to-select, and characters are dealt randomly](#pairing-is-tap-to-select-and-characters-are-dealt-randomly)
  - [Pair everyone avoids fresh rematches, and seats the odd one out when it can](#pair-everyone-avoids-fresh-rematches-and-seats-the-odd-one-out-when-it-can)
  - [The rematch warning remembers one round, and never blocks](#the-rematch-warning-remembers-one-round-and-never-blocks)
  - [Removing a student mid-chat is a quiet exit](#removing-a-student-mid-chat-is-a-quiet-exit)
  - [Every chat runs its own auto-end clock, and students watch it tick](#every-chat-runs-its-own-auto-end-clock-and-students-watch-it-tick)
  - [Auto-end edits: new minutes wait for new chats; the toggle acts immediately](#auto-end-edits-new-minutes-wait-for-new-chats-the-toggle-acts-immediately)
  - [Live edits propagate after a 1-second pause, and invalid states never do](#live-edits-propagate-after-a-1-second-pause-and-invalid-states-never-do)
  - [No reveal-names control in Chats in progress](#no-reveal-names-control-in-chats-in-progress)
  - [An unknown host code redirects to the demo activity](#an-unknown-host-code-redirects-to-the-demo-activity)
  - [The copyable student link carries the current origin, and is never printed](#the-copyable-student-link-carries-the-current-origin-and-is-never-printed)
- [Teacher monitoring view](#teacher-monitoring-view)
  - [Teacher chat cards: collapsed to the last 5 lines, End chat asks first](#teacher-chat-cards-collapsed-to-the-last-5-lines-end-chat-asks-first)
  - [Teacher view: character colors follow participant order](#teacher-view-character-colors-follow-participant-order)
- [Homepage & hero](#homepage--hero)
  - [The highlighter mark appears once on the homepage, under "In character"](#the-highlighter-mark-appears-once-on-the-homepage-under-in-character)
  - [The homepage has a "see it in action" section with doorways into both demos](#the-homepage-has-a-see-it-in-action-section-with-doorways-into-both-demos)
  - [On phones the live chat comes before the setup steps](#on-phones-the-live-chat-comes-before-the-setup-steps)
  - [The how-it-works footer answers cost, accounts, and devices](#the-how-it-works-footer-answers-cost-accounts-and-devices)
  - [The teacher bullets say the safety part out loud](#the-teacher-bullets-say-the-safety-part-out-loud)
  - [The homepage has no footer, and the demo-links line is gone](#the-homepage-has-no-footer-and-the-demo-links-line-is-gone)
  - [The teacher preview mirrors the hero chat live](#the-teacher-preview-mirrors-the-hero-chat-live)
  - [No testimonials on the homepage](#no-testimonials-on-the-homepage)
  - [The hero demo goes quiet after two Armstrong lines](#the-hero-demo-goes-quiet-after-two-armstrong-lines)
  - [Demo students have short names, and the teacher is never one of them](#demo-students-have-short-names-and-the-teacher-is-never-one-of-them)
  - [Solid grape is reserved for Join; both Host buttons are outline](#solid-grape-is-reserved-for-join-both-host-buttons-are-outline)
  - [The teacher section stays light, and never points at "this card"](#the-teacher-section-stays-light-and-never-points-at-this-card)
  - [The teacher pitch sells in-character talk, not a guessing game](#the-teacher-pitch-sells-in-character-talk-not-a-guessing-game)
  - [Hero CTAs sit right under the pitch at every width](#hero-ctas-sit-right-under-the-pitch-at-every-width)
  - [Founder photo loads from `/founder-moshe.jpg` with a marked placeholder fallback](#founder-photo-loads-from-founder-moshejpg-with-a-marked-placeholder-fallback)
  - [The hero looks hand-made and never mentions AI](#the-hero-looks-hand-made-and-never-mentions-ai)
  - [The hero chatbox is the product running live, not a mockup](#the-hero-chatbox-is-the-product-running-live-not-a-mockup)
- [Navbar](#navbar)
  - [The brand home link disappears mid-chat and while hosting](#the-brand-home-link-disappears-mid-chat-and-while-hosting)
  - [The navbar Join CTA appears only on the homepage](#the-navbar-join-cta-appears-only-on-the-homepage)
  - [Mobile navbar swaps the wordmark for "Join Activity" on scroll](#mobile-navbar-swaps-the-wordmark-for-join-activity-on-scroll)
  - [The navbar has one CTA: Join an Activity](#the-navbar-has-one-cta-join-an-activity)
  - [Navbar: CTA label shortens on phones; language switcher swaps in place](#navbar-cta-label-shortens-on-phones-language-switcher-swaps-in-place)
- [Branding & page titles](#branding--page-titles)
  - [Page titles read "&lt;Page&gt; | Chaverola", page name first](#page-titles-read-ltpagegt--chaverola-page-name-first)
- [Demo flows & demo furniture](#demo-flows--demo-furniture)
  - [The student demo skips the code screen and joins you as Rachel](#the-student-demo-skips-the-code-screen-and-joins-you-as-rachel)
  - [The demo notice is a banner you can't miss](#the-demo-notice-is-a-banner-you-cant-miss)
  - [When the backend arrives: real activities get strictly real, and `1234` stays the only demo](#when-the-backend-arrives-real-activities-get-strictly-real-and-1234-stays-the-only-demo)
  - [The demo control panels are teacher-facing and permanent (on demo flows)](#the-demo-control-panels-are-teacher-facing-and-permanent-on-demo-flows)
  - [The demo lobby pairs you by itself after 20 seconds](#the-demo-lobby-pairs-you-by-itself-after-20-seconds)
- [Routes & app structure](#routes--app-structure)
  - [Clicking to a new page opens it at the top](#clicking-to-a-new-page-opens-it-at-the-top)
  - [`/demo`, `/demo/teacher`, and `/demo/student` are thin redirects, never pages](#demo-demoteacher-and-demostudent-are-thin-redirects-never-pages)
  - [The temporary `/demo/*` routes are gone — every surface lives in its real flow](#the-temporary-demo-routes-are-gone--every-surface-lives-in-its-real-flow)
- [Process & tooling](#process--tooling)
  - [`?fast` compresses the demo clocks — dev builds only, and never to zero](#fast-compresses-the-demo-clocks--dev-builds-only-and-never-to-zero)
  - [Verification climbs a ladder: typecheck, then tests, then the browser](#verification-climbs-a-ladder-typecheck-then-tests-then-the-browser)
  - [The repo `memory/` folder is gone — its notes live in AGENTS.md](#the-repo-memory-folder-is-gone--its-notes-live-in-agentsmd)
  - [The repo is public on GitHub under MIT, and main auto-deploys to Vercel](#the-repo-is-public-on-github-under-mit-and-main-auto-deploys-to-vercel)
  - [Testing stays small while the app is UI-only: logic tests, no DOM](#testing-stays-small-while-the-app-is-ui-only-logic-tests-no-dom)
  - [The Fable prompt series document was deleted, not archived](#the-fable-prompt-series-document-was-deleted-not-archived)
  - [DECISIONS.md stays one file, with a linked table of contents](#decisionsmd-stays-one-file-with-a-linked-table-of-contents)
- [Superseded](#superseded)
  - [Demo surfaces say so: a pretend-students chip on both views](#demo-surfaces-say-so-a-pretend-students-chip-on-both-views)
  - [Hero CTAs sit above the fold on phones](#hero-ctas-sit-above-the-fold-on-phones)

---

## Student join flow & lobby

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
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

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

_Removed from [ChatStage](client/src/components/Student/ChatStage.tsx)._

### Mid-chat, the student's name is a corner badge

_2026-07-15_

**Decision:** While a chat is on screen (chatting and just-ended stages), the
student's name appears as a small badge in the top-left corner of the purple
world — the exact spot the Chaverola brand pill vacates mid-chat (see
[The brand home link disappears mid-chat and while hosting](#the-brand-home-link-disappears-mid-chat-and-while-hosting)).
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
[StudentWorldLayout](client/src/components/layout/StudentWorldLayout.tsx) and
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

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
> [In a group the student leaves; only a 2-person chat can be ended](#in-a-group-the-student-leaves-only-a-2-person-chat-can-be-ended),
> in a 3+ group it asks about leaving, not ending.

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

_Implemented in
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx); routes in
[App.tsx](client/src/App.tsx)._

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

_Implemented in
[WaitingLobby](client/src/components/Student/WaitingLobby.tsx)._

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

_Implemented in [studentSession.ts](client/src/lib/studentSession.ts) and
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

---

## Chat behavior

### In a group the student leaves; only a 2-person chat can be ended

_2026-07-16_

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

_Implemented in [useChatDemo](client/src/components/chat/useChatDemo.ts),
[the student chatbox](client/src/components/Student/Chatbox/index.tsx), and
[ChatEndedSection](client/src/components/Student/Chatbox/ChatEndedSection.tsx)._

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
[MessageComposer](client/src/components/chat/MessageComposer.tsx),
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
[PeerReconnectBanner](client/src/components/chat/PeerReconnectBanner.tsx)
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

---

## Teacher live activity page

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

_Implemented in [PairingPanel.tsx](client/src/components/Teacher/HostActivity/PairingPanel.tsx);
the rail's top padding moved onto its header in
[index.tsx](client/src/components/Teacher/HostActivity/index.tsx) because
Chrome insets sticky offsets by the scroll container's own padding._

### Pause is one world-level switch: chats freeze, clocks hold, matchmaking waits

_2026-07-17_

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
[hostWorld](client/src/components/Teacher/HostActivity/hostWorld.ts) and
[useHostActivityDemo](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
(teacher engine),
[useChatDemo](client/src/components/chat/useChatDemo.ts) (student engine),
[ChatsInProgressSection](client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
(the buttons), and
[ChatPausedBanner](client/src/components/chat/ChatPausedBanner.tsx) (the
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
([mergeExternalSettings](client/src/lib/hostActivity.ts)): only settings keys
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
[PairingPanel](client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(the switch row),
[LiveSettingsPanel](client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(the draft merge), and
[hostActivity](client/src/lib/hostActivity.ts) (`mergeExternalSettings`)._

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
[HostActivityDashboard](client/src/components/Teacher/HostActivity/index.tsx)
(the flip and the notice state),
[confirmCopy](client/src/components/Teacher/HostActivity/confirmCopy.ts), and
[PairingPanel](client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(the banner)._

### A character in a live chat shows the Live dot, and its hint says who

_2026-07-16_

**Decision:** While a live chat uses a character, that row in the host
page's settings panel swaps its remove button for the same pulsing mint
Live dot the chat cards wear (extracted to a shared
[LiveDot](client/src/components/ui/live-dot.tsx)), and the hint under the
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
[CharacterRowsField](client/src/components/Teacher/ActivitySetup/CharacterRowsField.tsx)
(the indicator) and
[LiveSettingsPanel](client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
(the named message)._

### The host page is never projected — it's the teacher's private control room

_2026-07-15_

**Decision:** `/activity/host/:joinCode` is designed on the assumption that
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
[HostActivityDashboard](client/src/components/Teacher/HostActivity/index.tsx);
the in-UI wording lives in
[JoiningInstructions](client/src/components/Teacher/HostActivity/JoiningInstructions.tsx)._

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
[HostActivityDashboard](client/src/components/Teacher/HostActivity/index.tsx)
on [CollapsibleSection](client/src/components/Teacher/HostActivity/CollapsibleSection.tsx)._

### The waiting count is the hero stat, and it never leaves the screen

_2026-07-15_

**Decision:** The count of students waiting to chat renders poster-sized in
the page header, re-animating on every change; when it scrolls out of view
it condenses into a slim bar fixed under the navbar (count + pin). The page
has no "Activity in Progress" status label. (Product-owner pick,
2026-07-15, over a static header stat and over a floating HUD pill.)
(**2026-07-16:** on the demo activity the condensed bar stands down — the
sticky demo banner owns the under-navbar band there; see
[The demo notice is a banner you can't miss](#the-demo-notice-is-a-banner-you-cant-miss).)

**Why:** A teacher glancing from across a classroom must catch the number
instantly, and it must visibly react when it changes — students sitting
unmatched is the one thing this page exists to prevent. The condensed bar
keeps the number on screen while the teacher is deep in the chat cards. A
status label was dropped because it states the obvious; the live count
already says the activity is running.

_Implemented in
[HostHeader](client/src/components/Teacher/HostActivity/HostHeader.tsx)._

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
[PairingPanel](client/src/components/Teacher/HostActivity/PairingPanel.tsx)
and `assignCharacters` in
[useHostActivityDemo](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)._

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

_Implemented in `pairEveryone` in
[useHostActivityDemo](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)._

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

_Implemented in
[useHostActivityDemo](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
(`lastPartners`), rendered by
[PairingPanel](client/src/components/Teacher/HostActivity/PairingPanel.tsx)._

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
[useHostActivityDemo](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts);
the control lives in
[ChatCardHeader](client/src/components/Teacher/ChatCard/ChatCardHeader.tsx)._

### Every chat runs its own auto-end clock, and students watch it tick

_2026-07-15_

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

_Implemented in [useChatDemo](client/src/components/chat/useChatDemo.ts) and
[useHostActivityDemo](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts),
rendered by
[AutoEndCountdown](client/src/components/chat/AutoEndCountdown.tsx)._

### Auto-end edits: new minutes wait for new chats; the toggle acts immediately

_2026-07-15_

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

_Implemented in the settings-change effect in
[useHostActivityDemo](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)._

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
[LiveSettingsPanel](client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)
with the draft model in [hostActivity](client/src/lib/hostActivity.ts)._

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
[ChatsInProgressSection](client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
deliberately has count + End-all only._

### An unknown host code redirects to the demo activity

_2026-07-15_

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
would put a pin on screen that rejects every student who types it.

_Implemented in
[HostActivityPage](client/src/pages/teacher/HostActivityPage.tsx)._

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
[JoiningInstructions](client/src/components/Teacher/HostActivity/JoiningInstructions.tsx)._

---

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

_Implemented in [HomePage](client/src/pages/HomePage.tsx) (the keeper);
removed from
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx) and
[DemoSection](client/src/components/home/DemoSection.tsx)._

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

_Implemented in [DemoSection.tsx](client/src/components/home/DemoSection.tsx)._

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

_Implemented in [HomePage](client/src/pages/HomePage.tsx)._

### The how-it-works footer answers cost, accounts, and devices

_2026-07-15_

**Decision:** The microcopy under the how-it-works Host CTA is a one-row
facts list: "Free to use · No student accounts · Works on anything with a
browser" (stacked without the dots on phones). It replaces "There's nothing
to print and nothing to install." The claims are founder-approved facts —
free for teachers, students enter a code and a name with no accounts or
emails, any device with a browser. Don't add pricing tiers or soften "free"
without a new founder call.

**Why:** Founder call (2026-07-15). Cost, student accounts, and devices are
the first practical questions teachers check before trying a classroom tool,
and the page answered none of them. One compact row removes that hesitation
without adding a section (a longer FAQ was considered and rejected — the page
should stay short).

_Implemented in
[HowItWorksSection](client/src/components/home/HowItWorksSection.tsx)._

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
[TeacherViewSection](client/src/components/home/TeacherViewSection.tsx)._

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
[useChatDemo.ts](client/src/components/chat/useChatDemo.ts)._

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

### The brand home link disappears mid-chat and while hosting

_2026-07-15_

**Decision:** The Chaverola brand mark in the top-left — the navbar logo in
AppLayout, the ChaverolaPill in the student world — is a link home, and it is
**removed entirely** (not just made non-clickable) on two screens: while a
student has a chat on screen (the chatting **and** just-ended stages, until
they tap back to the lobby), and on the teacher's live host page
(`/activity/host/:joinCode`). The language switcher stays and keeps its
end-aligned spot via `ms-auto`.

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
[Mid-chat, the student's name is a corner badge](#mid-chat-the-students-name-is-a-corner-badge)).

_Implemented in [AppLayout](client/src/components/layout/AppLayout.tsx),
[StudentWorldLayout](client/src/components/layout/StudentWorldLayout.tsx),
and [JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

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

## Branding & page titles

### Page titles read "&lt;Page&gt; | Chaverola", page name first

_2026-07-15_

**Decision:** `document.title` for every routed page is the page's own name
followed by the brand — e.g. "Join an Activity | Chaverola" — via the shared
`usePageTitle` hook. Routes without a title fall back to bare "Chaverola".

**Why:** Product-owner call for SEO: the page-specific words get prominence in
search results while the brand still matches a "Chaverola" search. Brand-first
("Chaverola | Join an Activity") and an audience prefix ("Student - Join an
Activity") were both rejected — the first buries the page's keywords, the
second adds clutter without search value. Full SSR/meta-tag SEO is deferred to
a later Vite SEO effort; until then titles are set client-side only.

_Implemented in [usePageTitle](client/src/lib/usePageTitle.ts)._

---

## Demo flows & demo furniture

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
[`/demo`, `/demo/teacher`, and `/demo/student` are thin redirects, never pages](#demo-demoteacher-and-demostudent-are-thin-redirects-never-pages).
Typing a code and inventing a name is the boring part of the trip, and a
homepage visitor gives a demo seconds before deciding — the interesting part
(the lobby, the matching, chatting in character) should be one click away.
Anyone curious about code entry can still visit `/activity/join` and type
`1234` by hand.

_Implemented in [App.tsx](client/src/App.tsx),
[DemoSection.tsx](client/src/components/home/DemoSection.tsx),
[JoinActivityPage.tsx](client/src/pages/student/JoinActivityPage.tsx), and
[activityDemo.ts](client/src/mockData/activityDemo.ts)._

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

_Implemented in [DemoBanner.tsx](client/src/components/demo/DemoBanner.tsx)
(which replaced `DemoChip.tsx`), rendered by
[HostActivityPage](client/src/pages/teacher/HostActivityPage.tsx) and
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx); the
stand-down lives in
[HostHeader](client/src/components/Teacher/HostActivity/HostHeader.tsx)._

### When the backend arrives: real activities get strictly real, and `1234` stays the only demo

_2026-07-16_

**Decision:** Recorded now so backend work builds toward it. Once `server/`
is real: (1) join code `1234` is reserved forever as the only simulated
activity — the backend must never hand it out (the client's
`mockGenerateJoinCode` already refuses it). (2) A teacher's real activity
shows only real students; the simulated classroom never leaks into it.
(3) An unknown host code becomes a friendly not-found —
[An unknown host code redirects to the demo activity](#an-unknown-host-code-redirects-to-the-demo-activity)
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

_The client-side seams are the engine hooks
([useChatDemo.ts](client/src/components/chat/useChatDemo.ts),
[useHostActivityDemo.ts](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts))
behind the `ChatRoomState`/`ChatRoomActions` contract in
[chat.ts](client/src/types/chat.ts)._

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
[DemoControls.tsx](client/src/components/demo/DemoControls.tsx),
[ChatDemoControls.tsx](client/src/components/demo/ChatDemoControls.tsx),
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
[JoinActivityPage.tsx](client/src/pages/student/JoinActivityPage.tsx)._

---

## Routes & app structure

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
[ScrollToTop.tsx](client/src/components/layout/ScrollToTop.tsx), mounted in
[App.tsx](client/src/App.tsx)._

### `/demo`, `/demo/teacher`, and `/demo/student` are thin redirects, never pages

_2026-07-16_

**Decision:** Three speakable demo URLs: `/demo` and `/demo/teacher` land on
`/activity/host/1234`; `/demo/student` lands on `/activity/join` — the code
screen, so a visitor walks the student trip from its first step.
(**2026-07-16:** that last part changed — `/demo/student` now lands on
`/activity/join/1234`; see
[The student demo skips the code screen and joins you as Rachel](#the-student-demo-skips-the-code-screen-and-joins-you-as-rachel).)
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

_Implemented in [App.tsx](client/src/App.tsx)._

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

_Routes live in [App.tsx](client/src/App.tsx)._

---

## Process & tooling

### `?fast` compresses the demo clocks — dev builds only, and never to zero

_2026-07-16_

**Decision:** In a dev build (`pnpm dev`), loading any page with `?fast`
compresses every demo-engine timer — the scripted chats and typing beats,
the host page's world tick (joins, wait clocks, auto-match, auto-end,
returns), the chatter drip, the demo lobby's auto-pair, and the countdown
clocks — by a scale factor: bare `?fast` is 10x, `?fast=<n>` clamps to
1–100. The scale is read once per full page load. Delays scale, they never
zero out. Production builds compile the entire mechanism away
(`import.meta.env.DEV`), and real-user timing — the live-settings ~1s
typing debounce, the 2s "copied" reset — is never scaled.

**Why:** Product-owner call, to make AI-agent verification fast: runtime
checks were spending nearly all their wall clock waiting out real-time demo
timers (~9s hero script, ~20s auto-pair, 2-minute reconnect window).
Scaling instead of zeroing keeps message order and typing→reply sequencing
assertable. The double gate (dev build AND an explicit param) means no
deployed link and no default `pnpm dev` session — including the founder's
pitch flow — ever runs fast. The verify skill documents how agents use it.

_Implemented in [demoTime.ts](client/src/lib/demoTime.ts); consumed by
[useChatDemo.ts](client/src/components/chat/useChatDemo.ts),
[useSecondCountdown.ts](client/src/lib/useSecondCountdown.ts),
[useHostActivityDemo.ts](client/src/components/Teacher/HostActivity/useHostActivityDemo.ts),
and [JoinActivityPage.tsx](client/src/pages/student/JoinActivityPage.tsx)._

### Verification climbs a ladder: typecheck, then tests, then the browser

_2026-07-16_

**Decision:** Agents verify at the cheapest gate that can catch the
mistake: `pnpm typecheck` on every change; `pnpm test` only when logic in
`client/src/lib/` or `hostWorld.ts` changed; a browser drive (the verify
skill, with fast timers) only when the change shows up in rendered UI —
and then only the surfaces the change touches, at desktop and phone
widths. The CSS-hash double-build proof still covers style-neutral
refactors.

**Why:** Product-owner call. Nothing in the automated suite renders
components, so agents defaulted to driving every surface in a browser for
every change — the slowest check applied to changes the type checker
already proves. The ladder reserves the browser for what only the browser
can show.

_Implemented in [AGENTS.md](AGENTS.md) → "Working Rules" and
[SKILL.md](.claude/skills/verify/SKILL.md)._

### The repo `memory/` folder is gone — its notes live in AGENTS.md

_2026-07-16_

**Decision:** `memory/MEMORY.md` and `memory/react-compiler-setup.md` were
deleted; the React Compiler guidance moved into AGENTS.md → Conventions,
with its stale typescript-eslint peer-version claim corrected on the way.

**Why:** The folder contradicted the recorded rule that learnings live in
the repo's shared docs, nothing referenced it, and its one load-bearing
fact had already drifted out of date. Recover it from git history if ever
needed.

_Implemented in [AGENTS.md](AGENTS.md)._

### The repo is public on GitHub under MIT, and main auto-deploys to Vercel

_2026-07-16_

**Decision:** The repo is public at
[github.com/mssiegel/chaverola](https://github.com/mssiegel/chaverola) under
the MIT license. Hosting is a Vercel project named `chaverola` with Root
Directory `client`; every push to `main` deploys straight to production —
there is no staging branch. `client/vercel.json` holds the SPA rewrite so
deep links (`/activity/host/1234`, `/he/...`) resolve on a direct load. The
GitHub description names no tech stack, on purpose: it describes only what
Chaverola is, so it never goes stale as the stack evolves.

**Why:** Product-owner call. MIT was chosen over the all-rights-reserved
default so others can reuse the code. Deploy-on-main matches the
commit-directly-to-main workflow (no PRs to gate a release train on), and a
UI-only demo app with mock data carries no rollout risk that would justify
one.

_Implemented in [LICENSE](LICENSE) and [vercel.json](client/vercel.json)._

### Testing stays small while the app is UI-only: logic tests, no DOM

_2026-07-15_

**Decision:** Vitest runs the unit tests (`pnpm test`) in a plain node
environment against the pure logic layer only — the setup validators and
caps (`lib/activitySetup.ts`), the live-edit rules (`lib/hostActivity.ts`),
the host page's world model (`hostWorld.ts`), and the character-color order
rule. No jsdom, no component or snapshot tests, and the suite stays small on
purpose.

**Why:** Product-owner call: this is an MVP and shipping speed wins. The
logic rules (rematch memory, clamps, id stability) are where regressions are
silent; component markup still churns with every design pass and would make
every change fight a wall of snapshots. Revisit the policy when `server/`
becomes real — the engine contract swap is exactly when these tests earn
their keep.

_Config in [vitest.config.ts](client/vitest.config.ts)._

### The Fable prompt series document was deleted, not archived

_2026-07-15_

**Decision:** `chaverola-fable-prompts.md` (the staged build prompts) was
deleted once the build it drove was complete. Recover it from git history if
it's ever needed (`git log --diff-filter=D -- chaverola-fable-prompts.md`).

**Why:** Product-owner call. It embedded a verbatim copy of the project
brief, and two copies drift; every product rule it introduced was recorded
in this file as it was implemented, and the brief itself lives in
[Shared_Project_Context.md](Shared_Project_Context.md). The repo's living
docs are the source of truth, not the prompts that produced them.

### DECISIONS.md stays one file, with a linked table of contents

_2026-07-15_

**Decision:** Keep appending entries to this single file. The Contents
section at the top links every rule; when you add, move, or retitle an
entry, update its Contents line in the same change.

**Why:** Product-owner call, chosen over splitting into per-area files. One
file stays trivially greppable, and the many "see DECISIONS.md → ..."
pointers in code comments and AGENTS.md keep working. At 1,600+ lines the
table of contents restores scannability without breaking any of that.

---

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
[DemoBanner.tsx](client/src/components/demo/DemoBanner.tsx)), rendered by
[HostActivityPage](client/src/pages/teacher/HostActivityPage.tsx) and
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

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
