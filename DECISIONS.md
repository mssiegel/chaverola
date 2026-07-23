# Product & UX Decisions

A log of **product, UX, and business decisions** for Chaverola — the choices
behind how the app behaves and _why_. It exists so contributors (people and AI
agents) don't undo intentional behavior that looks like a bug or an oversight.
The entries live in per-area files under `docs/decisions/`; this file is the
index into them.

## How to use this index

**Before changing behavior**, open the area file below that covers what you're
touching and skim its entry titles — every title states its rule, so the
headings alone work as the index. If a change you're about to make contradicts
an entry, the entry wins until the product owner says otherwise.

**Add an entry** whenever a decision is made about how the product should behave,
especially when the reasoning isn't obvious from the code. It's two touches made
in one change: put the entry at the **top** of the matching
`docs/decisions/<area>.md` file (entries are newest-first within each file; add
a new area file, and a section here, when none fits), and add its one line to
that area below. Record the decision and its reasoning; keep implementation
detail in the code, keep the _why_ here. Use this template:

```markdown
### <Title that states the rule — readable without opening the entry>

_YYYY-MM-DD_

**Decision:** What was decided, concretely enough to check the UI against.

**Why:** The reasoning — who made the call (founder feedback, product-owner
call), what alternative was rejected, and what breaks if it's undone.

_Implemented in [File](../../client/src/path/File.tsx)._
```

**When a decision is replaced:** don't delete or rewrite the old entry. Move it
to the **Superseded** section at the bottom of its area file, change its date
line to `_YYYY-MM-DD · Superseded by [new title](#its-anchor)_`, and link to it
from the new entry. Link related entries by title anchor, never by "above" /
"below" — entries move.

This index is generated from the area files' headings. The pre-split history of
these decisions — this file was one 4,300-line log through 2026-07-21 — is in
git: `git log -- DECISIONS.md`.

## Index

