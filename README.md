# Chaverola

A fun, fast, **game-like** multiplayer classroom chat activity for middle/high school
students. A teacher creates an activity and assigns characters; students join with a
4-digit code and chat in real time as their characters — without knowing who they're
really talking to. Only the teacher sees real names, and can reveal them at the end.

**Live site:** [chaverola.vercel.app](https://chaverola.vercel.app) (every push to
`main` deploys automatically via Vercel).

> **Scope note:** This repository is **UI/UX only** (with animations/transitions) — no
> backend logic. Every screen is driven by mock data and demo events, and nothing is a
> dead end. See [Shared_Project_Context.md](Shared_Project_Context.md) for the full brief.

> **AI agents:** read [AGENTS.md](AGENTS.md) before doing any work, and check
> [DECISIONS.md](DECISIONS.md) for the area you're touching — behavior that looks like a
> bug or an oversight is often an intentional, recorded decision.

## Repository structure

This is a **pnpm workspaces** monorepo.

```text
chaverola/
├─ client/     # the app — React 19 + TypeScript + Vite + Tailwind v4 + ShadCN
├─ server/     # empty for now (placeholder)
├─ Shared_Project_Context.md          # the source-of-truth project brief
├─ AGENTS.md                          # guidance for AI agents / contributors
├─ DECISIONS.md                       # product/UX decisions and their reasoning
└─ PROJECT_DOCUMENTATION_STANDARD.md  # structure future docs must follow
```

## Getting started

```bash
pnpm install        # install all workspace dependencies
pnpm dev            # run the client dev server (Vite)
```

Then open the URL Vite prints. The demo join code **`1234`** always works.

| Route                      | What it shows                                                      |
| -------------------------- | ------------------------------------------------------------------ |
| `/`                        | Homepage — the hero chatbox is the real product running a demo     |
| `/activity/join`           | Student join-code entry                                            |
| `/activity/join/:joinCode` | Name entry → waiting lobby (one URL for the whole student journey) |
| `/activity/create`         | Teacher activity setup                                             |
| `/activity/host/:joinCode` | Teacher's live activity page (join code `1234` hosts the demo)     |

Every route also exists under an `/he` prefix (Hebrew variant — same English text for
now). Routes are canonical: don't invent new ones beyond the project brief's table.

## Common scripts (run from the repo root)

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `pnpm dev`          | Start the client dev server              |
| `pnpm build`        | Type-check and build the client for prod |
| `pnpm preview`      | Preview the production build             |
| `pnpm typecheck`    | Type-check the client                    |
| `pnpm lint`         | Lint the client with ESLint              |
| `pnpm test`         | Run the unit tests (Vitest)              |
| `pnpm format`       | Format the whole repo with Prettier      |
| `pnpm format:check` | Check formatting without writing         |

The test suite is deliberately small while the app is UI-only: pure-logic
tests over the validators and the host page's world model, no DOM. See
DECISIONS.md → "Testing stays small while the app is UI-only".

## Documentation

Read in this order:

1. [Shared_Project_Context.md](Shared_Project_Context.md) — the project brief: what
   Chaverola is, scope, tech stack, canonical routes, branding, and chatbox conventions.
   The source of truth for requirements.
2. [AGENTS.md](AGENTS.md) — how to work in this repo: current status, commands,
   architecture, conventions, and working rules for AI agents and contributors.
3. [DECISIONS.md](DECISIONS.md) — product, UX, and business decisions with their
   reasoning, grouped by area. Check it before changing behavior that looks odd, and add
   an entry when a new decision is made.
4. [PROJECT_DOCUMENTATION_STANDARD.md](PROJECT_DOCUMENTATION_STANDARD.md) — the
   structure future documentation must follow.
