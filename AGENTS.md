# AGENTS.md

This file is the canonical source of guidance for all AI agents (Claude Code, Cursor, Copilot, etc.) working in this repository. Read this first. Do not create a separate `CLAUDE.md`, `.cursorrules`, or equivalent — keep agent instructions consolidated here.

## Status

`server/` is a real Express 5 API live at `https://api.chaverola.com` (Render, paid instance), and **both sides of the client call it** — students resolve real codes through `GET /activities/:joinCode`, teachers create with `POST /activities` and host at `/activity/host/:hostKey`. The demo code `1234` stays fully client-simulated, zero network.

Completing a feature that gives a teacher something new flips a cell here. A feature that **fixes** one already in the table gets no row of its own — features 12–16 and 19–20 are all fixes, and rows for them would say "Complete" about work the row above already claims (founder call, 2026-07-26). Their plans in `docs/plans/` are the record.

| Feature                | State                                                                                                                                                                                                                                                                                         | Plan                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1 · Create & join      | **Complete**, verified on prod 2026-07-19 — real codes resolve, teachers create and host.                                                                                                                                                                                                     | [feature-1](docs/plans/feature-1-create-and-join.md)                 |
| 2 · Live lobby         | **Complete**, verified on prod 2026-07-19 — live resumable seats over Socket.IO, teacher queue with real Remove.                                                                                                                                                                              | [feature-2](docs/plans/feature-2-live-lobby.md)                      |
| 3 · Real matching      | **Complete**, verified on prod 2026-07-20 — manual pairing, Pair everyone 1:1, server auto-match, settings sync, matched student enters a real chat room.                                                                                                                                     | [feature-3](docs/plans/feature-3-real-matching.md)                   |
| 4 · Messaging          | **Complete** — students send (`chat:send`→`chat:line`, capped 200-line transcript, resume backlog); the teacher reads every chat live under real names.                                                                                                                                       | [feature-4](docs/plans/feature-4-messaging.md)                       |
| 5 · Typing indicator   | **Complete** — `chat:typing`→`chat:peer-typing`, ephemeral, characterId-only, never to the teacher.                                                                                                                                                                                           | [feature-5](docs/plans/feature-5-typing-indicator.md)                |
| 6 · Ending chats       | **Complete** — `chat:end` / `chats:end-all`; every member goes wrappingUp, the card moves to Completed.                                                                                                                                                                                       | [feature-6](docs/plans/feature-6-ending-chats.md)                    |
| 7 · Pausing            | **Complete** — `chats:pause-all` / resume flips the world pause: sends and typing refuse, auto-match holds, clocks freeze, grace runs through.                                                                                                                                                | [feature-7](docs/plans/feature-7-pausing.md)                         |
| 8 · Peer-drop UI       | **Complete** — `chat:peer-connection` on the teacher's 4s gate, countdown ticks through a pause, "is back! 🎉"; expiry honest, a blip can't hide a drop.                                                                                                                                      | [feature-8](docs/plans/feature-8-peer-drop.md)                       |
| 9 · Reaped-seat return | **Complete** — a seat reaped out of a chat is remembered for the activity's life, replayed as `chat:started` + `chat:ended {self-timeout}` ("📶 You lost connection").                                                                                                                        | [feature-8](docs/plans/feature-8-peer-drop.md)                       |
| 10 · Name reveal       | **Complete** — when `revealNames` is on, `chat:ended` carries each peer's real name and the ended screen names who the student was really with (the one sanctioned exception to the characterId-only wire).                                                                                   | [feature-10](docs/plans/feature-10-name-reveal.md)                   |
| 11 · Transcript email  | **Complete** — **End activity** ends every chat, emails the teacher an HTML transcript of the whole class, and kills the join code; a ~10-minute fallback after the last teacher socket drops covers a closed laptop, and a send-once guard means one activity gets at most one email.        | [feature-11](docs/plans/feature-11-transcript-email.md)              |
| 17 · Details sync      | **Complete**, verified on prod 2026-07-26 — `activity:update-details` stores the host name + instructions and fans `activity:details-changed` to every seat; lobbies swap silently, late joiners read stored truth, a second host device is last-write-wins.                                  | [feature-17](docs/plans/feature-17-host-name-and-scene-sync-live.md) |
| 18 · Roster sync       | **Complete**, verified on prod 2026-07-26 — the cast rides `activity:update-details` too: lobby chips and every future deal follow the edit, a chat already running keeps the cast it froze at start, removal is never blocked, and a start the cast can't seat is refused whole.             | [feature-18](docs/plans/feature-18-character-roster-syncs-live.md)   |
| 23 · Hebrew            | **Complete**, verified on prod 2026-07-27 — `/he` is a Hebrew product, not an English one translated: every string, right-to-left layout, a Hebrew transcript email, an activity that remembers its language and hands it to joining students, and a demo cast an Israeli teacher recognizes. | [hebrew](docs/plans/hebrew/README.md)                                |

