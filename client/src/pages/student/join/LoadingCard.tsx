import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { SLOW_LOOKUP_COPY, STUDENT_CARD_CLASS } from "./stageTypes";

/**
 * The URL names a code whose lookup is still in flight (a lobby refresh, a
 * shared link). Its own stage on purpose: rendering the code gate here would
 * fire the page's sign-out effect mid-lookup. `showPatience` admits the
 * free-tier wake-up once the lookup blows past the slow-hint mark.
 */
export function LoadingCard({ showPatience }: { showPatience: boolean }) {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
      <div
        role="status"
        className={cn(
          STUDENT_CARD_CLASS,
          "flex w-full animate-in flex-col items-center gap-4 px-6 py-10 text-center duration-500 fade-in motion-reduce:animate-none sm:px-8"
        )}
      >
        <Loader2
          aria-hidden
          className="size-8 animate-spin text-brand-grape motion-reduce:animate-none"
        />
        <p className="text-lg font-semibold text-foreground">
          Finding your activity…
        </p>
        {showPatience && (
          <p className="text-sm text-muted-foreground">{SLOW_LOOKUP_COPY}</p>
        )}
      </div>
    </div>
  );
}
