# AGENTS.md

This file is the canonical source of guidance for all AI agents (Claude Code, Cursor, Copilot, etc.) working in this repository. Read this first. Do not create a separate `CLAUDE.md`, `.cursorrules`, or equivalent — keep agent instructions consolidated here.

## Status

Every UI surface is built, mock-driven, and lives in its real flow (demo
URLs exist but only as redirects). `server/` is a real Express 5 API
implementing the create-and-join contract ([docs/api.md](docs/api.md)) —
runnable locally, not yet deployed, and not yet called by the client
(the client wiring lands with feature 1's remaining prompts; see
[docs/plans/feature-1-create-and-join.md](docs/plans/feature-1-create-and-join.md)).
The demo flows are a **permanent product surface** — the homepage links to
them and the founder pitches with them — not scaffolding; see the working
rule below. The map:

| Surface               | Route                                     | Where it lives                                                                                                                                                                                                                                                        |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Homepage              | `/`                                       | `client/src/pages/HomePage.tsx` + `components/home/` — the hero chatbox and the teacher-view `ChatCard` mirror one live `useChatDemo` chat; demo section (`DemoSection.tsx`); founder's note with photo fallback                                                      |
| Student join flow     | `/activity/join[/:joinCode]`              | `client/src/pages/student/JoinActivityPage.tsx` — code → name → lobby → chatting → ended, all on one URL; `components/Student/ChatStage.tsx` owns the chat stages, keyed per match                                                                                    |
| Teacher setup         | `/activity/create`                        | `client/src/components/Teacher/ActivitySetup/` — form UI; the caps, draft persistence, validation, and hand-off live in `client/src/lib/activitySetup.ts`                                                                                                             |
| Teacher live activity | `/activity/host/:joinCode`                | `client/src/components/Teacher/HostActivity/` — engine `useHostActivityDemo.ts` + pure world model `hostWorld.ts`; live-edit draft model in `client/src/lib/hostActivity.ts`. The route param becomes `:hostKey` when the teacher side goes real (feature-1 Prompt 6) |
| Demo entry URLs       | `/demo`, `/demo/teacher`, `/demo/student` | Thin locale-aware redirects in `client/src/App.tsx` — teacher entries land on `/activity/host/1234`, the student entry on `/activity/join/1234` (name prefilled); never pages of their own (see DECISIONS.md → "Routes & app structure")                              |
| Not found             | `*`                                       | `client/src/pages/NotFoundPage.tsx`                                                                                                                                                                                                                                   |

Load-bearing flow facts (the reasoning for each is in DECISIONS.md):

- The demo activity behind join code `1234` seeds everything
  (`client/src/mockData/`); `/activity/host/1234` hosts the Rome demo (no
  teacher email, on purpose), other codes read the sessionStorage stash or
  redirect to `1234`. (The stash and `mockGenerateJoinCode` are mock-era
  plumbing: feature-1 Prompts 5–6 replace them with real API calls, and
  the server becomes the only join-code issuer.)
- The student flow renders navbar-free inside `StudentWorldLayout` (purple
  world, drifting doodles, brand pill that swaps for the student's name badge
  mid-chat); everything else sits under `AppLayout`, whose logo also hides on
  the host route. Student identity is a sessionStorage session
  (`lib/studentSession.ts`); landing back on code entry signs the student
  out, and browser back during a live chat asks first (`lib/useBackGuard.ts`).
- The chat-engine contract (`ChatRoomState`/`ChatRoomActions`) carries the
  2-minute peer-reconnect window and the per-chat auto-end clock (reason
  `"timer"` at zero, rendered by `chat/AutoEndCountdown.tsx` in the student
  header and on teacher chat cards). A 1:1 reconnect timeout ends the chat;
  a group timeout drops the peer with a notice instead.
- The setup form and the host page's live settings panel share their field
  components and validation; live edits propagate on a 1-second pause,
  last-valid-wins, with stable character ids (`lib/hostActivity.ts`).
