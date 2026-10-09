/*
  The build-time half of the page meta: one `PrerenderPage` per public URL, for
  `client/scripts/prerender-head.mjs` to stamp into a copy of the built shell.

  THIS MODULE'S WHOLE IMPORT GRAPH IS EVALUATED IN NODE, at build time, with no
  DOM of any kind. Nothing reachable from here may touch `document`, `window`,
  or `localStorage` at module scope, and nothing may reach `lib/api.ts`, which
  throws at module init in a production build without `VITE_API_URL`.

  It lives under `src/` on purpose, not in `scripts/`: `tsconfig.app.json`
  includes `src`, so `tsc -b` typechecks it with the `@/` alias and the i18next
  key augmentation for free. Nothing in the app imports it, so it never enters
  a bundle.
*/
import type { TFunction } from "i18next";

import { initI18n } from "@/i18n";
import {
  DEFAULT_LOCALE,
  LOCALE_DIR,
  LOCALES,
  switchLocalePath,
  type Locale,
} from "@/lib/locale";
import { PAGE_META, pageMeta } from "@/lib/pageMeta";

/**
 * The site's one address, and the only place in TypeScript that spells it.
 * Docs 03 (canonical), 04 (sitemap) and 05 (structured data) import this rather
 * than each declaring their own; `og:url` and `og:image` need it because a
 * relative URL in either is ignored by most unfurlers.
 *
 * The apex, no `www`, and no trailing slash so callers can append a path
 * straight from `switchLocalePath`. `www.chaverola.com` 308s here from Vercel
 * dashboard config, which is ungreppable from the repo — see
 * docs/decisions/branding.md.
 *
 * Two files mirror it as a literal, both static and so unable to import:
 * `client/index.html` and the `Sitemap:` line in `client/public/robots.txt`
 * (which the spec requires to be absolute). Change this, change those.
 */
export const SITE_ORIGIN = "https://chaverola.com";

/**
 * One picture for every URL and both locales, so there is one file to keep in
 * sync with the brand and one thing for an unfurler to cache. 1200×630 is the
 * size Slack, WhatsApp and X all crop their preview from; the width and height
 * are tags rather than a lookup because an unfurler that reads them can lay the
 * card out before the image arrives. See docs/decisions/branding.md.
 */
const OG_IMAGE = `${SITE_ORIGIN}/og-card.png`;
const OG_IMAGE_WIDTH = "1200";
const OG_IMAGE_HEIGHT = "630";

/**
 * `og:locale` takes a language_TERRITORY tag, not the bare `he` that the URL
 * prefix and `<html lang>` use, so it needs its own map rather than the locale
 * itself. A third language adds one line here; `LOCALES` already drives which
 * ones become `og:locale:alternate`.
 */
const OG_LOCALE: Record<Locale, string> = { en: "en_US", he: "he_IL" };

/**
 * The `Organization` logo, and it has to be the raster: Google's logo handling
 * rejects an SVG, which is why `public/logo-512.png` was shot alongside the
 * unfurl card rather than the favicon being reused. Square, unlike `OG_IMAGE`.
 */
const LOGO_IMAGE = `${SITE_ORIGIN}/logo-512.png`;

/**
 * The free plan is the whole product (docs/decisions/homepage.md), so the `Offer`
 * states a real price of zero. One currency for both locales — the number is 0
 * either way, and a per-locale currency would imply a price that varies by
 * region. The paid "Complete Implementation" tier is deliberately NOT modelled:
 * it has no public price, and an `Offer` without one is worse than no `Offer`.
 */
const PRICE_CURRENCY = "USD";

/**
 * The page's own unfurl card. Nothing here is new copy: the title and
 * description are the same two strings `pageMeta` resolved for the `<title>`
 * and the description tag, so a link preview cannot say something the tab and
 * the search result don't.
 *
 * `client/index.html` carries a hand-written twin of this set for the URLs that
 * have no `PAGE_META` entry. `scripts/prerender-head.mjs` deletes that twin from
 * every file it stamps — one `og:title` per head, never two.
 */
