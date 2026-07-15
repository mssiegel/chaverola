import { useEffect, useRef, useState } from "react";

import type { HostedActivity } from "@/types/activity";

/**
 * The page header, built around one hero stat: how many students are waiting
 * to chat. A teacher glancing over from across the classroom must catch it
 * instantly, so the count is poster-sized up top and, once it scrolls away,
 * condenses into a slim bar pinned under the navbar — it is never off
 * screen. The number re-animates on every change so movement catches the
 * eye. See DECISIONS.md → "Teacher live activity page".
 */
export function HostHeader({
  activity,
  waitingCount,
}: {
  activity: HostedActivity;
  waitingCount: number;
}) {
  const heroStatRef = useRef<HTMLDivElement>(null);
  const [statOffScreen, setStatOffScreen] = useState(false);

  useEffect(() => {
    const el = heroStatRef.current;
    if (!el) return;
    // The top margin accounts for the sticky navbar overlapping the page.
    const observer = new IntersectionObserver(
      ([entry]) => setStatOffScreen(entry ? !entry.isIntersecting : false),
      { rootMargin: "-64px 0px 0px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <header>
      <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
        Your activity is live
      </h1>
      <p className="mt-1 text-muted-foreground">
        Hosted by {activity.hostName}
      </p>

      {/* The hero stat. */}
      <div
        ref={heroStatRef}
        className="mt-5 flex items-center gap-4 rounded-2xl border border-border bg-gradient-to-r from-brand-grape-soft/70 to-card p-4 shadow-sm sm:gap-5 sm:p-5"
      >
        <span className="min-w-16 text-center text-5xl font-bold text-brand-grape-strong tabular-nums sm:min-w-20 sm:text-6xl">
          {/* Keyed by value: every change replays the pop animation. */}
          <span
            key={waitingCount}
            className="inline-block animate-in duration-500 zoom-in-50 motion-reduce:animate-none"
          >
            {waitingCount}
          </span>
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-lg font-semibold text-foreground">
            waiting to chat
            <LiveDot />
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {waitingCount === 0
              ? "The queue refills as chats wrap up."
              : "Pair them up below, or let auto-match handle it."}
          </p>
        </div>
      </div>

      {/* The condensed bar once the hero stat scrolls away. Purely visual —
          it repeats what's already on the page — so it stays out of the
          accessibility tree. */}
      {statOffScreen && (
        <div
          aria-hidden
          className="fixed inset-x-0 top-14 z-10 animate-in border-b border-border/70 bg-background/90 backdrop-blur-sm duration-200 fade-in slide-in-from-top-2 motion-reduce:animate-none sm:top-16"
        >
          <div className="mx-auto flex h-11 w-full max-w-6xl items-center gap-2.5 px-4 text-sm">
            <LiveDot />
            <span className="font-semibold text-foreground">
              <span
                key={waitingCount}
                className="inline-block animate-in text-base font-bold text-brand-grape-strong tabular-nums zoom-in-50 motion-reduce:animate-none"
              >
                {waitingCount}
              </span>{" "}
              waiting to chat
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              pin{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {activity.joinCode}
              </span>
            </span>
          </div>
        </div>
      )}
    </header>
  );
}

/** The mint "the system is live" pulse, as on the teacher chat cards. */
function LiveDot() {
  return (
    <span aria-hidden className="relative flex size-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-mint opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-brand-mint" />
    </span>
  );
}
