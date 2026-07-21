# tools/verify — the browser verification harness

Repo home of the Playwright harness that drives Chaverola end to end
(browser-surfaced Vite SPA + socket server). Plain `.mjs` on purpose:
no build, no typecheck, no lint ceremony.

## What lives here

- `lib.mjs` — the shared helpers every driver imports: result
  collection (`check`/`summary`/`exitWith`), activity minting, teacher
  and student page openers, the aside-scoped queue selectors, chat-card
  locators, `waitForQueueRows`, `dropConnection`,
  `watchForSocketTraffic`. Target selection lives here too: localhost
  5199/3001 by default, `--prod` on any driver's argv for
  chaverola.com, `CHAVEROLA_WEB`/`CHAVEROLA_API` env for anything else.
- `up.mjs` — the launcher (`pnpm verify:up`): client on 5199, server on
  3001 at `--scale <n>` (default 10, `--scale 1` for real timings).
  Prints one `READY web=... api=... scale=...` line; refuses a
  wrong-scale squatter on 3001 with the exact kill command. Run it in
  the background.
- `smoke.mjs` — the everyday driver (`pnpm verify:smoke`): a full
  activity end to end — create, two students, pair, a message each way,
  teacher transcript, End all. Local or `--prod`.
- `coldwake.mjs` — prod cold-start wake UX
  (`node tools/verify/coldwake.mjs --prod`); the first contact of every
  per-feature prod pass. Opportunistic: a warm server is reported, not
  failed.
- `shots/` (gitignored) — screenshots, via `lib.mjs`'s `SHOT(name)`.
- `scratch/` (gitignored) — one-shot and rarely-triggered drivers.

## Scratch drivers

Era-specific gauntlets rot when committed (they assert stale UI copy),
so one-shot drivers are born in `scratch/` when their trigger fires,
import `../lib.mjs`, and die with their era. Author them with file
tools only — never round-trip `.mjs` through PowerShell text cmdlets
(cp1252 mangles multibyte characters).

<!-- Speedup prompt 3 moves the selector map, host-page traps, and the
prod-lessons archive here from .claude/skills/verify/SKILL.md. -->