function socialCard(
  common: TFunction,
  locale: Locale,
  url: string,
  title: string,
  description: string
): string[] {
  const tag = (property: string, content: string) =>
    `<meta property="${property}" content="${escapeHtml(content)}" />`;

  return [
    tag("og:type", "website"),
    tag("og:site_name", common("brand.name")),
    tag("og:title", title),
    tag("og:description", description),
    // Absolute, both of them. A relative URL in either is ignored by most
    // unfurlers, which is the whole reason SITE_ORIGIN exists.
    tag("og:url", `${SITE_ORIGIN}${url}`),
    tag("og:image", OG_IMAGE),
    tag("og:image:width", OG_IMAGE_WIDTH),
    tag("og:image:height", OG_IMAGE_HEIGHT),
    tag("og:image:alt", common("share.cardAlt")),
    tag("og:locale", OG_LOCALE[locale]),
    ...LOCALES.filter((other) => other !== locale).map((other) =>
      tag("og:locale:alternate", OG_LOCALE[other])
    ),
    // `name`, not `property`, and the only twitter:* tag on the page. The
    // reasoning for the omission is in index.html beside the twin.
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
}

interface PageUrls {
  canonical: string;
  alternates: { hreflang: string; href: string }[];
}

/**
 * The page's canonical address and every language twin of it, as DATA — because
 * two formatters need the same set: `pageLinks` writes it as `<link>` tags into
 * the head, and `sitemapXml` writes it as `<xhtml:link>` into the sitemap.
 * Google reads them as two independent hreflang signals, which is only worth
 * having if they agree; one function is what makes agreeing free rather than
 * vigilant. A `<loc>` that differs from its page's canonical by a trailing slash
 * is a silent, classic defect, and it cannot arise from here.
 *
 * `hreflang` takes the BARE language tags — `en` and `he`, never `en-US` /
 * `he-IL`. This is language targeting, not regional: a region subtag would
 * restrict the Hebrew page to searchers in Israel, and there is nothing
 * Israel-specific about it beyond the language. `OG_LOCALE` above uses the
 * territory form for the same two locales because Facebook's format demands it,
 * NOT because anyone chose regional targeting — the asymmetry is deliberate and
 * neither one should be "fixed" to match the other.
 *
 * Alternates come from `url` rather than from the unprefixed route so they are
 * built from the same string the canonical is, character for character.
 * `switchLocalePath` strips whatever prefix is already there, so it round-trips.
 *
 * Every page lists ITSELF as well as its twin. Reciprocity is the part that
 * fails silently: if `/he` names `/` and `/` doesn't name `/he`, Google discards
 * the pair and neither page is helped. One function emits both sides, so they
 * cannot drift.
 */
function pageUrls(url: string): PageUrls {
  return {
    // Self-referencing, which is the right shape here: there is no
    // duplicate-parameter problem to consolidate. The canonical's job is to name
    // the hostname that won (the apex — see SITE_ORIGIN) and to pin the URL
    // against whatever tracking parameter someone appends to it later.
    canonical: `${SITE_ORIGIN}${url}`,
    alternates: [
      ...LOCALES.map((locale) => ({
        hreflang: locale as string,
        href: `${SITE_ORIGIN}${switchLocalePath(url, locale)}`,
      })),
      // Where to send a language we don't publish. English, because it is the
      // unprefixed tree — a third language would add its own prefix rather than
      // pushing English onto `/en` (see docs/decisions/routes.md).
      {
        hreflang: "x-default",
        href: `${SITE_ORIGIN}${switchLocalePath(url, DEFAULT_LOCALE)}`,
      },
    ],
  };
}

/** `pageUrls` as head tags. The sitemap's twin is `sitemapXml`. */
function pageLinks(url: string): string[] {
  const { canonical, alternates } = pageUrls(url);

  return [
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    ...alternates.map(
      ({ hreflang, href }) =>
        `<link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}" />`
    ),
  ];
}

/**
 * What Chaverola is, stated to a machine instead of inferred from prose: one
 * `<script type="application/ld+json">` holding an `@graph` of three nodes, so
 * there is one block to look at and the nodes can cross-reference by `@id`.
 *
 * HOMEPAGE ONLY — `/` and `/he`. The join gate, the create gate and the two demo
 * URLs get nothing: structured data on a form or a live classroom earns no
 * result and is four more claims to keep true. Resist the completeness instinct.
 *
 * NEVER add `aggregateRating` or `review`. There are no testimonials on this site
 * on purpose (docs/decisions/homepage.md), so any rating here would be invented
 * data about real people — the most-abused corner of this vocabulary and a
 * straightforward way to earn a manual penalty. This is a standing ban, not a
 * "not yet".
 *
 * No `SearchAction` on the `WebSite` either: the site has no search, and claiming
 * one that doesn't exist is how a page gets its structured data ignored wholesale.
 * No `HowTo`, and that is a decision rather than an oversight — the reasoning is
 * in the decision entry, since the visible four-step list makes its absence look
 * like a miss.
 *
 * Every string comes from the catalogs through the same `t` the head uses, so
 * `/he` describes חברולה in Hebrew and nothing here can drift from the page.
 *
 * THE ESCAPING TRAP: this is a different context from every other tag in this
 * file. `escapeHtml` must NOT touch it — HTML entities inside a `ld+json` body
 * are invalid JSON and the whole block is silently discarded. `JSON.stringify`
 * is the escaper; the one extra rule is `</` → `<\/` so a string can't close the
 * script tag early.
 */
function structuredData(
  common: TFunction,
  locale: Locale,
  url: string,
  description: string
): string {
  const name = common("brand.name");
  const page = `${SITE_ORIGIN}${url}`;
  // One organization behind both language trees, so its `@id` is locale-free and
  // the two `WebSite` nodes point at the same one.
  const organizationId = `${SITE_ORIGIN}/#organization`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": organizationId,
        name,
        url: SITE_ORIGIN,
        logo: LOGO_IMAGE,
      },
      {
        "@type": "WebSite",
        "@id": `${page}#website`,
        name,
        url: page,
        // From the page's own locale, never a constant — this file is emitted
        // twice and the two copies must disagree here.
        inLanguage: locale,
        publisher: { "@id": organizationId },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${page}#application`,
        name,
        // The homepage's own meta description, already written and humanized.
        // It is the sentence the search result shows, so the two cannot differ.
        description,
        url: page,
        inLanguage: locale,
        applicationCategory: "EducationalApplication",
        // It runs in a browser and installs nothing, which is one of the two
        // facts a teacher checks before trying a classroom tool. The other is
        // the price below.
        operatingSystem: "Any",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: PRICE_CURRENCY,
        },
        publisher: { "@id": organizationId },
      },
    ],
  };

  const json = JSON.stringify(graph, null, 2).replace(/<\//g, "<\\/");

  return [
    `<script type="application/ld+json">`,
    // The writer indents the first line only; the rest carry their own so the
    // emitted block reads as JSON when someone opens the file to debug it.
    json
      .split("\n")
      .map((line) => `      ${line}`)
      .join("\n"),
    `    </script>`,
  ].join("\n");
}

