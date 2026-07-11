import { Outlet } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";

import { LocaleLink } from "./LocaleLink";

/** App shell: a slim navbar (logo home) over the routed page content. */
export function AppLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <LocaleLink
            to="/"
            className="rounded-lg transition-opacity hover:opacity-80"
            aria-label="Chaverola home"
          >
            <Logo size={30} />
          </LocaleLink>
          <LocaleLink
            to="/demo/student-chat"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Chat demo
          </LocaleLink>
        </div>
      </header>
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
