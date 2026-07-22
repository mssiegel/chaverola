# Chaverola

A fun, fast, **game-like** multiplayer classroom chat activity for middle/high school
students. A teacher creates an activity and assigns characters; students join with a
4-digit code and chat in real time as their characters — without knowing who they're
really talking to. Only the teacher sees real names, and can reveal them at the end.

**Live site:** [chaverola.com](https://chaverola.com) (every push to `main` deploys
automatically via Vercel).

> **Scope note:** Every screen of the client is built and nothing is a dead
> end. The backend (`server/`) is live at `api.chaverola.com`, and both
> sides of the client call it: students resolve real join codes, teachers
> create activities and host them at a private `hostKey` URL, and the
> waiting lobby is live over Socket.IO — students appear in the teacher's
> queue in real time, with reconnect handling built for classroom phones.
> **Matching is real too:** the teacher pairs students (or lets
> server-side auto-match do it), characters are dealt, and each matched
> student's phone moves into a chat room. **And students now talk in
> them:** messages travel the wire in real time, attributed by character,
> with the transcript surviving a refresh, peers see each other typing —
> and **the teacher reads it all live**, every line under the sender's
> real name, on the host page's chat cards, **can end any chat (or
> all of them) whenever the round is over, and can pause the whole
> class** — composers lock, clocks freeze, matchmaking waits, and one
> tap resumes. The auto-end clock and the name reveal are honest
> placeholders for now. See
> [Shared_Project_Context.md](Shared_Project_Context.md)
> for the full brief and [docs/plans/](docs/plans/) for the current feature plan.

> **AI agents:** read [AGENTS.md](AGENTS.md) before doing any work, and check the
> [DECISIONS.md](DECISIONS.md) index for the area you're touching — behavior that looks like
> a bug or an oversight is often an intentional, recorded decision.

## Repository structure

This is a **pnpm workspaces** monorepo.

```text
chaverola/
├─ client/     # the app — React 19 + TypeScript + Vite + Tailwind v4 + ShadCN
├─ server/     # the API — Express 5 + TypeScript, in-memory store
├─ shared/     # the wire contract both sides import (types + constants)
├─ docs/       # technical docs: architecture, API contract, feature plans, decisions/
├─ Shared_Project_Context.md          # the source-of-truth project brief
├─ AGENTS.md                          # guidance for AI agents / contributors
└─ DECISIONS.md                       # index of product/UX decisions (bodies in docs/decisions/)
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
| `/activity/host/:hostKey`  | Teacher's live activity page (the param `1234` hosts the demo)          |
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
privacy (including the pin that a student never receives a peer's name or
id), the hostKey boundary (REST and socket editions), the `1234`
reservation, the lobby's seat-resume race guard, and the pure matching
rules. See DECISIONS.md → the "Testing stays small" entries.

## Deployment

Two platforms, split by package:

- **Client → Vercel.** Pushes to `main` deploy to
  [chaverola.com](https://chaverola.com) (Root Directory `client`; an
  explicit Ignored Build Step skips pushes that touch neither `client/`,
  `shared/`, nor the root manifests). One env var: `VITE_API_URL` — the
  API base URL, baked in at build time.
- **Server → Render** (Virginia/US-East, free tier), reached at
  `api.chaverola.com`. One required env var: `NODE_ENV=production`
  (Render injects `PORT` itself). Live since 2026-07-18; both the student
  join flow and the teacher create/host flow call it.

Free-tier caveats worth knowing: the server spins down when idle — but a
connected class's Socket.IO heartbeats count as traffic, so spin-down
only happens when nobody is connected (verified empirically; a single
hit wakes a sleeping instance in ~33 seconds, which the client's
`/healthz` ping on page mount hides). Activities live **in memory
only** — every server deploy or restart wipes live classes, and since
the live lobby that's visible: every connected student lands on an
"activity ended" screen and the teacher's page falls back to not-found.
Once real classes are using Chaverola (launch: end of August 2026), avoid
server-touching pushes during school hours; until then any hour is fine —
there is nothing live to wipe. Details in
[docs/architecture.md](docs/architecture.md).

## Documentation

Read in this order:

1. [Shared_Project_Context.md](Shared_Project_Context.md) — the project brief: what
   Chaverola is, scope, tech stack, canonical routes, branding, and chatbox conventions.
   The source of truth for requirements.
2. [AGENTS.md](AGENTS.md) — how to work in this repo: current status, commands,
   architecture, conventions, and working rules for AI agents and contributors.
3. [DECISIONS.md](DECISIONS.md) — the index of product, UX, and business decisions with
   their reasoning; the entries themselves live in per-area files under
   [docs/decisions/](docs/decisions/). Check it before changing behavior that looks odd; to
   add a decision, put the entry atop its area file and a line in the index, in one change.
4. [docs/architecture.md](docs/architecture.md) and [docs/api.md](docs/api.md) — the
   technical docs: how the packages fit together and the canonical API contract.
   Feature plans live in [docs/plans/](docs/plans/).
