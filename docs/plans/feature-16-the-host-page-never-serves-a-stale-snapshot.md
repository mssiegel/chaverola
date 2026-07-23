# Feature 16 — The host page stops serving a create-time snapshot after in-session navigation

**Reproduce this before fixing it.** It came out of a single audit sweep and
nothing cross-verified it, and one detail is already known to be wrong: the sweep
said the teacher gets back to the host page "via the logo", but the logo is **not
on that page** — [`AppLayout.tsx:39-41`](../../client/src/components/layout/AppLayout.tsx)
computes `hostingLiveActivity` and
[`AppLayout.tsx:47-62`](../../client/src/components/layout/AppLayout.tsx) drops
the brand link on a live host route. Treat the whole finding as unconfirmed until
you watch it happen.

**The reproduction (do this first):**

1. Create a real activity and land on `/activity/host/<hostKey>`.
2. Open **Edit activity settings**, set **Your email**, and wait out the commit —
   confirm it reached the server (the server log line, or a hard reload).
3. Navigate away and back **inside the same tab, without reloading**. Two paths
   exist here: the navbar language switcher
   ([`LanguageSwitcher.tsx:34-38`](../../client/src/components/layout/LanguageSwitcher.tsx)
   — `/activity/host/KEY` and `/he/activity/host/KEY` are separate branches of
   the route tree, [`App.tsx:72-75`](../../client/src/App.tsx), so the page
   unmounts and remounts), and browser Back/Forward (create pushes rather than
   replaces, [`ActivitySetup/index.tsx:197-201`](../../client/src/components/Teacher/ActivitySetup/index.tsx),
   and the host page arms no back guard).
4. Open the panel again. If the address is gone, the bug is real: the page is
   rendering the activity as it was at create time, minutes of edits ago.

**Probe with the email, not a setting.** If
[feature 14](./feature-14-settings-survive-a-sleeping-host-device.md) has
shipped, `settings` ride `chats:snapshot` and a remount builds a **new** socket
(the engine's connection lives in a mount-scoped effect,
[`useHostActivityLive.ts:137-141`](../../client/src/components/Teacher/HostActivity/useHostActivityLive.ts)),
so a settings probe self-heals — a false negative that would close this doc
wrongly. That fold replaces `settings` and nothing else
([`HostActivityPage.tsx:248-249`](../../client/src/pages/teacher/HostActivityPage.tsx));
the email rides no snapshot and has no echo, by decision
([`teacher-live.md:8-38`](../decisions/teacher-live.md)).

**The reported mechanism.** The create submit hands the freshly minted activity
across the navigation through a module-level map —
[`ActivitySetup/index.tsx:200`](../../client/src/components/Teacher/ActivitySetup/index.tsx)
calls `primeHostedActivityLookup`, which writes into `handedOff`
([`useHostedActivityLookup.ts:29-36`](../../client/src/lib/useHostedActivityLookup.ts)).
Nothing ever removes that entry. The lookup effect skips its fetch whenever
`attempt === 0 && handedOff.has(hostKey)`
([`:62-64`](../../client/src/lib/useHostedActivityLookup.ts)), and the state that
would outrank the map — `settled`
([`:51-55`](../../client/src/lib/useHostedActivityLookup.ts), consulted at
[`:94-112`](../../client/src/lib/useHostedActivityLookup.ts)) — is component state
that dies with the component. A remount starts over with `attempt === 0`, a null
`settled`, and a create-time entry still in the map: it serves that entry and
never asks the server. Settings, email, roster, host name and scene reach the
client through `GET /activities/host/:hostKey` and nowhere else
([`handlers/teacher.ts:60-62`](../../server/src/live/handlers/teacher.ts)).

**Why it is worse than a stale display.** The stale object becomes the base of
the next write. [`HostActivityPage.tsx:239`](../../client/src/pages/teacher/HostActivityPage.tsx)
seeds `activity` from the lookup, the panel seeds its draft from that
([`LiveSettingsPanel.tsx:47-49`](../../client/src/components/Teacher/HostActivity/LiveSettingsPanel.tsx)),
and the next commit through [`HostActivityPage.tsx:255-270`](../../client/src/pages/teacher/HostActivityPage.tsx)
sends the whole settings object, which the server stores as a full replace
([`handlers/teacher.ts:248-263`](../../server/src/live/handlers/teacher.ts)) — so
flipping _any_ switch after the remount silently undoes every settings edit made
before it. The email is worse: the diff at `:266` compares the stale value
against itself, so retyping the address on screen emits nothing at all. That is
feature 11's whole subject.

**Decisions this works within, and does not supersede.** "Settings edits sync for
real; characters, scenario, and host name stay local"
([`docs/decisions/teacher-live.md`](../decisions/teacher-live.md), 2026-07-19)
chose the full settings object precisely so the panel would stop "silently
reverting on refresh"; this doc makes that guarantee hold for in-session
navigation too. "The brand home link disappears mid-chat and while hosting"
([`docs/decisions/navbar.md`](../decisions/navbar.md), 2026-07-15) deliberately
kept the language switcher on this page; that stands unless the founder says
otherwise, and the fix is needed either way since Back/Forward can't be gated.

**The design being worked around — don't break it.** The hand-off map exists so
create → host doesn't burn a second lookup and flash a loading screen over data
the client received milliseconds earlier. It is read at render time, which is
only safe on a fresh mount: the sibling comment at
[`useActivityLookup.ts:29-41`](../../client/src/lib/useActivityLookup.ts) records
a React Compiler gotcha from feature 1's verification — the compiler may cache a
render-time `handedOff.get(...)` and never observe a later write. Any fix must
keep create → host fetch-free and add no render-time write to that map.