**Nothing on a real activity is simulated, and this is the one home for that claim** — don't restate it in `docs/architecture.md` or anywhere else. Every field on the live settings panel reaches the server and survives a refresh: settings, the teacher's email, the host name, the student instructions, and the character roster. The one place an edit deliberately stops is the door of a chat already running — that chat froze its cast when it started and keeps it. That is a recorded call, not a gap: DECISIONS.md → "A chat freezes its cast the moment it starts". `1234` is the only simulated activity.

## Project Brief

The full project brief (what Chaverola is, scope, tech stack, canonical routes, branding, and chatbox conventions) lives in [Shared_Project_Context.md](Shared_Project_Context.md). Read it before doing any work — it is the shared source of truth for the project's requirements.

## Docs map & what updates when

Every fact has ONE home. A typical slice touches at most one prose doc besides its plan doc — find the home, change it there, don't restate it elsewhere.

- [README.md](README.md) — the public front door (what/why, getting started, deploy summary).
- [Shared_Project_Context.md](Shared_Project_Context.md) — the project brief: scope, stack, canonical routes, branding.
- **This file (AGENTS.md)** — how to work here: status, invariants, the task router, conventions, working rules.
- [DECISIONS.md](DECISIONS.md) — the index of product/UX/business decisions; bodies live per area under [docs/decisions/](docs/decisions/).
- [docs/architecture.md](docs/architecture.md) — packages, request flow, deploy topology, the in-memory lifecycle, and client component geography.
- [docs/api.md](docs/api.md) — the canonical wire contract (REST + socket), kept current per feature.
- [docs/operations.md](docs/operations.md) — the deploy-check, production-logs, env-var, and refactor-verification runbook.
- [docs/plans/](docs/plans/) — one plan doc per feature, frozen at completion. [docs/pending-manual-tests.md](docs/pending-manual-tests.md) holds asked-for tests that were blocked.

Update only when:

| You changed…                                                                             | Touch                                                                     |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| a product/UX decision                                                                    | the area file in `docs/decisions/` **and** its one line in `DECISIONS.md` |
| the wire contract                                                                        | `docs/api.md`                                                             |
| topology, a lifecycle, or component geography                                            | `docs/architecture.md`                                                    |
| an invariant, convention, command, router row, or rule; a feature completed (= one cell) | `AGENTS.md`                                                               |
| an operational procedure                                                                 | `docs/operations.md`                                                      |
| a feature in flight                                                                      | its `docs/plans/feature-N.md` (freeze at completion)                      |
| the public framing (rare)                                                                | `README.md`                                                               |

## Project Overview

Chaverola is a fun, game-like classroom chat activity. Students join with a code, get a character, and roleplay with peers without knowing who's who; teachers create activities and can reveal names. The client is a React app; the server is a real Express API that both sides call — students resolve real join codes, teachers create and host real activities, and the live lobby, matching, and chat all run over Socket.IO. The demo code `1234` stays fully client-simulated. Primary stack: **React 19, TypeScript, Vite, Tailwind v4, ShadCN, Express 5, pnpm workspaces.**

## Commands

Run from the repo root:

- **Dev:** `pnpm dev` — client (Vite) and server (tsx watch, port 3001) in parallel; `pnpm dev:client` / `pnpm dev:server` run one side alone.
- **Build:** `pnpm build` — type-check + production build, then `client/scripts/prerender-head.mjs` stamps each public URL's own `<head>` into its own file under `dist/` and writes the unstamped `dist/app.html` the catch-all rewrite serves (client only; the server has no build — tsx runs its source, and `typecheck` is its gate). That last step **fails the build** rather than warning, so `pnpm build` is the gate for anything touching `client/index.html`'s head.
- **Typecheck:** `pnpm typecheck` — `pnpm -r typecheck` across all three packages.
- **Lint:** `pnpm lint` — ESLint 9 flat configs in `client/` and `server/`, including the React Hooks + React Compiler lints (client).
- **Test:** `pnpm test` — `pnpm -r test`: the client suite (pure logic, no DOM) plus the server suite (the safety invariants — projection privacy incl. the characterIds-only pin, the hostKey boundary in REST and socket editions, the `1234` reservation, the seat-resume race guard, the matched-seat grace timer, and the pure matching rules). Both suites are deliberately small — see DECISIONS.md → "Server tests cover only the safety invariants" / "Testing stays small" before adding tests.
- **Verify (browser):** `pnpm verify:up` launches the stack (client on 5199, server scaled), `pnpm verify:smoke` drives a full activity end to end — see the `verify` skill.
- **Preview:** `pnpm preview` — serve the production build.
- **Format:** `pnpm format` / `pnpm format:check` — Prettier over the whole repo. `prettier-plugin-tailwindcss` sorts Tailwind classes (including inside `cn()`/`cva()`) into canonical order — never hand-order class strings; run `pnpm format` and let it decide.