export interface PrerenderPage {
  /** Path under `dist/`, e.g. `he/activity/join/1234.html`. */
  file: string;
  /**
   * The URL that file answers, e.g. `/he/activity/join/1234`. A fallback shell
   * answers many, so it names the locale's home instead — see
   * `fallbackShells`.
   */
  url: string;
  lang: Locale;
  dir: "ltr" | "rtl";
  title: string;
  description: string;
  /**
   * Extra tags to insert before `</head>`, already whole: the Open Graph card,
   * the canonical/hreflang set, and on the two homepages the `ld+json` block.
   * All the string logic lives here so the writer script owns none.
   *
   * One entry per line, EXCEPT the `ld+json` block, which is several lines
   * carrying their own indent — the writer prefixes the first line only, which
   * is why `structuredData` indents the rest itself.
   */
  head: string[];
  /**
   * A `<noscript>` block to insert after `<div id="root"></div>`, already
   * indented for the body. `null` on every page that gets none — see
   * `homeNoscript` for which pages those are and why.
   */
  noscript: string | null;
}

/**
 * `&` first, or the ampersands the later rules emit get escaped again. Covers
 * attribute values and element text alike, which is why `"` is in the list.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Element text from a catalog string that may carry `<Trans>` placeholders —
 * Strip numbered component placeholders BEFORE escaping so a crawler reads
 * their text, not their markup. Escaping second keeps a real `<` in copy safe.
 */
