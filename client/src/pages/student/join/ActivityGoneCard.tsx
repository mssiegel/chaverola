import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { STUDENT_CARD_CLASS } from "./stageTypes";

/**
 * The screen for an activity that died under a seated student — a deploy or
 * restart wiped the in-memory store, or the 12h TTL reaped it. Honest about
 * what happened instead of blaming the student's code, and the sign-out is
 * deferred to the CTA (the session is the evidence this screen exists).
 */
export function ActivityGoneCard({
  onEnterNewCode,
}: {
  onEnterNewCode: () => void;
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
            This activity is over
          </h1>
          <p className="text-muted-foreground">
            Your class wrapped up, or Chaverola's server restarted and cut the
            activity short. If class is still going, ask your teacher for a
            fresh code.
          </p>
        </div>
        <Button
          size="lg"
          onClick={onEnterNewCode}
          className="w-full bg-linear-to-r from-brand-gradient-from to-brand-gradient-to hover:from-[#7d5cf5] hover:to-[#5f3fd6]"
        >
          Enter a new code
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
