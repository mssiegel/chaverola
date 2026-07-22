# Operations

The operational runbook: how to check a deploy landed, read production
logs on both platforms, set env vars safely, and prove a refactor changed
no styling. The _rules_ that govern deploying (the deploy race, the
tip-commit-must-touch-client trap) live in [AGENTS.md](../AGENTS.md) →
Working Rules; this file is the _how_.

## Deploy checks (run on every push)

Two checks catch the two ways a push can lie about being live. Both stay
on every push regardless of what changed.

- **Server commit — poll `/healthz`.** `curl https://api.chaverola.com/healthz`
  returns `{ ok, commit, pid, timeScale? }`, where `commit` is Render's
  injected `RENDER_GIT_COMMIT`. Poll until `commit` matches the SHA you
  pushed before treating a server change as live or testing it — one push
  starts two racing pipelines and Socket.IO drops an unhandled event
  silently (see AGENTS.md → Working Rules → the deploy race). `pid`
  identifies a stale instance; `timeScale` is present only when a dev
  server is scaled (production always omits it).
- **Client build — confirm Vercel is Ready.** `vercel ls` lists recent
  deployments; confirm the latest **production** deployment for the SHA
  you expect is **Ready**, not Canceled or Building. `/healthz` does not
  catch a skipped client build — a code commit followed by a docs-only
  tip commit deploys the server and silently skips Vercel, leaving a new
  server against an old client indefinitely (see AGENTS.md → Working
  Rules → the tip commit must touch `client/`).

## Reading production logs

- **Vercel (client):** the Vercel CLI is installed and linked to the
  `chaverola` project — `vercel logs <deployment-url>` tails a deployment,
  `vercel ls` lists recent deployments (also the way to grab a real
  preview hostname, e.g. for the server's CORS regex).
- **Render (server):** the Render CLI (`render.exe`, installed next to the
  Vercel CLI) reads `RENDER_API_KEY` from the environment — the key lives
  in the gitignored `.env.local` at the repo root. Load it, then query the
  service (`chaverola-api`, id `srv-d9ducu3bc2fs73esrr8g`):

  ```powershell
  $env:RENDER_API_KEY = (Get-Content .env.local |
    Select-String '^RENDER_API_KEY=').Line -replace '^RENDER_API_KEY=', ''
  render logs --resources srv-d9ducu3bc2fs73esrr8g --limit 50 -o text --confirm
  ```

  Add `--tail` to stream, `--text <substring>` to filter; `-o json` for
  structured entries (each line is the server's pino JSON). `render
services -o json --confirm` lists services; `render deploys list
srv-d9ducu3bc2fs73esrr8g -o json --confirm` shows deploy history. The
  active workspace is saved once per machine (`render workspace set
tea-d8f90l0g4nts738mebhg -o json --confirm` if it's ever missing). We
  chose the CLI over Render's hosted MCP server so the key stays in
  `.env.local` instead of inside agent config (see DECISIONS.md → "Agents
  read Render logs through the CLI").

## Setting Vercel env vars — never from a PowerShell pipe

Piping a value into `vercel env add` from PowerShell smuggled a UTF-8 BOM
in front of `VITE_API_URL`; the baked URL lost its scheme, every prod API
call resolved as a relative path on chaverola.com, and the demo kept
working so nothing looked broken (caught by the feature-1 prod pass). Use
Git Bash:

```bash
printf 'value' | vercel env add NAME production
```

The project stores env vars as **sensitive** — `vercel env pull` returns
them empty — so verify a value by grepping the deployed bundle, not by
pulling. Since `4aa218a` the client also scrubs BOMs/whitespace and
refuses a non-absolute URL at module init.

## Verifying a style-neutral refactor (the CSS-hash technique)

Run `pnpm build` before and after and compare the
`dist/assets/index-*.css` filename hash — an identical hash is byte-level
proof no styling changed (used across the 2026-07-13 DRY refactor). If the
hash changes unexpectedly, diff the two bundles rule-by-rule (split on
`}`). Gotcha: Tailwind v4 scans **code comments and any text in `client/`**
for class candidates, so a comment containing a bare utility word (e.g.
the CSS filter/blur one) silently adds that dead rule to the bundle —
reword the comment instead of accepting the bloat.