function plainText(value: string): string {
  return escapeHtml(value.replace(/<\/?\d+>/g, ""));
}

/**
 * `PAGE_META`'s key strings are deliberately plain strings, not key-checked
 * (see `pageMeta.ts`), and i18next hands back the key itself on a miss. So a
 * renamed catalog key would otherwise ship a live site full of
 * `setup.meta.title`. This throw is the only thing between those two.
 */
function must(value: string, key: string, locale: Locale): string {
  if (!value || value === key) {
    throw new Error(
      `prerenderMeta: "${key}" is missing from the ${locale} catalogs ` +
        `(resolved to "${value}"). PAGE_META's keys are not typechecked — ` +
        `fix the key or the catalog.`
    );
  }
  return value;
}

/** `t` for a namespace picked at runtime; `must()` replaces the key checking. */
type LooseT = (key: string) => string;

/*
  Init BEFORE the namespace imports, and only once. `registerBundle` reaches
  through `i18n.store`, which exists only after `init()`, so a STATIC
  `import "@/i18n/ns/home"` would hoist above this line and throw — hence
  dynamic imports. And they have to run here, at module scope behind top-level
  await, rather than inside `prerenderPages()`: `runnerImport` closes its module
  runner the moment this module finishes evaluating, so a dynamic import
  awaited any later dies with "Vite module runner has been closed."

  One init covers both locales — `initI18n` loads `resources: { en, he }` and
  `registerBundle` adds every locale per namespace, so `getFixedT("he", …)`
  answers correctly off this single instance. Do not try to init twice. `chat`
  is not imported; no PAGE_META entry uses it. The order matches what
  `main.tsx` plus the lazy chunks produce at runtime.
*/
const i18n = initI18n(DEFAULT_LOCALE);
await Promise.all([
  import("@/i18n/ns/home"),
  import("@/i18n/ns/teacher"),
  import("@/i18n/ns/student"),
]);

/**
 * The homepage's own words in the body, for a reader that never runs
 * JavaScript: GPTBot, ClaudeBot, PerplexityBot, every link unfurler. Read from
 * the same `home` catalog through the same `t` the head uses, so it cannot
 * drift from what the page renders — and no new copy, so nothing here needs a
 * humanizer pass.
 *
 * A `<noscript>` block rather than a rendered React tree, and the reasons are
 * structural rather than stylistic (see docs/plans/seo/01, prompt 2): a browser
 * with JS never paints it, so the locale flash that disqualifies a real
 * rendered body is impossible rather than mitigated; it sits outside `#root`,
 * so `createRoot`'s container wipe can't reach it and there is no hydration
 * surface; and it executes no React at build time, so it can't break the build
 * or impose an SSR-safety rule on future component authors. Not cloaking: it is
 * a faithful subset of the rendered page from the same keys, and Googlebot's
 * second-wave render sees the real page regardless.
 *
 * ONLY `/` and `/he` get one. The two demo URLs deliberately get none — they
 * are pitch-email links whose whole value is the unfurl card, which is pure
 * `<head>`; body text there would be maintenance for no reader. The create and
 * join gates likewise: nobody reads a form.
 *
 * Keep it small. It ships inside the HTML of the two most-fetched URLs, and it
 * is text, not a page. Hebrew needs no `dir` of its own — the emitted
 * `<html dir="rtl">` governs it.
 */