## Architecture

- **Monorepo:** three pnpm workspaces — `@chaverola/client` (the app), `@chaverola/server` (the Express 5 API), and `@chaverola/shared` (the wire contract: handwritten types + every shared limit/constant; buildless and zero-dependency — its `exports` points at source). Client and server both import `@chaverola/shared` and never each other. **zod lives in `server/` only**, pinned to the shared contract with `satisfies z.ZodType<CreateActivityRequest>` so schema/type drift is a compile error; the client keeps its friendly per-field form validation.
- **Routing** ([client/src/App.tsx](client/src/App.tsx)): the canonical route tree is defined once and mounted twice — at `/` and at `/he` (the Hebrew variant: Hebrew copy, RTL, Rubik). Use [`LocaleLink`](client/src/components/layout/LocaleLink.tsx) and [`useLocalePath`](client/src/lib/locale.ts) for internal navigation so the active locale prefix is preserved. English is the unprefixed locale and stays that way; `LOCALES` lives in [`shared/src/types.ts`](shared/src/types.ts) (an activity stores the language it was created in, so the list is wire contract) and is re-exported from [`lib/locale.ts`](client/src/lib/locale.ts) beside the URL helpers.
- **i18n** ([client/src/i18n/](client/src/i18n/)): `react-i18next`, five flat namespaces (`common`, `home`, `teacher`, `student`, `chat`). `common` loads at init; the rest register from `i18n/ns/*.ts`, which their lazy page module imports, so the strings ride that page's chunk and cost no extra request. **Completeness is a compile check, not a test** — English catalogs are `as const satisfies Catalog`, Hebrew ones are annotated `HebrewOf<EnCatalog>` (which also demands a `_two` for every plural base, because Hebrew's CLDR categories are one/two/other). A key used from a module that can't reach its registering chunk typechecks but misses at runtime; the DEV `missingKeyHandler` catches it on first render. Locale flows one way only — route → i18next → `<html lang/dir>`, via [`LocaleEffects`](client/src/components/layout/LocaleEffects.tsx); i18next has no detector of its own on purpose.
- **Design tokens** ([client/src/index.css](client/src/index.css)): one set of CSS variables ("Grape & Citrus") drives the theme via Tailwind v4 `@theme`. Character-name colors come from `--char-*` tokens, assigned **by speaking order** per room by [`assignCharacterColors`](client/src/lib/characterColor.ts) (or its `selfFirstCharacterColors` wrapper): the viewer's own character is green, the 2nd speaker golden, 3rd bluish, 4th purplish. The brand-mark gradient (logo tile, ChaverolaPill, join button) is the `--brand-gradient-*` token pair; the SVG stops in `Logo.tsx`/`favicon.svg` are pinned mirrors of it.
- **The rest — packages, the server request flow, the realtime layer, the in-memory lifecycle, and client component geography** (the chatbox engine contract, shared chat pieces, demo-engine helpers, the hook inventory, the navbar↔homepage contract, mock data, sticky-grid gotchas) — is in [docs/architecture.md](docs/architecture.md).

## Invariants

Load-bearing — trip over them before you break one:

- **The live engine imports nothing from `hostWorld.ts` beyond types.** `tickWorld` runs the SIMULATION's auto-match and must never see a real student. Where the live engine needs the same derivation, it keeps a deliberate local copy.
- **Every seat gets the same 120s grace, matched or waiting — and a matched seat that runs it out leaves its CHAT, not just its seat.** A student who drops mid-chat can resume into that chat for two minutes; past that, their membership goes inactive and the partner is freed. Matched seats used to arm no timer at all, which stranded a partner forever when a `lobby:leave` died in transit (found on a real handset 2026-07-20). Don't "restore" the missing timer. The reap is remembered (feature 9): the returning token gets the ended chat replayed as `"self-timeout"` and a wrappingUp seat — only a WAITING seat's reap stays a silent fresh join.
- **Auto-match runs only while a teacher socket is connected** — armed on the 0→1st, released on the last. A closed laptop holding pairing is the product, not a bug (founder call).
- **The student wire carries characterIds only** — never a peer's name, never a peer's studentId, in any payload, ever. Pinned by exact-key allowlist tests in `projections.test.ts`; keep them passing rather than loosening them.
- **`pausedAt` is both the pause flag and the freeze anchor.** While set, snapshots clock `waitSeconds` against it (but reconnecting state keeps real time — the grace clock runs through a pause), and `resumeChats` shifts the stored timestamps forward by the pause duration so nothing jumps. Don't split it into a boolean plus a timestamp, and don't "fix" the grace window to freeze.
- **Live socket timers never pass through `scaledMs`**; demo simulation always does.
- **`LiveChatStage` is a component split beside the demo's `ChatStage.tsx`, never a conditional hook.**
- **The create-activity submit has no client-side timeout** — create isn't idempotent, and a retry could mint a second activity. The idempotent GETs are the opposite: `getActivity` and `getHostedActivity` each carry an 8s `AbortSignal.timeout`, and an unreachable student lookup retries itself on a capped backoff. Keep the timeout on the helpers one by one, never on `request`.

