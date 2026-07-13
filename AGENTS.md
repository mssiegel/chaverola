# AGENTS.md

This file is the canonical source of guidance for all AI agents (Claude Code, Cursor, Copilot, etc.) working in this repository. Read this first. Do not create a separate `CLAUDE.md`, `.cursorrules`, or equivalent — keep agent instructions consolidated here.

## Status

Scaffolding is in place: a pnpm-workspaces monorepo with a working `client/` app
(React 19 + TypeScript + Vite + Tailwind v4 + ShadCN) and an empty `server/`. The
first feature — the **student chatbox** — is built as a working, mock-driven demo at
`/demo/student-chat`; it is wired into the real student flow in a later prompt. The
**teacher chat cards** follow the same pattern at `/demo/teacher-chat` and get wired
into `/activity/host/:joinCode` later. The **navbar** (logo, language switcher,
Join CTA) and the **full homepage** at `/` are in place: a hero with a live
sample chatbox reusing the student chat pieces, a teacher's-view section that
mirrors the same live chat through the real `ChatCard`, a
how-it-works-for-teachers section, and the founder's note (headshot at
`client/public/founder-moshe.jpg`, with a marked placeholder fallback if the
file ever goes missing). The **student join flow and waiting lobby** are real:
one page (`client/src/pages/student/JoinActivityPage.tsx`) serves both
`/activity/join` and `/activity/join/:joinCode`, carrying the student through
code entry → name entry → lobby (the chatting/ended stages get wired in a
later prompt); landing back on code entry signs the student out (see
DECISIONS.md). Student identity is a sessionStorage-backed session
(`client/src/lib/studentSession.ts`); `StudentIdentityBar` is reserved for
the future chatting stage (deliberately absent from the lobby — see
DECISIONS.md). The mock activity behind code `1234` lives in
`client/src/mockData/activityDemo.ts`. The join flow renders **navbar-free**
inside `client/src/components/layout/StudentWorldLayout.tsx` — an immersive
purple "world" with drifting hand-drawn doodles
(`client/src/components/decor/`), a floating language pill, and a gradient
`ChaverolaPill` (`client/src/components/brand/`) that links home; the route
tree in `client/src/App.tsx` is split into two pathless layout groups
(AppLayout vs. StudentWorldLayout) per locale. See DECISIONS.md.

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
- **Format:** `pnpm format` / `pnpm format:check` — Prettier over the whole repo

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
  [`assignCharacterColors`](client/src/lib/characterColor.ts): the student's own character
  is always green, the 2nd speaker golden, 3rd bluish, 4th purplish. See
  [DECISIONS.md](DECISIONS.md) for the rule and rationale.
- **Chatbox** ([client/src/components/Student/Chatbox/](client/src/components/Student/Chatbox/)):
  the shell (`index.tsx`) is **presentational** — driven entirely by props. The mock
  "engine" (`useChatDemo.ts`) simulates a live peer on timers and is swapped for a real
  data source later. The same chatbox conventions back the Teacher view.
- **Shared chat pieces** ([client/src/components/chat/](client/src/components/chat/)):
  the message-line renderer (`ConversationLines`) and the end-chat confirmation modal
  are shared by the student chatbox and the teacher chat cards
  ([client/src/components/Teacher/ChatCard/](client/src/components/Teacher/ChatCard/)).
- **Mock data** lives only in [client/src/mockData/](client/src/mockData/). The demo join
  code `1234` always works.

## Conventions

- **Prettier** config lives at the repo root (`.prettierrc`); run `pnpm format` before
  committing. 2-space indent, double quotes, semicolons, 80-col, `es5` trailing commas.
- **Path alias:** import app code via `@/…` (maps to `client/src/`).
- **ShadCN** primitives live in `client/src/components/ui/` (new-york style). Prefer adding
  components there over hand-rolling equivalents.
- **Routes are canonical** — do not invent new ones beyond those in the project brief (the
  temporary `/demo/*` routes are the exception and are clearly marked).
- **Shared vs. role-specific chat components:** anything the student and teacher views
  render identically lives in [client/src/components/chat/](client/src/components/chat/)
  (shared chat types in [client/src/types/chat.ts](client/src/types/chat.ts), shared
  helpers like `assignCharacterColors` in [client/src/lib/](client/src/lib/)); each
  role's own chrome stays under `components/Student/` or `components/Teacher/`. This
  layout is a current convention, not a commitment — if you see a clearly better
  structure, reorganize at any time, then update this bullet (and any stale paths
  elsewhere in this file) to match.
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
