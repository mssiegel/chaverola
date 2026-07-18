# API contract

The canonical home of Chaverola's HTTP API. Keep this file current as
features land — the wire types here mirror `shared/src/api.ts`, which is
what actually compiles against both the client and the server; if the two
ever disagree, the code is right and this file has a bug.

Implemented by `server/` (feature 1: create & join). Everything realtime —
queue, matching, chat, the teacher's live view — arrives in later features
over Socket.IO and is not part of this contract yet.

## Conventions

- **Base URL:** the client reads it from `VITE_API_URL`
  (`https://api.chaverola.com` in production; `http://localhost:3001` in
  local dev).
- All request and response bodies are JSON. Requests are capped at
  **16kb** (`express.json({ limit: "16kb" })`).
- Every 2xx body is a **named-member envelope** (`{ "activity": ... }`,
  never a bare object or array).
- Optional fields are **omitted** when absent — never `null`, never `""`.
- The server trims all strings before validating.
- Every response carries `Cache-Control: no-store`.
- Rate-limited responses use IETF draft-8 `RateLimit-*` headers.

## Wire types

From `shared/src/api.ts` (the activity types are in
`shared/src/types.ts`, limits in `shared/src/constants.ts`):

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

`Activity` is the **student projection**: `joinCode`, `hostName`,
`characters`, and optionally `scenario`. `HostedActivity` extends it with
`settings` and optionally `teacherEmail`. **Neither ever contains the
hostKey** — it appears only as the top-level `hostKey` member of the
create response.

## Endpoints

### `POST /activities` → `201 CreateActivityResponse`

Validates the body, mints character ids (the Unicode-aware slugger ported
from the client), issues a join code (uniform over the free codes in
1000–9999 minus `1234`; a dense fallback enumerates free codes when the
store is nearly full), and mints the hostKey
(`crypto.randomBytes(18).toString("base64url")` — 24 chars, 144 bits).

Errors:

- `400 invalid_json` — unparseable body (also: a body over 16kb comes
  back as `400 invalid_request`, never a mislabeled 500).
- `400 invalid_request` — validation failure, with `issues[]` naming each
  bad field by path.
- `429` — rate limited (see below).
- `503 capacity` — the store is at `MAX_ACTIVITIES`.

### `GET /activities/:joinCode` → `200 GetActivityResponse`

The student lookup. Returns **only the student projection** —
`teacherEmail`, `settings`, and the hostKey are absent by construction.

- Params that aren't exactly 4 digits, unknown codes, and **`"1234"`
  always** → `404 not_found` (the demo is fully client-simulated; the
  server never knows it, so a compromised server can't impersonate it).
- Does **not** refresh the activity's TTL — enumerating codes must not
  keep activities alive.

### `GET /activities/host/:hostKey` → `200 GetHostedActivityResponse`

The teacher lookup, by capability URL. Returns the full
`HostedActivity` — without echoing the hostKey back.

- Unknown keys and malformed params (including any 4-digit param — a join
  code structurally cannot unlock the host route) → `404 not_found`,
  indistinguishable from a miss.
- Refreshes the TTL: an activity stays alive as long as its host page
  keeps refetching.

### `GET /healthz` → `200 { ok: true, commit? }`

`commit` is Render's injected `RENDER_GIT_COMMIT`, absent locally.
Mounted **before** the rate limiters: it is the client's fire-and-forget
warm-up ping (fired from the homepage, create, and join pages) and
Render's health check — neither may burn limiter budget.

## Rate limits

Per-IP, sized for one school NAT (20 classes × 30 students = 600 users on
one IP — the sizing math is commented in `server/src/app.ts`):

- `POST /activities`: **60 / 15 min**.
- GET lookups (the joinCode and hostKey routes share one limiter):
  **1,200 / 5 min**.

429 responses use the shared error envelope with `code: "capacity"` — the
`ApiErrorCode` union deliberately has no rate-limit member (the client
treats every non-2xx the same), and the 429-vs-503 status keeps the two
capacity cases distinguishable.

## curl smoke

```bash
curl -s http://localhost:3001/healthz          # 200 {"ok":true}
curl -s -X POST http://localhost:3001/activities -H "content-type: application/json" \
  -d '{"hostName":"Ms. Cohen","characters":[{"name":"Brutus"},{"name":"Caesar"}],"settings":{"revealNames":true,"autoEndChats":true,"autoEndMinutes":7,"rematchWarning":true,"autoMatch":true,"autoMatchSeconds":20}}'
                                               # 201; note joinCode + hostKey
curl -s http://localhost:3001/activities/<joinCode>        # 200, student projection only
curl -s http://localhost:3001/activities/1234              # 404
curl -s http://localhost:3001/activities/host/<hostKey>    # 200, full activity
curl -s http://localhost:3001/activities/host/<joinCode>   # 404
```
