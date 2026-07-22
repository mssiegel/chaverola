import { Loader2 } from "lucide-react";

import { MAX_STUDENTS_PER_ACTIVITY } from "@chaverola/shared";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { STUDENT_CARD_CLASS } from "./stageTypes";

/**
 * The seat-cap screen: the student signed in, but every seat is taken.
 * Names the cap so the wall makes sense, offers a retry (someone leaving
 * frees a seat — socket.io doesn't auto-retry a middleware rejection, so
 * the button is the only way back in) and a quiet way out.
 */
export function ActivityFullCard({
  retrying,
  onRetry,
  onUseAnotherCode,
}: {
  retrying: boolean;
  onRetry: () => void;
  onUseAnotherCode: () => void;
}) {
  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
      <div
        className={cn(
          STUDENT_CARD_CLASS,
          "flex w-full animate-in flex-col gap-6 px-6 py-8 text-center duration-500 fade-in motion-reduce:animate-none sm:px-8"
        )}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            This activity is full
          </h1>
          <p className="text-muted-foreground">
            An activity holds up to {MAX_STUDENTS_PER_ACTIVITY} students, and
            every spot is taken right now. If someone leaves, their spot opens
            up.
          </p>
        </div>
        <div className="flex w-full flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={onRetry}
            disabled={retrying}
            className="w-full bg-linear-to-r from-brand-gradient-from to-brand-gradient-to hover:from-[#7d5cf5] hover:to-[#5f3fd6]"
          >
            {retrying ? (
              <>
                Checking for a spot…
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              </>
            ) : (
              "Try again"
            )}
          </Button>
          <button
            type="button"
            onClick={onUseAnotherCode}
            className="text-sm font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Use a different code
          </button>
        </div>
      </div>
    </div>
  );
}
