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
- **Client build — confirm Vercel is Ready.** `vercel ls chaverola --prod`
  lists recent production deployments; confirm the latest one is **Ready**,
  not Canceled or Building, and `vercel inspect <url>` to see that
  `https://chaverola.com` is among its aliases. `/healthz` does not
  catch a skipped client build — a code commit followed by a docs-only
  tip commit deploys the server and silently skips Vercel, leaving a new
  server against an old client indefinitely (see AGENTS.md → Working
  Rules → the tip commit must touch `client/`).
  - **Name the project, or you will read the wrong dashboard.**
    `client/.vercel/project.json` is a stale link to a **different** Vercel
    project also called `client`, whose last production deployment is an
    old **Error**. A bare `vercel ls --prod` run from `client/` reports
    that one and looks exactly like a failed deploy of this site. The live
    site is the `chaverola` project (`vercel project ls` shows both), so
    pass the name explicitly. The stale link is local and gitignored;
    deleting it is safe but nothing in the repo depends on it either way.

## Recovering a skipped client build

When a push's tip commit is docs-only, Vercel's Ignored Build Step cancels the
client build and the code commits under it never reach chaverola.com — a
permanent split, green on both dashboards (AGENTS.md → Working Rules → the tip
commit). `vercel ls` shows it as a **Canceled** production deployment with a
~1s duration, and the newest **Ready** one predating the code commit.

The fix is a CLI deploy, which uploads local source and builds it directly —
the Ignored Build Step gates only git-triggered deploys:

```powershell
# from the REPO ROOT, not client/
vercel --prod --yes
```

**Run it from the repo root.** From `client/` it fails with
`Command "npm install" exited with 1`: the CLI uploads only that directory, so
the workspace root is absent and `@chaverola/shared` (a `workspace:` dep) can't
resolve. From the root the whole monorepo uploads and the project's Root
Directory setting still points the build at `client/`. Commit first — the
deploy builds the working tree, so anything uncommitted ships too.

Verify it landed by grepping the served bundle for a string the stranded commit
changed, not by trusting Ready:

```bash
BUNDLE=$(curl -s https://chaverola.com/ | grep -o '/assets/index-[A-Za-z0-9_-]*\.js' | head -1)
curl -s "https://chaverola.com$BUNDLE" | grep -c "some new string"
```

The resulting deployment isn't tied to a git SHA, which is fine — the next push
whose tip touches `client/`, `shared/`, or a root manifest takes over normally.
(Used 2026-07-26, when feature 20's docs-only tip commit stranded feature 19's
client changes.)

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

## Search Console — the four numbers worth watching

Canonical tags, hreflang pairs, a sitemap and structured data all shipped from
the [SEO effort](plans/seo/README.md) without producing any feedback in the repo.
Search Console is the only place that says whether Google accepted them, ignored
them, or found them contradictory.

### Verification: a Domain property, by DNS TXT

`chaverola.com` is registered at **Squarespace**: Domains → chaverola.com → DNS
→ DNS Settings → Custom Records, then host `@`, type `TXT`, data the whole
`google-site-verification=…` string Search Console hands you. A DNS change takes
a while to publish, so a first Verify that fails means wait and retry, not
reissue the token.

Verify a **Domain** property, not a URL prefix. A Domain property covers the
apex, `www`, and both protocols at once, and `www.chaverola.com` 308s to the apex
— so a URL-prefix property on `www` reports almost nothing, forever, and reads as
an SEO failure rather than a mis-picked property. DNS verification also survives
a hosting change, which a tag on the page or a file in the output does not.