## Task router

"I'm touching X" → the entry-point files, the invariants in play, the decisions file(s) for the _why_, and how to verify. Paths are where to start, not the whole list.

**Student join / lobby**

- Files: [client/src/pages/student/JoinActivityPage.tsx](client/src/pages/student/JoinActivityPage.tsx) (the shell: stage machine + render dispatch, code → name → lobby → chatting → ended, one URL) over `pages/student/join/` (stage cards on the shared `StageCard` shell, `useActiveMatch`/`useDemoLobby`, and the pure `liveMatchState.ts` socket reducers), `pages/student/useLobbyPresence.ts` (the live seat), `components/Student/`, `lib/studentSession.ts`, `lib/useActivityLookup.ts`, `lib/useBackGuard.ts`.
- Invariants: characterIds-only wire · 120s grace · `LiveChatStage` is a split, not a hook · `scaledMs` is demo-only.
- Decisions: [student-join.md](docs/decisions/student-join.md), [chat-behavior.md](docs/decisions/chat-behavior.md).
- Verify: `verify:up --scale 10` + a two-tab live flow (or `?fast=10` for the demo), desktop and phone widths.

**Host dashboard (live activity)**

- Files: [client/src/components/Teacher/HostActivity/](client/src/components/Teacher/HostActivity/) — the dashboard takes an injected `HostEngine` (`hostEngine.ts`): `useHostActivityLive.ts` (real keys) and `useHostActivityDemo.ts` + `hostWorld.ts` (`1234`) are its two implementations; `lib/hostActivity.ts`, `lib/useHostedActivityLookup.ts`. Every amber "here's why that didn't do what you expected" box on the page is one `NoticeBanner`.
- Invariants: live engine imports only types from `hostWorld.ts` · teacher-gated auto-match · the host page is never projected (it's the teacher's private control room).
- Decisions: [teacher-live.md](docs/decisions/teacher-live.md), [monitoring.md](docs/decisions/monitoring.md).
- Verify: `verify:smoke` (host + two students), or the demo host at `/activity/host/1234`.

**Wire protocol change**

- Files: `shared/src/socket.ts` / `shared/src/api.ts` (the contract) → `server/src/store/projections.ts` (a field-by-field literal, never a spread) → the owning handler module in `server/src/live/handlers/` (`teacher.ts`, or `studentSession.ts` / `studentChat.ts`) → client registration in `useLobbyPresence.ts` (student) or `useHostActivityLive.ts` (teacher) → a student reducer in `pages/student/join/liveMatchState.ts` wired in `join/useActiveMatch.ts`.
- HOWTO: the seven touch points worked end to end (with `chat:peer-connection` as the example) — [docs/adding-a-wire-event.md](docs/adding-a-wire-event.md).
- Invariants: characterIds-only wire — add the allowlist pin in `projections.test.ts` (mandatory).
- **Deploy race:** `shared/` is in both deploy triggers, so one push races two pipelines and Socket.IO drops an unhandled event **silently**. Poll `/healthz` for the new server commit before testing; split a client-ahead-of-server window into separate pushes (see Working Rules).
- Decisions: [backend-api.md](docs/decisions/backend-api.md).
- Verify: `pnpm --filter @chaverola/server test` (the suite drives real sockets) + `verify:smoke`.

**Server lobby / matching / chat logic**