- [ ] Prompt — A teacher who navigates away and back sees the live activity, not the create-time copy

---

## Prompt — A teacher who navigates away and back sees the live activity, not the create-time copy

**Goal:** a teacher mid-class who switches language, or taps Back and then
Forward, returns to a host page showing the settings and email the server
actually holds — and their next flip of a switch doesn't quietly roll the class
back to how it was set up. If the bug doesn't reproduce, the goal is instead a
closed doc that says so, with the paths that were tested written down.

1. **Reproduce it first**, exactly as above, on the local stack (`pnpm dev`) with
   a real join code and the **email** probe. Try both navigation paths. Watch the
   Network tab: the give-away is the absence of a second
   `GET /activities/host/...` on the return. **If neither path reproduces it with
   an honest probe, stop.** Do not invent a fix. Replace this prompt's body with
   what you ran and what you saw, tick the box, and land that as the commit — a
   recorded no-op beats a speculative change to a hook two flows depend on.
2. **If it reproduces, fix the lookup, not the callers.** The change belongs in
   [`useHostedActivityLookup.ts`](../../client/src/lib/useHostedActivityLookup.ts)
   and should be describable in one sentence. The leading candidate is to make
   the primed entry **one-shot**: the effect at `:62-64`, instead of returning
   early forever, consumes the entry once — settles it into `settled` and deletes
   it from the map — so the first mount stays fetch-free and every later mount
   fetches normally. Consuming inside the effect (never during render) keeps the
   React Compiler caveat satisfied, and `settled` already outranks the map at
   `:94-112`, so a memoized `.get` can't resurrect the stale value. Alternatives
   worth a moment: drop the skip entirely and accept a loading flash on create →
   host, or keep the entry but refetch in the background. Pick the smallest that
   survives the edge cases; no new module, no new state shape, no caching
   abstraction.
3. **Update the hook's docblock** at `:21-28`, which promises the map is "safe to
   read at render time ONLY on a fresh mount" — true and now insufficient; say
   what bounds an entry's life. If the student-side comment at
   [`useActivityLookup.ts:29-41`](../../client/src/lib/useActivityLookup.ts)
   describes the same hazard (check whether a student can remount
   `/activity/join/:code` in-session), note it there in one line; the student
   lookup is out of scope.
4. **Docs.** A bug fix inside existing behavior, so nothing in `docs/api.md` or
   `docs/architecture.md` moves. If step 2 makes a product call, record it in
   `DECISIONS.md` plus
   [`docs/decisions/teacher-live.md`](../decisions/teacher-live.md) in the same
   commit.

**Ask the founder** (when you run this prompt, and only if it reproduces):

- What should the host page show during the refetch on a return navigation?
  Today's "Finding your activity…" screen is honest, but it's a visible stall
  mid-class and up to ~30 seconds against a cold free-tier server. The
  alternative is rendering the last-known activity immediately and folding the
  fresh copy in when it lands — no flash, a second or two of knowingly stale
  switches.
- Secondary, only if the language switcher is the reproducing path: should the
  switcher also disappear on a live host page, the way the brand link does?
  `docs/decisions/navbar.md` deliberately kept it. Removing it closes one route
  into this bug but not the Back/Forward one, so raise it, don't bundle it.

**Edge cases:** React `StrictMode` is on in dev
([`main.tsx:17-23`](../../client/src/main.tsx)), so a consume-in-effect fix
double-invokes and create → host fires one extra fetch in dev only — confirm it's
one extra, not a loop, and that production stays fetch-free. The manual **Try
again** button advances `attempt`
([`:89`](../../client/src/lib/useHostedActivityLookup.ts)) and must keep working
after the entry is gone. A refetch that comes back `not-found` must land on the
normal not-found screen, not a blank one. A remount while the class is live
re-establishes the teacher socket — check auto-match comes back armed, not
double-armed. If [feature 15](./feature-15-the-panel-respects-a-dropped-connection.md)
shipped, the language switcher is **both** a flush point and a refetch point, so
check the `GET` can't return a copy predating the flush and paint the edit away
(if it can, the fix is ordering, not a new mechanism). The demo never consults
this hook
([`HostActivityPage.tsx:48-55`](../../client/src/pages/teacher/HostActivityPage.tsx))
— confirm it, don't assume it.

**Tests:** none. The mechanism is a hook's mount-and-remount behavior and the
client suite is deliberately DOM-free, so any test here would be scaffolding
around the thing rather than the thing. The failure is loud in a browser once you
know the steps, and step 1 is exactly those steps.

**Done when:** `pnpm typecheck` + `pnpm test` green; the reproduction run again
on the fixed build — set an email, switch language and back, it's still there;
the same for Back/Forward; then change a setting and hard reload, and both
survive (proof the stale full-replace is gone). Create → host still lands with no
second `GET /activities/host/...` and no loading flash. The `1234` demo host page
unchanged, zero `/socket.io/` traffic. Phone width checked, since the language
switcher is a navbar control. `pnpm format`, one commit straight to `main`,
checkbox ticked. Client-only, so no `shared/` deploy race — but the tip commit
touches `client/`, so confirm Vercel's latest production deployment is Ready for
the SHA you pushed.
