import { Outlet, useLocation } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { localePrefix } from "@/lib/locale";
import { useHeroCtaPassed } from "@/lib/useHeroCtaPassed";
import { cn } from "@/lib/utils";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { LocaleLink } from "./LocaleLink";

/**
 * App shell: navbar (logo home, language switcher, the student Join CTA)
 * over the routed page content. The Join CTA renders only on the homepage
 * (the only page with the hero CTA) — elsewhere it's just noise. The
 * student join flow doesn't use this shell at all; see StudentWorldLayout.
 * On the teacher's live host route the logo (the home link) is removed
 * entirely so it can't be clicked by accident mid-activity.
 *
 * On phones, the homepage navbar swaps modes as you scroll: while the hero's
 * own Join button is on screen the bar shows just the brand; once you scroll
 * past it, the wordmark slides away and a "Join Activity" button slides in —
 * see DECISIONS.md. From `sm` up the bar is static.
 */
export function AppLayout() {
  const heroCtaPassed = useHeroCtaPassed();
  // null = no hero CTA, i.e. not the homepage → no navbar Join CTA at all.
  const onHomepage = heroCtaPassed !== null;

  // Hosting a live activity: the brand link disappears so a stray click can't
  // yank the teacher off their running activity — see DECISIONS.md → "The
  // brand home link disappears mid-chat and while hosting".
  const { pathname } = useLocation();
  const hostingActivity = pathname
    .slice(localePrefix(pathname).length)
    .startsWith("/activity/host/");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16">
          {!hostingActivity && (
            <LocaleLink
              to="/"
              className="rounded-lg transition-opacity hover:opacity-80"
              aria-label="Chaverola home"
            >
              <Logo
                size={30}
                wordmarkClassName={cn(
                  "max-w-32 overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none",
                  heroCtaPassed === true &&
                    "max-sm:max-w-0 max-sm:-translate-x-2 max-sm:opacity-0"
                )}
              />
            </LocaleLink>
          )}

          {/* `ms-auto` keeps this end-pinned when the brand link is hidden. */}
          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {onHomepage && (
              <>
                {/* From `sm` up: always there, full label, no swap. */}
                <Button asChild size="sm" className="max-sm:hidden">
                  <LocaleLink to="/activity/join">Join an Activity</LocaleLink>
                </Button>
                {/* Phones: hidden while the hero's own Join CTA is on screen. */}
                <div
                  inert={heroCtaPassed !== true}
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none sm:hidden",
                    heroCtaPassed
                      ? "visible max-w-36 translate-x-0 opacity-100"
                      : "invisible max-w-0 translate-x-4 opacity-0"
                  )}
                >
                  <Button asChild size="sm">
                    <LocaleLink to="/activity/join">Join Activity</LocaleLink>
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
