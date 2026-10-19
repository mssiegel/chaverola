import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router-dom";

import { ChaverolaPill } from "@/components/brand/ChaverolaPill";
import { DriftingDoodles } from "@/components/decor/DriftingDoodles";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { LocaleLink } from "./LocaleLink";
import { PageSpinner } from "./PageSpinner";
import { useStudentChatViewport } from "./useStudentChatViewport";

const InputDiagnostics = lazy(() =>
  import("./InputDiagnostics").then((m) => ({ default: m.InputDiagnostics }))
);

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
  /**
   * Whether the resolved activity holds students in its own language. The
   * page owns this too, for the same reason: a join code resolves inside the
   * page, long after this layout mounted.
   */
  setLocaleLocked: (locked: boolean) => void;
}

/**
 * The immersive shell for the student join flow: no navbar, a full-viewport
 * purple world with slowly drifting doodles, a floating language pill, and
 * the Chaverola pill (the one link home) above the routed content. The
 * backdrop is `fixed` so lobby scrolling slides the content OVER the world
 * rather than dragging the world along. Phone chats follow the visual
 * viewport: Safari pans/shrinks that rectangle above its keyboard even when
 * the layout viewport and dvh stay unchanged.
 *
 * On phones, typing collapses the corner chrome: with a keyboard open there
 * are barely 300px of world left, and a quarter of it went to a name badge
 * and a language pill (see DECISIONS.md → "While a student types on a phone,
 * the world's chrome gets out of the way"). Both come back on blur.
 */
