# Chaverola

A fun, fast, **game-like** multiplayer classroom chat activity for middle/high school
students. A teacher creates an activity and assigns characters; students join with a
4-digit code and chat in real time as their characters — without knowing who they're
really talking to. Only the teacher sees real names, and can reveal them at the end.

> **Scope note:** This repository is **UI/UX only** (with animations/transitions) — no
> backend logic. Every screen is driven by mock data and demo events, and nothing is a
> dead end. See [Shared_Project_Context.md](Shared_Project_Context.md) for the full brief.

## Repository structure

This is a **pnpm workspaces** monorepo.

```text
chaverola/
├─ client/     # the app — React 19 + TypeScript + Vite + Tailwind + ShadCN
├─ server/     # empty for now (placeholder)
├─ Shared_Project_Context.md      # the source-of-truth project brief
├─ AGENTS.md                      # guidance for AI agents / contributors
└─ PROJECT_DOCUMENTATION_STANDARD.md
```

## Getting started

```bash
pnpm install        # install all workspace dependencies
pnpm dev            # run the client dev server (Vite)
```

Then open the URL Vite prints. Useful during development:

| Route                | What it shows                                          |
| -------------------- | ------------------------------------------------------ |
| `/`                  | Homepage                                               |
| `/activity/join`     | Student join-code entry                                |
| `/demo/student-chat` | **Live demo of the student chatbox** (temporary route) |

The demo join code **`1234`** always works.

## Common scripts (run from the repo root)

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `pnpm dev`       | Start the client dev server              |
| `pnpm build`     | Type-check and build the client for prod |
| `pnpm preview`   | Preview the production build             |
| `pnpm typecheck` | Type-check the client                    |
| `pnpm format`    | Format the whole repo with Prettier      |

## Documentation

- [Shared_Project_Context.md](Shared_Project_Context.md) — the project brief (source of truth)
- [AGENTS.md](AGENTS.md) — guidance for AI agents and contributors
- [PROJECT_DOCUMENTATION_STANDARD.md](PROJECT_DOCUMENTATION_STANDARD.md) — documentation structure