- [Student join flow & lobby](docs/decisions/student-join.md)
  - [The full-activity screen names the 60-seat cap and offers a retry](docs/decisions/student-join.md#the-full-activity-screen-names-the-60-seat-cap-and-offers-a-retry)
  - [A removed student retypes their name — the field is not refilled](docs/decisions/student-join.md#a-removed-student-retypes-their-name--the-field-is-not-refilled)
  - [The real lobby still says Waiting for your match until matching ships](docs/decisions/student-join.md#the-real-lobby-still-says-waiting-for-your-match-until-matching-ships)
  - [Two students can share a name; the queue tells them apart](docs/decisions/student-join.md#two-students-can-share-a-name-the-queue-tells-them-apart)
  - [A wiped server ends the class honestly on the student's screen](docs/decisions/student-join.md#a-wiped-server-ends-the-class-honestly-on-the-students-screen)
  - [Real codes resolve over the API, and only a resolved miss signs anyone out](docs/decisions/student-join.md#real-codes-resolve-over-the-api-and-only-a-resolved-miss-signs-anyone-out)
  - [Stage swaps inside the student route open at the top of the page](docs/decisions/student-join.md#stage-swaps-inside-the-student-route-open-at-the-top-of-the-page)
  - [No identity bar during chat either](docs/decisions/student-join.md#no-identity-bar-during-chat-either)
  - [Mid-chat, the student's name is a corner badge](docs/decisions/student-join.md#mid-chat-the-students-name-is-a-corner-badge)
  - [Back during a live chat asks before ending it](docs/decisions/student-join.md#back-during-a-live-chat-asks-before-ending-it)
  - [One URL for the whole student journey](docs/decisions/student-join.md#one-url-for-the-whole-student-journey)
  - [Landing on code entry signs the student out](docs/decisions/student-join.md#landing-on-code-entry-signs-the-student-out)
  - [Lobby waiting dots are mint, not grape](docs/decisions/student-join.md#lobby-waiting-dots-are-mint-not-grape)
  - [The lobby shows no identity bar](docs/decisions/student-join.md#the-lobby-shows-no-identity-bar)
  - [No emoji bubble row in the waiting lobby](docs/decisions/student-join.md#no-emoji-bubble-row-in-the-waiting-lobby)
  - [The student join flow lives in its own navbar-free "world"](docs/decisions/student-join.md#the-student-join-flow-lives-in-its-own-navbar-free-world)
  - [Background doodles are deterministic, and freeze (not hide) under reduced motion](docs/decisions/student-join.md#background-doodles-are-deterministic-and-freeze-not-hide-under-reduced-motion)
  - [No "use a different code" escape on the name step](docs/decisions/student-join.md#no-use-a-different-code-escape-on-the-name-step)
  - [One page serves both join routes; a wrong code never changes the URL](docs/decisions/student-join.md#one-page-serves-both-join-routes-a-wrong-code-never-changes-the-url)
  - [Student sign-in lives in the tab, and removal sends you to the name step](docs/decisions/student-join.md#student-sign-in-lives-in-the-tab-and-removal-sends-you-to-the-name-step)
- [Chat behavior](docs/decisions/chat-behavior.md)
  - [Ending your own chat keeps your seat, and the ender gets a wrap-up screen](docs/decisions/chat-behavior.md#ending-your-own-chat-keeps-your-seat-and-the-ender-gets-a-wrap-up-screen)
  - [While a student types on a phone, the world's chrome gets out of the way](docs/decisions/chat-behavior.md#while-a-student-types-on-a-phone-the-worlds-chrome-gets-out-of-the-way)
  - [A student's own leave ends a 1:1 as "peer", and the survivor's screen names their character](docs/decisions/chat-behavior.md#a-students-own-leave-ends-a-11-as-peer-and-the-survivors-screen-names-their-character)
  - [On phones the chat fills the screen and hugs the keyboard; desktop keeps the fixed card](docs/decisions/chat-behavior.md#on-phones-the-chat-fills-the-screen-and-hugs-the-keyboard-desktop-keeps-the-fixed-card)
  - [A timed-out student returns to their ended chat, never silently to the lobby](docs/decisions/chat-behavior.md#a-timed-out-student-returns-to-their-ended-chat-never-silently-to-the-lobby)
  - [Students see a partner's drop and return, on the teacher's own 4s gate](docs/decisions/chat-behavior.md#students-see-a-partners-drop-and-return-on-the-teachers-own-4s-gate)
  - [A grace expiry ends a 1:1 as "peer-timeout"; the group notice is a client heuristic](docs/decisions/chat-behavior.md#a-grace-expiry-ends-a-11-as-peer-timeout-the-group-notice-is-a-client-heuristic)
  - [The teacher never sees typing](docs/decisions/chat-behavior.md#the-teacher-never-sees-typing)
  - [Typing is a heartbeat that dies in five seconds, never a stored fact](docs/decisions/chat-behavior.md#typing-is-a-heartbeat-that-dies-in-five-seconds-never-a-stored-fact)
  - [One typing slot per room, last writer wins](docs/decisions/chat-behavior.md#one-typing-slot-per-room-last-writer-wins)
  - [The server never inspects what students write](docs/decisions/chat-behavior.md#the-server-never-inspects-what-students-write)
  - [Leaving a live chat means leaving the activity (until messaging ships)](docs/decisions/chat-behavior.md#leaving-a-live-chat-means-leaving-the-activity-until-messaging-ships)
  - [The live ended screen returns to the lobby only on a tap, and shows no reveal](docs/decisions/chat-behavior.md#the-live-ended-screen-returns-to-the-lobby-only-on-a-tap-and-shows-no-reveal)
  - [The live name reveal fires at chat-end, per the teacher's setting](docs/decisions/chat-behavior.md#the-live-name-reveal-fires-at-chat-end-per-the-teachers-setting)
  - [In a group the student leaves; only a 2-person chat can be ended](docs/decisions/chat-behavior.md#in-a-group-the-student-leaves-only-a-2-person-chat-can-be-ended)
  - [The composer's emoji picker stays open across inserts](docs/decisions/chat-behavior.md#the-composers-emoji-picker-stays-open-across-inserts)
  - [Every chat end explains itself](docs/decisions/chat-behavior.md#every-chat-end-explains-itself)
  - [The chat header summarizes the room, and tapping it shows everyone](docs/decisions/chat-behavior.md#the-chat-header-summarizes-the-room-and-tapping-it-shows-everyone)
  - [A disconnected peer gets 2 minutes to come back, and the student watches the clock](docs/decisions/chat-behavior.md#a-disconnected-peer-gets-2-minutes-to-come-back-and-the-student-watches-the-clock)
  - [A group chat drops a timed-out peer instead of ending](docs/decisions/chat-behavior.md#a-group-chat-drops-a-timed-out-peer-instead-of-ending)
  - [Ending a chat ends it for everyone in the room](docs/decisions/chat-behavior.md#ending-a-chat-ends-it-for-everyone-in-the-room)
  - [End of chat requires a tap to return to the lobby](docs/decisions/chat-behavior.md#end-of-chat-requires-a-tap-to-return-to-the-lobby)
  - [Character-name colors](docs/decisions/chat-behavior.md#character-name-colors)
- [Characters & rosters](docs/decisions/characters.md)
  - [A character's emoji is optional, and labels simply drop it](docs/decisions/characters.md#a-characters-emoji-is-optional-and-labels-simply-drop-it)
- [Teacher activity setup](docs/decisions/teacher-setup.md)
  - [Setup is one scrolling form, and Host the Activity is never disabled](docs/decisions/teacher-setup.md#setup-is-one-scrolling-form-and-host-the-activity-is-never-disabled)
  - [The setup draft lives in the tab, and hosting doesn't clear it](docs/decisions/teacher-setup.md#the-setup-draft-lives-in-the-tab-and-hosting-doesnt-clear-it)
  - [An abandoned character row never blocks hosting; a duplicate name does](docs/decisions/teacher-setup.md#an-abandoned-character-row-never-blocks-hosting-a-duplicate-name-does)
  - [Hard caps with quiet counters: 30-character names, 20-word scene](docs/decisions/teacher-setup.md#hard-caps-with-quiet-counters-30-character-names-20-word-scene)
  - [Settings ship on, and a toggle's sub-control disables instead of hiding](docs/decisions/teacher-setup.md#settings-ship-on-and-a-toggles-sub-control-disables-instead-of-hiding)
  - [The setup form's submit is solid grape](docs/decisions/teacher-setup.md#the-setup-forms-submit-is-solid-grape)
  - [Wide screens get a live student-lobby preview beside the form](docs/decisions/teacher-setup.md#wide-screens-get-a-live-student-lobby-preview-beside-the-form)
  - [Host the Activity docks to the bottom edge at every breakpoint](docs/decisions/teacher-setup.md#host-the-activity-docks-to-the-bottom-edge-at-every-breakpoint)
  - [Character rows lead with the emoji avatar](docs/decisions/teacher-setup.md#character-rows-lead-with-the-emoji-avatar)
  - [Setup sections each carry one brand accent; settings stays the quiet one](docs/decisions/teacher-setup.md#setup-sections-each-carry-one-brand-accent-settings-stays-the-quiet-one)
- [Teacher live activity page](docs/decisions/teacher-live.md)
  - [The live settings panel only claims the edits that actually travel](docs/decisions/teacher-live.md#the-live-settings-panel-only-claims-the-edits-that-actually-travel)
  - [A best-effort fallback emails the transcript if the teacher just closes the laptop](docs/decisions/teacher-live.md#a-best-effort-fallback-emails-the-transcript-if-the-teacher-just-closes-the-laptop)
  - [End activity is the terminal wrap-up, and it emails the class transcript](docs/decisions/teacher-live.md#end-activity-is-the-terminal-wrap-up-and-it-emails-the-class-transcript)
  - [Ending removes the activity right away; the wrapped-up screen is local to the tab](docs/decisions/teacher-live.md#ending-removes-the-activity-right-away-the-wrapped-up-screen-is-local-to-the-tab)
  - [The teacher's email syncs live; the rest of the roster still doesn't](docs/decisions/teacher-live.md#the-teachers-email-syncs-live-the-rest-of-the-roster-still-doesnt)
  - [Chats show no timer or clock — the teacher ends them by hand](docs/decisions/teacher-live.md#chats-show-no-timer-or-clock--the-teacher-ends-them-by-hand)
  - [Pausing ships end to end; the grace window keeps running through it](docs/decisions/teacher-live.md#pausing-ships-end-to-end-the-grace-window-keeps-running-through-it)
  - [Ending ships for real; pausing keeps the placeholder seam](docs/decisions/teacher-live.md#ending-ships-for-real-pausing-keeps-the-placeholder-seam)
  - [The teacher reads every chat, and that ships with messaging — not after it](docs/decisions/teacher-live.md#the-teacher-reads-every-chat-and-that-ships-with-messaging--not-after-it)
  - [Message lines are the one delta on the teacher wire](docs/decisions/teacher-live.md#message-lines-are-the-one-delta-on-the-teacher-wire)
  - [Disabled ending controls share one hint line, not one per card](docs/decisions/teacher-live.md#disabled-ending-controls-share-one-hint-line-not-one-per-card)
  - [An empty live transcript explains itself; a finished one doesn't](docs/decisions/teacher-live.md#an-empty-live-transcript-explains-itself-a-finished-one-doesnt)
  - [A matched seat gets the same 2 minutes as any other, and leaves its chat when they run out](docs/decisions/teacher-live.md#a-matched-seat-gets-the-same-2-minutes-as-any-other-and-leaves-its-chat-when-they-run-out)
  - [Matching's production pass reruns the matching story, not the restart story](docs/decisions/teacher-live.md#matchings-production-pass-reruns-the-matching-story-not-the-restart-story)
  - [Feature 3 makes matching real; messaging, ending, and pause stay placeholders](docs/decisions/teacher-live.md#feature-3-makes-matching-real-messaging-ending-and-pause-stay-placeholders)
  - [Auto-match runs on the server, and only while the teacher is connected](docs/decisions/teacher-live.md#auto-match-runs-on-the-server-and-only-while-the-teacher-is-connected)
  - [Mid-chat, drops show and Remove works — nothing happens automatically](docs/decisions/teacher-live.md#mid-chat-drops-show-and-remove-works--nothing-happens-automatically)
  - [Settings edits sync for real; characters, scenario, and host name stay local](docs/decisions/teacher-live.md#settings-edits-sync-for-real-characters-scenario-and-host-name-stay-local)
  - [A dropped student keeps their seat for 2 minutes, marked and unmatchable](docs/decisions/teacher-live.md#a-dropped-student-keeps-their-seat-for-2-minutes-marked-and-unmatchable)
  - [When the teacher's connection drops, the queue dims under a reconnecting banner](docs/decisions/teacher-live.md#when-the-teachers-connection-drops-the-queue-dims-under-a-reconnecting-banner)
  - [A rematch only counts when it's an exact rerun for everyone in it](docs/decisions/teacher-live.md#a-rematch-only-counts-when-its-an-exact-rerun-for-everyone-in-it)
  - [The live-settings panel stays on real activities, editing the teacher's local view](docs/decisions/teacher-live.md#the-live-settings-panel-stays-on-real-activities-editing-the-teachers-local-view)
  - [Start their chat sits below Pair everyone 1:1, nearest the names](docs/decisions/teacher-live.md#start-their-chat-sits-below-pair-everyone-11-nearest-the-names)
  - [The pairing CTAs pin at the top of the desktop rail while the queue scrolls](docs/decisions/teacher-live.md#the-pairing-ctas-pin-at-the-top-of-the-desktop-rail-while-the-queue-scrolls)
  - [Pause is one world-level switch: chats freeze, clocks hold, matchmaking waits](docs/decisions/teacher-live.md#pause-is-one-world-level-switch-chats-freeze-clocks-hold-matchmaking-waits)
  - [The pairing rail carries the auto-match switch, and it IS the activity setting](docs/decisions/teacher-live.md#the-pairing-rail-carries-the-auto-match-switch-and-it-is-the-activity-setting)
  - [End all chats holds auto-match by turning the real setting off](docs/decisions/teacher-live.md#end-all-chats-holds-auto-match-by-turning-the-real-setting-off)
  - [A character in a live chat shows the Live dot, and its hint says who](docs/decisions/teacher-live.md#a-character-in-a-live-chat-shows-the-live-dot-and-its-hint-says-who)
  - [The host page is never projected — it's the teacher's private control room](docs/decisions/teacher-live.md#the-host-page-is-never-projected--its-the-teachers-private-control-room)
  - [Host page layout: stacked sections on phones, a sticky pairing rail on desktop](docs/decisions/teacher-live.md#host-page-layout-stacked-sections-on-phones-a-sticky-pairing-rail-on-desktop)
  - [The waiting count is the hero stat, and it never leaves the screen](docs/decisions/teacher-live.md#the-waiting-count-is-the-hero-stat-and-it-never-leaves-the-screen)
  - [Pairing is tap-to-select, and characters are dealt randomly](docs/decisions/teacher-live.md#pairing-is-tap-to-select-and-characters-are-dealt-randomly)
  - [Pair everyone avoids fresh rematches, and seats the odd one out when it can](docs/decisions/teacher-live.md#pair-everyone-avoids-fresh-rematches-and-seats-the-odd-one-out-when-it-can)
  - [The rematch warning remembers one round, and never blocks](docs/decisions/teacher-live.md#the-rematch-warning-remembers-one-round-and-never-blocks)
  - [Removing a student mid-chat is a quiet exit](docs/decisions/teacher-live.md#removing-a-student-mid-chat-is-a-quiet-exit)
  - [Live edits propagate after a 1-second pause, and invalid states never do](docs/decisions/teacher-live.md#live-edits-propagate-after-a-1-second-pause-and-invalid-states-never-do)
  - [No reveal-names control in Chats in progress](docs/decisions/teacher-live.md#no-reveal-names-control-in-chats-in-progress)
  - [Unknown host links get a friendly not-found, and the demo redirect is gone](docs/decisions/teacher-live.md#unknown-host-links-get-a-friendly-not-found-and-the-demo-redirect-is-gone)
  - [The copyable student link carries the current origin, and is never printed](docs/decisions/teacher-live.md#the-copyable-student-link-carries-the-current-origin-and-is-never-printed)
  - _Superseded_
    - [Every chat runs its own auto-end clock, and students watch it tick](docs/decisions/teacher-live.md#every-chat-runs-its-own-auto-end-clock-and-students-watch-it-tick)
    - [Auto-end edits: new minutes wait for new chats; the toggle acts immediately](docs/decisions/teacher-live.md#auto-end-edits-new-minutes-wait-for-new-chats-the-toggle-acts-immediately)
    - [The live card's count-up clock appears only after the first minute](docs/decisions/teacher-live.md#the-live-cards-count-up-clock-appears-only-after-the-first-minute)
    - [Server pairing keeps no rematch memory this feature](docs/decisions/teacher-live.md#server-pairing-keeps-no-rematch-memory-this-feature)
    - [The chat sections hide entirely on real activities until matching ships](docs/decisions/teacher-live.md#the-chat-sections-hide-entirely-on-real-activities-until-matching-ships)
    - [Real host pages show an honest placeholder instead of pairing controls](docs/decisions/teacher-live.md#real-host-pages-show-an-honest-placeholder-instead-of-pairing-controls)
    - [Real activities hide the live-settings panel until edit sync ships](docs/decisions/teacher-live.md#real-activities-hide-the-live-settings-panel-until-edit-sync-ships)
    - [An unknown host code redirects to the demo activity](docs/decisions/teacher-live.md#an-unknown-host-code-redirects-to-the-demo-activity)
- [Teacher monitoring view](docs/decisions/monitoring.md)
  - [Teacher chat cards: collapsed to the last 5 lines, End chat asks first](docs/decisions/monitoring.md#teacher-chat-cards-collapsed-to-the-last-5-lines-end-chat-asks-first)
  - [Teacher view: character colors follow participant order](docs/decisions/monitoring.md#teacher-view-character-colors-follow-participant-order)
- [Homepage & hero](docs/decisions/homepage.md)
  - [The highlighter mark appears once on the homepage, under "In character"](docs/decisions/homepage.md#the-highlighter-mark-appears-once-on-the-homepage-under-in-character)
  - [The homepage has a "see it in action" section with doorways into both demos](docs/decisions/homepage.md#the-homepage-has-a-see-it-in-action-section-with-doorways-into-both-demos)
  - [On phones the live chat comes before the setup steps](docs/decisions/homepage.md#on-phones-the-live-chat-comes-before-the-setup-steps)
  - [The how-it-works footer answers cost, accounts, and devices](docs/decisions/homepage.md#the-how-it-works-footer-answers-cost-accounts-and-devices)
  - [The teacher bullets say the safety part out loud](docs/decisions/homepage.md#the-teacher-bullets-say-the-safety-part-out-loud)
  - [The homepage has no footer, and the demo-links line is gone](docs/decisions/homepage.md#the-homepage-has-no-footer-and-the-demo-links-line-is-gone)
  - [The teacher preview mirrors the hero chat live](docs/decisions/homepage.md#the-teacher-preview-mirrors-the-hero-chat-live)
  - [No testimonials on the homepage](docs/decisions/homepage.md#no-testimonials-on-the-homepage)
  - [The hero demo goes quiet after two Armstrong lines](docs/decisions/homepage.md#the-hero-demo-goes-quiet-after-two-armstrong-lines)
  - [Demo students have short names, and the teacher is never one of them](docs/decisions/homepage.md#demo-students-have-short-names-and-the-teacher-is-never-one-of-them)
  - [Solid grape is reserved for Join; both Host buttons are outline](docs/decisions/homepage.md#solid-grape-is-reserved-for-join-both-host-buttons-are-outline)
  - [The teacher section stays light, and never points at "this card"](docs/decisions/homepage.md#the-teacher-section-stays-light-and-never-points-at-this-card)
  - [The teacher pitch sells in-character talk, not a guessing game](docs/decisions/homepage.md#the-teacher-pitch-sells-in-character-talk-not-a-guessing-game)
  - [Hero CTAs sit right under the pitch at every width](docs/decisions/homepage.md#hero-ctas-sit-right-under-the-pitch-at-every-width)
  - [Founder photo loads from `/founder-moshe.jpg` with a marked placeholder fallback](docs/decisions/homepage.md#founder-photo-loads-from-founder-moshejpg-with-a-marked-placeholder-fallback)
  - [The hero looks hand-made and never mentions AI](docs/decisions/homepage.md#the-hero-looks-hand-made-and-never-mentions-ai)
  - [The hero chatbox is the product running live, not a mockup](docs/decisions/homepage.md#the-hero-chatbox-is-the-product-running-live-not-a-mockup)
  - _Superseded_
    - [Hero CTAs sit above the fold on phones](docs/decisions/homepage.md#hero-ctas-sit-above-the-fold-on-phones)
- [Navbar](docs/decisions/navbar.md)
  - [The brand home link disappears mid-chat and while hosting](docs/decisions/navbar.md#the-brand-home-link-disappears-mid-chat-and-while-hosting)
  - [The navbar Join CTA appears only on the homepage](docs/decisions/navbar.md#the-navbar-join-cta-appears-only-on-the-homepage)
  - [Mobile navbar swaps the wordmark for "Join Activity" on scroll](docs/decisions/navbar.md#mobile-navbar-swaps-the-wordmark-for-join-activity-on-scroll)
  - [The navbar has one CTA: Join an Activity](docs/decisions/navbar.md#the-navbar-has-one-cta-join-an-activity)
  - [Navbar: CTA label shortens on phones; language switcher swaps in place](docs/decisions/navbar.md#navbar-cta-label-shortens-on-phones-language-switcher-swaps-in-place)
- [Branding & page titles](docs/decisions/branding.md)
  - [The name's story is Chaver + Olah ("rising up"), not Chaver + Crayola](docs/decisions/branding.md#the-names-story-is-chaver--olah-rising-up-not-chaver--crayola)
  - [Page titles read "&lt;Page&gt; | Chaverola", page name first](docs/decisions/branding.md#page-titles-read-ltpagegt--chaverola-page-name-first)
- [Demo flows & demo furniture](docs/decisions/demo-flows.md)
  - [The student demo skips the code screen and joins you as Rachel](docs/decisions/demo-flows.md#the-student-demo-skips-the-code-screen-and-joins-you-as-rachel)
  - [The demo notice is a banner you can't miss](docs/decisions/demo-flows.md#the-demo-notice-is-a-banner-you-cant-miss)
  - [When the backend arrives: real activities get strictly real, and `1234` stays the only demo](docs/decisions/demo-flows.md#when-the-backend-arrives-real-activities-get-strictly-real-and-1234-stays-the-only-demo)
  - [The demo control panels are teacher-facing and permanent (on demo flows)](docs/decisions/demo-flows.md#the-demo-control-panels-are-teacher-facing-and-permanent-on-demo-flows)
  - [The demo lobby pairs you by itself after 20 seconds](docs/decisions/demo-flows.md#the-demo-lobby-pairs-you-by-itself-after-20-seconds)
  - _Superseded_
    - [Demo surfaces say so: a pretend-students chip on both views](docs/decisions/demo-flows.md#demo-surfaces-say-so-a-pretend-students-chip-on-both-views)
- [Routes & app structure](docs/decisions/routes.md)
  - [Clicking to a new page opens it at the top](docs/decisions/routes.md#clicking-to-a-new-page-opens-it-at-the-top)
  - [`/demo`, `/demo/teacher`, and `/demo/student` are thin redirects, never pages](docs/decisions/routes.md#demo-demoteacher-and-demostudent-are-thin-redirects-never-pages)
  - [The temporary `/demo/*` routes are gone — every surface lives in its real flow](docs/decisions/routes.md#the-temporary-demo-routes-are-gone--every-surface-lives-in-its-real-flow)
- [Backend & API](docs/decisions/backend-api.md)
  - [The transcript mailer: Gmail SMTP behind one module, log-only without credentials](docs/decisions/backend-api.md#the-transcript-mailer-gmail-smtp-behind-one-module-log-only-without-credentials)
  - [One implementation of the pure matching rules, shared by both engines](docs/decisions/backend-api.md#one-implementation-of-the-pure-matching-rules-shared-by-both-engines)
  - [Localhost real flows compress through a server-side time-scale knob; production is pinned to 1](docs/decisions/backend-api.md#localhost-real-flows-compress-through-a-server-side-time-scale-knob-production-is-pinned-to-1)
  - [The student chat wire carries characterIds only](docs/decisions/backend-api.md#the-student-chat-wire-carries-characterids-only)
  - [Starting a chat clamps to the server's roster instead of rejecting](docs/decisions/backend-api.md#starting-a-chat-clamps-to-the-servers-roster-instead-of-rejecting)
  - [Sockets connect at lobby entry and host-page load, and never on the demo](docs/decisions/backend-api.md#sockets-connect-at-lobby-entry-and-host-page-load-and-never-on-the-demo)
  - [The backend is Express 5 on Render's free tier — REST now, Socket.IO later](docs/decisions/backend-api.md#the-backend-is-express-5-on-renders-free-tier--rest-now-socketio-later)
  - [The API lives at `api.chaverola.com` from day one, with no `/api/v1` prefix](docs/decisions/backend-api.md#the-api-lives-at-apichaverolacom-from-day-one-with-no-apiv1-prefix)
  - [Teachers set up at class start, and a warm-up ping hides the cold start](docs/decisions/backend-api.md#teachers-set-up-at-class-start-and-a-warm-up-ping-hides-the-cold-start)
  - [Nothing persists: activities live in memory for 12 hours, and deploys wipe them](docs/decisions/backend-api.md#nothing-persists-activities-live-in-memory-for-12-hours-and-deploys-wipe-them)
  - [Host access is a URL capability — the hostKey — not an account](docs/decisions/backend-api.md#host-access-is-a-url-capability--the-hostkey--not-an-account)
  - [The wire contract is handwritten types in `shared/`; zod validates on the server only](docs/decisions/backend-api.md#the-wire-contract-is-handwritten-types-in-shared-zod-validates-on-the-server-only)
  - [Rate limits assume a whole school behind one IP, and join-code enumeration is accepted](docs/decisions/backend-api.md#rate-limits-assume-a-whole-school-behind-one-ip-and-join-code-enumeration-is-accepted)
  - [Create is not idempotent in v1: a lost response can orphan one activity](docs/decisions/backend-api.md#create-is-not-idempotent-in-v1-a-lost-response-can-orphan-one-activity)
  - [Transcripts wait: feature 1 only stores the teacher's email](docs/decisions/backend-api.md#transcripts-wait-feature-1-only-stores-the-teachers-email)
  - [Considered and rejected for the backend: TanStack Query, dotenv, a hostKey stash, an npm conversion](docs/decisions/backend-api.md#considered-and-rejected-for-the-backend-tanstack-query-dotenv-a-hostkey-stash-an-npm-conversion)
- [Process & tooling](docs/decisions/process.md)
  - [AGENTS.md is a router: a status table, invariants, and a task router, not a narrative](docs/decisions/process.md#agentsmd-is-a-router-a-status-table-invariants-and-a-task-router-not-a-narrative)
  - [DECISIONS.md is an index; entries live in docs/decisions/ per area](docs/decisions/process.md#decisionsmd-is-an-index-entries-live-in-docsdecisions-per-area)
  - [The per-feature prod pass trims to cold-wake, a smoke, and one network leg](docs/decisions/process.md#the-per-feature-prod-pass-trims-to-cold-wake-a-smoke-and-one-network-leg)
  - [No CI; the local pre-push typecheck and test are the gate](docs/decisions/process.md#no-ci-the-local-pre-push-typecheck-and-test-are-the-gate)
  - [The verify harness is repo code; one-shot drivers live and die in scratch](docs/decisions/process.md#the-verify-harness-is-repo-code-one-shot-drivers-live-and-die-in-scratch)
  - [Slices verify on localhost; production driving happens once per feature](docs/decisions/process.md#slices-verify-on-localhost-production-driving-happens-once-per-feature)
  - [Until launch, server pushes can happen at any hour](docs/decisions/process.md#until-launch-server-pushes-can-happen-at-any-hour)
  - [Features ship as end-to-end slices, not layers](docs/decisions/process.md#features-ship-as-end-to-end-slices-not-layers)
  - [Agents read Render logs through the CLI, with the API key in `.env.local`](docs/decisions/process.md#agents-read-render-logs-through-the-cli-with-the-api-key-in-envlocal)
  - [The numbered doc standard is retired; technical docs live in `docs/`](docs/decisions/process.md#the-numbered-doc-standard-is-retired-technical-docs-live-in-docs)
  - [Features ship as prompt-doc plans in `docs/plans/`, one prompt per session](docs/decisions/process.md#features-ship-as-prompt-doc-plans-in-docsplans-one-prompt-per-session)
  - [Server tests cover only the safety invariants](docs/decisions/process.md#server-tests-cover-only-the-safety-invariants)
  - [`?fast` compresses the demo clocks — dev builds only, and never to zero](docs/decisions/process.md#fast-compresses-the-demo-clocks--dev-builds-only-and-never-to-zero)
  - [Verification climbs a ladder: typecheck, then tests, then the browser](docs/decisions/process.md#verification-climbs-a-ladder-typecheck-then-tests-then-the-browser)
  - [The repo `memory/` folder is gone — its notes live in AGENTS.md](docs/decisions/process.md#the-repo-memory-folder-is-gone--its-notes-live-in-agentsmd)
  - [The repo is public on GitHub under MIT, and main auto-deploys to Vercel](docs/decisions/process.md#the-repo-is-public-on-github-under-mit-and-main-auto-deploys-to-vercel)
  - [Testing stays small while the app is UI-only: logic tests, no DOM](docs/decisions/process.md#testing-stays-small-while-the-app-is-ui-only-logic-tests-no-dom)
  - [The Fable prompt series document was deleted, not archived](docs/decisions/process.md#the-fable-prompt-series-document-was-deleted-not-archived)
  - _Superseded_
    - [DECISIONS.md stays one file, with a linked table of contents](docs/decisions/process.md#decisionsmd-stays-one-file-with-a-linked-table-of-contents)
