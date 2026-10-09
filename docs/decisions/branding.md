# Branding & page titles

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

### English homepage search copy leads with the activity rather than its price

_2026-10-09_

**Decision:** The English homepage title is "Classroom Roleplay Chat Activities
| Chaverola". Its description emphasizes excitement about learning, student
conversation, collaboration, and thinking about the material through roleplay.
Neither the homepage metadata nor the English
fallback description leads with or mentions "free". The same homepage copy
feeds its Open Graph tags. Hebrew metadata and other pages keep their copy.

**Why:** Product-owner feedback: leading with "free" makes the product feel
cheap in search results. The activity itself should be the reason to click.
This overrides the English homepage's price emphasis in
[The meta title is written for a search result, not for the page, and the demo carries its own](#the-meta-title-is-written-for-a-search-result-not-for-the-page-and-the-demo-carries-its-own).
The page-name-first title format and factual pricing data still stand.

_Implemented in the English home catalog and [index.html](../../client/index.html)._

### There is a Hebrew fallback shell too, and an unprefixed URL is still English

_2026-07-27_

**Decision:** `pnpm build` emits a second fallback, `dist/he-app.html` — the
same shell stamped `lang="he" dir="rtl"`, titled חברולה, and carrying a new
Hebrew sentence, `shell.description` in the `common` catalog.
[`vercel.json`](../../client/vercel.json) routes `/he/…` to it and everything
else to `app.html`, with the `/he/` rule ahead of the catch-all. Both still sit
behind the filesystem check, so the ten prerendered files keep winning: `/he`
itself never reaches the rule.

This extends [The prerendered shell splits in
two…](#the-prerendered-shell-splits-in-two-and-apphtml-is-the-one-that-keeps-the-generic-pair)
rather than replacing it. That entry's split stands exactly as written; there
is now one more file on the far side of it.

**Why:** That entry named the case and left it open: "every `/he/… session`"
was listed among the URLs `app.html` serves, which meant a Hebrew teacher
mid-class had an English tab title, and a Hebrew session link pasted into a
staffroom WhatsApp unfurled in English. Hebrew is a first-class product here,
not a translation layer ([The Hebrew demo is re-cast, never
translated](demo-flows.md#the-hebrew-demo-is-re-cast-never-translated)), so the
prefix that already decides the page's language now decides its shell's too.

**The limit, stated rather than chased:** a Hebrew-preferring visitor who opens
a bare English session URL still gets `app.html`. The path carries no
preference for a static host to read, and boot corrects the page to Hebrew a
moment later exactly as it does today. Serving Hebrew off `Accept-Language`
would need an edge function and would make a cached response depend on a header,
which is a worse trade than one English frame.

The new file is not a page and does not pretend to be one. It carries **no
canonical and no `hreflang`**: ten URLs share it, so a canonical would name nine
of them wrongly, and pointing every mistyped `/he` path at the Hebrew homepage
would consolidate garbage into it. Keeping those URLs out of the index is
[`robots.txt`](../../client/public/robots.txt)'s job, which disallows
`/he-app.html` beside `/app.html`. Its `og:url` says `/he`, the one field a
shared session link cannot answer honestly, matching what `index.html`'s
hand-written twin already claims for English. It **does** carry `og:locale`,
which `index.html` deliberately omits — that block serves both languages and
claiming `en_US` to a Hebrew reader is worse than claiming nothing, while this
one serves a single language and so cannot be wrong about it.

The English sentence keeps its home in `client/index.html`, because `app.html`
is also the template the writer script re-stamps every page from and has to stay
untouched. `shell.description`'s English value is therefore a pinned mirror that
nothing reads, kept identical so the two can be diffed by eye — the same
admission `share.cardAlt` and `SITE_ORIGIN` already make about the same file. A
third language would add a catalog pair, a rewrite rule and a `Disallow` line;
the emitter itself walks `LOCALES` and needs no edit.

_Implemented in [prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts)
(`fallbackShells`), [prerender-head.mjs](../../client/scripts/prerender-head.mjs),
[vercel.json](../../client/vercel.json),
[robots.txt](../../client/public/robots.txt), the `common` catalogs, and the head
comment in [index.html](../../client/index.html)._

### A pasted link shows a card, and it's one image and one tag set for the whole site

_2026-07-27_

**Decision:** `client/public/og-card.png` — 1200×630, the grape gradient, the
logo mark, "Chaverola", and the line "A free classroom roleplay activity" — is
the picture every Chaverola link unfurls with. `client/index.html` carries the
Open Graph set that points at it, so a link pasted into Slack, WhatsApp,
iMessage, LinkedIn or a Gmail compose window shows a branded card instead of a
bare text row.

`og:title` and `og:description` are the `<title>` and description already in
that file, not a third set written for social. Nothing suggests a different
sentence performs better, and a third set is a third thing to keep in sync. The
title stays the bare brand for the reason it always has: this shell serves every
unmatched URL, student sessions included.

`twitter:card` is the only `twitter:*` tag, and the omission is the decision. X
and the other consumers of those tags fall back to the `og:*` equivalents for
title, description and image, so a parallel `twitter:title` / `twitter:description`
/ `twitter:image` set would be three more strings to keep in sync for no change
in what anyone sees.

One card for both locales, and the mark inside it is not mirrored — the same
call [the logo mark
makes](#the-brand-is-חברולה-in-hebrew-and-the-logo-mark-never-mirrors).

**Update (2026-07-27):** the ten prerendered URLs now carry their own tag set
rather than the shell's, so the demo link in a pitch email unfurls saying what
the demo is. Same picture, same reasoning above; what varies is the title, the
description, `og:url`, and the Hebrew pages' `og:site_name`, `og:image:alt` and
`og:locale`. The tags are built in `prerenderMeta.ts` from the two strings
`pageMeta` already resolved, so a preview cannot say something the tab and the
search result don't.

The shell's set survives only in `app.html`, which is deliberate: it answers the
real host session, the real join code and the 404, and none of those should
advertise a live classroom. `prerender-head.mjs` cuts that block out of every
page it stamps, so no head carries two `og:title`s — a duplicate is resolved
differently by each unfurler, and the shell's copy would probably win by being
first.

The PNG is a browser screenshot of the same inline SVG `LogoMark` draws, taken
through the verify harness rather than by adding a rasterizer, which makes it a
fourth pinned mirror of the brand gradient alongside `Logo.tsx`, `favicon.svg`
and the `--brand-gradient-*` tokens. It is 244 KB, well under the 300 KB an
unfurler should have to fetch; the 472 KB founder photo in the same directory is
the cautionary example. `logo-512.png` ships in the same change, unused until
doc 05's `Organization` node needs a raster logo that the SVG favicon can't be.

**Why:** Product-owner call. `/demo` is the link that goes into an email to a
principal, and it was unfurling as one word and one sentence with no picture,
which reads as a URL somebody typed wrong.

Card text is deliberately almost nothing. At Slack's thumbnail size a sentence
is unreadable, so the card's job is recognition and the words are the `og:title`
and `og:description` beside it.

_Implemented in [index.html](../../client/index.html),
[og-card.png](../../client/public/og-card.png),
[prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts),
[prerender-head.mjs](../../client/scripts/prerender-head.mjs), and the
pinned-mirror note in
[Logo.tsx](../../client/src/components/brand/Logo.tsx)._

### No server-rendered body — the locale flash costs a Hebrew visitor more than a crawler gains

_2026-07-27_

**Decision:** Chaverola does not and will not server-render or prerender a React
body. What a reader who never runs JavaScript gets is the per-URL `<head>` from
[The prerendered shell splits in
two…](#the-prerendered-shell-splits-in-two-and-apphtml-is-the-one-that-keeps-the-generic-pair)
plus the homepage's [`<noscript>`
block](#the-homepage-ships-its-words-in-a-noscript-block-and-the-demo-urls-get-none),
and that is the end of the delivery story. `renderToString`, `prerender` from
`react-dom/static` and `hydrateRoot` are all off the table.

**Why:** Founder call, on the risk record written to make this call an informed
one ([doc 01's prompt
3](../plans/seo/01-every-url-ships-its-own-head.md#prompt-3--a-rendered-body-gated--read-the-risk-record-first)),
which argues against itself.

The deciding cost is the locale flash, and it is a regression rather than a
nitpick. A Hebrew-preferring visitor landing on `/` would read a fully painted
**English** homepage — headline, CTAs, plans, founder note — for roughly
150-350 ms on desktop and 1-1.5 s on a mid-tier Android on school wifi, then
watch it reflow right-to-left, blank, spinner, Hebrew. Four visual states
instead of two, and if the JS never lands they are stranded on a dead English
page rather than a blank one. [The meta title is written for a search
result…](#the-meta-title-is-written-for-a-search-result-not-for-the-page-and-the-demo-carries-its-own)
already refuses to put a _single English sentence_ in `<title>` for exactly this
reason; a whole painted page is the same harm an order of magnitude larger.
`hydrateRoot` is worse rather than better: `applyBootLocale` has rewritten the
URL to `/he` by then, so a Hebrew tree would hydrate against English DOM and
mismatch wholesale.

Three costs behind it, none of them the reason on their own. `pnpm build` would
stop being static analysis and start executing the app, so every future
component author inherits a transitive, invisible rule — no `window`,
`document` or `localStorage` at module scope or during render, in anything
reachable from a prerendered route — that **no cheap gate enforces**:
`pnpm typecheck` passes `window.matchMedia` happily and `client/vitest.config.ts`
is `environment: "node"` with no jsdom, so no test in this repo renders a
component. Two crashes are already in the tree: `window.matchMedia` in the
render phase at
[`JoinGateCard.tsx`](../../client/src/pages/student/join/JoinGateCard.tsx),
which `MessageComposer` cites as its model and is therefore a sanctioned idiom
rather than an accident, and [`api.ts`](../../client/src/lib/api.ts) throwing at
module init without `VITE_API_URL`, which would make builds env-dependent. And
what it buys is smaller than it looks:
[`useChatDemo`](../../client/src/components/chat/useChatDemo.ts) seeds the hero
conversation inside a `useEffect` and effects never run during SSR, so a
prerendered homepage would ship the marketing copy and an **empty hero
chatbox** — the running demo this repo calls the proof would be the one thing
not in the HTML.

What would reopen it, and nothing else: Search Console evidence (doc 06) that
the homepage is failing to index on its rendered content, or a named AI crawler
that demonstrably needs more than the `<noscript>` block. Googlebot renders
JavaScript, and every consumer that doesn't is already served. If it is ever
reopened, start from the minimum-risk shape in that prompt — `/he` only, since a
locale already in the URL is the visitor's own choice and cannot flash the wrong
language at anyone — and keep `createRoot`, whose container wipe is what
guarantees the post-mount experience is byte-identical to today's.

_No code, and that is the decision. The prompt stays in
[doc 01](../plans/seo/01-every-url-ships-its-own-head.md) as the record of what
was weighed rather than being deleted._

### The homepage ships its words in a `<noscript>` block, and the demo URLs get none

_2026-07-27_

**Decision:** `/` and `/he` — and only those two — carry a small `<noscript>`
block after `<div id="root"></div>`: the hero headline as an `<h1>`, the pitch
paragraph, the three setup steps, the four how-it-works step titles, and links
to that locale's join and create pages. No string is new. Every one is read
from the same `home` catalog through the same `t` the rendered page uses, so
the block cannot drift from what a browser paints.

**Why:** GPTBot, ClaudeBot, PerplexityBot and every link unfurler download the
JavaScript and never run it. [The prerendered shell splits in
two…](#the-prerendered-shell-splits-in-two-and-apphtml-is-the-one-that-keeps-the-generic-pair)
gave them each page's name; this gives them the product. `<noscript>` rather
than a server-rendered body, and the reasons are structural rather than
stylistic: a browser with JS never paints it, so the locale flash — a Hebrew
visitor reading a fully painted English homepage while the app catches up — is
impossible rather than mitigated; the block sits outside `#root`, where
`createRoot`'s container wipe cannot reach it, so there is no hydration
surface; and `pnpm build` still executes no React, so no future component
author inherits an SSR-safety rule. A real rendered body is
[doc 01's prompt 3](../plans/seo/01-every-url-ships-its-own-head.md), which is
gated on a founder call and argues against itself.

It is not cloaking. The text is a faithful subset of what the page renders,
from the same keys, and Googlebot's second-wave render sees the real page
regardless.

The two demo URLs deliberately get **none**. They are the link out of a pitch
email, and their whole value is the unfurl card, which is pure `<head>`; body
text there would be maintenance for no reader. The create and join gates
likewise — nobody searches for a form.

_Implemented in [prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts) and
[prerender-head.mjs](../../client/scripts/prerender-head.mjs)._

### The prerendered shell splits in two, and `app.html` is the one that keeps the generic pair

_2026-07-27_

**Decision:** `pnpm build` now ends by stamping each of the ten public URLs'
own `<title>`, description and `<html lang/dir>` into its own file under
`dist/`, plus one more file — `dist/app.html`, an untouched copy of the shell —
that `client/vercel.json`'s catch-all rewrite points at rather than at
`index.html`.

The split is the whole point. `dist/index.html` has to carry the homepage's
meta, because it is the only file Vercel can serve for `/` — so if it were also
the rewrite target, every unmatched URL (a real host session, a real 4-digit
join code, the 404, every `/he/…` session) would unfurl as the English
homepage. Vercel's filesystem check runs before rewrites, so `/` and the ten
prerendered paths win on disk and everything else falls through to `app.html`,
which still says the bare brand and the third-person all-purpose sentence — the
exact case [The meta title is written for a search
result…](#the-meta-title-is-written-for-a-search-result-not-for-the-page-and-the-demo-carries-its-own)
wrote them for. That entry's "these strings are set client-side, so a
link-preview bot never sees them" no longer holds for the ten; it still holds
for everything served through `app.html`.

The emitter loads its typed half through Vite's `runnerImport`, not a plugin in
`vite.config.ts`. A plugin was tried and is a dead end worth not retrying: the
config file is bundled by rolldown with an externalize-deps pass that leaves
`@/lib/locale` unresolvable and hands back `@chaverola/shared` as raw
extensionless TS, which breaks config loading on _every_ Vite command including
`vite dev`. `runnerImport` is marked experimental, but it is what Vite itself
uses to load a config with `configLoader: 'runner'`, the version is pinned by
the lockfile, and it fails loudly rather than silently.

**Why:** Product-owner call. No string changed — only who gets to read them.
Slack, WhatsApp, Gmail and LinkedIn parse raw HTML; GPTBot, ClaudeBot and
PerplexityBot download JS and never execute it; Bing takes its `<title>` from
the first response. All of them were reading one generic sentence for ten URLs,
which made `/demo` — the link that goes into a pitch email to a principal —
unfurl as generic product copy.

The step fails hard on purpose, with no warn-and-keep-the-shell branch: a green
deploy serving generic meta everywhere is a regression nobody notices for a
week, the same argument [`api.ts`](../../client/src/lib/api.ts) already makes
about a silent localhost fallback. The three markers it matches in
`client/index.html` (`<html lang="en" dir="ltr">`, `<title>Chaverola</title>`,
the description tag) are a contract, and the script throws unless each matches
exactly once.

Every page is written **twice** — `dist/he.html` and `dist/he/index.html` — and
both shapes are load-bearing. Vercel's filesystem phase does not strip `.html`
(`cleanUrls` defaults off), measured on production 2026-07-27: `/he.html`
served the stamped file while `/he` fell through to `app.html`. So Vercel needs
the directory-index shape. `vite preview` needs the flat one — its sirv runs
with `extensions: []` and only tries `…/index.html` for URLs ending in `/` — and
without it there is no way to check the work locally before a deploy. `/` needs
no twin; `dist/index.html` already is both.

`cleanUrls: true` would have collapsed this to one shape, and was not taken: it
also rewrites `/app.html` to `/app`, which is the destination of the catch-all
that every real session URL and every 404 goes through. Trading a duplicated
static file for a redirect hop on the join path is the wrong way round.

`vite preview` hardcodes its own SPA fallback to `/index.html`, so it
structurally cannot test the `app.html` rewrite; that one assertion belongs on
a Vercel deploy.

_Implemented in [prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts),
[prerender-head.mjs](../../client/scripts/prerender-head.mjs),
[vercel.json](../../client/vercel.json), and the head comment in
[index.html](../../client/index.html)._

### The canonical host is the apex, and it's what a teacher says out loud

_2026-07-27_

**Decision:** `chaverola.com` — the apex, no `www` — is the site's one
address. The joining instructions a teacher reads to the class say
`chaverola.com`, so the spoken address and the canonical URL are the same
string.

**Why:** Founder call. Two hostnames answering the same content is duplicate
content: it splits every ranking signal and hands a search engine a choice
nobody meant to offer. The apex also shortens the sentence a teacher performs
in front of a room of teenagers, which is the only place this string is ever
said out loud rather than clicked.

The spoken and canonical forms were allowed to differ before — speech said
`www.chaverola.com` while the site answered on both — and collapsing them is
what stops the next person having to work out which one is authoritative.

**Update (2026-07-27):** the redirect is live. `www.chaverola.com` answers a 308
to `https://chaverola.com/`, configured as a redirect on the `www` domain in the
Vercel project dashboard. Nothing in the repo says so, which is why it says so
here — `curl.exe -I https://www.chaverola.com` is how you check it, and a
dashboard nobody remembers editing is how it disappears. The origin now also has
a home in TypeScript, `SITE_ORIGIN` in
[prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts), which every later SEO
doc imports instead of spelling the host again.

Still outstanding: the `<link rel="canonical">` tags that make this true for
machines, which are [docs/plans/seo/](../plans/seo/README.md) work.

_Implemented in
[JoiningInstructions](../../client/src/components/Teacher/HostActivity/JoiningInstructions.tsx)
(`SPOKEN_DOMAIN`), [prerenderMeta.ts](../../client/src/lib/prerenderMeta.ts)
(`SITE_ORIGIN`), and the Vercel dashboard._

### The meta title is written for a search result, not for the page, and the demo carries its own

_2026-07-27_

**Decision:** A page's `<title>` and `<meta name="description">` are written for
someone reading a search result or a link preview, and they may say something
different from what the page itself says. The homepage no longer titles itself
"A Classroom Activity That Students Love"; it leads with the words a teacher
types, and every description closes on the facts that remove hesitation (free,
no student accounts, nothing to install).

The join gate is the case that forced this. Its `title.join` is also the gate
card's own `<h1>`, so it now has a **separate** `join.meta.title` key: the
heading a student reads still says "Join an Activity", while the tab and the
search result say "Join the Activity with Your 4-Digit Code". Never merge those
two keys back together — nothing in the type system catches it, `JoinGateCard`
would just quietly start rendering a search-engine sentence as its heading.

`/activity/host/1234` and `/activity/join/1234` get their own share-ready pairs
(`host.demo.meta.*`, `join.demo.meta.*`), picked at the page's existing
`usePageMeta` call by a `hostKey === DEMO_JOIN_CODE` test rather than by a
second hook call in the demo view. A real host session keeps the plain private
title and still passes it as its own description.

The Hebrew is a localization. Its demo description names the Hebrew demo's
scene, not the English one's — there is no Roman class on `/he` (see
[The Hebrew demo is re-cast, never
translated](demo-flows.md#the-hebrew-demo-is-re-cast-never-translated)) — and
grammatical person follows each page's shipped neighbours rather than the
English source, so setup and the join gate keep their impersonal plural while
the homepage and both demo pages address the teacher as `אתה`.

**Why:** Product-owner call, extending [Page titles read "&lt;Page&gt; |
Chaverola", page name
first](#page-titles-read-ltpagegt--chaverola-page-name-first). That entry set
the format; nobody had since asked whether the words inside it were words
anyone searches for, and they weren't. The demo half is a straight defect fix:
`/demo` is the URL that gets said out loud in a meeting and pasted into an
email to a principal, and it was rendering "Your Live Activity" as both its
title and its description.

Deliberately **not** in this change, so the omissions don't read as oversights:
no Open Graph or Twitter cards, no canonical URLs, no `hreflang` between `/` and
`/he`, no `robots.txt` or `sitemap.xml`, and no prerendering. Those stay
deferred to the later Vite SEO effort. The consequence to know: these strings
are set client-side, so a link-preview bot never sees them — it reads
`client/index.html`, which is why that file's description was rewritten in the
same change to be the best all-purpose sentence about the product. Its `<title>`
stays the bare brand on purpose: nothing stamps a title before React mounts, so
a sentence there would flash English at a Hebrew visitor mid-fetch.

_Implemented in [pageMeta](../../client/src/lib/pageMeta.ts),
[HostActivityPage](../../client/src/pages/teacher/HostActivityPage.tsx),
[JoinActivityPage](../../client/src/pages/student/JoinActivityPage.tsx), and the
`meta.*` keys across `client/src/i18n/locales/`._

### Hebrew talks about the teacher without guessing their gender

_2026-07-27_

**Decision:** The student's screens name no actor where a phrasing without one
is at least as natural. "Your teacher removed you from the activity" is
`הוצאת מהפעילות`, "Your teacher ended the chat" is `הצ׳אט נסגר`, "Your teacher
paused the chat" is `הצ׳אט מושהה`. Masculine third person stays where the
sentence is genuinely _about_ what a teacher does — the demo steering buttons
(`המורה עוצר את השיעור`) and the lobby's "{host} is picking who chats with
who", which interpolates the teacher's own name.

**Why:** [Hebrew is written in masculine second
person](#hebrew-is-written-in-masculine-second-person) already accepts
addressing half a class in the wrong gender, and says to sidestep where a
phrasing can. The student flow is where that bites hardest: it mentions the
teacher on a dozen screens, most Israeli teachers are women, and unlike
`אתה` — which a teenager reads as the generic — `המורה סגר` is a specific
claim about a specific person the student is looking at across the room. The
passive costs nothing here: every one of these sentences already says what
happened, and _who_ was never the interesting half.

The exception is deliberate rather than lazy. The demo panel's buttons exist
to say "this is the thing a teacher does", so an actor-free label
(`עצירת השיעור`) would read as a system setting instead of a person's move.

---

### The brand is חברולה in Hebrew, and the logo mark never mirrors

_2026-07-27_

**Decision:** Under `/he` the brand reads **חברולה** everywhere the app writes
it: the navbar wordmark, the student world's pill, the `<title>` suffix, and
body copy. What stays Latin is the domain (`chaverola.com`, which a teacher
reads out loud to the class) and the email From-name.

The logo mark itself is never flipped. Its speech-bubble tail points
bottom-left in both languages.

**Why:** "Chaverola" is a Hebrew word already (Chaver + Olah), so spelling it
in Latin on a Hebrew page reads as a foreign product rather than a local one.
The exceptions are the two places the Latin string is the identifier rather
than the name.

The mark stays put because `public/favicon.svg` is a pinned mirror of
`Logo.tsx` and can't follow a CSS transform. A mirrored wordmark beside an
unmirrored favicon looks broken in a way a tail on the "wrong" side does not.
The same reasoning covers media transport icons (play, fast-forward), which
keep pointing right in RTL by both Material's and Apple's guidance.

---

### Hebrew uses Rubik, and it's a quality call rather than a missing-glyph fix

_2026-07-27_

**Decision:** `[dir="rtl"]` swaps `--font-app` to Rubik (Hebrew subsets only,
four weights) with Fredoka behind it, and zeroes the headings' `-0.01em`
tracking.

**Why:** Fredoka already ships a Hebrew subset, so there was never any tofu to
fix. Rubik is here because Fredoka's Hebrew is a bolt-on to a Latin display
face with counters that close up at 15px on a phone, while Rubik is drawn for
Hebrew UI text. Worth writing down so nobody later removes the dependency as
unnecessary after checking that Fredoka "already works".

The tracking goes with it: negative letter-spacing is a Latin adjustment, and
Hebrew has no caps for it to help. Four `tracking-tight` utilities override the
token directly and carry an `rtl:tracking-normal` twin.

---

### Hebrew is written in masculine second person

_2026-07-27_

**Decision:** Hebrew copy addresses the reader in the masculine, always. Never
slash forms (`אתה/את`, `הצטרף/י`).

**Why:** Founder call (2026-07-27). Slashes are standard on Israeli forms and
school paperwork, which is exactly the register this product is trying not to
have. It is a game-like product for teenagers, and buttons in particular can't
carry the clutter. The cost is real and accepted: half of any class is
addressed in the wrong gender. Where a phrasing can sidestep gender without
sounding stilted (an infinitive on a button, a noun label instead of a verb),
it does.

---

### The name's story is Chaver + Olah ("rising up"), not Chaver + Crayola

_2026-07-18_

**Decision:** The founder's note explains "Chaverola" as a blend of Chaver
(Hebrew for friend) and Olah, glossed as "rising up": friends raise each other
up. This replaces the earlier Chaver + Crayola (friendship plus crayons) story.
The gloss is deliberately the neutral "rising up" rather than the founder's
original phrasing "he rises up" — olah (עוֹלָה) is grammatically the feminine
form ("oleh" is masculine), and Hebrew-literate readers would catch the
mismatch. The spelling stays Olah because it matches the "-ola" ending of the
name.

**Why:** Founder call. The rising-up meaning is the product's actual thesis
(friends raising each other up), where Crayola was only a mood. Any copy that
retells the name's origin should use this story.

_Implemented in [FounderNote.tsx](../../client/src/components/home/FounderNote.tsx)._

### Page titles read "&lt;Page&gt; | Chaverola", page name first

_2026-07-15_

**Decision:** `document.title` for every routed page is the page's own name
followed by the brand — e.g. "Join an Activity | Chaverola" — via the shared
`usePageMeta` hook. Routes without a title fall back to bare "Chaverola".

**Why:** Product-owner call for SEO: the page-specific words get prominence in
search results while the brand still matches a "Chaverola" search. Brand-first
("Chaverola | Join an Activity") and an audience prefix ("Student - Join an
Activity") were both rejected — the first buries the page's keywords, the
second adds clutter without search value. Full SSR/meta-tag SEO is deferred to
a later Vite SEO effort; until then titles are set client-side only.

**Update (2026-07-27):** the format is unchanged, but what goes inside it is
now settled separately — see [The meta title is written for a search result,
not for the page, and the demo carries its
own](#the-meta-title-is-written-for-a-search-result-not-for-the-page-and-the-demo-carries-its-own).
The hook was also renamed `usePageTitle` → `usePageMeta` when it took on the
description; the name is corrected above.

_Implemented in [usePageMeta](../../client/src/lib/usePageMeta.ts)._
