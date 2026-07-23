# Feature 11 — The transcript email ships (End activity + Gmail send)

The app has promised this email since the setup form shipped: the optional
"Your email" field says "We'll email you every chat from the activity once it
wraps up" ([`AboutYouFields.tsx:98-100`](../../client/src/components/Teacher/ActivitySetup/AboutYouFields.tsx)),
the homepage repeats it, and the live settings panel nudges teachers to add an
email mid-activity ([`LiveSettingsPanel.tsx:128-132`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)).
None of it is real. `teacherEmail` is captured at create and stored on
`StoredActivity` — and that's the end of the road: there is **no email
infrastructure anywhere** (no mail dependency, no SMTP config), **no
"activity ended" moment** (teachers can end chats, but the activity itself
only dies via the 12h TTL, the sweep, or a deploy), and the live panel's
email edits **never reach the server** — only `settings` sync
([`useHostActivityLive.ts:265-267`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts));
the "add your email" nudge writes to local React state and the value dies
with the tab.

One operational fact shapes the whole design: the server is a **single
in-memory Render free-tier instance that spins down when idle**. "Send it
later" (at the TTL, on a schedule) silently loses emails — the process is
usually gone before the timer fires. The send has to happen at a concrete
event while the server is demonstrably alive.

**Product calls (founder, 2026-07-23):**

- **An explicit "End activity" button** on the teacher's live page, behind a
  confirm dialog, is the send moment. Ending is **terminal**: every chat
  ends, students land on the ended screen, the join code dies. One activity →
  at most one email.