function homeNoscript(t: LooseT, common: TFunction, locale: Locale): string {
  const text = (key: string) => plainText(must(t(key), key, locale));
  const href = (route: string) => escapeHtml(switchLocalePath(route, locale));

  return [
    `    <noscript>`,
    `      <h1>${text("hero.title")}</h1>`,
    `      <p>${text("hero.intro")}</p>`,
    `      <p>${text("hero.pitch")}</p>`,
    `      <p>${text("hero.stepsLabel")}</p>`,
    `      <ol>`,
    `        <li>${text("hero.step1")}</li>`,
    `        <li>${text("hero.step2")}</li>`,
    `        <li>${text("hero.step3")}</li>`,
    `        <li>${text("hero.step4")}</li>`,
    `      </ol>`,
    // The page's own two CTAs, and the only crawlable path from here into the
    // rest of the app — every other link on the homepage is a router click.
    // `nav.joinLong` lives in `common`, which is why this takes two `t`s; being
    // key-checked, it needs no `must` guard, same as `pageMeta`'s `brand.name`.
    `      <p><a href="${href("/activity/join")}">${plainText(common("nav.joinLong"))}</a></p>`,
    `      <p><a href="${href("/activity/create")}">${text("cta.host")}</a></p>`,
    `    </noscript>`,
  ].join("\n");
}

export async function prerenderPages(): Promise<PrerenderPage[]> {
  const pages: PrerenderPage[] = [];

  for (const locale of LOCALES) {
    // Two `t`s, not one. The fixed-namespace one resolves the page's own pair;
    // `pageMeta` needs a separate default-namespace one for `brand.name`, which
    // lives in `common`. There is no `fallbackNS`, so passing the page's `t` to
    // both would title every page "… | brand.name".
    const common = i18n.getFixedT(locale);

    for (const [route, entry] of Object.entries(PAGE_META)) {
      const t = i18n.getFixedT(locale, entry.ns) as unknown as LooseT;
      const meta = pageMeta(
        common,
        must(t(entry.title), entry.title, locale),
        must(t(entry.description), entry.description, locale)
      );

      // Through the app's own helper, never string concatenation: a third
      // locale would need no edit here. Same for `dir` — never a literal.
      const url = switchLocalePath(route, locale);

      pages.push({
        file: url === "/" ? "index.html" : `${url.slice(1)}.html`,
        url,
        lang: locale,
        dir: LOCALE_DIR[locale],
        title: meta.title,
        description: meta.description,
        head: [
          ...socialCard(common, locale, url, meta.title, meta.description),
          ...pageLinks(url),
          // Homepage only, same gate as the noscript block below and for a
          // related reason: these two URLs are the ones a search engine has any
          // reason to describe.
          ...(route === "/"
            ? [structuredData(common, locale, url, meta.description)]
            : []),
        ],
        noscript: route === "/" ? homeNoscript(t, common, locale) : null,
      });
    }
  }

  return pages;
}

/**
 * `dist/sitemap.xml` — every public URL once, each naming its language twins.
 *
 * It takes the array `prerenderPages()` already returned rather than walking
 * `PAGE_META` again, so a route added to that table appears in the sitemap and
 * in the heads or in neither. A hand-written file in `public/` would be a second
 * home for the route list, which is the drift this repo's process rules are most
 * pointed about.
 *
 * The map matters most for the two demo URLs: nothing on the site links
 * `/activity/host/1234` or `/activity/join/1234` — they go out in a pitch email
 * — so either this names them or a crawler finds them by accident.
 *
 * The `xhtml` namespace on `<urlset>` is not decoration: without it the
 * `<xhtml:link>` alternates are undefined markup and a validator rejects the
 * file. They mirror `pageLinks`' head tags exactly, being the same `pageUrls`.
 *
 * NO `lastmod`, `changefreq` OR `priority`, and that is a decision rather than
 * an oversight (docs/decisions/routes.md). Google ignores the last two outright.
 * `lastmod` is only useful when it is true, and a build timestamp would claim
 * every page changed on every deploy, which teaches the crawler to distrust the
 * field. A real signal would have to come from git, not from the clock.
 *
 * The fallback shells are absent because `fallbackShells()` is a separate array
 * — right, and not an omission to fix: `he-app.html` answers ten URLs and is not
 * a page. Real host sessions and live join codes are absent for the same reason,
 * and `robots.txt` fences them besides.
 */
