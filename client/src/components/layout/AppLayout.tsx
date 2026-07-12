import { Outlet } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useHeroCtaPassed } from "@/lib/useHeroCtaPassed";
import { cn } from "@/lib/utils";

import { LanguageSwitcher } from "./LanguageSwitcher";
import { LocaleLink } from "./LocaleLink";

/**
 * App shell: navbar (logo home, language switcher, the student Join CTA)
 * over the routed page content. Join is the only navbar CTA — teachers reach
 * Host an Activity from the hero.
 *
 * On phones, the homepage navbar swaps modes as you scroll: while the hero's
 * own Join button is on screen the bar shows just the brand; once you scroll
 * past it, the wordmark slides away and a "Join Activity" button slides in —
 * see DECISIONS.md. Other pages keep a short "Join" button. From `sm` up the
 * bar is static.
 */
export function AppLayout() {
  const heroCtaPassed = useHeroCtaPassed();
  // null = no hero CTA on this page (show the static short Join button).
  const showMobileJoin = heroCtaPassed !== false;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:h-16">
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

          <div className="flex items-center gap-1 sm:gap-2">
            <LanguageSwitcher />
            {/* From `sm` up: always there, full label, no swap. */}
            <Button asChild size="sm" className="max-sm:hidden">
              <LocaleLink to="/activity/join">Join an Activity</LocaleLink>
            </Button>
            {/* Phones: hidden while the hero's own Join CTA is on screen. */}
            <div
              inert={!showMobileJoin}
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out motion-reduce:transition-none sm:hidden",
                showMobileJoin
                  ? "visible max-w-36 translate-x-0 opacity-100"
                  : "invisible max-w-0 translate-x-4 opacity-0"
              )}
            >
              <Button asChild size="sm">
                <LocaleLink to="/activity/join">
                  {heroCtaPassed === null ? "Join" : "Join Activity"}
                </LocaleLink>
              </Button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