- **A fallback for the teacher who just closes the laptop:** ~10 minutes
  after the **last** teacher socket disconnects, send whatever transcripts
  exist (cancelled if a teacher reconnects; guarded so a later explicit End
  can't double-send).
- **Provider: Gmail SMTP via nodemailer** — the founder's Gmail plus an app
  password, two env vars on Render. In dev with no creds the mailer logs the
  email instead of sending, so the zero-env dev rule holds.
- **Lean V1, no retention machinery:** on End the activity is removed
  immediately after the send settles, through the store's existing removal
  path. The wrapped-up confirmation screen lives in the clicking tab's local
  state; a post-end refresh shows the normal not-found page and a second host
  device just sees the activity vanish. Accepted.
- **Ship fast: 2 automated tests total** (the transcript formatter and the
  send-once guard — the two places a bug would be silent). Everything else is
  verified in the browser.

## How to use this document

Same rules as features 4–10: each prompt is sized for one agent session, ends
green (`pnpm typecheck` + `pnpm test` + its own verification, production pass
included), gets **one commit straight to `main`**, and is safe to push on its
own. Run `pnpm format` before committing; record newly-made decisions in
`DECISIONS.md` + `docs/decisions/teacher-live.md`; run the humanizer skill on
all new user-facing copy (the email body counts). The prompts are sequential
(3 and 4 need 2's mailer; 3's confirm copy reads the email 1 keeps fresh) but
each leaves the app fully working.

- [x] Prompt 1 — teacherEmail live edits reach the server
- [x] Prompt 2 — Mailer + transcript formatter (server-only, invisible)
- [x] Prompt 3 — End activity, end to end
- [x] Prompt 4 — The 10-minute fallback send

## Shared context: the send-once guard

`StoredActivity.transcriptEmail: { to: string; state: "sending" | "sent" | "failed" } | null`
(init `null` in `createActivity`), mutated **only** inside
`sendTranscriptEmail(record, mailer, log)`. The guard's synchronous
null → `"sending"` check-and-set (before the first `await`) is what makes the
End-click vs. fallback-timer race safe — single-threaded JS, no locks needed.
One deliberate exception: `"failed"` admits one more attempt, so an explicit
End can retry after a failed fallback send. The helper also skips when the
record has no `teacherEmail` or no chats at all.

## Shared context: the wire contract additions

In `shared/src/socket.ts`, per `docs/adding-a-wire-event.md`, documented in
`docs/api.md`:

```ts
// ClientToServerEvents (teacher only, like settings:update):
"activity:update-email": (payload: { teacherEmail: string | null }) => void;
  // prompt 1 — null clears. No echo event; last write wins.
"activity:end": () => void;
  // prompt 3 — terminal; repeats while a send is in flight are dropped.

// ServerToClientEvents (to the clicking socket only, not the room):
"activity:end-result": (payload: {
  email: { to: string; state: "sent" | "failed" } | null; // null = nothing to send
}) => void; // prompt 3
```

No projection/allowlist changes: nothing here reaches a student socket, and
`activity:end-result` carries only what the teacher typed.

## Shared context: the deploy race

Prompts 1, 2, and 4 are benign in both directions (unknown events are dropped
by Socket.IO; the mailer is invisible). **Prompt 3 is the one that bites
client-ahead:** a client with the End button talking to a server without the
handler = a button that does nothing. Push the server commit first, poll
`/healthz` for it, confirm Vercel Ready, then do the production pass — and
within prompt 3 prefer server-then-client commit ordering if splitting.

---

## Prompt 1 — teacherEmail live edits reach the server

**Goal:** a teacher who adds or fixes their email in the live settings panel
("No email yet. Add yours to get every chat sent to you afterward") actually
changes where the transcripts go. Today that edit never leaves the tab.
Mirrors `settings:update` end to end, minus the multi-device echo.

1. **Wire** (`shared/src/socket.ts`): `activity:update-email` as above.
2. **Server** ([`handlers/teacher.ts`](../../server/src/live/handlers/teacher.ts),
   beside `settings:update` at line 245): validate with a zod schema in
   `server/src/schemas/activity.ts` —
   `z.union([z.null(), z.string().trim().min(1).max(EMAIL_MAX_CHARS).regex(EMAIL_PATTERN)])`
   (the same shared constants the create schema uses at
   [`activity.ts:96-101`](../../server/src/schemas/activity.ts)). Set or
   `delete` `record.teacherEmail`; log; no emit back.
3. **Engine seam** ([`hostEngine.ts`](../../client/src/components/Teacher/HostActivity/hostEngine.ts)):
   add `updateTeacherEmail(email: string | null): void`.
   [`useHostActivityLive.ts`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)
   emits the event; [`useHostActivityDemo.ts`](../../client/src/components/Teacher/HostActivity/useHostActivityDemo.ts)
   is a no-op (demo edits already flow through local `setActivity`).
4. **Call site** ([`HostActivityPage.tsx:255-259`](../../client/src/pages/teacher/HostActivityPage.tsx)):
   `handleActivityChange` currently emits only when a `settings` key changed —
   add a `teacherEmail` diff beside it → `engine.updateTeacherEmail(next.teacherEmail ?? null)`.
   Only send validated values: skip the emit while the draft has a
   `teacherEmail` problem (the panel already computes `problemFor("teacherEmail")`).
5. **Docs.** Fix the now-stale "characters/scenario/hostName edits stay
   local-only" comment at [`index.tsx:197-200`](../../client/src/components/Teacher/HostActivity/index.tsx)
   (email leaves that list); `docs/api.md`; amend the teacher-live decision
   about what syncs live.

**Edge cases (benign):** clearing the field sends `null` and deletes the
stored email — the teacher opted out, prompt 3's confirm copy will say so; an
invalid draft never emits (server zod is the backstop); a mid-edit disconnect
drops the edit exactly like settings edits today.

**Tests:** none — a validated-input write in the `settings:update` idiom,
nothing privacy-bearing.

**Done when:** `pnpm typecheck` + `pnpm test` green; browser pass — host a
real activity, add an email in the live panel, refresh the host page → the
email is still there (proof it round-tripped through the server); clear it,
refresh → still cleared; the `1234` demo unchanged with zero `/socket.io/`
traffic. Production pass on chaverola.com. `pnpm format`, one commit,
checkbox ticked.

---

## Prompt 2 — Mailer + transcript formatter (server-only, invisible)

**Goal:** the server can compose and send the transcript email, provably, with
zero user-visible change. Dev keeps needing no env vars.

1. **Dependency:** `nodemailer` in `server/package.json` (+
   `@types/nodemailer` as a dev dep — nodemailer ships no types).
2. **Config** ([`server/src/config.ts`](../../server/src/config.ts)): add
   `smtp: { user: string; pass: string } | null`, read from `GMAIL_USER` /
   `GMAIL_APP_PASSWORD`; `null` when either is missing.
3. **Mailer** (`server/src/email/mailer.ts`, new):
   `createMailer(config, log)` → `{ mode: "gmail" | "log", send({ to, subject, text }): Promise<void> }`.
   Gmail mode wraps `nodemailer.createTransport({ service: "gmail", auth })`;
   log mode logs the full composed email at info and resolves. Log the chosen
   mode once at boot.
4. **Formatter** (`server/src/email/transcript.ts`, new): pure
   `formatTranscriptEmail(record: StoredActivity): { subject: string; text: string }`.
   Plain text. Subject names the activity (host name, join code, date); body
   is a short header (hosted by, scenario if set) then each chat in creation
   order: a participants line built from `chat.members` ("Rachel as
   Brutus 🔪" — names were captured at chat start, so departed students still
   resolve, [`matching.ts:55-67`](../../server/src/live/matching.ts)), then
   the lines in the established teacher format `(Rachel) Brutus 🔪: text`,
   `(no messages)` for a silent chat, and a "showing the last 200 messages"
   note when a chat sits at `CHAT_TRANSCRIPT_MAX_LINES`. Humanizer pass on
   the copy.
5. **Send helper** (`server/src/email/sendTranscript.ts`, new):
   `sendTranscriptEmail(record, mailer, log)` implementing the send-once
   guard from the shared context.
6. **Store + plumbing:** add `transcriptEmail: null` to `StoredActivity` /
   `createActivity` ([`activityStore.ts`](../../server/src/store/activityStore.ts));
   create the mailer in `index.ts` and thread it onto `LobbyContext`
   (unused until prompt 3 — keeps that prompt pure feature).
7. **Ops docs:** `server/.env.example` + `docs/operations.md` — the two vars
   and the one-time manual step: Google account → 2-Step Verification on →
   myaccount.google.com/apppasswords → create a "Chaverola" app password →
   paste both vars into Render's Environment tab (strip the spaces Google
   displays in the 16-char password). Note Gmail's ~500 sends/day ceiling —
   irrelevant at launch scale.