- Files: `server/src/live/lobby.ts` (composition root — wires the pieces), `lobbyContext.ts` (shared io/broadcast/timer helpers, plus the `seatSocket` / `connectedSeatSockets` / `connectedMemberSockets` fan-out every server→student emit goes through — never hand-roll `io.sockets.sockets.get(...)` again), `auth.ts` (connection middleware + seating), `autoMatch.ts` (the auto-match timer), `handlers/teacher.ts` + `handlers/studentSession.ts` + `handlers/studentChat.ts` (the socket handlers), `seats.ts` (pure, io-free seat lifecycle), `matching.ts` (pure chat rules), `server/src/store/`.
- Invariants: characterIds-only projection · 120s grace incl. matched seats · teacher-gated auto-match · `pausedAt` dual role.
- Decisions: [backend-api.md](docs/decisions/backend-api.md), [teacher-live.md](docs/decisions/teacher-live.md), [chat-behavior.md](docs/decisions/chat-behavior.md).
- Verify: `pnpm --filter @chaverola/server test`; scratch `socket.io-client` drivers in `tools/verify/scratch/` (importing `../lib.mjs`) for behavior beyond the suite.

**Teacher setup form**

- Files: [client/src/components/Teacher/ActivitySetup/](client/src/components/Teacher/ActivitySetup/) (form UI), `lib/activitySetup.ts` (caps, draft persistence, validation, the `POST /activities` mapping).
- Invariants: shares its field components and validation with the host page's live-settings panel (last-valid-wins on a 1s pause, stable character ids); the form grid must not get `items-start` (sticky-rail gotcha).
- Decisions: [teacher-setup.md](docs/decisions/teacher-setup.md).
- Verify: `pnpm test` (validators) + a browser pass at both widths.

**Shared chat pieces**

