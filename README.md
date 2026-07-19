# Chaverola

A fun, fast, **game-like** multiplayer classroom chat activity for middle/high school
students. A teacher creates an activity and assigns characters; students join with a
4-digit code and chat in real time as their characters — without knowing who they're
really talking to. Only the teacher sees real names, and can reveal them at the end.

**Live site:** [chaverola.com](https://chaverola.com) (every push to `main` deploys
automatically via Vercel).

> **Scope note:** Every screen of the client is built and nothing is a dead
> end. The backend (`server/`) is live at `api.chaverola.com`, and the
> student join flow resolves real codes through it; the teacher side (and
> everything the demo simulates — matching, chat) is still mock-driven.
> Finishing that wiring is feature 1, in progress. See
> [Shared_Project_Context.md](Shared_Project_Context.md)
> for the full brief and [docs/plans/](docs/plans/) for the current feature plan.

> **AI agents:** read [AGENTS.md](AGENTS.md) before doing any work, and check
> [DECISIONS.md](DECISIONS.md) for the area you're touching — behavior that looks like a
> bug or an oversight is often an intentional, recorded decision.

## Repository structure

This is a **pnpm workspaces** monorepo.

```text
chaverola/
├─ client/     # the app — React 19 + TypeScript + Vite + Tailwind v4 + ShadCN
├─ server/     # the API — Express 5 + TypeScript, in-memory store
├─ shared/     # the wire contract both sides import (types + constants)
├─ docs/       # technical docs: architecture, API contract, feature plans
├─ Shared_Project_Context.md          # the source-of-truth project brief
├─ AGENTS.md                          # guidance for AI agents / contributors
└─ DECISIONS.md                       # product/UX decisions and their reasoning
```

## Getting started

```bash
pnpm install        # install all workspace dependencies
pnpm dev            # run the client (Vite) and the server (port 3001) together
```

Then open the URL Vite prints. The demo join code **`1234`** always works
(fully client-simulated — no server needed), and `/demo` jumps you straight
into the running teacher demo. `pnpm dev:client` / `pnpm dev:server` run
either side alone; the server needs no env vars in dev
(see `server/.env.example`).

| Route                      | What it shows                                                           |
| -------------------------- | ----------------------------------------------------------------------- |
| `/`                        | Homepage — the hero chatbox is the real product running a demo          |
| `/activity/join`           | Student join-code entry                                                 |
| `/activity/join/:joinCode` | Name entry → waiting lobby (one URL for the whole student journey)      |
| `/activity/create`         | Teacher activity setup                                                  |
| `/activity/host/:joinCode` | Teacher's live activity page (join code `1234` hosts the demo)          |
| `/demo` · `/demo/teacher`  | Redirects to the teacher demo (`/activity/host/1234`)                   |
| `/demo/student`            | Redirects into the student demo (`/activity/join/1234`, name prefilled) |

Every route also exists under an `/he` prefix (Hebrew variant — same English text for
now). Routes are canonical: don't invent new ones beyond the project brief's table.

## Common scripts (run from the repo root)

| Command             | Description                                       |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | Start the client and server dev servers together  |
| `pnpm dev:client`   | Start just the client (Vite)                      |
| `pnpm dev:server`   | Start just the server (tsx watch, port 3001)      |
| `pnpm build`        | Type-check and build the client for prod          |
| `pnpm preview`      | Preview the client's production build             |
| `pnpm typecheck`    | Type-check every package (client, server, shared) |
| `pnpm lint`         | Lint every package with ESLint                    |
| `pnpm test`         | Run the unit tests in every package (Vitest)      |
| `pnpm format`       | Format the whole repo with Prettier               |
| `pnpm format:check` | Check formatting without writing                  |

The test suites are deliberately small while the product is an MVP: on the
client, pure-logic tests over the validators and the host page's world
model (no DOM); on the server, just the safety invariants — projection
privacy, the hostKey boundary, the `1234` reservation. See DECISIONS.md →
the "Testing stays small" entries.

## Deployment

Two platforms, split by package:

- **Client → Vercel.** Every push to `main` deploys to
  [chaverola.com](https://chaverola.com) (Root Directory `client`; pushes
  that don't touch the client are skipped automatically). One env var:
  `VITE_API_URL` — the API base URL, baked in at build time.
- **Server → Render** (Virginia/US-East, free tier), reached at
  `api.chaverola.com`. One required env var: `NODE_ENV=production`
  (Render injects `PORT` itself). Live since 2026-07-18; the student
  join flow calls it, and the teacher side follows in feature 1's
  remaining prompts.

Free-tier caveats worth knowing: the server spins down when idle
(observed: ~30 minutes after the last real request; a single hit wakes it
in ~33 seconds, which the client's `/healthz` ping on page mount hides),
and activities live **in memory only** — every server deploy or restart
wipes live classes, so avoid server-touching pushes during school hours.
Details in [docs/architecture.md](docs/architecture.md).

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
4. [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md) — the
   technical docs: how the packages fit together and the canonical API contract.
   Feature plans live in [docs/plans/](docs/plans/).
