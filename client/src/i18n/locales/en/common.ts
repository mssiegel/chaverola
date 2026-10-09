import type { Catalog } from "../../types";

/**
 * The app shell: brand, navbar, language switcher, 404, the error floor.
 *
 * The only namespace registered at init, so it's the only one eager code (and
 * `PageErrorBoundary`, which sits outside the router) may read. Keep it small.
 */
export const common = {
  "brand.name": "Chaverola",
  "brand.home": "Chaverola home",

  // The link-preview card (public/og-card.png), described for a reader whose
  // screen reader announces it. No call site in the app: `prerenderMeta` reads
  // it at build time, and client/index.html spells the same sentence by hand for
  // the URLs that get the fallback card. It stops at the picture because the
  // words on the card are the og:title and og:description sitting beside it.
  "share.cardAlt":
    "The Chaverola logo, a white speech bubble with a smiling face, on a purple card.",

  // The fallback shell's description — the sentence served to every URL that
  // isn't one of the ten prerendered ones. Third person on purpose: it has to
  // read correctly on a student URL as well as a teacher's.
  //
  // ONLY THE HEBREW SIDE IS READ. `prerenderMeta.fallbackShells()` stamps
  // he-app.html from `he`; app.html is the pristine shell, so ITS copy of this
  // sentence is the literal in client/index.html and that is the English one's
  // home. This key exists because `HebrewOf<>` cannot hold a Hebrew string
  // without its English twin, and the value is kept identical so the two can be
  // diffed by eye. A pinned mirror, the same admission `share.cardAlt` above
  // makes about the same file, and SITE_ORIGIN makes about the same host.
  "shell.description":
    "A classroom roleplay activity where students chat in character about their lessons. Teachers follow every conversation live.",

  "nav.joinLong": "Join an Activity",
  "nav.joinShort": "Join Activity",

  "language.change": "Change language",

  "student.signedInAs": "Signed in as ",

  "dialog.close": "Close",
  "dialog.dismiss": "Dismiss",

  // The teacher's monitoring chat card. Here rather than in `teacher` because
  // the homepage renders the real card too (TeacherViewSection's live
  // preview), and a page-scoped namespace would make one of the two pay for
  // the other's chunk. See DECISIONS.md → "The chat card's strings live in
  // the common namespace".
  "card.as": " as ",
  "card.live": "Live",
  "card.paused": "Paused",
  "card.ended": "Ended",
  "card.fullChat": "Full chat",
  "card.minimize": "Minimize",
  "card.remove": "Remove {{name, bidi}} from this chat",

  // The lost-connection tag, shared by the card's roster and the queue rows.
  lostConnection: "lost connection",

  // The demo furniture. Here for the same reason as the card: the banner and
  // the steering panel are mounted by the teacher's host page and the student
  // world alike, and neither namespace covers both.
  "demo.banner": "This is the demo class. The students are pretend.",
  "demo.bannerStudent": "This is the demo. The other students are pretend.",
  "demo.startYourOwn": "Start your own",
  "demo.driving": "You're driving this demo",

  // The end-a-chat confirmation. Shared by the teacher's card and the student
  // chatbox; the seat-specific half of it rides here too, because the card
  // keeps the dialog mounted even on the homepage, where `teacher` isn't.
  "endChat.title": "End this chat?",
  "endChat.confirm": "End chat",
  "endChat.hostBody":
    "The students will see the chat is over and can head back to the lobby. There's no reopening it.",
  "endChat.hostCancel": "Let them keep chatting",

  "notFound.pageTitle": "Page Not Found",
  "notFound.eyebrow": "404",
  "notFound.title": "Nothing here 🫥",
  "notFound.body": "That page wandered off. Got a code from your teacher?",
  "notFound.backHome": "Back home",

  "error.title": "That didn't load 🫠",
  "error.body":
    "Something got stuck on the way here. Another go usually does it.",
  "error.retry": "Try again",
} as const satisfies Catalog;

export type CommonCatalog = typeof common;