export function StudentWorldLayout() {
  const { t } = useTranslation();
  // While a chat is on screen the brand pill disappears (one stray tap on it
  // would dump the student on the homepage and kill the chat) and the
  // student's name badge fills the vacated corner.
  const [chatStudentName, setChatStudentName] = useState<string | null>(null);
  // Set by the join page once a code resolves onto a locked activity. Starts
  // false so the code gate — which anyone may land on cold — always has its
  // switcher.
  const [localeLocked, setLocaleLocked] = useState(false);
  const worldRef = useStudentChatViewport(chatStudentName !== null);
  const inputDebug =
    new URLSearchParams(window.location.search).get("input-debug") === "1";
  return (
    // `group` shares the viewport boundary and composer-focus state with the
    // chat. Name any unrelated groups below (`group/thing`) to avoid collisions.
    <div
      ref={worldRef}
      className="group relative flex min-h-dvh flex-col data-[chat-viewport]:fixed data-[chat-viewport]:inset-x-0 data-[chat-viewport]:top-[var(--student-viewport-top)] data-[chat-viewport]:h-[var(--student-viewport-height)] data-[chat-viewport]:min-h-0 data-[chat-viewport]:overflow-hidden"
    >
      <div aria-hidden className="student-world-bg fixed inset-0">
        <DriftingDoodles />
      </div>

      {/* Corner chrome, navbar-style: brand pill (or, mid-chat, the name
          badge) starts, language pill ends. The bar itself must not block
          clicks on the world below it. On phones it stands down while the
          student types, handing its band to the chatbox.

          Every pad is an inset with today's spacing as its floor (the setup
          dock's idiom), because index.html's viewport-fit=cover runs the page
          under the notch. The left/right ones are the landscape half: rotate a
          notched iPhone and the notch eats the corner the language pill sits
          in. `pl`/`pr`, not `ps`/`pe` — the env() vars are PHYSICAL, and this
          app now really does mirror under /he, so a logical
          `ps-[…inset-left]` would put the left notch's inset on the right
          edge. These two are the one deliberate exception to the logical-
          property sweep; leave them physical. */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-between gap-3 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(1rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] group-data-[chat-viewport]:absolute max-sm:group-has-[textarea:focus]:hidden">
        {chatStudentName === null ? (
          <LocaleLink
            to="/"
            aria-label={t("brand.home")}
            className="pointer-events-auto inline-flex rounded-full transition-opacity hover:opacity-90"
          >
            <ChaverolaPill />
          </LocaleLink>
        ) : (
          <StudentNameBadge name={chatStudentName} />
        )}
        {/* The switcher goes away for the same reason the brand pill does:
            `/` and `/he` are separate route mounts, so switching language
            remounts the page — which mid-chat means a dropped socket and a
            reset conversation. A student picks their language at the join
            gate; mid-roleplay is the worst moment to offer a reset. See
            DECISIONS.md → "The language switcher disappears once a student is
            seated".

            And it never appears at all once a LOCKED activity has resolved:
            the teacher said the class reads one language, so a switch that
            the join page would bounce straight back is worse than no switch.
            See DECISIONS.md → "A teacher can lock an activity to its
            language".

            `ms-auto` keeps it pinned end even with no start chrome. */}
        {chatStudentName === null && !localeLocked && (
          <LanguageSwitcher className="pointer-events-auto ms-auto shrink-0 rounded-full bg-white/90 text-foreground shadow-md backdrop-blur-sm hover:bg-white hover:text-foreground" />
        )}
        {inputDebug && chatStudentName !== null && (
          <Suspense fallback={null}>
            <InputDiagnostics />
          </Suspense>
        )}
      </div>

      {/* The top pad clears the corner bar; when that bar stands down for the
          keyboard the padding goes with it, or the chatbox would gain nothing.
          80px is bar-pad (16) + pill (~40) + gap (24), so once the bar's own
          pad grows to the notch inset this has to grow with it — hence
          `4rem + inset` (the 64px of bar-and-gap) under a 5rem floor, which is
          exactly today's pt-20 wherever the inset is 0. The collapsed pad
          takes an inset too: the corner bar hides while typing, the status bar
          does not, so a bare pt-2 would slide the chat card under it.

          The bottom pad is the one this whole change is for: it's what holds
          the composer's send button out of the home-indicator strip. The chat
          card's -mx-2 stretch is horizontal only, so it can't bypass this.
          While typing the keyboard replaces the home-indicator edge; do not
          carry a stale safe-area bottom inset into the space above the keys.
          Demo controls and long ended cards scroll INSIDE the phone viewport. */}
      <div className="relative z-10 flex flex-1 flex-col items-center gap-6 px-4 pt-[max(5rem,calc(4rem+env(safe-area-inset-top)))] pb-[max(0.5rem,env(safe-area-inset-bottom))] group-data-[chat-viewport]:min-h-0 group-data-[chat-viewport]:overflow-y-auto group-data-[chat-viewport]:overscroll-y-contain max-sm:group-has-[textarea:focus]:pt-[max(0.5rem,env(safe-area-inset-top))] max-sm:group-has-[textarea:focus]:pb-2 sm:pb-[max(2rem,env(safe-area-inset-bottom))]">
        {/* Around the Outlet, never in place of it — the Outlet is what hands
            the page its context. The world and its doodles stay up while the
            join chunk arrives, which is the whole point of splitting inside
            the layout rather than above it. White, not grape: the spinner's
            usual colour vanishes against the purple. */}
        <main className="flex min-h-0 w-full flex-1 flex-col items-center">
          <Suspense fallback={<PageSpinner className="text-white" />}>
            <Outlet
              context={
                {
                  setChatStudentName,
                  setLocaleLocked,
                } satisfies StudentWorldOutletContext
              }
            />
          </Suspense>
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
  const { t } = useTranslation();
  return (
    <p className="min-w-0 truncate rounded-full bg-brand-grape-strong/60 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm">
      <span className="sr-only">{t("student.signedInAs")}</span>
      {/* The name is student-typed, so it may be a different script from the
          UI around it — <bdi> keeps it from dragging neighbouring
          punctuation to the wrong side. */}
      <bdi>{name}</bdi>
    </p>
  );
}