export function sitemapXml(pages: PrerenderPage[]): string {
  // `escapeHtml` despite the name: the four entities it writes — `&`, `<`, `>`,
  // `"` — are exactly what XML needs in element text and in a double-quoted
  // attribute. `&` is the one that will actually happen, the day a URL here
  // carries a query parameter.
  const entries = pages.map((page) => {
    const { canonical, alternates } = pageUrls(page.url);

    return [
      `  <url>`,
      `    <loc>${escapeHtml(canonical)}</loc>`,
      ...alternates.map(
        ({ hreflang, href }) =>
          `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${escapeHtml(href)}" />`
      ),
      `  </url>`,
    ].join("\n");
  });

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"`,
    `        xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...entries,
    `</urlset>`,
    ``,
  ].join("\n");
}

/**
 * One fallback shell per prefixed locale — `dist/he-app.html` today — for the
 * URLs that have no `PAGE_META` entry and so get no file of their own: a live
 * host session, a real 4-digit join code, a mistyped path. `vercel.json` routes
 * `/he/…` here and everything else to `app.html`, which stays the pristine
 * English shell that `client/index.html` spells by hand.
 *
 * English is absent by design, not by omission: `app.html` is also the TEMPLATE
 * the writer script re-stamps every page from, so it has to stay untouched.
 * That is why `shell.description`'s English value is a pinned mirror rather than
 * the sentence's only home — the note is on the key in the `common` catalog.
 *
 * Not a page, and it must never look like one:
 *
 * - **No canonical and no `hreflang`.** Ten URLs share this file, so a canonical
 *   would name nine of them wrongly, and pointing every mistyped path at `/he`
 *   would consolidate garbage into the Hebrew homepage. Keeping these URLs out
 *   of the index is `robots.txt`'s job, not a link tag's, and the two mechanisms
 *   should not be confused.
 * - **`og:url` is the locale's home** (`/he`), matching what `index.html`'s
 *   hand-written twin already claims for English. It is the one field a shared
 *   session link can't answer honestly; `robots.txt` disallows this file, and an
 *   unfurl card naming the product beats one naming nothing.
 * - **It DOES carry `og:locale`.** `index.html` omits the pair because that
 *   block serves both languages and claiming `en_US` to a Hebrew reader is worse
 *   than claiming nothing. This file serves one language, so the pair cannot be
 *   wrong.
 *
 * The `<title>` is the bare brand rather than `pageMeta`'s "… | חברולה": nothing
 * stamps a title before React mounts, so this is what sits in the tab during the
 * lazy page fetch, and it is the same call `index.html`'s `<title>` makes.
 */
export function fallbackShells(): PrerenderPage[] {
  return LOCALES.filter((locale) => locale !== DEFAULT_LOCALE).map((locale) => {
    const common = i18n.getFixedT(locale);
    // Both key-checked through the i18next augmentation, so neither needs the
    // `must()` guard that PAGE_META's plain-string keys do.
    const title = common("brand.name");
    const description = common("shell.description");
    const url = switchLocalePath("/", locale);

    return {
      file: `${locale}-app.html`,
      url,
      lang: locale,
      dir: LOCALE_DIR[locale],
      title,
      description,
      head: socialCard(common, locale, url, title, description),
      noscript: null,
    };
  });
}
