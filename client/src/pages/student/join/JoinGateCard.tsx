import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

import { STUDENT_NAME_MAX_CHARS } from "@chaverola/shared";

import { Button } from "@/components/ui/button";
import { getActivity } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useLocaleNavigate } from "@/lib/locale";
import type { Activity } from "@/types/activity";
import {
  primeActivityLookup,
  type ActivityLookup,
} from "@/lib/useActivityLookup";
import { DEMO_JOIN_CODE } from "@/mockData";

import {
  STUDENT_CARD_CLASS,
  UNREACHABLE_COPY,
  type CodeProblem,
  type StudentStage,
} from "./stageTypes";

/**
 * The one form serving both gate stages — code entry and name entry — on one
 * route; only the input and the button label change between them. Owns the
 * code-entry submit machinery (the state and the lookup);
 * `name` / `removedByTeacher` arrive as props because socket and demo flows
 * write them. The name-stage submit's page effects (sign-in, latch clears)
 * are `onJoinActivity`; the same-URL resubmit hands its fetched activity back
 * through `onDeliverLookup`.
 */
export function JoinGateCard({
  stage,
  activity,
  joinCodeParam,
  lookupState,
  code,
  onCodeChange,
  name,
  onNameChange,
  removedByTeacher,
  onJoinActivity,
  onDeliverLookup,
}: {
  stage: StudentStage;
  activity: Activity | undefined;
  joinCodeParam: string | undefined;
  lookupState: ActivityLookup["state"];
  // Code state is owned by the shell, not this card: the page persists across
  // the /activity/join ↔ /activity/join/:code SPA navigation, but this card
  // unmounts whenever the stage leaves the gate (lobby, chat), so a
  // card-local seed would drop a typed code on the browser-back-from-lobby
  // flow. Page-level state keeps the last code exactly as before.
  code: string;
  onCodeChange: (value: string) => void;
  name: string;
  onNameChange: (value: string) => void;
  removedByTeacher: boolean;
  onJoinActivity: () => void;
  onDeliverLookup: (activity: Activity) => void;
}) {
  const navigate = useLocaleNavigate();

  // The message under the code input has two sources: a submit that came
  // back empty-handed (state), and a shared-link arrival whose URL code
  // resolved to nothing (derived straight from the lookup, so it's already
  // showing when the code gate appears). Typing dismisses both.
  const [submitProblem, setSubmitProblem] = useState<CodeProblem | null>(null);
  const [lookupProblemDismissed, setLookupProblemDismissed] = useState(false);
  const lookupProblem: CodeProblem | null =
    joinCodeParam !== undefined &&
    (lookupState === "not-found" || lookupState === "unreachable")
      ? lookupState
      : null;
  const codeProblem =
    submitProblem ?? (lookupProblemDismissed ? null : lookupProblem);
  // True while the code-entry submit's own lookup is in flight.
  const [lookingUpCode, setLookingUpCode] = useState(false);

  // Autofocusing an input on a phone pops the keyboard over half the world,
  // so phones only get it when there's typing to do: never on the code input
  // (fresh landing, let the page breathe first) and not on a prefilled demo
  // name. Desktop always autofocuses — no keyboard to pop, and Enter submits
  // the prefilled name straight away.
  const isDesktopViewport = window.matchMedia("(min-width: 640px)").matches;

  const isCodeComplete = /^\d{4}$/.test(code);
  const canJoin = name.trim().length > 0;
  const canSubmit =
    stage === "name" ? canJoin : isCodeComplete && !lookingUpCode;

  // One form serves both gate stages; only the input and the button label
  // change between them.
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    if (stage === "name") {
      if (!activity) return;
      onJoinActivity();
      return;
    }
    // The demo code resolves with zero network — the demo works offline.
    if (code === DEMO_JOIN_CODE) {
      setSubmitProblem(null);
      navigate(`/activity/join/${code}`);
      return;
    }
    setLookingUpCode(true);
    void getActivity(code).then((result) => {
      setLookingUpCode(false);
      if (!result.ok) {
        setSubmitProblem(
          result.kind === "not_found" ? "not-found" : "unreachable"
        );
        return;
      }
      setSubmitProblem(null);
      if (code === joinCodeParam) {
        // Already on this URL (a lobby refresh that found the server down,
        // then a resubmit): navigating is a no-op, so hand the activity to
        // the lookup directly.
        onDeliverLookup(result.data.activity);
      } else {
        // Hand the fetched activity to the target route's fresh lookup so
        // the code input swaps in-place for the name input (see
        // DECISIONS.md) instead of flashing a loading screen over a
        // refetch.
        primeActivityLookup(result.data.activity);
        navigate(`/activity/join/${code}`);
      }
    });
  };

  return (
    // Phones anchor the card high so the form is visible without
    // scrolling or hunting; from `sm` up it centers in the viewport.
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-start gap-4 pt-2 sm:justify-center sm:pt-0">
      <div
        className={cn(
          STUDENT_CARD_CLASS,
          "flex w-full animate-in flex-col gap-6 px-6 py-8 text-center duration-500 fade-in slide-in-from-bottom-4 motion-reduce:animate-none sm:px-8"
        )}
      >
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-foreground">
            Join an Activity
          </h1>
          {stage === "name" && activity ? (
            <p className="animate-in text-muted-foreground duration-300 fade-in motion-reduce:animate-none">
              Hosted by{" "}
              <span className="font-semibold text-foreground">
                {activity.hostName}
              </span>{" "}
              · code {activity.joinCode}
            </p>
          ) : (
            <p className="text-muted-foreground">Enter your activity's code.</p>
          )}
        </div>

        {removedByTeacher && (
          <div
            role="alert"
            className="w-full rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
          >
            Your teacher removed you from the activity, so you're signed out.
            Enter your name to join again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
          {stage === "name" ? (
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              autoFocus={isDesktopViewport || name === ""}
              maxLength={STUDENT_NAME_MAX_CHARS}
              aria-label="Your name"
              placeholder="Your name"
              className="w-full animate-in rounded-2xl border-0 bg-brand-grape-soft px-4 py-4 text-center text-xl font-semibold duration-300 outline-none fade-in slide-in-from-bottom-2 focus:ring-2 focus:ring-brand-grape/40 motion-reduce:animate-none"
            />
          ) : (
            <>
              <input
                value={code}
                onChange={(event) => {
                  onCodeChange(
                    event.target.value.replace(/\D/g, "").slice(0, 4)
                  );
                  setSubmitProblem(null);
                  setLookupProblemDismissed(true);
                }}
                // Read-only (not disabled) mid-lookup: edits mid-flight
                // would make the answer about a different code, but a
                // disabled input would drop focus and the phone keyboard.
                readOnly={lookingUpCode}
                inputMode="numeric"
                autoFocus={isDesktopViewport}
                aria-label="Join code"
                placeholder="1234"
                className="w-full rounded-2xl border-0 bg-brand-grape-soft py-4 text-center text-3xl font-semibold tracking-[0.4em] outline-none focus:ring-2 focus:ring-brand-grape/40"
              />
              {codeProblem && (
                <p
                  role="alert"
                  className="text-sm font-medium text-destructive"
                >
                  {codeProblem === "not-found"
                    ? "Activity was not found. Recheck the Join Code you entered."
                    : UNREACHABLE_COPY}
                </p>
              )}
            </>
          )}
          {/* Hover stops are hand-tuned darker shades of the
              `--brand-gradient-*` tokens the base stops come from. */}
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            className="w-full bg-linear-to-r from-brand-gradient-from to-brand-gradient-to hover:from-[#7d5cf5] hover:to-[#5f3fd6]"
          >
            {stage === "name" ? (
              <>
                Join Activity
                <ArrowRight className="size-4" />
              </>
            ) : lookingUpCode ? (
              <>
                Finding your activity…
                <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
