import { useState } from "react";
import { Outlet } from "react-router-dom";

import { ChaverolaPill } from "@/components/brand/ChaverolaPill";
import { DriftingDoodles } from "@/components/decor/DriftingDoodles";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { LocaleLink } from "./LocaleLink";

/**
 * What the layout hands its pages through the router Outlet. The chat stage
 * lives in page state, not the route, so the page has to tell the layout
 * when a chat is on screen. One signal covers both corner effects: the brand
 * pill (the one link home) goes away, and the student's name badge takes its
 * spot — see DECISIONS.md → "The brand home link disappears mid-chat and
 * while hosting" and "Mid-chat, the student's name is a corner badge".
 */
export interface StudentWorldOutletContext {
  /** The signed-in student's name while a chat is on screen, else null. */
  setChatStudentName: (name: string | null) => void;
}

/**
 * The immersive shell for the student join flow: no navbar, a full-viewport
 * purple world with slowly drifting doodles, a floating language pill, and
 * the Chaverola pill (the one link home) above the routed content. The
 * backdrop is `fixed` so lobby scrolling slides the content OVER the world
 * rather than dragging the world along. On Android the keyboard resizes the
 * viewport itself (`interactive-widget` in index.html), so the world — and
 * the chat card filling it — shrinks to what's visible above the keys.
 */
export function StudentWorldLayout() {
  // While a chat is on screen the brand pill disappears (one stray tap on it
  // would dump the student on the homepage and kill the chat) and the
  // student's name badge fills the vacated corner.
  const [chatStudentName, setChatStudentName] = useState<string | null>(null);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="student-world-bg fixed inset-0">
        <DriftingDoodles />
      </div>

      {/* Corner chrome, navbar-style: brand pill (or, mid-chat, the name
          badge) starts, language pill ends. The bar itself must not block
          clicks on the world below it. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-4">
        {chatStudentName === null ? (
          <LocaleLink
            to="/"
            aria-label="Chaverola home"
            className="pointer-events-auto inline-flex rounded-full transition-opacity hover:opacity-90"
          >
            <ChaverolaPill />
          </LocaleLink>
        ) : (
          <StudentNameBadge name={chatStudentName} />
        )}
        {/* `ms-auto` keeps the switcher pinned end even with no start chrome. */}
        <LanguageSwitcher className="pointer-events-auto ms-auto shrink-0 rounded-full bg-white/90 text-foreground shadow-md backdrop-blur-sm hover:bg-white hover:text-foreground" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-4 pt-20 pb-2 sm:pb-8">
        <main className="flex w-full flex-1 flex-col items-center">
          <Outlet
            context={{ setChatStudentName } satisfies StudentWorldOutletContext}
          />
        </main>
      </div>
    </div>
  );
}

/**
 * The student's own name in the world's top-left corner while they chat,
 * where the brand pill normally sits. Deliberately NOT a button: darker than
 * the world (translucent white washes out against the purple), flat, no
 * shadow, no hover state — unlike the solid-white pills that do things — and
 * it stays inside the bar's `pointer-events-none`, so taps fall through to
 * the world. Just the name: no avatar disc, since students never have one.
 */
function StudentNameBadge({ name }: { name: string }) {
  return (
    <p className="min-w-0 truncate rounded-full bg-brand-grape-strong/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
      <span className="sr-only">Signed in as </span>
      {name}
    </p>
  );
}
