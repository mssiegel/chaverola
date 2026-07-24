---
name: verify
description: How to launch and drive Chaverola for runtime verification (browser-surfaced Vite SPA on Windows).
---

# Verifying Chaverola

The browser is the LAST gate, not the first. AGENTS.md owns the ladder
("Verify at the cheapest gate"): run `pnpm typecheck` — and `pnpm test` for
logic in `lib/`, `hostWorld.ts`, or `server/src/live/` — before driving the
app, and drive only the surfaces the change touches, at desktop and phone
widths. This skill is just the top rung: how to launch the stack and drive
the browser once you're there.

## Launch

`pnpm verify:up` starts the whole stack — the client on
`http://localhost:5199` (strict port) and the server on 3001 at time
`--scale 10`. It prints one line when both answer:

```
READY web=http://localhost:5199 api=http://localhost:3001 scale=10 pid=12345
```

Run it in the background; it stays up until killed. Then point any driver at
localhost (the default) — no CORS override, no `$env:` dance. The dev server
already allows 5199, and `up.mjs` passes `CHAVEROLA_TIME_SCALE` in the spawn
env, so the whole PowerShell launch ritual is gone.

- **`--scale 1`** when a run needs real-world timings (a true 120s grace, the
  real ~45s ping cycle). Otherwise scale 10 compresses them — see "Fast time"
  below.
- **A server already on 3001:** `up.mjs` reads its `/healthz` and prints
  `pid` / `timeScale` / `commit`. If the scale matches the request it reuses
  the server; if not, it refuses and prints the exact `taskkill /PID <pid> /F`
  line rather than killing someone else's process. (No `Get-NetTCPConnection`
  ritual — `/healthz` names the owner.)

Mint activities by driving the create form, or POST `/activities` (payload in
[docs/api.md](../../../docs/api.md) — the 201 carries the student `joinCode`
and the `hostKey` that opens `/activity/host/<hostKey>`). The in-memory store
forgets everything on restart.

## Drive

The committed drivers live in `tools/verify/`; each takes `--prod` to run
against chaverola.com instead of localhost.

| Driver   | Command                                 | What it proves                                                                                                                                                                       |
| -------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| smoke    | `pnpm verify:smoke` (`--prod`)          | A full activity end to end: create → teacher → two students → Pair everyone → a message each way → teacher transcript → End all. Seconds at scale 10. Also the deployed-build smoke. |
| coldwake | `node tools/verify/coldwake.mjs --prod` | The freshly deployed build boots and answers, and a create through the real form lands on a live host page with a real socket.                                                       |

New one-shot drivers go in `tools/verify/scratch/` (gitignored), import
`../lib.mjs`, and are authored with file tools only — never round-tripped
through PowerShell text cmdlets (cp1252 mangles the multibyte characters).
`lib.mjs` already encodes the selector lessons: `waitForQueueRows`,
`rail`/`liveCard`/`endedCard`, `seated`, `dropConnection`,
`watchForSocketTraffic`, and the `check`/`summary`/`exitWith` fail-soft
collection.

## Fast time, two knobs

Two independent knobs compress clocks; they never overlap.

- **`?fast` — the client's demo simulation only.** A dev build reads it once
  per full page load (bare `?fast` = 10x; `?fast=<n>` clamps 1–100): the
  scripted hero/lobby chats, ambient chatter, the host page's world tick, the
  demo lobby's 20s auto-pair, the countdown clocks. Delays scale rather than
  zero out, so message-ORDER assertions stay valid; don't assert on the typing
  indicator (~120ms at 10x), and re-add the param on every fresh `goto`.
  Production compiles the mechanism out (`lib/demoTime.ts`), and it reaches
  **nothing on a real activity** — the server has never heard of it.
- **`CHAVEROLA_TIME_SCALE` — the server's real flows.** `verify:up --scale n`
  divides the lobby's real clocks by n: the 120s grace, the 4s disconnect
  broadcast gate, the engine.io ping cycle (~45s detection), and the
  auto-match tick/gap and teacher-set threshold. What never scales: the
  `chat:send` rate limit, `TYPING_*` timings, teacher keepalive, store
  TTL/sweep, the client's `LEAVE_FLUSH_MS`. Production is pinned to 1
  (`NODE_ENV` forces it; Render never sets the var), so a scaled run's numbers
  are dev-only. Detail in [docs/api.md](../../../docs/api.md) → "Dev-only time
  scaling".
  - **Cosmetic wart, accepted:** `PeerReconnectBanner`'s static "2 minutes"
    sr-only copy reads wrong while a scaled grace window runs ~12s. Dev-only.

## Production

**Production is driven once per feature, not per slice** (DECISIONS.md →
"Slices verify on localhost; production driving happens once per feature",
trimmed by "The per-feature prod pass trims to cold-wake, a smoke, and one
network leg"). A slice's own verification is entirely local, on the stack
above. The feature's final prompt runs the trimmed pass, in order:

1. **`node tools/verify/coldwake.mjs --prod`** — first contact with the fresh
   deployment: it boots, answers `/healthz`, and a teacher can create through
   the real form onto a live host page. No longer has to run first: the API is
   on a paid instance, so there is no idle spin-down to catch before it warms.
2. **`pnpm verify:smoke --prod`** — the deployed-build smoke.
3. **ONE** feature-specific, network-sensitive leg, written fresh in
   `tools/verify/scratch/` — the single thing about THIS feature that only the
   real deployment (Render's proxy, real reconnect backoff) can prove.
4. **A handset ask, only when the feature touches offline/disconnect paths** —
   a headless browser on broadband never truly loses its connection. If a real
   device can't run it now, write the ask into
   [docs/pending-manual-tests.md](../../../docs/pending-manual-tests.md).

Prior features' gauntlets are NOT re-run over unchanged areas. The per-push
deploy checks (`/healthz` for the new server commit, Vercel Ready for the
expected SHA) are deploy discipline, not verification — they stay on every
push regardless.

## Reference

Selector map, host-page anatomy, the host-page selector traps, driver-author
timing notes, and the prod-lessons archive live in
[tools/verify/README.md](../../../tools/verify/README.md).