**Tests — the two sanctioned ones** (`server/src/email/*.test.ts`):
formatter (participant naming incl. a departed member, the line format, an
empty chat, the cap note) and the send-once guard (fake mailer: two calls →
exactly one send; a `"failed"` record admits exactly one retry; no email / no
chats → no send).

**Done when:** `pnpm typecheck` + `pnpm test` green; dev boot logs the
log-only mailer line; nothing user-visible changed anywhere. The real Gmail
leg gets proven the first time a real activity is ended after prompt 3.
Production pass is just a healthy deploy. `pnpm format`, one commit, checkbox
ticked.

**As built (2026-07-23), with the product calls made this session:**

- Subject is `${hostName}'s Chaverola activity (code ${joinCode})` — **no
  date** (Render is UTC; a stamped date is wrong for an evening class, and
  Gmail timestamps in the reader's zone).
- Log mode splits by env: **dev logs the full composed email**, **production
  logs a warning with recipient + line count only, never the student
  messages** (Render's log stream isn't a place for transcripts).
- The send-once guard **skips a silent activity** (chats but no messages),
  same as no chats — prompt 3's "nothing to send" card covers it.
- The participants line **marks a student who left mid-chat** (`(left
partway)`); departed members still resolve off `chat.members`.
- Each chat block gets a **numbered heading** (`Chat 3 of 15`) so a long
  email stays scannable.
- `characterLabel`'s `name + emoji` join **moved to `shared/`**
  (`shared/src/labels.ts`), so the server formatter and the client share one
  rule; the client keeps a thin `Participant` wrapper. (Chosen over a
  server-local copy to honor the single-formatter decision.)
- `/healthz` was **left unchanged** (a `mail` field was considered and cut to
  stay minimal).
- The homepage's stale "full transcript" claim vs. the 200-line cap is
  **left to feature 20** (docs & copy drift).

---

## Prompt 3 — End activity, end to end

**Goal:** the teacher clicks **End activity**, confirms, watches "sending…"
become "sent to you@school.org", and every chat from the class is in their
inbox. Students land on the existing activity-over screen; the join code
dies. The demo simulates it offline.

1. **Wire** (`shared/src/socket.ts`): `activity:end` + `activity:end-result`
   as in the shared context.
2. **Server handler** ([`handlers/teacher.ts`](../../server/src/live/handlers/teacher.ts)),
   an async `activity:end` in this order:
   1. Look up via `getByHostKey`; drop if gone, drop if
      `transcriptEmail?.state === "sending"` (double-click / second device).
   2. `releaseAutoMatch(joinCode)` **first** — otherwise the auto-match tick
      could pair freshly-freed students into new chats during the send await.
   3. Loop [`endChat()`](../../server/src/live/matching.ts) over every active
      chat **without** `settleMembershipChange` — removal boots the students
      wholesale in step 6, and settling here would flash a second ended
      screen. The flips make the store truthful for the formatter.
   4. `await sendTranscriptEmail(record, mailer, log)`.
   5. `socket.emit("activity:end-result", …)` to the clicking socket only —
      `{ to, state: "sent" | "failed" }`, or `email: null` when nothing was
      sent (no email set / no chats).
   6. Store `remove(record)` (export the existing private helper or a thin
      `removeActivity(joinCode)` — [`activityStore.ts:135-139`](../../server/src/store/activityStore.ts)).
      `onActivityRemoved` ([`lobby.ts:78-86`](../../server/src/live/lobby.ts))
      already clears seat timers, sends every student `activity:ended`, and
      disconnects all sockets — the entire teardown, reused. If the teacher
      vanished mid-send, step 5 goes nowhere and removal still runs: the
      email is safe.
3. **Engine seam** (`hostEngine.ts`): `endActivity(): void` plus an
   `ended: { email: { to: string; state: "sending" | "sent" | "failed" } | null } | null`
   field (null = still live).
4. **Live engine** (`useHostActivityLive.ts`): on `endActivity()` set `ended`
   locally — `{ email: { to, state: "sending" } }` when `activity.teacherEmail`
   is set, `{ email: null }` when not — then emit `activity:end`. Listen for
   `activity:end-result` to settle the state. **Terminal latch:** once
   `ended` is non-null, ignore `connect_error` / `activity_gone` / disconnect
   so the wrapped screen never flips to not-found when the server removes the
   activity under us.
5. **Demo engine** (`useHostActivityDemo.ts`): end all demo chats, set
   `ended` locally (`"sent"` when the demo teacher typed an email, else
   `email: null`). Zero network; the wrapped card carries a demo-honest line
   ("This is the demo — nothing was actually emailed").
6. **UI** ([`index.tsx`](../../client/src/components/Teacher/HostActivity/index.tsx)):
   a small "Wrap up" block at the **bottom** of the page, below
   `CompletedChatsSection` — one line naming where the email will go (or that
   no email is set) + a destructive-outline **End activity** button. It's a
   page-level terminal action, deliberately not in the chats toolbar next to
   "End all chats". When `engine.ended` is non-null render a new
   `WrappedUpCard.tsx` **instead of** the dashboard sections: sending… /
   "sent to {to}" / the failure state ("We couldn't send the email. Your
   chats are still below — copy anything you need before closing this tab.")
   / the no-email variants — with `CompletedChatsSection` rendered beneath it
   from local state (the failed-case escape hatch) and a "Set up a new
   activity" link.
7. **Confirm** ([`confirmCopy.ts`](../../client/src/components/Teacher/HostActivity/confirmCopy.ts)):
   add `{ kind: "end-activity" }` to `PendingAction` with copy that names the
   consequences — chats end for everyone, students see the activity is over,
   the join code stops working — and the email destination (or "no email is
   set, so nothing will be emailed"). Humanizer pass on all new copy.
8. **Students: zero changes.** `activity:ended` already routes every student
   — lobby, chatting, or ended-screen — to the existing activity-gone flow.
9. **Docs.** `docs/api.md`; DECISIONS + teacher-live entries (the End button,
   terminal semantics, lean no-retention call and its accepted refresh
   behavior).

**Edge cases:** double-click or a second device racing End → the `"sending"`
guard drops the repeat, one email; End with no email set → confirm says so,
activity still ends, `email: null` card; SMTP failure → `"failed"` card with
the transcripts readable below; students typing during the send window → chat
status is already `"ended"`, lines are dropped; teacher closes the tab right
after confirming → send completes anyway, the result emit is lost, which is
fine.

**Tests:** none new — the guard and formatter are pinned in prompt 2; the
flow is browser-verified.

**Done when:** `pnpm typecheck` + `pnpm test` green; dev pass
(`tools/verify` at `--scale 10` or `pnpm dev`) — teacher + two students
chat → End activity → confirm → "sending…" → the dev mailer logs the full
email (eyeball the format against the formatter spec) → "sent to …";
students land on the activity-over screen; the join code no longer resolves;
a host-page refresh shows not-found (accepted); End with no email set shows
the right copy end to end; the `1234` demo ends offline with the demo-honest
line. **Production pass:** push server first, poll `/healthz`, Vercel Ready,
then end a real activity on chaverola.com with your own email and read the
actual Gmail-delivered transcript. `pnpm format`, commit(s), checkbox ticked.

---

## Prompt 4 — The 10-minute fallback send

**Goal:** a teacher who never clicks End and just closes the laptop still gets
the transcripts: ~10 minutes after the last teacher socket disconnects, the
server sends whatever exists. Reconnecting cancels it; an explicit End before
or after can't double-send.

1. **Timing** ([`server/src/live/timing.ts`](../../server/src/live/timing.ts)):
   `transcriptFallbackMs` = scaled 10 minutes, so `CHAVEROLA_TIME_SCALE=10`
   gives a 60s fallback in dev.
2. **Timer module** (`server/src/live/transcriptFallback.ts`, new): a
   per-joinCode `Map` of timeouts; `armTranscriptFallback(ctx, joinCode)`
   (`.unref()`'d; re-arm replaces any pending timer) and
   `cancelTranscriptFallback(joinCode)`. On fire: `getByJoinCode` (the
   non-TTL-refreshing lookup — the fallback must not keep the activity
   alive); if the record is gone, has no email, or has no chats, do nothing;
   else `sendTranscriptEmail(record, mailer, log)`. No emits — nobody is
   listening.
3. **Arming** ([`handlers/teacher.ts`](../../server/src/live/handlers/teacher.ts)):
   on teacher connect, `cancelTranscriptFallback` beside `armAutoMatch`; in
   the disconnect handler (lines 262-266), scan `io.sockets.sockets` for
   another connected **teacher** socket on the same joinCode excluding the
   disconnecting `socket.id` (don't trust removal ordering during the
   `disconnect` event) — none found → arm. Stateless, no second refcount
   beside auto-match's.
4. **Cleanup** ([`lobby.ts`](../../server/src/live/lobby.ts)):
   `cancelTranscriptFallback` in `onActivityRemoved` — which also covers the
   explicit End path, since End removes the record.
5. **Docs.** DECISIONS + teacher-live entry: why a fallback (free-tier
   spin-down makes anything later unreliable), why 10 minutes, cancelled on
   reconnect, best-effort by design.

**Edge cases:** teacher reconnects at minute 9 → cancelled, re-armed on their
next disconnect; fallback fires then the teacher returns and clicks End →
the `"sent"` guard blocks a second email and the wrapped card reports sent;
fallback send fails → `"failed"` admits the one explicit-End retry; two host
tabs → closing one arms nothing; messages sent after the fallback fired are
lost to the email — best-effort, accepted; server spins down inside the 10
minutes → nothing anyone can do, in-memory by design.

**Tests:** none new — send-once is pinned in prompt 2.

**Done when:** `pnpm typecheck` + `pnpm test` green; dev pass with
`CHAVEROLA_TIME_SCALE=10` — close the teacher tab mid-class → the fallback
email appears in the server log ~60s later; reopen inside the window →
cancelled (no email); two teacher tabs, close one → nothing arms; fallback
fires, teacher returns, End → no second send. Production pass: close the real
host tab, get the email ~10 minutes later. `pnpm format`, one commit,
checkbox ticked.
