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
  - [The full-activity screen names the 60-seat cap and offers a retry](#the-full-activity-screen-names-the-60-seat-cap-and-offers-a-retry)
  - [A removed student retypes their name — the field is not refilled](#a-removed-student-retypes-their-name--the-field-is-not-refilled)
  - [The real lobby still says Waiting for your match until matching ships](#the-real-lobby-still-says-waiting-for-your-match-until-matching-ships)
  - [Two students can share a name; the queue tells them apart](#two-students-can-share-a-name-the-queue-tells-them-apart)
  - [A wiped server ends the class honestly on the student's screen](#a-wiped-server-ends-the-class-honestly-on-the-students-screen)
  - [Real codes resolve over the API, and only a resolved miss signs anyone out](#real-codes-resolve-over-the-api-and-only-a-resolved-miss-signs-anyone-out)
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
  - [Leaving a live chat means leaving the activity (until messaging ships)](#leaving-a-live-chat-means-leaving-the-activity-until-messaging-ships)
  - [The live ended screen returns to the lobby only on a tap, and shows no reveal](#the-live-ended-screen-returns-to-the-lobby-only-on-a-tap-and-shows-no-reveal)
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
  - [Host the Activity docks to the bottom edge at every breakpoint](#host-the-activity-docks-to-the-bottom-edge-at-every-breakpoint)
  - [Character rows lead with the emoji avatar](#character-rows-lead-with-the-emoji-avatar)
  - [Setup sections each carry one brand accent; settings stays the quiet one](#setup-sections-each-carry-one-brand-accent-settings-stays-the-quiet-one)
- [Teacher live activity page](#teacher-live-activity-page)
  - [Disabled ending controls share one hint line, not one per card](#disabled-ending-controls-share-one-hint-line-not-one-per-card)
  - [The live card's count-up clock appears only after the first minute](#the-live-cards-count-up-clock-appears-only-after-the-first-minute)
  - [An empty live transcript explains itself; a finished one doesn't](#an-empty-live-transcript-explains-itself-a-finished-one-doesnt)
  - [Feature 3 makes matching real; messaging, ending, and pause stay placeholders](#feature-3-makes-matching-real-messaging-ending-and-pause-stay-placeholders)
  - [Auto-match runs on the server, and only while the teacher is connected](#auto-match-runs-on-the-server-and-only-while-the-teacher-is-connected)
  - [Mid-chat, drops show and Remove works — nothing happens automatically](#mid-chat-drops-show-and-remove-works--nothing-happens-automatically)
  - [Settings edits sync for real; characters, scenario, and host name stay local](#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local)
  - [Server pairing keeps no rematch memory this feature](#server-pairing-keeps-no-rematch-memory-this-feature)
  - [A dropped student keeps their seat for 2 minutes, marked and unmatchable](#a-dropped-student-keeps-their-seat-for-2-minutes-marked-and-unmatchable)
  - [When the teacher's connection drops, the queue dims under a reconnecting banner](#when-the-teachers-connection-drops-the-queue-dims-under-a-reconnecting-banner)
  - [A rematch only counts when it's an exact rerun for everyone in it](#a-rematch-only-counts-when-its-an-exact-rerun-for-everyone-in-it)
  - [The live-settings panel stays on real activities, editing the teacher's local view](#the-live-settings-panel-stays-on-real-activities-editing-the-teachers-local-view)
  - [Start their chat sits below Pair everyone 1:1, nearest the names](#start-their-chat-sits-below-pair-everyone-11-nearest-the-names)
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
  - [Unknown host links get a friendly not-found, and the demo redirect is gone](#unknown-host-links-get-a-friendly-not-found-and-the-demo-redirect-is-gone)
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
  - [The name's story is Chaver + Olah ("rising up"), not Chaver + Crayola](#the-names-story-is-chaver--olah-rising-up-not-chaver--crayola)
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
- [Backend & API](#backend--api)
  - [The student chat wire carries characterIds only](#the-student-chat-wire-carries-characterids-only)
  - [Starting a chat clamps to the server's roster instead of rejecting](#starting-a-chat-clamps-to-the-servers-roster-instead-of-rejecting)
  - [Sockets connect at lobby entry and host-page load, and never on the demo](#sockets-connect-at-lobby-entry-and-host-page-load-and-never-on-the-demo)
  - [The backend is Express 5 on Render's free tier — REST now, Socket.IO later](#the-backend-is-express-5-on-renders-free-tier--rest-now-socketio-later)
  - [The API lives at `api.chaverola.com` from day one, with no `/api/v1` prefix](#the-api-lives-at-apichaverolacom-from-day-one-with-no-apiv1-prefix)
  - [Teachers set up at class start, and a warm-up ping hides the cold start](#teachers-set-up-at-class-start-and-a-warm-up-ping-hides-the-cold-start)
  - [Nothing persists: activities live in memory for 12 hours, and deploys wipe them](#nothing-persists-activities-live-in-memory-for-12-hours-and-deploys-wipe-them)
  - [Host access is a URL capability — the hostKey — not an account](#host-access-is-a-url-capability--the-hostkey--not-an-account)
  - [The wire contract is handwritten types in `shared/`; zod validates on the server only](#the-wire-contract-is-handwritten-types-in-shared-zod-validates-on-the-server-only)
  - [Rate limits assume a whole school behind one IP, and join-code enumeration is accepted](#rate-limits-assume-a-whole-school-behind-one-ip-and-join-code-enumeration-is-accepted)
  - [Create is not idempotent in v1: a lost response can orphan one activity](#create-is-not-idempotent-in-v1-a-lost-response-can-orphan-one-activity)
  - [Transcripts wait: feature 1 only stores the teacher's email](#transcripts-wait-feature-1-only-stores-the-teachers-email)
  - [Considered and rejected for the backend: TanStack Query, dotenv, a hostKey stash, an npm conversion](#considered-and-rejected-for-the-backend-tanstack-query-dotenv-a-hostkey-stash-an-npm-conversion)
- [Process & tooling](#process--tooling)
  - [Agents read Render logs through the CLI, with the API key in `.env.local`](#agents-read-render-logs-through-the-cli-with-the-api-key-in-envlocal)
  - [The numbered doc standard is retired; technical docs live in `docs/`](#the-numbered-doc-standard-is-retired-technical-docs-live-in-docs)
  - [Features ship as prompt-doc plans in `docs/plans/`, one prompt per session](#features-ship-as-prompt-doc-plans-in-docsplans-one-prompt-per-session)
  - [Server tests cover only the safety invariants](#server-tests-cover-only-the-safety-invariants)
  - [`?fast` compresses the demo clocks — dev builds only, and never to zero](#fast-compresses-the-demo-clocks--dev-builds-only-and-never-to-zero)
  - [Verification climbs a ladder: typecheck, then tests, then the browser](#verification-climbs-a-ladder-typecheck-then-tests-then-the-browser)
  - [The repo `memory/` folder is gone — its notes live in AGENTS.md](#the-repo-memory-folder-is-gone--its-notes-live-in-agentsmd)
  - [The repo is public on GitHub under MIT, and main auto-deploys to Vercel](#the-repo-is-public-on-github-under-mit-and-main-auto-deploys-to-vercel)
  - [Testing stays small while the app is UI-only: logic tests, no DOM](#testing-stays-small-while-the-app-is-ui-only-logic-tests-no-dom)
  - [The Fable prompt series document was deleted, not archived](#the-fable-prompt-series-document-was-deleted-not-archived)
  - [DECISIONS.md stays one file, with a linked table of contents](#decisionsmd-stays-one-file-with-a-linked-table-of-contents)
- [Superseded](#superseded)
  - [The chat sections hide entirely on real activities until matching ships](#the-chat-sections-hide-entirely-on-real-activities-until-matching-ships)
  - [Real host pages show an honest placeholder instead of pairing controls](#real-host-pages-show-an-honest-placeholder-instead-of-pairing-controls)
  - [Demo surfaces say so: a pretend-students chip on both views](#demo-surfaces-say-so-a-pretend-students-chip-on-both-views)
  - [Hero CTAs sit above the fold on phones](#hero-ctas-sit-above-the-fold-on-phones)
  - [Real activities hide the live-settings panel until edit sync ships](#real-activities-hide-the-live-settings-panel-until-edit-sync-ships)
  - [An unknown host code redirects to the demo activity](#an-unknown-host-code-redirects-to-the-demo-activity)

---

## Student join flow & lobby

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
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)
(`ActivityFullCard`) over
[useLobbyPresence](client/src/pages/student/useLobbyPresence.ts)._

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
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx) (the
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
[WaitingLobby](client/src/components/Student/WaitingLobby.tsx) (the
`connection` pill variant), driven by
[useLobbyPresence](client/src/pages/student/useLobbyPresence.ts)._

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

_Implemented in [seats.ts](server/src/live/seats.ts) (server-minted ids;
no name-uniqueness check anywhere) and
[PairingPanel.tsx](client/src/components/Teacher/HostActivity/PairingPanel.tsx)
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
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx) (the
ended stage, both the socket and REST-404-with-token paths) over
[useLobbyPresence](client/src/pages/student/useLobbyPresence.ts); the
server side notifies through the store's removal hook in
[lobby.ts](server/src/live/lobby.ts). Extends
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
[useActivityLookup](client/src/lib/useActivityLookup.ts),
[api.ts](client/src/lib/api.ts), and
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)._

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
`/activity/host/:hostKey`).

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

**Update (2026-07-19):** with real codes resolving over the API, "landing
on code entry" is narrowed to a **resolved** landing — an in-flight lookup
or an unreachable server never signs anyone out. See
[Real codes resolve over the API, and only a resolved miss signs anyone out](#real-codes-resolve-over-the-api-and-only-a-resolved-miss-signs-anyone-out).

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

### Leaving a live chat means leaving the activity (until messaging ships)

_2026-07-19_

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
[LiveChatStage](client/src/components/Student/LiveChatStage.tsx) (the exit
pill and the back-guard confirm both route to the leave flow) and
[JoinActivityPage](client/src/pages/student/JoinActivityPage.tsx)
(back-as-reset → `lobby:leave`); the partner's chat ends server-side in
[lobby.ts](server/src/live/lobby.ts)._

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

_Implemented in [seats.ts](server/src/live/seats.ts) (the seat's
`wrappingUp` flag and `returnToQueue`), the `lobby:back` handler in
[lobby.ts](server/src/live/lobby.ts), and
[LiveChatStage](client/src/components/Student/LiveChatStage.tsx) (the
neutral ended screen and its back CTA)._

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
[Create is not idempotent in v1](#create-is-not-idempotent-in-v1-a-lost-response-can-orphan-one-activity)).
The pending button reads "Setting up your activity…", swaps in the
"Chaverola is just waking up" patience line after ~5 seconds, and a failed
create shows distinct inline copy for unreachable vs server error, right
above the button. Validation still never disables anything.

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
(`validateActivityDraft` / `toCreateActivityRequest`) and
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
card) that re-renders from the draft on every keystroke. The rail is
display-only — the Host action lives in
[the bottom dock](#host-the-activity-docks-to-the-bottom-edge-at-every-breakpoint),
not under the preview. It mirrors
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

### Disabled ending controls share one hint line, not one per card

_2026-07-20_

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

_Implemented in [ChatsInProgressSection](client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)._

### The live card's count-up clock appears only after the first minute

_2026-07-20_

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

_Implemented in [ElapsedClock](client/src/components/Teacher/ChatCard/ElapsedClock.tsx)._

### An empty live transcript explains itself; a finished one doesn't

_2026-07-20_

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
[ChatsInProgressSection](client/src/components/Teacher/HostActivity/ChatsInProgressSection.tsx)
(which passes `emptyHint`) and
[ChatCard](client/src/components/Teacher/ChatCard/index.tsx)._

### Feature 3 makes matching real; messaging, ending, and pause stay placeholders

_2026-07-19_

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
[docs/plans/feature-3-real-matching.md](docs/plans/feature-3-real-matching.md)):
the pairing rules in [matching.ts](server/src/live/matching.ts), the
socket wiring in [lobby.ts](server/src/live/lobby.ts), the student's room
in [LiveChatStage](client/src/components/Student/LiveChatStage.tsx), and
the teacher's dashboard in
[useHostActivityLive](client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
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

_Implemented in [lobby.ts](server/src/live/lobby.ts) — the `joinCode →
{ timer, teacherCount, nextAt }` map, armed on the 0→1st teacher socket
and cleared on the last disconnect — with the pairing itself in
[matching.ts](server/src/live/matching.ts) (`findAutoMatchPair`).
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
([A disconnected peer gets 2 minutes to come back, and the student watches the clock](#a-disconnected-peer-gets-2-minutes-to-come-back-and-the-student-watches-the-clock))
exists to protect a running conversation — but these rooms are silent, so a
timed drop would kick students out of chats that lose nothing by waiting,
and a peer-countdown banner would alarm the remaining student over nothing.
Both activate when messaging ships.

_Implemented in [lobby.ts](server/src/live/lobby.ts) (a matched seat's
disconnect arms the broadcast-delay timer and passes `null` for the
grace — pinned by a test in `lobby.test.ts`, since a regression here
would silently strand real students) and
[ChatCardHeader](client/src/components/Teacher/ChatCard/ChatCardHeader.tsx)
(the dimmed row and its "lost connection" pill, reusing the queue-row
styling)._

### Settings edits sync for real; characters, scenario, and host name stay local

_2026-07-19_

**Decision:** A settings edit on a real host page now sends the full
`ActivitySettings` object to the server, which validates and stores it;
other connected host devices receive the change live. `revealNames` and
`autoEndChats` are stored but still act on nothing. Character, scenario, and
host-name edits remain local-only exactly as recorded in
[The live-settings panel stays on real activities, editing the teacher's local view](#the-live-settings-panel-stays-on-real-activities-editing-the-teachers-local-view)
— that entry's settings half retires when this ships.

**Why:** Real auto-match forces the question: the switch and its seconds
must reach the server or the rail lies. Syncing the whole settings object is
one event and stops the panel silently reverting on refresh; syncing only
the two auto-match fields was rejected — it leaves the panel half-real with
no user-visible logic to the split. Roster/scenario sync stays out because
those propagate to students' lobbies — a bigger feature than a settings
echo. Founder call (feature-3 planning).

_Implemented in the `settings:update` handler in
[lobby.ts](server/src/live/lobby.ts) (zod-validated against the same
schema `POST /activities` uses, echoing `settings:changed` to the room
minus the sender) and
[HostActivityPage](client/src/pages/teacher/HostActivityPage.tsx), whose
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

_Implemented in [matching.ts](server/src/live/matching.ts) (greedy in
queue order, no `lastPartners`); the client's live engine keeps the stubs
`isExactRematch: () => false` and `rematchNotice: null` in
[useHostActivityLive](client/src/components/Teacher/HostActivity/useHostActivityLive.ts),
so the notices have somewhere to land when ending ships._

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

_Implemented in [seats.ts](server/src/live/seats.ts) (the grace +
broadcast-delay timers and the `currentSocketId` guard),
[PairingPanel.tsx](client/src/components/Teacher/HostActivity/PairingPanel.tsx)
(the marked row), and the `connection` filters in
[hostWorld.ts](client/src/components/Teacher/HostActivity/hostWorld.ts)
(unmatchable — pinned by tests); the chat-side window lives in
[A disconnected peer gets 2 minutes to come back, and the student watches the clock](#a-disconnected-peer-gets-2-minutes-to-come-back-and-the-student-watches-the-clock)._

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
[HostActivity/index.tsx](client/src/components/Teacher/HostActivity/index.tsx),
driven by the connection state in
[useHostActivityLive](client/src/components/Teacher/HostActivity/useHostActivityLive.ts)._

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
[hostWorld.ts](client/src/components/Teacher/HostActivity/hostWorld.ts)
(`isExactRematchIn`, `pairEveryoneIn`, `findAutoMatchPair`), with the
heads-up in
[index.tsx](client/src/components/Teacher/HostActivity/index.tsx)._

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
[HostActivityPage](client/src/pages/teacher/HostActivityPage.tsx) (local
state is the only edit target) and
[index.tsx](client/src/components/Teacher/HostActivity/index.tsx)._

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
[PairingPanel.tsx](client/src/components/Teacher/HostActivity/PairingPanel.tsx)._

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

**Update (2026-07-18):** the forced-repeat fallback is gone — per
[A rematch only counts when it's an exact rerun for everyone in it](#a-rematch-only-counts-when-its-an-exact-rerun-for-everyone-in-it),
partial repeats now pair silently and an exact rerun is never created; an
unresolvable exact pair or trio stays in line with a notice. The odd-count
handling is unchanged.

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

**Update (2026-07-18):** the trigger narrowed — the warning now fires only
when the selection is an exact rerun of everyone's previous chat, not when
any two selected students overlap. See
[A rematch only counts when it's an exact rerun for everyone in it](#a-rematch-only-counts-when-its-an-exact-rerun-for-everyone-in-it).
The one-round memory and never-blocking stand.

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
[HostActivityPage](client/src/pages/teacher/HostActivityPage.tsx) over
[useHostedActivityLookup](client/src/lib/useHostedActivityLookup.ts)._

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
[Mid-chat, the student's name is a corner badge](#mid-chat-the-students-name-is-a-corner-badge)).

**Update (2026-07-18):** the **demo** host page (`/activity/host/1234`) is
exempt — it keeps the clickable brand, logo and wordmark both, on phones
too. Nothing real is at stake in the demo, and a visitor poking at it needs
a way back to the homepage. (The homepage's scroll-away wordmark collapse
doesn't apply here; that swap only exists to make room for the navbar Join
CTA, which is homepage-only.) Real hosted activities are unchanged.

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

### The name's story is Chaver + Olah ("rising up"), not Chaver + Crayola

_2026-07-18_

**Decision:** The founder's note explains "Chaverola" as a blend of Chaver
(Hebrew for friend) and Olah, glossed as "rising up": friends raise each other
up. This replaces the earlier Chaver + Crayola (friendship plus crayons) story.
The gloss is deliberately the neutral "rising up" rather than the founder's
original phrasing "he rises up" — olah (עוֹלָה) is grammatically the feminine
form ("oleh" is masculine), and Hebrew-literate readers would catch the
mismatch. The spelling stays Olah because it matches the "-ola" ending of the
name.

**Why:** Founder call. The rising-up meaning is the product's actual thesis
(friends raising each other up), where Crayola was only a mood. Any copy that
retells the name's origin should use this story.

_Implemented in [FounderNote.tsx](client/src/components/home/FounderNote.tsx)._

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
[Unknown host links get a friendly not-found, and the demo redirect is gone](#unknown-host-links-get-a-friendly-not-found-and-the-demo-redirect-is-gone)),
and the demo control panels render only on `1234`.

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

## Backend & API

### The student chat wire carries characterIds only

_2026-07-19_

**Decision:** Everything a student receives about their chat is targeted and
character-shaped: their own characterId plus peers as bare characterIds —
never a peer's real name, never a peer's studentId. The teacher's chat
snapshots carry real names and the server roster's full `Character` (so a
locally renamed roster still resolves on cards). A chat-ended payload
carries only the reason.

**Why:** The projection tradition
([The host page is never projected — it's the teacher's private control room](#the-host-page-is-never-projected--its-the-teachers-private-control-room))
extended to matching: the who-am-I-chatting-with mystery is the product, and
peer studentIds buy the client nothing while no messages travel — every
field a student doesn't get is a field that can't leak. Pinned by exact-key
allowlist tests like every other projection.

_Implemented in [projections.ts](server/src/store/projections.ts)
(`toChatStarted`, `toChatUpdate`, `toChatEnded`, `toChatSnapshot`), with
the allowlists in `projections.test.ts` — the load-bearing one asserts a
peer object's keys are exactly `["characterId"]`. Keep that test passing
rather than loosening it._

### Starting a chat clamps to the server's roster instead of rejecting

_2026-07-19_

**Decision:** A teacher's start-chat command is filtered to currently
eligible students (connected, unmatched) and clamped to `min(4, the server's
roster size)`; whoever doesn't fit visibly stays in the queue. Below 2
eligible members the command does nothing and the next snapshot corrects the
rail.

**Why:** Character edits are local-only, so the teacher's roster can briefly
disagree with the server's — and a selected student can drop in the instant
before the tap lands. Rejecting the whole command on either mismatch makes
the button read as broken; clamping produces a visible, explainable outcome,
and the rail self-corrects from the snapshot either way. Founder-approved in
feature-3 planning.

_Implemented in [matching.ts](server/src/live/matching.ts) (`createChat`
filters through `eligibleWaiting`, then slices to
`min(4, roster length)`)._

### Sockets connect at lobby entry and host-page load, and never on the demo

_2026-07-19_

**Decision:** The Socket.IO connection is not app-wide. A student's socket
connects only when they enter the lobby stage of a **real** activity — the
code and name steps stay REST-only. A teacher's socket connects as soon as
the host page resolves a real activity; there is no "start the live
activity" click, because the host page already is the live activity from the
moment of creation. The demo (`1234`) never loads or connects a socket on
either side — zero network, structurally.

**Why:** Founder call (feature-2 planning). Sockets exist for presence, and
presence begins when a student is actually in the room and when a teacher
opens the control room — connecting earlier spends server connections on
visitors who never finish joining. An explicit teacher "start" gate was
rejected as a product change: activities have been live-from-creation since
feature 1, and students can already join the moment the code exists. The
demo rule is the standing offline-forever guarantee extended to the
transport layer.

_Implemented in
[useLobbyPresence](client/src/pages/student/useLobbyPresence.ts)
(student) and
[useHostActivityLive](client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
(teacher), both over the factory in
[socket.ts](client/src/lib/socket.ts) — `autoConnect: false`, so nothing
connects on the demo by construction._

### The backend is Express 5 on Render's free tier — REST now, Socket.IO later

_2026-07-17_

**Decision:** The server is Express 5 + TypeScript, deployed as a single
instance on Render (Virginia/US-East), on the **free tier** until traffic
justifies paying. REST covers the out-of-session lifecycle (create an
activity, look one up); everything inside a live session — queue,
matching, chat, the teacher's live view — arrives in later features over
Socket.IO attached to the same HTTP server. The server keeps a hard seam
for that: `app.ts` builds the Express app without listening, and
`index.ts` wraps it in `http.createServer` (never `app.listen()`), which
is exactly where Socket.IO attaches later.

**Why:** Founder call (2026-07-17). Boring, battle-tested pieces for a v1
whose hard part (realtime) is still ahead; Express 5 finally forwards
async throws to error middleware, which keeps handlers thin. The free
tier's spin-down and deploy-wipe are accepted trade-offs with their own
entries (the warm-up ping, the in-memory lifecycle). US East sits well
for both US schools and transatlantic latency.

**Update (2026-07-19):** the "Socket.IO later" half landed with feature
2 — `attachLobby` ([lobby.ts](server/src/live/lobby.ts)) wraps the same
`http.Server` at the `index.ts` seam, exactly as reserved. The seam
never had to move.

_Implemented in [app.ts](server/src/app.ts) and
[index.ts](server/src/index.ts); topology in
[docs/architecture.md](docs/architecture.md)._

### The API lives at `api.chaverola.com` from day one, with no `/api/v1` prefix

_2026-07-17_

**Decision:** The API's base URL is `https://api.chaverola.com` (a CNAME
to the Render host) from the very first deploy, and endpoint paths are
unversioned — `/activities`, not `/api/v1/activities`.

**Why:** Founder call. Baking the real domain in from the start means
`VITE_API_URL` never churns through onrender.com hostnames. URL
versioning protects clients you don't control; Chaverola has one
first-party client in the same repo, the contract is compile-checked
through `shared/`, and all data is ephemeral — there is nothing durable
for an old client to corrupt. The dedicated `api.` subdomain also makes
an `/api` path prefix redundant. If a public API ever ships, introduce
`/v1` then.

_Recorded in [docs/api.md](docs/api.md); the DNS landed 2026-07-18 with
the Prompt 4 deploy._

### Teachers set up at class start, and a warm-up ping hides the cold start

_2026-07-17_

**Decision:** The product assumes teachers create activities **at the
start of class** — no accounts, setup takes under a minute — so the
client fires a fire-and-forget `GET /healthz` when the homepage, the
create page, or the join page mounts. `/healthz` sits before the rate
limiters on purpose: the ping every visitor fires (and Render's health
check) never burns limiter budget.

**Why:** Founder call. The free-tier instance spins down after ~15 idle
minutes and takes tens of seconds to wake; without the ping, the first
teacher of the morning would submit a form into a sleeping server. With
it, the server wakes while the teacher is still typing. The client-side
mounts land with the wiring prompts (feature-1 Prompts 5–6); the
patience copy on pending buttons covers the case where the ping loses
the race.

**Update (2026-07-19):** placement revisited (founder question: should
the ping centralize into a run-once call in `App.tsx`?) and deliberately
kept per-surface. `App` mounts once per page load, so a run-once ping
couldn't re-warm a server that spun down while a visitor idled on the
homepage before navigating into the join or create page — the
per-surface mounts re-ping at exactly the moments that precede an API
call. Per-surface also keeps the demo routes zero-network (the demo must
work offline forever), and the host page needs no ping because its own
lookup is the wake. DRY lives in the shared hook
([useWarmUpServer.ts](client/src/lib/useWarmUpServer.ts)); the three
one-line call sites are declarations of intent.

_Server side in [app.ts](server/src/app.ts)._

### Nothing persists: activities live in memory for 12 hours, and deploys wipe them

_2026-07-17_

**Decision:** No database. Activities live in in-memory Maps on the
single server instance: a 12-hour TTL refreshed **only** by hostKey
lookups (student lookups and code enumeration never keep an activity
alive), a sweep every 10 minutes, and a hard cap of 4,000 concurrent
activities. Restarts and deploys wipe every live class — accepted for
v1, with the working rule: **avoid server-touching pushes during school
hours**.

**Why:** Founder call. An activity is inherently ephemeral — it exists
for one class period and is worthless the next morning — so durability
would buy nothing anyone needs yet, at the cost of schema, migrations,
and hosting. The hostKey-only TTL refresh makes the lifetime match
reality: an activity lives exactly as long as its teacher keeps the host
page open, and a crawler enumerating join codes can't immortalize
garbage.

_Implemented in
[activityStore.ts](server/src/store/activityStore.ts)._

### Host access is a URL capability — the hostKey — not an account

_2026-07-17_

**Decision:** Creating an activity returns the `joinCode` (for students)
plus `hostKey = crypto.randomBytes(18).toString("base64url")` — 24
characters, 144 bits. The host page becomes `/activity/host/:hostKey`
(feature-1 Prompt 6): shareable with an assistant teacher, **never
stored client-side, never a field of `HostedActivity`** (it exists only
as the create response's own `hostKey` member, and the host GET doesn't
echo it back). A join code structurally cannot unlock the host route —
four digits never match the key pattern, and the host route 404s any
4-digit param. CORS is explicitly **not** the security boundary (curl
ignores CORS); the hostKey is.

**Why:** Founder call. No accounts is a core product promise, so the
URL itself must be the credential — and at 144 bits it's unguessable in
a way a login would only complicate. Losing the URL loses the activity;
accepted, because activities are ephemeral and `teacherEmail` is the
future recovery channel (a localStorage stash was rejected — see the
considered-and-rejected entry).

_Implemented in [activityStore.ts](server/src/store/activityStore.ts),
[projections.ts](server/src/store/projections.ts), and
[activities.ts](server/src/routes/activities.ts); the
joinCode-never-unlocks-host rule is an executable test in
[activities.test.ts](server/src/routes/activities.test.ts)._

### The wire contract is handwritten types in `shared/`; zod validates on the server only

_2026-07-17_

**Decision:** `@chaverola/shared` holds the canonical wire contract as
handwritten TypeScript interfaces (moved verbatim from the client, doc
comments kept) plus every shared limit and constant; the package is
buildless and zero-dependency. zod exists only in `server/`, and the
create schema is pinned with
`createActivityRequestSchema satisfies z.ZodType<CreateActivityRequest>`
— any drift between schema and contract is a compile error. The client
keeps its friendly per-field form validation and never imports zod. The
packages carry scoped names `@chaverola/{client,server,shared}`, which
lets Vercel skip builds that don't affect the client.

**Why:** Founder call. Generating types from zod schemas would make zod
the contract's source of truth and pull it toward the client bundle;
handwritten interfaces stay readable, keep their doc comments, and the
`satisfies` pin buys the same drift protection generation would.
pnpm's strict `node_modules` keeps zod structurally unreachable from
the client, so the boundary can't erode by accident.

_Implemented in [shared/src/](shared/src/) and
[schemas/activity.ts](server/src/schemas/activity.ts)._

### Rate limits assume a whole school behind one IP, and join-code enumeration is accepted

_2026-07-17_

**Decision:** Every per-IP limit is sized from one assumption: a school
NAT can put **20 simultaneous classes × 30 students = 600 users on one
IP**. So: `POST /activities` at 60 per 15 minutes (20 teachers starting
class at once, ×3 headroom); GET lookups (the joinCode and hostKey
routes share one limiter) at 1,200 per 5 minutes (600 students × ~2
lookups in a join burst, ×2 headroom). Known residual exposure: one IP
can sweep all 9,000 codes in ~37 minutes — accepted, because the
student projection is public-by-assumption (join code, host name,
characters, scenario: what's on the classroom board anyway), while
`teacherEmail`, `settings`, and the hostKey are never in it. 429s reuse
the shared error envelope with code `capacity` — the `ApiErrorCode`
union has no rate-limit member on purpose (the client treats every
non-2xx the same), and the 429-vs-503 status keeps the two capacity
cases distinguishable.

**Why:** Founder call on the scale assumption (2026-07-17). Sizing per
IP without it would lock out exactly the customer the product wants — a
school where many classes join at once. The enumeration exposure is
handled by making the enumerable data safe rather than the enumeration
impossible: the projection leaks nothing sensitive, and enumeration
can't even keep activities alive (student lookups never refresh the
TTL).

_Sizing math commented in [app.ts](server/src/app.ts); the privacy
allowlist is pinned by
[projections.test.ts](server/src/store/projections.test.ts)._

### Create is not idempotent in v1: a lost response can orphan one activity

_2026-07-17_

**Decision:** `POST /activities` carries no idempotency key. If the
response is lost after the server processed the create (say, a
connection drop during a cold start), a retry mints a second activity;
the first sits unused until the 12-hour TTL reaps it. Accepted for v1.
The client's half of the bargain (landed with feature-1 Prompt 6): the
submit stays disabled until the request settles — no short client-side
timeout that would invite an automatic retry.

**Why:** Founder call. Idempotency machinery (client-minted keys, a
dedup window in the store) is real complexity, and the worst case here
is one orphaned in-memory record that expires on its own — nothing
leaks, and with a 4,000 cap against 8,999 codes an orphan can't
meaningfully crowd anyone out.

_The client half is implemented in
[ActivitySetupForm](client/src/components/Teacher/ActivitySetup/index.tsx)._

### Transcripts wait: feature 1 only stores the teacher's email

_2026-07-17_

**Decision:** The optional `teacherEmail` collected at setup is stored
(and exposed only in the host projection) but nothing is sent yet.
Transcript email ships in a later feature via **Nodemailer + a Gmail
app password** as a stopgap, isolated behind a single send module so
swapping to a real provider (Resend or similar) touches one file.

**Why:** Founder call. Collecting the email now costs one optional
field and means the send feature works for teachers from day one of
_its_ launch; building sending now would block feature 1 on deliverability
plumbing. The Gmail stopgap is free and fine at MVP volume — the
one-module isolation is what keeps it disposable.

_Storage in [activityStore.ts](server/src/store/activityStore.ts);
host-only exposure pinned by
[projections.test.ts](server/src/store/projections.test.ts)._

### Considered and rejected for the backend: TanStack Query, dotenv, a hostKey stash, an npm conversion

_2026-07-17_

**Decision:** Recorded so they aren't re-litigated (founder calls,
2026-07-17):

1. **TanStack Query** — the client will make three fetch calls; the
   lean-deps rule wins. A hand-rolled typed `api.ts` is the whole layer.
2. **dotenv** — dev needs zero env vars (port defaults to 3001, CORS
   defaults to localhost) and Render injects prod env, so there is
   nothing for it to load.
3. **A localStorage hostKey stash** for lost-URL recovery — on a shared
   classroom computer it would hand the next user the teacher view.
   `teacherEmail` is the future recovery channel.
4. **Converting the workspace to npm** — the repo is already pnpm
   workspaces; a conversion is churn with no benefit, and pnpm's strict
   `node_modules` is load-bearing for the zod boundary.

**Why:** Each rejection is the same shape: the alternative solves a
problem this repo doesn't have yet, at the cost of a dependency, a
secret-handling surface, or a privacy hole it would have to carry
forever.

---

## Process & tooling

### Agents read Render logs through the CLI, with the API key in `.env.local`

_2026-07-19_

**Decision:** Agent access to the production server's logs goes through
the official Render CLI (`render logs`, non-interactive with
`RENDER_API_KEY` read from the gitignored `.env.local`) rather than
Render's hosted MCP server. The exact commands live in AGENTS.md →
"Reading production logs".

**Why:** Render API keys are broadly scoped — they grant access to every
service the account can reach — so where the key lives matters more than
the transport. With the CLI it sits in `.env.local`, which the repo
already gitignores and every agent already knows not to commit; the MCP
path would move it into per-agent config files, one more place to leak
from and one per tool to keep in sync. The CLI is also tool-agnostic:
anything that can run a shell can read the logs.

### The numbered doc standard is retired; technical docs live in `docs/`

_2026-07-18_

**Decision:** `PROJECT_DOCUMENTATION_STANDARD.md` — a friend's template
prescribing a numbered doc flow (Product Vision → Change Log) — is
deleted without ever being adopted; git history keeps it. Technical
documentation lives in `docs/` as plainly named files:
[docs/architecture.md](docs/architecture.md),
[docs/api.md](docs/api.md) (the API contract's canonical home, kept
current per feature), and feature plans under
[docs/plans/](docs/plans/).

**Why:** Founder call (made in the feature-1 plan). The template spent
its whole life saying "don't scaffold these yet," and when the backend
finally arrived, the docs the repo actually needed didn't match its
shape — two files that describe the real system beat nine that follow a
method. The living docs named in AGENTS.md remain the source of truth.

### Features ship as prompt-doc plans in `docs/plans/`, one prompt per session

_2026-07-18_

**Decision:** A feature spanning several work sessions gets a plan
document in `docs/plans/` (the first:
[feature-1-create-and-join.md](docs/plans/feature-1-create-and-join.md)):
shared-context sections (the founder's architecture decisions, the wire
contract) followed by numbered prompts, each sized for **one agent
session**, each ending green (typecheck + tests + its own verification)
with **one commit straight to `main`** and its checkbox ticked in the
same commit. Prompts run in order, and ordering constraints are stated
in the doc itself. This is the delivery pattern for future features.

**Why:** Founder + agent working pattern, proven on feature 1. Each
prompt leaves prod deployable, so nothing ever blocks on a half-done
feature; the checkboxes make progress resumable across sessions; and
the shared-context sections keep every session working from the same
recorded decisions instead of re-deriving (or re-litigating) them.
Unlike the deleted Fable prompt series (see
[The Fable prompt series document was deleted, not archived](#the-fable-prompt-series-document-was-deleted-not-archived)),
a plan doc holds decisions and pointers, not a duplicate of the brief —
and decisions still graduate into this file as their prompts land.

### Server tests cover only the safety invariants

_2026-07-17_

**Decision:** The server suite is two small files: a projection test
pinning the **exact key allowlists** of both projections (the student
projection never carries `teacherEmail`, `settings`, or the hostKey),
and four route cases (happy-path create, student projection over the
wire, the `1234` reservation, joinCode-never-unlocks-host). TTL/sweep,
capacity, the dense join-code fallback, 429s, CORS, and body-parser
mapping are deliberately untested — curl smoke and the browser pass
cover them.

**Why:** Founder call, extending
[Testing stays small while the app is UI-only: logic tests, no DOM](#testing-stays-small-while-the-app-is-ui-only-logic-tests-no-dom)
to the server while the product is an MVP. The tested invariants are
the ones whose failure would be **silent and harmful** — a privacy leak
has no visual symptom, so only a pinned allowlist catches a stray
spread. The untested paths fail loudly in smoke, and while the routes
and store are still churning, a broad suite would fight every change.

**Update (2026-07-19):** feature 2 extends the policy to the socket
layer, same shape: the projection test gains the socket-payload
allowlists (`toQueueEntry` never carries the seat token), and one
integration file ([lobby.test.ts](server/src/live/lobby.test.ts))
covers the socket editions of the same invariants — occupancy stays a
mystery to students, a join code can't open a teacher socket, a student
`queue:remove` is ignored, and the seat-resume `currentSocketId` race
guard. Grace timing, the broadcast delay, duplicate tabs, the cap, and
shutdown stay deliberately untested — the browser and phone passes
cover them.

_Implemented in
[projections.test.ts](server/src/store/projections.test.ts),
[activities.test.ts](server/src/routes/activities.test.ts), and
[lobby.test.ts](server/src/live/lobby.test.ts)._

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

**Update (2026-07-18):** `server/` is real, and the policy extends to it
rather than ending — see
[Server tests cover only the safety invariants](#server-tests-cover-only-the-safety-invariants).
The client-side revisit still waits for the engine contract swap (the
realtime feature).

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
([PairingPanel.tsx](client/src/components/Teacher/HostActivity/PairingPanel.tsx)).
The auto-match footer's promise is one the page can finally keep, per
[Auto-match runs on the server, and only while the teacher is connected](#auto-match-runs-on-the-server-and-only-while-the-teacher-is-connected)._

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
[feature-1 Prompt 6](docs/plans/feature-1-create-and-join.md); the panel
lives in
[Teacher/HostActivity](client/src/components/Teacher/HostActivity/)._

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
[HostActivityPage](client/src/pages/teacher/HostActivityPage.tsx)._