- Demo surfaces are marked and steerable: a golden `DemoBanner` ("the
  students are pretend") shows whenever the activity is the `1234` demo —
  sticky under the navbar on the host page (where HostHeader's condensed
  waiting bar stands down), a solid card pinned below the corner pills in
  the student world — and the
  "You're driving this demo" panels are permanent, teacher-facing demo
  furniture. Student-demo entries land on `/activity/join/1234` with the
  name prefilled (`DEMO_STUDENT_NAME`, "Rachel"). The demo lobby auto-pairs
  after ~20s if no demo button is pressed (`JoinActivityPage.tsx`).
- Setup-page layout gotcha: the form grid must NOT get `items-start`, or the
  sticky `LobbyPreview` rail loses its track (there's a code comment on it).

## Project Brief

The full project brief (what Chaverola is, scope, tech stack, canonical routes, branding, and chatbox conventions) lives in [Shared_Project_Context.md](Shared_Project_Context.md). Read it before doing any work — it is the shared source of truth for the project's requirements.

## Documentation

The living docs are [README.md](README.md), this file, [DECISIONS.md](DECISIONS.md), [Shared_Project_Context.md](Shared_Project_Context.md), and the technical docs under [docs/](docs/) — [docs/architecture.md](docs/architecture.md) (packages, request flow, deploy topology, the in-memory lifecycle) and [docs/api.md](docs/api.md) (the canonical API contract, kept current per feature). Keep them all in sync with the code before considering a change complete. Feature plans live in [docs/plans/](docs/plans/). (`PROJECT_DOCUMENTATION_STANDARD.md` was retired 2026-07-18 — founder call; see DECISIONS.md.)

## Project Overview

Chaverola is a fun, game-like classroom chat activity. Students join with a
code, get a character, and roleplay with peers without knowing who's who;
teachers create activities and can reveal names. The client is a React app
where every screen is currently driven by mock data + demo events — nothing
is a dead end; the server is an Express API being wired in feature by
feature. Primary stack: **React 19, TypeScript, Vite, Tailwind v4, ShadCN,
Express 5, pnpm workspaces.**

## Commands

Run from the repo root:

- **Dev:** `pnpm dev` — client (Vite) and server (tsx watch, port 3001) in
  parallel; `pnpm dev:client` / `pnpm dev:server` run one side alone
- **Build:** `pnpm build` — type-check + production build (client; the
  server has no build — tsx runs its source, and `typecheck` is its gate)
- **Typecheck:** `pnpm typecheck` — `pnpm -r typecheck` across all three
  packages
- **Lint:** `pnpm lint` — ESLint 9 flat configs in `client/` and
  `server/`, including the React Hooks + React Compiler lints (client)
- **Test:** `pnpm test` — `pnpm -r test`: the client suite
  (`client/vitest.config.ts`, plain node environment over the pure logic
  layer) plus the server suite (`server/src/**/*.test.ts` — the safety
  invariants: projection privacy, the hostKey boundary, the `1234`
  reservation). Both suites are deliberately small; see DECISIONS.md →
  "Testing stays small" entries before adding tests.
- **Preview:** `pnpm preview` — serve the production build
- **Format:** `pnpm format` / `pnpm format:check` — Prettier over the whole repo.
  `prettier-plugin-tailwindcss` sorts Tailwind classes (including inside `cn()`/
  `cva()` calls) into canonical order — never hand-order class strings; run
  `pnpm format` and let it decide.

## Architecture

- **Monorepo:** three pnpm workspaces — `@chaverola/client` (the app),
  `@chaverola/server` (the Express 5 API), and `@chaverola/shared` (the
  wire contract: handwritten types + every shared limit/constant;
  buildless and zero-dependency — its `exports` points at source). The
  client and server both import `@chaverola/shared` and never each other.
  **zod lives in `server/` only**, pinned to the shared contract with
  `satisfies z.ZodType<CreateActivityRequest>` so schema/type drift is a
  compile error; the client keeps its friendly per-field form validation.
  Full picture in [docs/architecture.md](docs/architecture.md).
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
  `EmojiPickerPopover` — also used by the setup form's emoji slots, always
  inside the `ui/popover` primitive), and the end-chat confirmation modal are
  shared by the student chatbox, the homepage hero chatbox, and the teacher
  chat cards
  ([client/src/components/Teacher/ChatCard/](client/src/components/Teacher/ChatCard/)).
  Character display labels come from
  [`characterLabel` / `peerListLabel`](client/src/lib/characterLabel.ts).
  Every confirmation step renders through
  [`ui/confirm-dialog`](client/src/components/ui/confirm-dialog.tsx) —
  `EndChatConfirmationModal` is a thin wrapper over it, and the host page's
  remove/end-all confirmations use it directly (copy in
  `Teacher/HostActivity/confirmCopy.ts`).
- **Demo-engine helpers** live in [client/src/lib/random.ts](client/src/lib/random.ts)
  (`nextId`, `randInt`, `randomFrom`, `shuffled`) — both engines import them;
  don't re-declare per-engine copies. The reserved notice sender id
  (`NOTICE_SENDER_ID`) lives in [client/src/types/chat.ts](client/src/types/chat.ts).
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
- **Demo furniture** lives in `client/src/components/demo/`
  (`DemoControlsPanel` — the dashed "You're driving this demo" panel — with
  `EventButton`, `DemoToggle`, `ChatDemoControls` — the student-seat trigger
  panel used by the join flow's chatting stage, with an `extraEvents` slot —
  and `DemoBanner`, the pretend-students banner). The panels also appear in the
  join-flow lobby and on the teacher host page. It is teacher-facing and
  permanent on the demo flows, NOT dev scaffolding (founder pitches use it);
  when a real backend arrives it leaves real activities only. The `onWorld`
  prop switches to the white/glass theme for the purple student world.
- **Accepted duplication** (deliberate — don't extract): the sticky-note captions on
  the homepage, the two numbered-step renderers (HomePage vs HowItWorksSection emit
  different markup), the page-section wrapper strings, the page-H1 strings, the
  ping/pulse "live" dots (different animations on different surfaces), and the
  seed-message id-stamping idiom in the two demo engines. Two or three short
  repetitions read cheaper than a component boundary; revisit any of these at a
  fourth occurrence.
- **Routes are canonical** — do not invent new ones beyond those in the project brief.
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
  drives (e.g. `components/chat/useChatDemo.ts`,
  `components/Teacher/HostActivity/useHostActivityDemo.ts` — whose pure
  simulation rules live beside it in `hostWorld.ts`);
  generic cross-cutting hooks live in `lib/` (`usePageTitle` — it prepends the
  "Chaverola | " brand prefix itself, callers pass just the page name —
  `useHeroCtaPassed`, `useBackGuard`, `useLatestRef` — the
  ref-mirrors-latest-value idiom for timer callbacks; don't hand-roll it —
  `useSecondCountdown`, and the hooks inside `locale.ts` / `studentSession.ts`).
  All per-tab persistence goes through the sessionStorage helpers in
  `lib/storage.ts` (`readSessionJson`/`writeSessionJson`/`removeSessionItem`,
  plus the `isRecord`/`hasString` guards for the validate callbacks)
  — don't hand-roll try/catch JSON storage access.
- **React Compiler does the memoizing** — never hand-write `memo` /
  `useCallback` / `useMemo` (all removed 2026-07-11 at the product owner's
  request). The wiring is in `client/vite.config.ts`: `@vitejs/plugin-react`
  v6 runs the compiler as a Babel preset via `@rolldown/plugin-babel` (v6
  dropped the old `babel` option). The `react-hooks` `recommended-latest`
  lint enforces the Rules of React so the compiler can optimize; it bails on
  any component that breaks them — it caught refs written during render in
  `useChatDemo` (sync latest-value refs in a `useEffect`, or use
  `useLatestRef`). Confirm optimization is happening by grepping the build
  for `useMemoCache`. Relatedly, `typescript` stays pinned to `5.9.3` (not
  the native-preview 7.x) so the typescript-eslint parser can handle the
  code.
- **Dependency policy:** stay lean. Deliberately not added to the client
  (evaluated 2026-07-15): `zod` (revisited 2026-07-17 — it landed in
  `server/` only; the client's storage validators stay a few lines on
  shared guards), `react-hook-form` (the setup form is built and its UX
  rules are recorded), i18n libraries (no Hebrew text yet — extraction comes
  with the translation pass), `xstate` and debounce utilities (not enough
  repetition to buy a dependency). Also rejected for the server (2026-07-17):
  TanStack Query (three fetch calls) and dotenv (dev needs zero env vars;
  Render injects prod env) — see DECISIONS.md → "Backend & API".
- **`index.tsx` means folder-as-component** (`Student/Chatbox/`, `Teacher/ChatCard/`):
  one component whose private sub-parts share the folder. The only barrel file is
  `mockData/index.ts` — don't add new barrels.
- **Sticky inside a padded scroller:** Chrome insets `position: sticky`
  offsets by the scroll container's own padding, so a `sticky top-0` child
  rests below the container's clip line and scrolled content peeks through
  the gap above it. Keep the scroller's top padding at zero (move it onto
  the first child) so pinned elements sit flush — done for the host page's
  pairing rail (`Teacher/HostActivity/index.tsx`). The chat feed's
  pause/reconnect banner (`chat/Conversation.tsx`, `py-3` scroller) still
  carries the minor 12px version of this gap.
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
- **The demo flows are product — every feature must show up in them.** The demo
  activity (join code `1234`, reached from the homepage demo section and the `/demo`
  redirect URLs) is a permanent sales surface: teachers self-serve it and the founder
  pitches with it. A user-facing feature is not done until it can be experienced in the
  demo flows. Because the demo renders the SAME components as the real flows, UI changes
  carry over for free; what's on you is the simulation — when a feature adds new
  behavior or data, extend the demo engines (`useChatDemo.ts`,
  `useHostActivityDemo.ts` + `hostWorld.ts`) and the `client/src/mockData/` fixtures so
  the demo actually demonstrates it. The `ChatRoomState`/`ChatRoomActions` contract
  type-checks the shape, but showing the feature in the demo story is a judgment call —
  make it. Never fork demo-specific pages or components; demo URLs stay thin redirects.
  Once `server/` is real, keep the split recorded in DECISIONS.md → "Demo flows & demo
  furniture": real activities strictly real, `1234` the only simulated one.
- **Record learnings in the repo, not in private memory.** Gotchas, verification
  techniques, and working knowledge worth keeping go in this file (or the relevant
  doc) so every future agent and tool sees them — never only in an assistant's own
  memory store. This is a product-owner preference.
- **Verify at the cheapest gate that catches the mistake.** Run
  `pnpm typecheck` on every change (incremental, seconds). Add `pnpm test`
  when logic in `client/src/lib/` or `hostWorld.ts` changed, or when
  anything in `server/src/` changed (`pnpm -r test` covers the server
  suite). For server behavior beyond the tests' safety invariants, curl
  against `pnpm dev:server` is the next rung. Drive the
  browser (the `verify` skill) only when the change shows up in rendered
  UI — and then only the surfaces the change touches, at desktop and phone
  widths, with fast timers on (`?fast=10` on a dev build; see the skill).
  A full every-surface sweep is for cross-cutting changes (layout shells,
  design tokens, shared chat pieces), not for localized ones.
- **Verifying a style-neutral refactor:** run `pnpm build` before and after and
  compare the `dist/assets/index-*.css` filename hash — identical hash is byte-level
  proof no styling changed (used across the 2026-07-13 DRY refactor). If the hash
  changes unexpectedly, diff the two bundles rule-by-rule (split on `}`). Gotcha:
  Tailwind v4 scans **code comments and any text in `client/`** for class
  candidates, so a comment containing a bare utility word (e.g. the CSS
  filter/blur one) silently adds that dead rule to the bundle — reword the comment
  instead of accepting the bloat.

## Reading production logs

- **Vercel (client):** the Vercel CLI is installed and linked to the
  `chaverola` project — `vercel logs <deployment-url>` tails a deployment,
  `vercel ls` lists recent deployments (also the way to grab a real
  preview hostname, e.g. for the server's CORS regex).
- **Render (server):** not deployed yet. Agent log access (Render CLI or
  MCP, with the API key in gitignored `.env.local`) is set up in feature-1
  Prompt 4 — document the exact command here when it lands.
