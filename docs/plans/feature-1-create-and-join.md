# Feature 1 — Create & join an activity

The first real backend work: a teacher creates an activity over a real API and
gets a real 4-digit join code plus a private host URL; a student looks the
activity up by code. Everything realtime (queue, matching, chat, the teacher's
live view) comes in later features over Socket.IO.

## How to use this document

Work through the prompts **in order, one prompt per agent session**. Each
prompt is sized for one session, ends green (typecheck + tests + its own
verification), gets **one commit straight to `main`**, and is safe to push on
its own — prod never breaks between prompts. Ordering is load-bearing:
**Prompt 4 must be done before Prompts 5–7** (the client's production build
fails loudly without the `VITE_API_URL` env var Prompt 4 sets).

To run a prompt, tell the agent:

> Read `docs/plans/feature-1-create-and-join.md` (all of it — the shared
> context sections apply to every prompt), read `AGENTS.md`, then do Prompt N.

When a prompt is done, tick its checkbox here (same commit).

- [x] Prompt 1 — Workspace prep + `shared/` + client shims
- [x] Prompt 2 — The `server/` package with tests
- [ ] Prompt 3 — Docs, DECISIONS.md, stale-reference sweep
- [ ] Prompt 4 — Deploy to Render + DNS + agent log access
- [ ] Prompt 5 — Client wiring, student side
- [ ] Prompt 6 — Client wiring, teacher side (the feature completes)
- [ ] Prompt 7 — End-to-end verification + prod cutover

Repo rules that apply to every prompt (details in `AGENTS.md`): run
`pnpm format` before committing; run every piece of new user-facing copy
through the **humanizer** skill; never hand-write `memo`/`useCallback`/
`useMemo` in the client (React Compiler does it); record product decisions in
`DECISIONS.md`; verify at the cheapest gate that catches the mistake.

---

## Shared context: architecture decisions (founder, 2026-07-17)

- **Stack:** Express 5 + TypeScript on Render (Virginia/US-East, **Free
  tier** until traffic justifies Starter). REST for out-of-session lifecycle;
  Socket.IO (later features) for everything inside a live session.
- **Cold starts:** teachers set up activities _at the start of class_ (no
  accounts, setup takes under a minute), so the client fires a
  fire-and-forget warm-up `GET /healthz` when the homepage, create page, or
  join page mounts — the free-tier server is awake by the time anyone submits.
- **Scale assumption:** one school NAT can carry **20 simultaneous classes ×
  30 students = 600 users on one IP**. All per-IP rate limits are sized from
  this.
- **Persistence:** none — in-memory, single Render instance. Restarts and
  deploys wipe live classes (accepted for v1; avoid server-touching pushes
  during school hours). Activities live 12 hours (TTL refreshed **only** by
  hostKey lookups), swept every 10 minutes, capped at `MAX_ACTIVITIES = 4000`.
- **Host access is a URL capability:** creation returns the `joinCode` (for
  students) plus `hostKey = crypto.randomBytes(18).toString("base64url")`
  (24 chars, 144 bits). The host page is `/activity/host/:hostKey` —
  shareable with an assistant teacher, **never stored client-side, never a
  field of `HostedActivity`**. A join code structurally cannot unlock the
  host route. CORS is explicitly _not_ the security boundary — the hostKey is.