- Files: [client/src/components/chat/](client/src/components/chat/), `client/src/types/chat.ts` (the `ChatRoomState`/`ChatRoomActions` contract), `lib/characterColor.ts`. Geography: [architecture.md → Client component geography](docs/architecture.md#client-component-geography). The three over-the-conversation pills (paused, your own drop, a peer's) are one `ChatBanner`; they share a slot, so they share a shape.
- Invariants: the chatbox shell is presentational (props-only) and shared by the student chatbox, the homepage hero, and the teacher cards — one change ripples to all three.
- Decisions: [chat-behavior.md](docs/decisions/chat-behavior.md), [monitoring.md](docs/decisions/monitoring.md).
- Verify: a full cross-surface sweep (it's a shared piece), desktop and phone.

**Demo engines & mock data**

- Files: `client/src/components/chat/useChatDemo.ts`, `Teacher/HostActivity/useHostActivityDemo.ts` + `hostWorld.ts`, [client/src/mockData/](client/src/mockData/), `client/src/components/demo/`.
- Invariants: the demo is structurally zero-network · `1234` is the only simulated activity · a user-facing feature isn't done until the demo shows it (Working Rules).
- Decisions: [demo-flows.md](docs/decisions/demo-flows.md).
- Verify: a `?fast=10` demo run at `/activity/join/1234` and `/activity/host/1234`.

**Homepage / navbar / branding**

- Files: [client/src/pages/HomePage.tsx](client/src/pages/HomePage.tsx) + `components/home/`, `components/layout/` (`AppLayout`, navbar), `Logo.tsx`, `lib/useHeroCtaPassed.ts`.
- Invariants: the navbar↔homepage contract (`HERO_JOIN_CTA_ID`) · the brand-gradient token mirrors in `Logo.tsx`/`favicon.svg`.
- Decisions: [homepage.md](docs/decisions/homepage.md), [navbar.md](docs/decisions/navbar.md), [branding.md](docs/decisions/branding.md).
- Plan: [docs/plans/seo/](docs/plans/seo/README.md) — Open Graph, canonical, hreflang, robots/sitemap, prerendering. One prompt each; `curl`, not a browser, is the gate for most of them.
- Verify: a browser pass, desktop and phone (the mobile navbar mode swap on hero-CTA scroll).

**Styling & tokens**

- Files: `client/src/index.css` (the `@theme` token set), `client/src/components/ui/` (ShadCN primitives), `lib/characterColor.ts`.
- Invariants: never hand-order Tailwind classes (`pnpm format` decides) · tokens are single-sourced · logical properties over physical, with four commented exceptions (safe-area paddings, dialog centering, decorative scatter, the switch thumbs' physical anchor).
- Verify: the CSS-hash technique for style-neutral refactors ([docs/operations.md](docs/operations.md)); a full sweep for token changes. **The CSS-hash technique does not apply to RTL work** — the hash changes by design.

**Copy & languages**

- Files: [client/src/i18n/](client/src/i18n/) (`locales/{en,he}/<ns>.ts` catalogs, `ns/<ns>.ts` registrars, `i18next.d.ts`), `lib/locale.ts` (URL helpers; re-exports the locale list from `shared/`), `lib/localePreference.ts` + `lib/localeBoot.ts` (detection) + `lib/activityLocalePin.ts` (a locked activity's per-tab pin, read as boot's top rung), `components/layout/LocaleEffects.tsx`, `pages/student/JoinActivityPage.tsx` (the activity rung: a resolved join code swaps the URL's locale, before a seat exists and never after — and when `Activity.lockLocale` is on it also beats an explicit student choice and hides the switcher).
- Invariants: **teacher-authored free text is never translated, in any locale** (character names, host name, student instructions, student names, every message) · a namespace may only be read from modules that reach the chunk registering it · route → i18next → `<html lang/dir>`, one way · **the locale rung never fires once a seat exists, and the lock does not change that** — a cross-locale navigate remounts the tree and `useLobbyPresence`'s cleanup emits `lobby:leave`, which mid-chat ends the partner's chat; the seated case is answered by `activityLocalePin` before React mounts, never by relaxing the guard.
- Decisions: [routes.md](docs/decisions/routes.md) (precedence, the switcher, the language lock), [branding.md](docs/decisions/branding.md) (חברולה, Rubik, masculine second person), [backend-api.md](docs/decisions/backend-api.md) (why react-i18next in the client and nothing on the server).
- Plan: [docs/plans/hebrew/](docs/plans/hebrew/README.md) — the remaining prompts, one session each.
- Verify: run the humanizer skill on new copy, then a browser pass over `/` **and** `/he` at desktop and phone widths, checking for horizontal overflow.

**Deploy / infra**

- Files: `server/src/config.ts`, `server/src/app.ts`, `client/vercel.json` (rewrites only — the Vercel skip config is dashboard-only and ungreppable from the repo).
- Runbook: [docs/operations.md](docs/operations.md) — deploy checks, production logs, env vars.
- Decisions: [backend-api.md](docs/decisions/backend-api.md), [process.md](docs/decisions/process.md).
- Plan (deferred): [capacity-alerts](docs/plans/capacity-alerts.md) — an email when the instance nears 80% of memory, CPU, or its fd ceiling. Shelved 2026-07-27 (pre-launch, ~8× headroom); the doc holds the research, the triggers for picking it up, and the open `ulimit` question.
- Verify: `/healthz` for the server commit + Vercel Ready for the expected SHA, on every push.

## Conventions

- **Prettier** (`.prettierrc` at the root): 2-space indent, double quotes, semicolons, 80-col, `es5` trailing commas. Run `pnpm format` before committing.
- **Indexed access is checked** (`noUncheckedIndexedAccess`): `array[i]` / `record[key]` may be `undefined` — handle it, or assert with `!` plus a one-line comment stating why it can't miss.
- **Path alias:** import app code via `@/…` (maps to `client/src/`).
- **ShadCN** primitives live in `client/src/components/ui/` (new-york style). Prefer adding components there over hand-rolling equivalents. They're owned code and may be customized: our `ui/badge.tsx` IS the rounded "eyebrow pill", not the stock badge, `ui/button.tsx` carries a `brand` variant (the gradient the student flow's forward CTAs wear), and a few app primitives with no ShadCN original live there too (`live-dot`, `section-label`, `status-pill`).
- **Repeated chrome becomes a component, not a copied class string.** The shared shells and where they live are listed in [architecture.md → Client component geography](docs/architecture.md#client-component-geography) — reach for one before writing the same `rounded-full border border-amber-200 …` a second time. Prove the extraction changed no styling with the CSS-hash technique ([operations.md](docs/operations.md)); an identical `dist/assets/index-*.css` hash is the gate.
- **Demo furniture** lives in `client/src/components/demo/` (`DemoControlsPanel` with `EventButton`/`DemoToggle`/`ChatDemoControls`, and `DemoBanner`). It is teacher-facing and permanent on the demo flows, NOT dev scaffolding (founder pitches use it); when a real backend arrives it leaves real activities only. The `onWorld` prop switches to the white/glass theme for the purple student world.
- **Hooks have no dedicated directory:** a hook lives next to the components it drives; generic cross-cutting hooks live in `lib/`. The full inventory is in [architecture.md → Client component geography](docs/architecture.md#client-component-geography).
- **All API calls go through `lib/api.ts`** — failures are `ApiResult` values, not exceptions; `VITE_API_URL` bakes the base URL at build time (dev falls back to `localhost:3001`; a prod build without it fails at startup).
- **All per-tab persistence goes through `lib/storage.ts`** (`readSessionJson`/`writeSessionJson`/`removeSessionItem`, plus the `isRecord`/`hasString` guards) — don't hand-roll try/catch JSON storage access.
- **React Compiler does the memoizing** — never hand-write `memo` / `useCallback` / `useMemo` (all removed 2026-07-11 at the product owner's request). The wiring is in `client/vite.config.ts`: `@vitejs/plugin-react` v6 runs the compiler as a Babel preset via `@rolldown/plugin-babel`. The `react-hooks` `recommended-latest` lint enforces the Rules of React so the compiler can optimize; it bails on any component that breaks them (it caught refs written during render in `useChatDemo`). Confirm optimization by grepping the build for `useMemoCache`. `typescript` stays pinned to `5.9.3` (not native-preview 7.x) so the typescript-eslint parser can handle the code.
- **Dependency policy — stay lean.** Deliberately not added to the client: `zod` (it landed in `server/` only), `react-hook-form`, `xstate`, debounce utilities. Rejected for the server: TanStack Query and dotenv. See DECISIONS.md → "Backend & API" before adding one. The i18n exception is recorded there too: `i18next` + `react-i18next` are IN the client (Hebrew plurals and `<Trans>` are the reasons), while **the server takes no i18n dependency** — the transcript email is the only prose it ships, and a typed `Record<Locale, EmailCopy>` makes a missing string a compile error where i18next would make it a silent runtime fallback.
- **Right-to-left.** Prefer logical properties (`ps`/`pe`, `ms`/`me`, `start`/`end`, `text-start`) over physical ones; flex _alignment_ is already logical, so leave it alone. Four deliberate exceptions, each commented where it lives: `StudentWorldLayout`'s safe-area paddings (the `env()` values are physical), `ui/dialog`'s centering (direction-invariant), the decorative blur/doodle scatter (composition, not reading order), and the two switch thumbs' `absolute top-0.5 left-0.5`. Transforms are physical and have no logical form — mirror the whole control with `rtl:-scale-x-100` when it holds no text (the two switches), or write an explicit `rtl:` twin when it does. **A mirrored control must lay its own insides out physically and out of flow** — `absolute` with `top`/`left` inside a `relative` root, never a flex child and never `start`/`end`. The mirror is one flip, so anything inside it that also follows direction flips twice: `ui/switch`'s thumb was a flex child, which put it at the track's far end under `/he` before the physical translate pushed it further out and the mirror threw it off the opposite edge — shipped 2026-07-27, caught 2026-08-13. Flex alignment is logical; flex _normal-flow placement_ is direction-sensitive, and that is the distinction the old wording missed. Directional icons get the `flip-rtl` class **per icon**, never as a sweep: vertical chevrons, media transport controls, cycle glyphs, and the logo mark all stay put.
- **Shared vs. role-specific chat components:** anything more than one surface renders identically lives in `client/src/components/chat/` (shared types + the engine contract in `client/src/types/chat.ts`, shared helpers in `client/src/lib/`); each role's own chrome stays under `components/Student/` or `components/Teacher/`. A current convention, not a commitment — reorganize if you see better structure, then update this bullet and any stale paths.
- **`index.tsx` means folder-as-component** (`Student/Chatbox/`, `Teacher/ChatCard/`): one component whose private sub-parts share the folder. The only barrel file is `mockData/index.ts` — don't add new barrels.
- **Directory casing:** the role-chrome roots `components/Student/` and `components/Teacher/` are PascalCase; every other directory is lowercase. New directories are lowercase. Don't case-rename the existing two (case-only renames misbehave in git on Windows).
- **Routes are canonical** — don't invent new ones beyond the project brief.
- **Accepted duplication** (deliberate — don't extract): the page-section wrapper strings, the page-H1 strings, the ping/pulse "live" dots, and the seed-message id-stamping idiom in the two demo engines. Revisit any at a fourth occurrence.
- **Mobile-first:** design and verify every screen at phone width.

## Working Rules for AI Agents

- **Cut features into end-to-end slices, not layers.** Each prompt in a plan doc is one working thing delivered all the way through — wire, server, client, docs, tests, and its own verification against the local stack — demonstrable on its own when it lands. Docs are updated **inside** the prompt that changes the behavior, never deferred to an end sweep. **Production is driven once per feature**, in the final cross-cutting prompt: a first-contact check against the fresh deployment, the feature's network-sensitive legs, and a deployed-build smoke. Founder calls — see DECISIONS.md → "Features ship as end-to-end slices, not layers" and "Slices verify on localhost; production driving happens once per feature".
  - **The deploy race is the cost, and it has a rule.** A vertical slice touches `shared/` in one commit, and `shared/` is in BOTH deploy triggers (Vercel's Ignored Build Step and Render's build filter), so one push starts two pipelines that race. Client-lands-first means a UI talking to a server that has no handler yet — and Socket.IO drops an unhandled event **silently**, so there is no error anywhere. After pushing a slice, **poll `/healthz` for the new server commit before treating the feature as live or testing it**. Where a client-ahead-of-server window would actually hurt a real user, split the slice into a server commit and a client commit and **push them separately, waiting for `/healthz` between** — pushing both at once buys nothing, since one push is one deployment per side however many commits it carries.
  - **The tip commit of any push must touch `client/`, `shared/`, or a root manifest, or the client will not rebuild.** Vercel's skip check diffs only the TIP commit (`git diff --quiet HEAD^ HEAD -- . ../shared …`), not the range since the last deployment, and a push of N commits produces exactly one deployment. So a code commit followed by a docs-only commit, pushed together, deploys the server and **silently skips the client** — not a race but a permanent split: new server, old client, indefinitely, green on both dashboards. Push the code commit on its own; a docs-only follow-up goes in its own push. `/healthz` does NOT catch this — confirm Vercel's latest production deployment is Ready, not Canceled, for the SHA you expect. This config lives only in the Vercel dashboard (`client/vercel.json` has nothing but rewrites), so it is ungreppable from the repo.
- **Verify at the cheapest gate that catches the mistake.** Run `pnpm typecheck` on every change (incremental, seconds). Add `pnpm test` when logic in `client/src/lib/`, `hostWorld.ts`, or `server/src/live/` changed, or when anything else in `server/src/` changed. For socket behavior beyond the suite's safety invariants — which curl can't reach — scratch `socket.io-client` scripts in `tools/verify/scratch/` (importing `../lib.mjs`) beat opening four browser tabs. Drive the browser (the `verify` skill) only when the change shows up in rendered UI — and then only the surfaces it touches, at desktop and phone widths, with fast timers on (`?fast=10` for demo flows, `verify:up --scale 10` for the server's real socket flows). A full every-surface sweep is for cross-cutting changes only. Per-push deploy checks (`/healthz` for the new server commit, Vercel Ready for the expected SHA) stay on every push regardless ([docs/operations.md](docs/operations.md)).
- **Send real features to a real phone.** Headless Chrome on broadband never actually loses its connection, so it can't test what a user does while offline — a real cellular handset found the one bug every scripted leg missed (a mid-chat leave over a dead socket stranding a partner forever). Keep sending real features to a real phone. When a handset run is asked for and can't happen then, record it in [docs/pending-manual-tests.md](docs/pending-manual-tests.md) rather than letting the ask evaporate.
- **The API runs on a paid Render instance, and that is load-bearing.** Render blocks outbound SMTP (ports 25/465/587) on Free web services, so the transcript email cannot send from one — see DECISIONS.md → "The API runs on a paid Render instance". A paid instance also never spins down when idle, so there is no cold-start wake to test, hide, or wait for: don't add warm-up pings or "waking up" copy, and don't run hold-and-wait checks. A deploy or restart still boots a cold process and still wipes every live activity.
- **Humanize all copy you write.** Any user-facing text you create or change — UI strings, button labels, empty states, mock chat messages, error/success copy — must be run through the **humanizer** skill ([blader/humanizer](https://github.com/blader/humanizer)) before it's considered done, so nothing reads as AI-generated. Install once with `npx skills add blader/humanizer`, then invoke `/humanizer` on the drafted text. This does **not** apply to code, comments, or internal docs.
- **Record product/UX decisions.** When a choice is made about how the product behaves or why a screen works a certain way — especially anything non-obvious or that looks like a bug but is intentional — record it so future agents don't "fix" it. It's a two-touch change made together: add the entry to the top of the matching `docs/decisions/<area>.md` file, and its one-line link to the [DECISIONS.md](DECISIONS.md) index. Record the decision, not just the change.
- **The demo flows are product — every feature must show up in them.** The demo activity (join code `1234`, reached from the homepage demo section and the `/demo` redirect URLs) is a permanent sales surface: teachers self-serve it and the founder pitches with it. A user-facing feature is not done until it can be experienced in the demo. Because the demo renders the SAME components as the real flows, UI changes carry over for free; what's on you is the simulation — extend the demo engines (`useChatDemo.ts`, `useHostActivityDemo.ts` + `hostWorld.ts`) and the `client/src/mockData/` fixtures so the demo actually demonstrates it. Never fork demo-specific pages or components; demo URLs stay thin redirects. See DECISIONS.md → "Demo flows & demo furniture".
- **Record learnings in the repo, not in private memory.** Gotchas, verification techniques, and working knowledge worth keeping go in this file or the relevant doc so every future agent and tool sees them — never only in an assistant's own memory store. This is a product-owner preference.

## Operations

Deploy checks, reading production logs (Vercel + Render CLIs), setting env vars safely (the BOM gotcha), and the CSS-hash refactor-verification technique live in [docs/operations.md](docs/operations.md).
