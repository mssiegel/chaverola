# Architecture

How Chaverola is put together across its three packages, how a request
flows through the server, and where everything runs. The API surface
itself lives in [api.md](api.md); the _why_ behind each choice is in
[DECISIONS.md](../DECISIONS.md) (mostly the "Backend & API" section).

## Workspace layout

A pnpm-workspaces monorepo with three scoped packages:

```text
chaverola/
├─ client/   @chaverola/client — React 19 + Vite + Tailwind v4 (the app)
├─ server/   @chaverola/server — Express 5 + TypeScript (the API)
└─ shared/   @chaverola/shared — the wire contract (types + constants)
```

Who imports what:

- **`shared/` depends on nothing.** It is buildless — its `exports` map
  points at `./src/index.ts`, and Vite, tsx, and Vitest all compile it in
  place. No dist, no build ordering.
- **`client/` and `server/` both depend on `shared/`** (`workspace:*`) and
  never on each other. The handwritten interfaces in `shared/src/api.ts`
  and `shared/src/types.ts` are the canonical wire contract; every limit
  (name caps, join-code pattern, settings bounds) lives in
  `shared/src/constants.ts` so the form and the validator can't drift.
- **zod exists only in `server/`.** The schema is pinned to the shared
  contract with `satisfies z.ZodType<CreateActivityRequest>` — drift is a
  compile error — and pnpm's strict `node_modules` keeps zod out of the
  client structurally. The client keeps its friendly per-field form
  validation instead.

Skipping client builds for server-only pushes turned out to need more than
the workspace layout: Vercel's automatic monorepo detection rebuilt the
client on a server-only push, so an explicit Ignored Build Step does it by
paths (see Deploy topology).

## Deploy topology

```text
   browser ──────────────► Vercel (client)      chaverola.com, www
      │                      static SPA; client-touching pushes deploy
      │  fetch/XHR
      ▼
   api.chaverola.com ─────► Render (server)     Virginia / US East, Free tier
      CNAME → onrender.com   single Node instance, tsx runs src directly
```

- **Vercel** builds only `client/` (Root Directory `client`, with
  source-files-outside-root enabled so `shared/` resolves). Its Ignored
  Build Step — `git diff --quiet HEAD^ HEAD -- . ../shared
../pnpm-lock.yaml ../package.json ../tsconfig.base.json`, run inside
  `client/` — skips pushes that touch none of those paths (set explicitly
  2026-07-19 after a server-only push proved the automatic detection
  didn't skip). The client reaches the API through `VITE_API_URL`, baked
  at build time; `lib/api.ts` scrubs BOMs and whitespace off it and
  requires an absolute URL, because the value once arrived with a leading
  UTF-8 BOM that turned every prod call into a relative-path 404 (caught
  by the feature-1 prod pass — the gotcha and the safe way to set env
  vars are in AGENTS.md → Reading production logs).
- **Render** runs the server (service `chaverola-api`, live since
  2026-07-18; build filters keep client-only pushes from deploying it). The
  build command installs with pnpm and runs `tsc --noEmit` as the deploy
  gate; at runtime **tsx executes the TypeScript source directly** — there
  is no emit step anywhere. Render injects `PORT` and
  `RENDER_GIT_COMMIT` (echoed by `/healthz`); Node's version comes from
  the root `.nvmrc`.
- **Free-tier consequences:** the instance spins down when idle. Measured
  2026-07-19: SIGTERM came ~30 minutes after the last real request
  (Render documents ~15; their own health-check pings don't count as
  traffic and don't delay it), and a single `/healthz` hit woke it in
  ~33 seconds — boot to `listening` took ~11s of that. The client's
  warm-up ping on page mount hides this cold start. Every server deploy
  or restart wipes all live activities — so server-touching pushes are
  avoided during school hours.
- **CORS** allows `chaverola.com`, `www.chaverola.com`, Vercel preview
  hostnames (`chaverola-*-moshe-siegels-projects.vercel.app`), and
  localhost outside production (`server/src/config.ts`). CORS is
  explicitly **not** the security boundary — curl ignores it; the hostKey
  is the boundary.

## Request flow (server)

`buildApp` in `server/src/app.ts` assembles the middleware in this order —
the order is load-bearing:

```text
trust proxy (3)          socket + Render internal + Cloudflare edge; the
                         limiters must see real client IPs, not Render's
→ helmet                 security headers
→ cors                   credentials: false, preflight cached 24h
→ pino-http              structured request logs
→ GET /healthz           BEFORE the limiters — the warm-up ping and
                         Render's health check never burn limiter budget
→ rate limiters          POST and GET limiters, picked per method
→ express.json (16kb)
→ Cache-Control: no-store
→ /activities router     validate (zod) → store → project → respond
→ 404 fallback           unknown routes get the shared error envelope
→ error middleware       HttpError → its status + envelope;
                         body-parser errors → 400 envelope; else log + 500
```

Handlers stay thin: `server/src/routes/activities.ts` only validates,
calls the store, and projects. The **projection layer**
(`server/src/store/projections.ts`) is the single module allowed to turn a
stored record into response JSON, and it builds explicit field-by-field
literals — the student projection cannot leak `settings`, `teacherEmail`,
or the hostKey by construction. Tests pin the exact key lists.

### The `app.ts` / `index.ts` seam

`app.ts` builds and returns the Express app **without listening** —
supertest targets it directly. `index.ts` is the only side-effectful
module: it wraps the app in `http.createServer(app)` (never
`app.listen()`), starts the sweep timer, listens, and handles SIGTERM
(Render sends it on every deploy). This seam is deliberate: the realtime
feature attaches Socket.IO to that same `http.Server`, so the split never
needs to move.

## In-memory lifecycle

There is no database. `server/src/store/activityStore.ts` holds two Maps
(`byJoinCode`, `byHostKey`) sharing the same record objects — one record,
two lookup paths.

- **TTL 12 hours**, refreshed **only** by hostKey lookups: an activity
  stays alive exactly as long as a teacher keeps the host page open.
  Student lookups deliberately don't refresh, so enumerating join codes
  can't keep activities alive.
- **Sweep every 10 minutes** (`startSweep`, called only from `index.ts`;
  the interval is `.unref()`ed so it never holds the process open).
  Lookups also delete-and-miss expired records between sweeps.
- **Capacity cap `MAX_ACTIVITIES = 4000`** — comfortably under the 8,999
  usable join codes, so code minting (100 random draws, then a dense
  fallback that stays uniform) never starves.
- **Join code `1234` is never minted and never served** — it belongs to
  the client-simulated demo forever; the server 404s it unconditionally.
- Restarts and deploys wipe everything. Accepted for v1.

## Rate-limit sizing

All per-IP limits assume one school NAT carrying **20 simultaneous
classes × 30 students = 600 users on one IP**:

| Limiter                        | Limit         | Sizing                                                 |
| ------------------------------ | ------------- | ------------------------------------------------------ |
| `POST /activities`             | 60 / 15 min   | 20 teachers starting class at once, ×3 headroom        |
| GET lookups (code + host, one) | 1,200 / 5 min | 600 students × ~2 lookups in a join burst, ×2 headroom |

Residual exposure: a full 9,000-code sweep from one IP takes ~37 minutes —
accepted, because the student projection is public-by-assumption. The
math lives next to the limiters in `server/src/app.ts`.
