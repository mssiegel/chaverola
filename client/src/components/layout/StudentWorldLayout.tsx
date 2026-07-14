import { useState } from "react";
import { Outlet } from "react-router-dom";

import { ChaverolaPill } from "@/components/brand/ChaverolaPill";
import { DriftingDoodles } from "@/components/decor/DriftingDoodles";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { LocaleLink } from "./LocaleLink";

/**
 * What the layout hands its pages through the router Outlet. The chat stage
 * lives in page state, not the route, so the page has to tell the layout
 * when the brand pill (the one link home) must go away — see DECISIONS.md →
 * "The brand home link disappears mid-chat and while hosting".
 */
export interface StudentWorldOutletContext {
  setHomeLinkHidden: (hidden: boolean) => void;
}

/**
 * The immersive shell for the student join flow: no navbar, a full-viewport
 * purple world with slowly drifting doodles, a floating language pill, and
 * the Chaverola pill (the one link home) above the routed content. The
 * backdrop is `fixed` so lobby scrolling and mobile keyboards slide the
 * content OVER the world rather than dragging the world along.
 */
export function StudentWorldLayout() {
  // While a chat is on screen the pill disappears: one stray tap on it would
  // dump the student on the homepage and kill the chat.
  const [homeLinkHidden, setHomeLinkHidden] = useState(false);
  return (
    <div className="relative flex min-h-dvh flex-col">
      <div aria-hidden className="student-world-bg fixed inset-0">
        <DriftingDoodles />
      </div>

      {/* Corner chrome, navbar-style: brand pill starts, language pill ends.
          The bar itself must not block clicks on the world below it. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-4">
        {!homeLinkHidden && (
          <LocaleLink
            to="/"
            aria-label="Chaverola home"
            className="pointer-events-auto inline-flex rounded-full transition-opacity hover:opacity-90"
          >
            <ChaverolaPill />
          </LocaleLink>
        )}
        {/* `ms-auto` keeps the switcher pinned end when the pill is hidden. */}
        <LanguageSwitcher className="pointer-events-auto ms-auto rounded-full bg-white/90 text-foreground shadow-md backdrop-blur-sm hover:bg-white hover:text-foreground" />
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-4 pt-20 pb-8">
        <main className="flex w-full flex-1 flex-col items-center">
          <Outlet
            context={{ setHomeLinkHidden } satisfies StudentWorldOutletContext}
          />
        </main>
      </div>
    </div>
  );
}
