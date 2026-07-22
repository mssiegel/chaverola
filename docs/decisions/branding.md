# Branding & page titles

Part of the [Product & UX Decisions](../../DECISIONS.md) index — one file per
area. Entries are newest-first; add new ones at the top, and add a matching line
to the index in the same change. Replaced decisions move to Superseded at the
bottom of this file.

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
`usePageTitle` hook. Routes without a title fall back to bare "Chaverola".

**Why:** Product-owner call for SEO: the page-specific words get prominence in
search results while the brand still matches a "Chaverola" search. Brand-first
("Chaverola | Join an Activity") and an audience prefix ("Student - Join an
Activity") were both rejected — the first buries the page's keywords, the
second adds clutter without search value. Full SSR/meta-tag SEO is deferred to
a later Vite SEO effort; until then titles are set client-side only.

_Implemented in [usePageTitle](../../client/src/lib/usePageTitle.ts)._