There is deliberately **no verification meta tag in the HTML and no token file in
`client/public/`** — see DECISIONS.md → [Search Console is verified by DNS, not
by a tag on the
page](decisions/analytics.md#search-console-is-verified-by-dns-not-by-a-tag-on-the-page).

### Bing: not set up, and one step away if it ever matters

**Only Google is verified** (founder call, 2026-07-28 — Bing wasn't worth the
attention at this stage). Nothing in the repo depends on that, and reversing it is
cheap: Bing Webmaster Tools imports a verified Search Console property in one step
and brings the sitemap with it. Do that rather than verifying Bing on its own,
which is repeated work for the same result.

**IndexNow is deliberately skipped.** It pushes instant change notifications for
large, fast-moving sites. Ten static URLs that change a few times a year gain
nothing from it, and it would be one more key to hold.

### Once, right after verifying

- **Submit the sitemap** at `https://chaverola.com/sitemap.xml`. It is generated
  at build time by `client/scripts/prerender-head.mjs`, so confirm it serves
  `application/xml` and lists ten `<loc>` entries before submitting — when a
  push's client build is skipped that URL answers 200 with the SPA shell instead
  (see [Recovering a skipped client build](#recovering-a-skipped-client-build)),
  and a sitemap that resolves to HTML starts the relationship badly.
- **Run URL Inspection on `/` and `/he`.** It is the one place that shows the
  **crawled** HTML beside the **rendered** HTML, which makes it the direct proof
  that the prerendered heads reached the bytes and not only the browser.

### Then four numbers, and only four

- **Performance → Queries.** Which words teachers actually arrive on. The only
  feedback loop that can say whether the meta copy guessed right, and worth more
  than the other three put together.
- **Page indexing → whether `/he` URLs are indexed at all.** Hebrew is equal
  priority for this product, and this is the number that says whether that
  landed. Search Console **retired its International Targeting report in 2022**,
  so hreflang errors surface nowhere in the UI — don't hunt for a report that no
  longer exists. Validate the tags with a third-party hreflang checker instead.
- **Page indexing → Soft 404.** Every unknown path answers HTTP 200 with the
  shell (the catch-all rewrite in `client/vercel.json`), so Google will report
  soft 404s. This count is the honest way to decide whether fixing that is worth
  the work: small and stable means it isn't.
- **Page indexing → "Duplicate without user-selected canonical"** and
  **"Alternate page with proper canonical tag".** The first should stay empty. If
  it fills, a canonical tag and the sitemap's `<loc>` disagree somewhere —
  classically by a trailing slash. Both come from `pageUrls()` in
  `client/src/lib/prerenderMeta.ts`, one function precisely so they can't, which
  makes a disagreement a sign that something started building URLs a second way.

**Expect nothing for weeks.** A new site with no backlinks gets crawled slowly,
so an empty report in week one carries no information. Check monthly, not daily.

## Gmail app password (the transcript email)

The transcript email (feature 11) sends over Gmail SMTP. It needs two env
vars on Render — `GMAIL_USER` (the full Gmail address) and
`GMAIL_APP_PASSWORD` (a Google app password, not the normal password). With
either missing the server runs in log-only mode, so this is production-only
setup; dev needs nothing.

> **`chaverola-api` must stay on a paid instance type.** Render blocks
> outbound traffic to SMTP ports 25, 465, and 587 on **free** web services
> (since 2025-09-26), so on a free instance the send dies at the socket with
> `ESOCKET` / `ENETUNREACH … :465` and `command: "CONN"` no matter how correct
> the credentials are. Ports 465 and 587 work on any paid plan; port 25 is
> blocked on every plan (Render runs on EC2). If transcripts ever stop sending
> right after a plan change, check this first — see DECISIONS.md → "The API
> runs on a paid Render instance".
>
> It's the **instance type**, not the workspace plan. Render's own free-tier
> docs: "Upgrading your workspace plan does _not_ remove limitations on Free
> instances." Paying for a Professional **workspace** leaves the service on a
> Free **instance**, SMTP still blocked, money spent for nothing. The control
> is `chaverola-api` → Settings → Instance Type. The pricing page leads with
> workspace plans, which is what makes this easy to get wrong.

One-time steps on the sending Google account (`siegel.moshes@gmail.com`):

1. Turn on 2-Step Verification — app passwords don't exist without it:
   https://myaccount.google.com/signinoptions/twosv
2. Create the password at https://myaccount.google.com/apppasswords — name it
   "Chaverola", click Create. Google shows 16 characters as four groups of
   four (`abcd efgh ijkl mnop`), once.
3. **Strip the spaces** — the real password is the 16 characters with no
   spaces.
4. In Render's Environment tab for `chaverola-api`
   (`srv-d9ducu3bc2fs73esrr8g`) add `GMAIL_USER` and `GMAIL_APP_PASSWORD`,
   then let it redeploy.

Confirm it took: the boot log's mail line reads `mode: "gmail"` ("mailer
ready — sending via Gmail SMTP") instead of the log-only line. A wrong or
revoked password doesn't fail at boot (nodemailer connects lazily) — it
surfaces only as a `"transcript email failed"` error in the logs when an
activity ends, so if transcripts stop arriving, check there first. Read the
`err` before regenerating anything — the failure stage names the cause:

- `command: "CONN"` with `ESOCKET` / `ENETUNREACH` / `ETIMEDOUT` — the socket
  never opened, so the password was never offered. That's the blocked-port
  case above (a free instance), not a bad credential.
- `command: "AUTH …"` with a 535 (`Username and Password not accepted`) — that
  really is the password. Regenerate it, and re-paste the 16 characters with
  the spaces stripped.

Gmail caps a normal account at ~500 sends/day, which is far above launch scale.

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
