# AGENTS.md

This file is the canonical source of guidance for all AI agents (Claude Code, Cursor, Copilot, etc.) working in this repository. Read this first. Do not create a separate `CLAUDE.md`, `.cursorrules`, or equivalent — keep agent instructions consolidated here.

## Status

Scaffolding is in place: a pnpm-workspaces monorepo with a working `client/` app
(React 19 + TypeScript + Vite + Tailwind v4 + ShadCN) and an empty `server/`. The
first feature — the **student chatbox** — is built as a working, mock-driven demo at
`/demo/student-chat` and is wired into the real student flow (see below). The
**teacher chat cards** follow the same pattern at `/demo/teacher-chat` and get wired
into `/activity/host/:joinCode` later. The **navbar** (logo, language switcher,
Join CTA) and the **full homepage** at `/` are in place: a hero with a live
sample chatbox reusing the student chat pieces, a teacher's-view section that
mirrors the same live chat through the real `ChatCard`, a
how-it-works-for-teachers section, and the founder's note (headshot at
`client/public/founder-moshe.jpg`, with a marked placeholder fallback if the
file ever goes missing). The **full student flow** is real: one page
(`client/src/pages/student/JoinActivityPage.tsx`) serves both
`/activity/join` and `/activity/join/:joinCode`, carrying the student through
code entry → name entry → lobby → chatting → chat ended on that one route
(mock match triggers in the lobby's demo panel start a 1:1 or group-of-3
chat; `client/src/components/Student/ChatStage.tsx` owns the chatting/ended
stages, keyed per match). Landing back on code entry signs the student out,
and browser back during a live chat opens the end-chat confirmation via
`client/src/lib/useBackGuard.ts` (see DECISIONS.md for both). The demo chat
engine (`useChatDemo`) also owns the 2-minute peer-reconnect window with its
live countdown: a 1:1 timeout ends the chat with an end **reason** (reason-
aware copy in `ChatEndedSection`), a group timeout drops the peer with a
conversation notice instead of ending (see DECISIONS.md). Student identity
is a sessionStorage-backed session (`client/src/lib/studentSession.ts`);
`StudentIdentityBar` renders in the chatting/ended stages only (deliberately
absent from the lobby — see DECISIONS.md). The mock activity behind code
`1234` lives in `client/src/mockData/activityDemo.ts`, and the matched-chat
scenarios it feeds live in `client/src/mockData/activityChatDemo.ts`. The join flow renders **navbar-free**
inside `client/src/components/layout/StudentWorldLayout.tsx` — an immersive
purple "world" with drifting hand-drawn doodles
(`client/src/components/decor/`), a floating language pill, and a gradient
`ChaverolaPill` (`client/src/components/brand/`) that links home — hidden
while a chat is on screen, as is AppLayout's logo on the teacher host route
(see DECISIONS.md → "The brand home link disappears mid-chat and while
hosting"); the route
tree in `client/src/App.tsx` is split into two pathless layout groups
(AppLayout vs. StudentWorldLayout) per locale. See DECISIONS.md.
The **teacher setup page** at `/activity/create` is real: one scrolling
form (`client/src/components/Teacher/ActivitySetup/` — 2–4 character rows
with optional emoji slots, hosted-by, optional email, 20-word scene, four
recommended-on toggles with steppers), with the caps, sessionStorage draft,
validation, and hosted-activity hand-off in
`client/src/lib/activitySetup.ts` (char/word clamps in
`client/src/lib/text.ts`). "Host the Activity" is never disabled — an
invalid tap scrolls to the first problem; a valid one saves a
`HostedActivity` under the `chaverola.hostedActivity` sessionStorage key and
navigates to `/activity/host/:joinCode` with a fresh non-`1234` 4-digit code
(`mockGenerateJoinCode`), where the still-placeholder host page will read it
via `readHostedActivity` when it's built. The emoji picker now lives at
`client/src/components/chat/EmojiPickerPopover.tsx`, loaded through
`client/src/components/chat/LazyEmojiPicker.tsx` (the shared lazy + Suspense
fallback) and shared by the student composer and the setup's emoji slots —
both surfaces render it inside the `ui/popover` primitive (the composer's
prevented Radix focus defaults are a recorded decision; see DECISIONS.md).
`ui/` gained switch, input, and textarea primitives. Layout-wise the page is a warm brand pass: sections open
with accent icon chips (grape/coral/sky/mint via `FormSection`'s `accent`
prop), character rows lead with a round emoji-avatar slot, from `lg` up a
sticky `LobbyPreview` rail (a live miniature of `WaitingLobby`, Host button
beneath) sits beside the form — the grid must NOT get `items-start` or the
sticky rail loses its track — and below `lg` the Host button docks to a fixed
bottom bar (the page carries `pb-36` for clearance). See DECISIONS.md →
"Teacher activity setup".

## Project Brief

The full project brief (what Chaverola is, scope, tech stack, canonical routes, branding, and chatbox conventions) lives in [Shared_Project_Context.md](Shared_Project_Context.md). Read it before doing any work — it is the shared source of truth for the project's requirements.

## Documentation

All project documentation must be created and maintained according to [PROJECT_DOCUMENTATION_STANDARD.md](PROJECT_DOCUMENTATION_STANDARD.md). That file defines the canonical structure, reading order, and the purpose (with "should contain" / "should NOT contain" rules) for every document. When creating or updating docs, follow it — do not invent an alternate structure.

The recommended documentation flow is:

```text
README
01 Product Vision
02 Core Concepts
03 Data Concept
04 Architecture
05 Database Design
06 API Design
07 UI Design
08 Contributing
09 Change Log
```

Documentation moves from **business concepts** toward **technical implementation**. Docs after 04 Architecture / 05 Database Design become project-specific (e.g. Infrastructure, Deployment, Security, AI Components) and may be added, merged, or reordered as the project requires. Keep documentation in sync with the code: update all related documents before considering a feature or architectural change complete, and record significant changes in the Change Log.

## Project Overview

Chaverola is a **UI/UX-only** (no backend logic) React app for a fun, game-like
classroom chat activity. Students join with a code, get a character, and roleplay with
peers without knowing who's who; teachers create activities and can reveal names. Every
screen is driven by mock data + demo events — nothing is a dead end. Primary stack:
**React 19, TypeScript, Vite, Tailwind v4, ShadCN, pnpm workspaces.**

## Commands

Run from the repo root:

- **Dev:** `pnpm dev` — start the Vite dev server (client)
- **Build:** `pnpm build` — type-check + production build (client)
- **Typecheck:** `pnpm typecheck` — `tsc -b` (client)
- **Lint:** `pnpm lint` — ESLint 9 flat config (`client/eslint.config.js`), including
  the React Hooks + React Compiler lints
- **Preview:** `pnpm preview` — serve the production build
- **Format:** `pnpm format` / `pnpm format:check` — Prettier over the whole repo.
  `prettier-plugin-tailwindcss` sorts Tailwind classes (including inside `cn()`/
  `cva()` calls) into canonical order — never hand-order class strings; run
  `pnpm format` and let it decide.

There is no test runner configured yet.

## Architecture

- **Monorepo:** `client/` (the app) and `server/` (empty placeholder) as pnpm workspaces.
- **Routing** ([client/src/App.tsx](client/src/App.tsx)): the canonical route tree is
  defined once and mounted twice — at `/` and at `/he` (the Hebrew variant, same English
  text for now). Use [`LocaleLink`](client/src/components/layout/LocaleLink.tsx) and
  [`useLocalePath`](client/src/lib/locale.ts) for internal navigation so the active locale
  prefix is preserved.
- **Design tokens** ([client/src/index.css](client/src/index.css)): a single set of CSS
  variables ("Grape & Citrus") drives the theme via Tailwind v4 `@theme`. Character-name
  colors come from `--char-*` tokens, assigned **by speaking order** per room by
  [`assignCharacterColors`](client/src/lib/characterColor.ts) (or its
  `selfFirstCharacterColors` wrapper, which seeds the viewer's own character first): the
  student's own character is always green, the 2nd speaker golden, 3rd bluish, 4th
  purplish. See [DECISIONS.md](DECISIONS.md) for the rule and rationale. The brand-mark
  gradient (logo tile, ChaverolaPill, join button) is the `--brand-gradient-*` token
  pair; the SVG stops in `Logo.tsx`/`favicon.svg` are pinned mirrors of it.
- **Chatbox** ([client/src/components/Student/Chatbox/](client/src/components/Student/Chatbox/)):
  the shell (`index.tsx`) is **presentational** — driven entirely by props: the room
  as one `chat: ChatRoomState` object plus the action callbacks its parent mediates.
  The engine contract lives in [client/src/types/chat.ts](client/src/types/chat.ts)
  (`ChatRoomState` + `ChatRoomActions`); the mock "engine"
  ([client/src/components/chat/useChatDemo.ts](client/src/components/chat/useChatDemo.ts)
  — under `chat/` because the homepage hero uses it too) explicitly implements it
  (`ChatDemo extends ChatRoomState, ChatRoomActions` plus dev-only triggers), so
  swapping in a real data source later is a type-checked replacement, not a
  re-plumbing. The same chatbox conventions back the Teacher view.
- **Navbar ↔ homepage contract:** `HERO_JOIN_CTA_ID`
  ([client/src/lib/useHeroCtaPassed.ts](client/src/lib/useHeroCtaPassed.ts)) ties two
  files together — `HomePage` puts the id on the hero's Join CTA, and `AppLayout`
  watches that element to swap the mobile navbar mode.
- **Shared chat pieces** ([client/src/components/chat/](client/src/components/chat/)):
  the card chrome (`ChatFrame` / `CHAT_FRAME_CLASS`), the gradient "You're X … with Y"
  header (`ChatHeader`), the message-line renderer (`ConversationLines`), the
  conversation feed (`Conversation`, with `PeerIsTyping` and `PeerReconnectBanner`),
  the message input (`MessageComposer`, with `LazyEmojiPicker` /
  `EmojiPickerPopover`), and the end-chat confirmation modal are shared by the
  student chatbox, the homepage hero chatbox, and the teacher chat cards
  ([client/src/components/Teacher/ChatCard/](client/src/components/Teacher/ChatCard/)).
  Character display labels come from
  [`characterLabel` / `peerListLabel`](client/src/lib/characterLabel.ts).
- **Mock data** lives only in [client/src/mockData/](client/src/mockData/). The demo join
  code `1234` always works.

## Conventions

- **Prettier** config lives at the repo root (`.prettierrc`); run `pnpm format` before
  committing. 2-space indent, double quotes, semicolons, 80-col, `es5` trailing commas.
- **Indexed access is checked** (`noUncheckedIndexedAccess`): `array[i]` /
  `record[key]` may be `undefined` — handle it, or assert with `!` plus a one-line
  comment stating why the access can't miss.
- **Path alias:** import app code via `@/…` (maps to `client/src/`).
- **ShadCN** primitives live in `client/src/components/ui/` (new-york style). Prefer adding
  components there over hand-rolling equivalents. They're owned code and may be
  customized: our `ui/badge.tsx` IS the rounded "eyebrow pill", not the stock ShadCN
  badge styling.
- **Dev-only demo chrome** lives in `client/src/components/demo/`
  (`DemoControlsPanel`, `SegmentButton`, `EventButton`, `DemoToggle`,
  `DemoPageHeader`, and `ChatDemoControls` — the student-seat trigger panel
  shared by the join flow's chatting stage and `/demo/student-chat`, with
  `header`/`extraEvents` slots for each surface's extras) — used by the
  `/demo/*` pages and the join-flow lobby panel, and by the teacher host page
  when it gets wired. The `onWorld` prop switches to the white/glass theme for
  the purple student world.
- **Accepted duplication** (deliberate — don't extract): the sticky-note captions on
  the homepage, the two numbered-step renderers (HomePage vs HowItWorksSection emit
  different markup), the page-section wrapper strings, the page-H1 strings, the
  ping/pulse "live" dots (different animations on different surfaces), and the
  seed-message id-stamping idiom in the two demo engines. Two or three short
  repetitions read cheaper than a component boundary; revisit any of these at a
  fourth occurrence.
- **Routes are canonical** — do not invent new ones beyond those in the project brief (the
  temporary `/demo/*` routes are the exception and are clearly marked).
- **Shared vs. role-specific chat components:** anything more than one surface
  renders identically lives in [client/src/components/chat/](client/src/components/chat/)
  (shared chat types and the `ChatRoomState`/`ChatRoomActions` engine contract in
  [client/src/types/chat.ts](client/src/types/chat.ts), shared helpers like
  `assignCharacterColors` in [client/src/lib/](client/src/lib/)); each role's own
  chrome stays under `components/Student/` or `components/Teacher/` —
  `Student/Chatbox/` is down to the shell (`index.tsx`) and the student-only
  `ChatEndedSection`, since the homepage hero shares the feed and composer. This
  layout is a current convention, not a commitment — if you see a clearly better
  structure, reorganize at any time, then update this bullet (and any stale paths
  elsewhere in this file) to match.
- **Directory casing:** the role-chrome roots `components/Student/` and
  `components/Teacher/` are PascalCase; every other directory is lowercase. New
  directories should be lowercase. Don't case-rename the existing two: case-only
  renames misbehave in git on Windows, and TypeScript's casing checks already catch
  wrong-case imports.
- **Hooks have no dedicated directory:** a hook lives next to the components it
  drives (e.g. `components/chat/useChatDemo.ts`, `pages/demo/useTeacherChatsDemo.ts`);
  generic cross-cutting hooks live in `lib/` (`usePageTitle` — it prepends the
  "Chaverola | " brand prefix itself, callers pass just the page name —
  `useHeroCtaPassed`, and the hooks inside `locale.ts` / `studentSession.ts`).
  All per-tab persistence goes through the sessionStorage helpers in
  `lib/storage.ts` (`readSessionJson`/`writeSessionJson`/`removeSessionItem`)
  — don't hand-roll try/catch JSON storage access.
- **`index.tsx` means folder-as-component** (`Student/Chatbox/`, `Teacher/ChatCard/`):
  one component whose private sub-parts share the folder. The only barrel file is
  `mockData/index.ts` — don't add new barrels.
- **Mobile-first:** design and verify every screen at phone width.

## Working Rules for AI Agents

- **Humanize all copy you write.** Any user-facing text you create or change — UI
  strings, button labels, empty states, mock chat messages, error/success copy — must be
  run through the **humanizer** skill ([blader/humanizer](https://github.com/blader/humanizer))
  before it's considered done, so nothing reads as AI-generated. Install it once with
  `npx skills add blader/humanizer` (or `/plugin marketplace add blader/humanizer` then
  `/plugin install humanizer@humanizer`), then invoke `/humanizer` on the drafted text.
  This does **not** apply to code, comments, or internal docs — only copy a user reads.
- **Record product/UX decisions.** When a choice is made about how the product behaves
  or why a screen works a certain way — especially anything non-obvious or that looks like
  a bug but is intentional — add it to [DECISIONS.md](DECISIONS.md) with its reasoning, so
  future agents don't "fix" it. Record the decision, not just the change.
- **Record learnings in the repo, not in private memory.** Gotchas, verification
  techniques, and working knowledge worth keeping go in this file (or the relevant
  doc) so every future agent and tool sees them — never only in an assistant's own
  memory store. This is a product-owner preference.
- **Verifying a style-neutral refactor:** run `pnpm build` before and after and
  compare the `dist/assets/index-*.css` filename hash — identical hash is byte-level
  proof no styling changed (used across the 2026-07-13 DRY refactor). If the hash
  changes unexpectedly, diff the two bundles rule-by-rule (split on `}`). Gotcha:
  Tailwind v4 scans **code comments and any text in `client/`** for class
  candidates, so a comment containing a bare utility word (e.g. the CSS
  filter/blur one) silently adds that dead rule to the bundle — reword the comment
  instead of accepting the bloat.