- **Workspaces:** the repo is already pnpm workspaces; we add `shared/` and
  rename packages to scoped names `@chaverola/{client,server,shared}`
  (enables Vercel's automatic skip-unaffected builds).
- **Types & zod:** handwritten interfaces in `shared/` are the canonical wire
  contract (moved verbatim from the client, doc comments kept). **zod lives
  in `server/` only**, pinned via
  `createActivityRequestSchema satisfies z.ZodType<CreateActivityRequest>` —
  schema/type drift is a compile error, and pnpm's strict `node_modules`
  keeps zod out of the client structurally (`shared/` has zero
  dependencies). The client keeps its friendly per-field form validation.
- **The demo split activates** (DECISIONS.md → "When the backend arrives"):
  `1234` stays the only demo activity, fully client-simulated forever; real
  activities show only real students; unknown host links get a friendly
  not-found instead of the demo redirect; demo control panels appear only on
  the demo.
- **Transcripts:** feature 1 only _stores_ `teacherEmail`. Sending ships with
  a later feature via Nodemailer + a Gmail app password as a stopgap,
  isolated behind one send module so a Resend swap is trivial.
- **API domain:** `api.chaverola.com` (CNAME → onrender.com) from day one, so
  `VITE_API_URL` never churns.
- **No `/api/v1/` URL versioning:** versioning protects clients you don't
  control; Chaverola has one first-party client in the same repo, the
  contract is compile-checked via `shared/`, and all data is ephemeral. The
  dedicated `api.` subdomain also makes an `/api` prefix redundant. If a
  public API ever ships, introduce `/v1` then.
- **Tests stay light (MVP):** automated tests cover only the safety
  invariants — the privacy projection, the host-key boundary, the `1234`
  reservation, one happy path. Everything else is verified by curl smoke and
  the browser pass until the product stabilizes.
- **Considered and rejected** (do not re-litigate; Prompt 3 records these in
  DECISIONS.md): TanStack Query (three fetch calls; lean-deps rule), dotenv
  (dev needs no env vars; Render injects prod env), a localStorage hostKey
  stash for lost-URL recovery (a shared classroom computer would hand the
  next user the teacher view — `teacherEmail` is the future recovery
  channel), npm-literal workspace conversion (repo is already pnpm).

## Shared context: the API contract

Base URL: `VITE_API_URL`. All bodies JSON. Every 2xx body is a named-member
envelope. Optional fields are **omitted** when absent — never `null`, never
`""`. The server trims all strings. `Cache-Control: no-store` on every
response. `express.json({ limit: "16kb" })`.

Wire types (in `shared/src/api.ts`):

```ts
export interface CharacterInput {
  name: string;
  emoji?: string;
} // the server mints character ids

export interface CreateActivityRequest {
  hostName: string; // 1–30 after trim
  characters: CharacterInput[]; // 2–4; names unique (trimmed, case-insensitive)
  scenario?: string; // ≤ 20 words and ≤ SCENE_MAX_CHARS; omit when blank
  teacherEmail?: string; // EMAIL_PATTERN, ≤ EMAIL_MAX_CHARS; omit when blank
  settings: ActivitySettings; // required in full; bounds REJECTED, not clamped
}
export interface CreateActivityResponse {
  activity: HostedActivity;
  hostKey: string;
}
export interface GetActivityResponse {
  activity: Activity;
} // the student projection
export interface GetHostedActivityResponse {
  activity: HostedActivity;
}

export type ApiErrorCode =
  "invalid_json" | "invalid_request" | "not_found" | "capacity" | "internal";
export interface ApiFieldIssue {
  path: string;
  message: string;
} // zod-style: "characters.1.name"
export interface ApiErrorResponse {
  error: { code: ApiErrorCode; message: string; issues?: ApiFieldIssue[] };
}
```

Endpoints:

- **`POST /activities`** → `201 CreateActivityResponse`. Validates, mints
  character ids (slugger ported from the client), issues a joinCode (uniform
  over free 1000–9999 minus `1234`; dense fallback enumerates free codes),
  mints the hostKey. Errors: `400 invalid_json` (unparseable body),
  `400 invalid_request` (with `issues[]`), `429`, `503 capacity`.
- **`GET /activities/:joinCode`** → `200 GetActivityResponse` with the
  **student projection only** (`teacherEmail`/`settings`/`hostKey` absent by
  construction). Non-`\d{4}` params and `"1234"` → 404 always (the server
  never knows the demo). Does **not** refresh the TTL (enumeration must not
  keep activities alive).
- **`GET /activities/host/:hostKey`** → `200 GetHostedActivityResponse`
  (full `HostedActivity`, no hostKey echo). 404 for unknown or 4-digit
  params. Refreshes the TTL.
- **`GET /healthz`** → `{ ok: true, commit }` (`commit` from Render's
  injected `RENDER_GIT_COMMIT`, absent locally). Mounted **before** the rate
  limiters — it's the warm-up ping every visitor fires, and Render's health
  check.

Rate limits (`express-rate-limit`, `trust proxy: 1`), sized for 600 users
behind one school NAT — keep the sizing math in a code comment:

- `POST /activities`: **60 / 15 min / IP** (20 teachers starting class at
  once, ×3 headroom).
- GET lookups (joinCode + hostKey routes share one limiter): **1,200 /
  5 min / IP** (600 students × ~2 lookups in a join burst, ×2 headroom).
  Residual exposure: a full 9,000-code sweep from one IP takes ~37 minutes —
  accepted, since the student projection is public-by-assumption.
- 429 responses use the shared error envelope.

Body-parser errors are mapped in the error middleware — unparseable JSON →
`400 invalid_json`, oversized body (413) → `400 invalid_request` — never a
mislabeled 500.

---

## Prompt 1 — Workspace prep + `shared/` + client shims

**Goal:** the `shared/` package exists with the wire contract, the client
consumes it through re-export shims, and nothing about client behavior
changes.

Read first: `pnpm-workspace.yaml`, root `package.json`,
`client/package.json`, `client/src/types/activity.ts`,
`client/src/types/chat.ts`, `client/src/lib/activitySetup.ts`,
`client/src/mockData/activityDemo.ts`.

1. Root: add `- "shared"` to `pnpm-workspace.yaml`. In root `package.json`
   add `"packageManager": "pnpm@11.9.0"` and rework scripts: `dev` runs
   client + server in parallel
   (`pnpm --parallel --filter @chaverola/client --filter @chaverola/server dev`),
   add `dev:client` / `dev:server`, and switch `typecheck`/`lint`/`test` to
   `pnpm -r <script>` (packages without the script are skipped).
2. New root `tsconfig.base.json` for the two new packages (client tsconfigs
   stay untouched): ES2023 target/lib, `module: ESNext`,
   `moduleResolution: bundler`, `verbatimModuleSyntax`, `noEmit`, `strict`,
   `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`,
   `noFallthroughCasesInSwitch`, `skipLibCheck`.
3. `.nvmrc`: `20` → `24` (local dev runs 24.x; Render reads this file;
   Vercel ignores it).
4. `shared/` package — buildless and zero-dependency:
   - `shared/package.json`: name `@chaverola/shared`, private,
     `"type": "module"`, `"exports": { ".": "./src/index.ts" }` (Vite, tsx,
     and Vitest all compile it in place — no dist, no build ordering),
     scripts: just `typecheck`, devDependency `typescript@5.9.3`.
   - `shared/tsconfig.json` extends the base.
   - `shared/src/types.ts`: move `Character` (from `client/src/types/chat.ts`)
     and `Activity`, `ActivitySettings`, `HostedActivity` (from
     `client/src/types/activity.ts`) **verbatim, doc comments included**.
     Chat types do NOT move (`Participant` needs a realName privacy split
     before it ever crosses a wire — later feature).
   - `shared/src/api.ts`: the wire types from the contract above.
   - `shared/src/constants.ts`: move from `client/src/lib/activitySetup.ts` —
     `MIN_CHARACTERS`, `MAX_CHARACTERS`, `NAME_MAX_CHARS`, `SCENE_MAX_WORDS`,
     `StepperBounds`, `AUTO_END_MINUTES`, `AUTO_MATCH_SECONDS`,
     `DEFAULT_ACTIVITY_SETTINGS`, `EMAIL_PATTERN`; move `DEMO_JOIN_CODE` from
     `client/src/mockData/activityDemo.ts`. New: `SCENE_MAX_CHARS = 500`,
     `EMAIL_MAX_CHARS = 254`, `JOIN_CODE_PATTERN = /^\d{4}$/`,
     `HOST_KEY_PATTERN = /^[A-Za-z0-9_-]{20,64}$/`. UI-only counter knobs
     (`NAME_COUNTER_FROM`, `SCENE_COUNTER_FROM`) stay in the client.
   - `shared/src/index.ts` re-exports all three modules (this is a package
     entry point — AGENTS.md's no-barrels rule is about client-internal
     folders).
5. Client: rename to `@chaverola/client`, add
   `"@chaverola/shared": "workspace:*"`. Turn the moved declarations into
   re-export shims so the ~15 downstream import sites stay untouched:
   `types/activity.ts` re-exports the three types; `types/chat.ts` re-exports
   `Character` (everything else in it stays); `lib/activitySetup.ts`
   re-exports the moved constants (its logic stays); `mockData/activityDemo.ts`
   re-exports `DEMO_JOIN_CODE`.

**Done when:** `pnpm install` resolves, `pnpm -r typecheck` and `pnpm -r test`
are green, `pnpm dev:client` renders the app unchanged. `pnpm format`,
commit, tick the checkbox.

---

## Prompt 2 — The `server/` package with tests

**Goal:** a complete, locally-runnable API implementing the contract above.
Nothing deploys yet.

Read first: the API contract section above, `shared/src/*`,
`client/src/lib/activitySetup.ts` (the `toCharacterId` slugger to port),
`client/vitest.config.ts` (test conventions to mirror).

1. Delete `server/.gitkeep`. `server/package.json` — name
   `@chaverola/server`, private, `"type": "module"`:
   - dependencies: `@chaverola/shared` (workspace), `express@^5`, `cors`,
     `express-rate-limit`, `helmet`, `pino-http`, `zod@^4`, **`tsx`** (a
     dependency, not dev — tsx runs the server in production; the deploy
     gate is `tsc --noEmit` in the Render build command).
   - devDependencies: `typescript@5.9.3`, `vitest`, `supertest` +
     `@types/supertest`, `@types/express`, `@types/cors`, `@types/node`,
     `eslint` + `typescript-eslint`, `pino-pretty`.
   - scripts: `dev` (`tsx watch --clear-screen=false src/index.ts`, piped
     through pino-pretty is fine), `start` (`tsx src/index.ts`), `typecheck`,
     `lint`, `test`.
   - No dotenv anywhere: dev needs zero env vars (port defaults to 3001,
     CORS defaults to localhost); Render injects prod env.
2. `server/tsconfig.json` (extends base, `types: ["node"]`),
   `server/vitest.config.ts` (node environment, colocated `*.test.ts`),
   `server/eslint.config.js` (minimal typescript-eslint flat config),
   `server/.env.example` documenting `PORT` and `CLIENT_ORIGINS`.
3. `src/config.ts` — env parsing plus one `allowedOrigins()` used by CORS
   now and Socket.IO later: production allows `https://chaverola.com`,
   `https://www.chaverola.com`, **and** the Vercel-preview hostname regex
   (copy the exact preview hostname off a real Vercel preview deployment —
   do not guess the team slug); outside production add
   `http://localhost:5173` / `http://127.0.0.1:5173`; a `CLIENT_ORIGINS`
   env var overrides the list. Comment in the file: CORS is not a security
   boundary (curl ignores it) — the hostKey is.
4. `src/lib/httpErrors.ts` — an `HttpError` class + `notFound()`,
   `invalidRequest(issues)`, `capacity()` constructors mapping to the shared
   envelope.
5. `src/store/activityStore.ts` — the in-memory store. `StoredActivity`
   (joinCode, hostKey, hostName, characters, scenario?, teacherEmail?,
   settings, createdAt, lastSeenAt) **never appears in a response**; two
   Maps (`byJoinCode`, `byHostKey`) share the same object refs.
   `createActivity` order: capacity guard (4000 → capacity error) → joinCode
   (100 draws of `crypto.randomInt(1000, 10000)` skipping `DEMO_JOIN_CODE`
   and taken codes; dense fallback enumerates free codes and picks
   uniformly) → hostKey (`randomBytes(18).toString("base64url")`, one-line
   collision recheck). Lookups treat records idle past 12h as missing
   (delete + miss); only the hostKey lookup refreshes `lastSeenAt`.
   `sweepExpired(now)` exported; `startSweep()` = 10-min interval,
   `.unref()`, called **only** from `index.ts`; `resetForTests()`. Port
   `toCharacterId` here (it already handles Unicode/Hebrew names).
6. `src/store/projections.ts` — `toActivity(stored)` and
   `toHostedActivity(stored)` as **explicit field-by-field object literals**
   (never spread, never delete; optional fields conditionally included).
   The only module allowed to turn stored records into response JSON.
7. `src/schemas/activity.ts` — zod schemas reading every limit from
   `@chaverola/shared` constants; duplicate character names rejected via
   `superRefine` (trimmed, case-insensitive — same rule as the form); emoji
   capped by a loose length check (≤32 UTF-16 units — ZWJ emoji run long),
   not grapheme validation; settings bounds rejected, not clamped (the
   client already snaps, so out-of-range means a broken caller); unknown
   keys stripped. End with the drift pin:
   `createActivityRequestSchema satisfies z.ZodType<CreateActivityRequest>`.
8. `src/routes/activities.ts` — thin handlers: validate → store → project →
   respond, typed to the shared response interfaces. Param guards
   (`JOIN_CODE_PATTERN` / `HOST_KEY_PATTERN` mismatch → plain 404), the
   hard-coded `1234 → 404`, host route registered before the joinCode route.
9. `src/app.ts` — `buildApp(config)` returning the app **without
   listening** (supertest target; Socket.IO-era reuse). Order:
   `trust proxy: 1` → helmet → cors (`credentials: false`,
   `maxAge: 86400`) → pino-http → `/healthz` (returns
   `{ ok: true, commit: process.env.RENDER_GIT_COMMIT }`, mounted before
   limiters) → rate limiters → `express.json({ limit: "16kb" })` →
   `Cache-Control: no-store` → activities router → 404 fallback (envelope) →
   error middleware (`HttpError` → status+body; body-parser errors → 400
   envelope per the contract; anything else → log + `500 internal`;
   Express 5 forwards async throws automatically).
10. `src/index.ts` — the only side-effectful file and the Socket.IO seam:
    `const server = http.createServer(app)` (never `app.listen()` — a later
    feature attaches `new SocketIOServer(server, ...)` here), `startSweep()`,
    listen on `PORT` (Render injects it; default 3001) on `0.0.0.0`,
    SIGTERM → `server.close()` (Render sends SIGTERM on deploys).
11. Tests — **deliberately light** (MVP; extends the repo's "testing stays
    small" rule): two files only.
    - `src/store/projections.test.ts`: build a record with every optional
      field populated; assert `Object.keys` of each projection deep-equals
      its exact allowlist (student projection: no `teacherEmail`, no
      `settings`, no `hostKey`).
    - `src/routes/activities.test.ts` (supertest on `buildApp`, ~4 cases):
      valid payload → 201 with a 4-digit code + ≥24-char hostKey; GET by
      code returns only the student projection keys; `GET /activities/1234`
      → 404; `GET /activities/host/<joinCode>` → 404 (the
      joinCode-never-unlocks-host rule as an executable test).
    - TTL/sweep, capacity, dense fallback, 429, CORS, and body-parser
      mapping are covered by curl smoke and the browser pass — do not add
      tests for them.

**Done when:** `pnpm -r typecheck && pnpm -r test` green, plus this local
curl smoke against `pnpm dev:server`:

```bash
curl -s http://localhost:3001/healthz          # 200 {"ok":true}
curl -s -X POST http://localhost:3001/activities -H "content-type: application/json" \
  -d '{"hostName":"Ms. Cohen","characters":[{"name":"Brutus"},{"name":"Caesar"}],"settings":{"revealNames":true,"autoEndChats":true,"autoEndMinutes":7,"rematchWarning":true,"autoMatch":true,"autoMatchSeconds":20}}'
                                               # 201; note joinCode + hostKey
curl -s http://localhost:3001/activities/<joinCode>        # 200, student projection only
curl -s http://localhost:3001/activities/1234               # 404
curl -s http://localhost:3001/activities/host/<hostKey>     # 200, full activity
curl -s http://localhost:3001/activities/host/<joinCode>    # 404
```

`pnpm format`, commit, tick the checkbox.

---

## Prompt 3 — Docs, DECISIONS.md, stale-reference sweep

**Goal:** the repo's documentation reflects the real server before anything
deploys.

Read first: `AGENTS.md`, `README.md`, `PROJECT_DOCUMENTATION_STANDARD.md`,
DECISIONS.md → "When the backend arrives" and "Testing stays small".

1. Delete `PROJECT_DOCUMENTATION_STANDARD.md` (founder call — a friend's
   template we never adopted; git history keeps it).
2. Create `docs/architecture.md`: workspace layout (three packages, who
   imports what), request flow, deploy topology (Vercel = client, Render =
   server, `api.chaverola.com`), the `app.ts`-vs-`index.ts` Socket.IO seam,
   the in-memory lifecycle (TTL/sweep/cap, wiped on deploy), rate-limit
   sizing. Create `docs/api.md`: the API contract from this document —
   `docs/api.md` becomes the contract's canonical home going forward, kept
   current per feature.
3. Update `AGENTS.md`: status table (server real; note the host route
   becomes `:hostKey` in Prompt 6), commands (`pnpm dev` runs both,
   `dev:client`/`dev:server`), architecture bullets (shared package, zod is
   server-side only), the cheapest-gate ladder gains "server tests"
   (`pnpm test` covers them via `-r`), a **"Reading production logs"**
   section (Vercel CLI is installed and linked — `vercel logs`; Render
   access lands in Prompt 4), and a pointer to `docs/`.
4. Update `README.md`: repo structure (+`shared/`, +`docs/`), commands,
   deployment section (both platforms, the two env vars, free-tier caveats:
   15-min spin-down and every server deploy wipe live activities — avoid
   server-touching pushes during school hours).
5. Sweep stale references so no doc lies once Prompts 5–6 land: mentions of
   `mockGenerateJoinCode`, the `chaverola.hostedActivity` stash, and the
   `:joinCode` host route in `AGENTS.md` and DECISIONS.md pointers (follow
   DECISIONS.md's own convention for annotating superseded pointers).
6. Add DECISIONS.md entries (decision + why, per the repo's format): every
   bullet in this document's "architecture decisions" section, plus —
   live-settings panel disabled on real activities until the edit-sync
   feature (prevents teacher/student split-brain); create is non-idempotent
   in v1 (a response lost across a cold start can orphan one 12h activity —
   accepted); the enumerable-code exposure + rate-limit sizing (20×30 behind
   one NAT); teachers-set-up-at-class-start + the warm-up ping; the
   Nodemailer-stopgap transcript plan; the doc-standard retirement; this
   prompt-doc delivery pattern for future features; server tests stay light
   (safety invariants only) while the product is an MVP; the
   considered-and-rejected list.

**Done when:** `pnpm format:check` passes and every doc statement matches the
repo. Commit (a client no-op deploy), tick the checkbox.

---

## Prompt 4 — Deploy to Render + DNS + agent log access

**Goal:** the API is live at `https://api.chaverola.com`. The founder drives
the dashboards; the agent prepares exact values and verifies each step.
**Prompts 5–7 must not start until this one is done** (the client's prod
build requires `VITE_API_URL`).

1. Render web service (dashboard, Node runtime — no `render.yaml` for one
   service): this repo, branch `main`, autodeploy on; region **Virginia
   (US East)**; instance **Free**; **Root Directory empty** (a root dir
   would hide `shared/` and the lockfile from the build);
   - Build:
     `npm install -g pnpm@11.9.0 && pnpm install --frozen-lockfile --prod=false --filter @chaverola/server... && pnpm --filter @chaverola/server typecheck`
     (`--prod=false` defuses the NODE_ENV=production-skips-devDeps trap that
     would drop typescript and break the gate; the trailing `...` pulls in
     `shared/`; the typecheck is the deploy gate since tsx runs source).
   - Start: `pnpm --filter @chaverola/server start`
   - Health Check Path: `/healthz`
   - Build Filters → Included Paths: `server/**`, `shared/**`,
     `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
     `tsconfig.base.json`, `.nvmrc`
   - Env: `NODE_ENV=production` (optionally `CLIENT_ORIGINS`; **never set
     `PORT`** — Render injects it). Node version comes from root `.nvmrc`.
2. DNS: CNAME `api.chaverola.com` → the service's onrender.com host; confirm
   TLS issues and `https://api.chaverola.com/healthz` returns 200 with a
   `commit` field matching the deployed SHA.
3. Vercel dashboard: set `VITE_API_URL=https://api.chaverola.com` for
   **Production and Preview** now (VITE\_ vars bake at build time); confirm
   Settings → Build and Deployment → "Include source files outside of the
   Root Directory" is ON (if off, client builds fail with a confusing
   module-not-found for `@chaverola/shared`). Root Directory stays `client`;
   `client/vercel.json` untouched. Grab a real preview-deployment hostname
   and verify the server's `allowedOrigins()` preview regex matches it —
   fix the regex if the slug differs.
4. **Agent access to Render logs:** install the Render CLI; create a Render
   API key and put it in `.env.local` as `RENDER_API_KEY` (`.env.*` is
   gitignored — verify it stays untracked); check Render's current docs for
   their official MCP server and wire it up if it's the better agent path.
   Document in AGENTS.md's "Reading production logs" section how an agent
   tails server logs (CLI command or MCP), next to the existing Vercel
   guidance.
5. Prod curl smoke: the Prompt 2 set against `https://api.chaverola.com`.
   Then let the service spin down (>15 min idle) and confirm one `/healthz`
   hit wakes it.

**Done when:** all checks pass. Commit the AGENTS.md/regex touches, tick the
checkbox.

---

## Prompt 5 — Client wiring, student side

**Goal:** students look up real activities through the API. Prod-safe on its
own: the teacher side is still mock-driven, so no real codes exist via the
UI yet — real-code lookups correctly 404.

Read first: `client/src/pages/student/JoinActivityPage.tsx` (all of it),
`client/src/lib/studentSession.ts`, `client/src/lib/storage.ts`,
DECISIONS.md → the student join flow entries.

1. `client/src/lib/api.ts` — the repo's entire data-fetching layer (no
   library): `API_BASE_URL` from `import.meta.env.VITE_API_URL`, falling
   back to `http://localhost:3001` **only under `import.meta.env.DEV`; a
   PROD build with the var missing throws at module init** (a silent
   localhost fallback in prod would strand every real call while the demo
   keeps working — easy to miss). Typed calls `createActivity`,
   `getActivity`, `getHostedActivity` over `fetch`, each returning
   `{ ok: true; data: T } | { ok: false; kind: "not_found" | "server" | "unreachable" }`
   (not-found is a normal render state, not an exception). All shared-type
   imports are `import type`. Type `VITE_API_URL` in `vite-env.d.ts`; add
   `client/.env.example` documenting it.
2. `client/src/lib/useWarmUpServer.ts` — fire-and-forget `GET /healthz`
   (`.catch(() => {})`, no UI); mount it in `HomePage` and
   `JoinActivityPage` (ActivitySetup gets it in Prompt 6).
3. `client/src/lib/useActivityLookup.ts` — join-code resolution:
   `DEMO_JOIN_CODE` resolves **synchronously** to the demo activity (zero
   network — the demo works offline forever); other codes go through
   `getActivity` with states `"loading" | "found" | "not-found" | "unreachable"`.
4. `JoinActivityPage.tsx` — **the sign-out trap, this prompt's critical
   piece.** Today the page derives its stage from
   (URL code, session, match), and an effect signs the student out whenever
   the derived stage is code entry — safe only because today's lookup is
   synchronous, so a lobby refresh never momentarily lacks an activity.
   With an async lookup, the in-flight gap would derive "code entry" and
   **destroy the session on every lobby refresh**. Fix: an explicit loading
   stage while the lookup is in flight, excluded from the sign-out effect —
   sign out only on _resolved_ not-found or an actual navigation to code
   entry. Also: pending state on the code-entry Continue button with staged
   cold-start patience copy (after ~5s, swap to a "first start of the day
   takes a moment" line); `not-found` reuses the existing copy; a new
   distinct `unreachable` copy; `LobbyDemoControls` renders **only** when
   the activity is the `1234` demo. All new copy through the humanizer
   skill.

**Done when:** typecheck/tests green; browser pass (verify skill, `?fast`
per its docs): join with a real code created via curl against the local
server → real lobby with no demo controls and no auto-pairing; lobby
refresh keeps the session; wrong code → not-found copy; server stopped →
unreachable copy while `1234` still works fully offline; demo lobby
unchanged. `pnpm format`, commit, tick the checkbox.

---

## Prompt 6 — Client wiring, teacher side (the feature completes)

**Goal:** teachers create real activities and host them at the private URL.

Read first: `client/src/components/Teacher/ActivitySetup/index.tsx`,
`client/src/lib/activitySetup.ts`, `client/src/lib/hostActivity.ts`,
`client/src/App.tsx`, the host page under
`client/src/components/Teacher/HostActivity/`, DECISIONS.md → "When the
backend arrives" and the host-page entries.

1. `lib/activitySetup.ts`: delete `buildHostedActivity`, `toCharacterId`,
   and the `chaverola.hostedActivity` stash (`saveHostedActivity` /
   `readHostedActivity` + call sites) — the hostKey URL is the durable
   hand-off now. Add `toCreateActivityRequest(draft)`: drop empty character
   rows, trim everything, omit blank email/scene, map the draft's `scene` →
   wire `scenario`. Delete `mockGenerateJoinCode` from
   `mockData/activityDemo.ts` (the server is the only issuer). Form inputs
   get `maxLength` from `SCENE_MAX_CHARS` / `EMAIL_MAX_CHARS` so the form
   can't accept what the server rejects.
2. `ActivitySetup/index.tsx`: submit becomes async — pending state that
   survives a ~60s cold start (no short client-side abort; the button stays
   disabled until the request settles — a retry after a lost response would
   mint a second activity), the same staged patience copy as the join page,
   warm-up ping on mount. Success → navigate to `/activity/host/${hostKey}`.
   Failure → inline banner near the CTA, distinct copy for unreachable vs
   server error (humanizer).
3. `App.tsx` + the host page: rename the host route param `:joinCode` →
   `:hostKey`. Resolution: param `"1234"` → the Rome demo, fully
   client-simulated, with demo banner and panels (the existing `/demo` →
   `/activity/host/1234` redirects keep working verbatim; a real key is 24
   chars, no collision). Any other param → `getHostedActivity`; not-found
   (including stale 4-digit host links) → a **friendly not-found screen
   replacing the demo redirect**, with copy acknowledging activities only
   live while class is running (free-tier truthfulness; humanizer). A real
   activity boots an empty, truthful host world: no `useHostActivityDemo`
   seeding, no pretend students, no demo panels, and the **live-settings
   panel hidden** (no edit endpoint yet — edits would be invisible to
   students and vanish on refresh; the panel returns with the edit-sync
   feature). `teacherEmail` shows on the host page; the queue and chats stay
   empty until the realtime feature.

**Done when:** typecheck/tests green; browser: create → land on a 24-char
host URL; refresh the host page — it refetches and survives; second tab
joins with the shown code; `/demo` flows byte-identical; garbage host key →
not-found. `pnpm format`, commit, tick the checkbox.

---

## Prompt 7 — End-to-end verification + prod cutover

**Goal:** the feature verified on production, docs true, nothing demo-side
regressed.

1. Full browser pass (verify skill; desktop and phone widths): on
   chaverola.com — create an activity, open the host URL, join from a
   second device/tab with the code, wrong-code and garbage-host-key
   not-found paths, `/demo`, `/demo/teacher`, `/demo/student` all fully
   intact, old-style 4-digit host URL → not-found.
2. Prod checks: a server-only push skips the Vercel build and deploys
   Render; a client-only push does the reverse (Build Filters); homepage
   load wakes a spun-down instance and an immediate create then succeeds;
   `/healthz` `commit` matches the deployed SHA;
   `grep -c zod client/dist/assets/index-*.js` → 0 after a local
   `pnpm build`.
3. Sweep for stragglers: any copy that skipped the humanizer, any doc
   statement Prompts 5–6 made stale (AGENTS.md status table, README), tick
   the final checkbox, and add a DECISIONS.md entry only if anything was
   decided during verification.

**Done when:** everything above passes on production. Commit, tick the
checkbox — feature 1 is live.
