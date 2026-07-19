import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Clapperboard,
  Drama,
  Loader2,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createActivity } from "@/lib/api";
import {
  readActivityDraft,
  saveActivityDraft,
  toCreateActivityRequest,
  validateActivityDraft,
  type ActivityDraft,
  type ActivityDraftFields,
  type SetupField,
  type SetupProblem,
} from "@/lib/activitySetup";
import { useLocaleNavigate } from "@/lib/locale";
import { SLOW_LOOKUP_HINT_MS } from "@/lib/useActivityLookup";
import { primeHostedActivityLookup } from "@/lib/useHostedActivityLookup";
import { useWarmUpServer } from "@/lib/useWarmUpServer";

import { AboutYouFields } from "./AboutYouFields";
import {
  CharacterRowsField,
  type CharacterRowState,
} from "./CharacterRowsField";
import { makeDraftPatches } from "./draftPatches";
import { FormSection } from "./FormSection";
import { LobbyPreview } from "./LobbyPreview";
import { SceneField } from "./SceneField";
import { SettingsSection } from "./SettingsSection";

// Same id-stamping idiom as the demo engines: rows need stable React keys,
// but the persisted draft stores only the content.
let rowSeq = 0;
const nextRowId = () => `character-row-${++rowSeq}`;

/** What went wrong with the last Host attempt. */
type CreateFailure = "unreachable" | "server";

/**
 * The copy for a create that has blown past the slow-hint mark — the
 * free-tier server takes ~30s to wake. Mirrors the join page's line.
 */
const SLOW_CREATE_COPY =
  "Chaverola is just waking up. The first activity of the day takes about " +
  "half a minute.";

const FAILURE_COPY: Record<CreateFailure, string> = {
  unreachable:
    "We can't reach Chaverola right now. Check your internet, then try " +
    "again. Everything you typed is still here.",
  server:
    "Something went wrong on our end and the activity wasn't created. " +
    "Give it a second, then try again.",
};

interface SetupFormState extends ActivityDraftFields {
  characters: CharacterRowState[];
}

function fromDraft(draft: ActivityDraft): SetupFormState {
  return {
    ...draft,
    characters: draft.characters.map((row) => ({ ...row, id: nextRowId() })),
  };
}

function toDraft(form: SetupFormState): ActivityDraft {
  return {
    ...form,
    characters: form.characters.map(({ name, emoji }) =>
      emoji ? { name, emoji } : { name }
    ),
  };
}

/**
 * The teacher's whole setup — one scrolling form, no wizard (teachers refill
 * it for every activity in a series, and seeing everything at once backs the
 * "about a minute" promise). The draft auto-saves to sessionStorage as they
 * type, so a refresh on a flaky classroom device loses nothing; closing the
 * tab discards it. "Host the Activity" is never disabled by validation:
 * tapping it with a problem left scrolls to and highlights the first one
 * instead of submitting. Only an in-flight create disables it — submitting
 * `POST /activities` and landing on `/activity/host/<hostKey>`.
 */
export function ActivitySetupForm() {
  const navigate = useLocaleNavigate();

  // Wake the free-tier server while the teacher fills the form, so the
  // create they submit in a minute lands on a warm instance.
  useWarmUpServer();

  const [form, setForm] = useState<SetupFormState>(() =>
    fromDraft(readActivityDraft())
  );
  // Problems render only after the first failed Host tap; from then on they
  // update live, so fixing a field clears its error the moment it's fixed.
  const [showProblems, setShowProblems] = useState(false);

  // True while the create request is in flight; the button stays disabled
  // for the whole ride (see handleSubmit for why there's no timeout).
  const [hosting, setHosting] = useState(false);
  // True once an in-flight create has blown past the slow-hint mark.
  const [hostingSlow, setHostingSlow] = useState(false);
  const hostingSlowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [failure, setFailure] = useState<CreateFailure | null>(null);

  useEffect(
    () => () => {
      if (hostingSlowTimer.current) clearTimeout(hostingSlowTimer.current);
    },
    []
  );

  useEffect(() => {
    saveActivityDraft(toDraft(form));
  }, [form]);

  const problems = useMemo(() => validateActivityDraft(toDraft(form)), [form]);
  const problemFor = (field: SetupField): string | undefined =>
    showProblems
      ? problems.find((problem) => problem.field === field)?.message
      : undefined;

  // Every field that can be a problem registers its input here, so a failed
  // Host tap can scroll straight to the first one.
  const fieldRefs = useRef(new Map<SetupField, HTMLElement>());
  const registerField = (field: SetupField) => (el: HTMLElement | null) => {
    if (el) {
      fieldRefs.current.set(field, el);
    } else {
      fieldRefs.current.delete(field);
    }
  };

  const scrollToProblem = (problem: SetupProblem) => {
    const el = fieldRefs.current.get(problem.field);
    if (!el) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    el.scrollIntoView({
      block: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });
    el.focus({ preventScroll: true });
  };

  const { patch, patchSettings, updateCharacter, addCharacter } =
    makeDraftPatches(setForm, nextRowId);

  const removeCharacter = (id: string) =>
    setForm((prev) => ({
      ...prev,
      characters: prev.characters.filter((row) => row.id !== id),
    }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (hosting) return;
    const firstProblem = problems[0];
    if (firstProblem) {
      setShowProblems(true);
      scrollToProblem(firstProblem);
      return;
    }
    setHosting(true);
    setFailure(null);
    hostingSlowTimer.current = setTimeout(
      () => setHostingSlow(true),
      SLOW_LOOKUP_HINT_MS
    );
    // No client-side timeout on purpose: create isn't idempotent, so a retry
    // fired while a cold-start response is still in flight could mint a
    // second activity. The button waits out even a ~60s cold start.
    void createActivity(toCreateActivityRequest(toDraft(form))).then(
      (result) => {
        if (hostingSlowTimer.current !== null) {
          clearTimeout(hostingSlowTimer.current);
          hostingSlowTimer.current = null;
        }
        setHosting(false);
        setHostingSlow(false);
        if (!result.ok) {
          // Create has no not-found; anything but unreachable reads as a
          // server-side failure.
          setFailure(result.kind === "unreachable" ? "unreachable" : "server");
          return;
        }
        // The draft stays put on purpose: Chaverola is a series of
        // activities with the same class, so the next round starts from
        // this setup.
        primeHostedActivityLookup(result.data.hostKey, result.data.activity);
        navigate(`/activity/host/${result.data.hostKey}`);
      }
    );
  };

  const hostNameError = problemFor("hostName");
  const emailError = problemFor("teacherEmail");

  return (
    <form noValidate onSubmit={handleSubmit}>
      {/* No items-start here: the aside must stretch to the row's full
          height, or its sticky preview has no track to slide along. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
        <div className="flex flex-col gap-5 sm:gap-6">
          <FormSection
            title="Characters"
            icon={Drama}
            accent="grape"
            hint="Students play these parts when you pair them up. Two is all you need: every 1:1 chat uses the first two. A 3rd character only gets used when you pair a group of 3, and a 4th when you pair a group of 4."
          >
            <CharacterRowsField
              rows={form.characters}
              onUpdate={updateCharacter}
              onAdd={addCharacter}
              onRemove={removeCharacter}
              problemFor={problemFor}
              registerField={registerField}
            />
          </FormSection>

          <FormSection title="About you" icon={UserRound} accent="coral">
            <AboutYouFields
              hostName={form.hostName}
              teacherEmail={form.teacherEmail}
              onPatch={patch}
              hostNameError={hostNameError}
              emailError={emailError}
              idPrefix="setup-host"
              namePlaceholder="Ms. Cohen"
              nameHint={
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Students see “Hosted by {form.hostName.trim() || "…"}” in the
                  lobby.
                </p>
              }
              registerField={registerField}
            />
          </FormSection>

          <FormSection
            title="Set the scene"
            icon={Clapperboard}
            accent="sky"
            optional
            hint="One or two lines about where and when the chat happens. Students read it in the lobby while they wait."
          >
            <SceneField
              value={form.scene}
              onChange={(scene) => patch({ scene })}
            />
          </FormSection>

          <SettingsSection settings={form.settings} onChange={patchSettings} />
        </div>

        {/* Desktop rail: the live lobby preview — fill on the left, watch it
            land on the right. The Host action lives in the bottom dock. */}
        <aside className="hidden lg:block">
          <div className="sticky top-20">
            <LobbyPreview
              hostName={form.hostName}
              scene={form.scene}
              characters={form.characters}
            />
          </div>
        </aside>
      </div>

      {/* The docked submit, its one home at every breakpoint — first-time
          teachers working down the form column missed the old rail placement.
          Phones get a blur-backed bottom bar in thumb reach; on desktop the
          bar chrome goes (a full-width shelf behind a column-wide button
          looked lopsided) and the button floats shadowed off the bottom edge,
          card-edge to card-edge with the form column. The strip itself is
          pointer-events-none there so it never blocks the page behind it. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/85 backdrop-blur-sm lg:pointer-events-none lg:border-t-0 lg:bg-transparent lg:backdrop-blur-none">
        <div className="mx-auto w-full max-w-2xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 lg:pt-0 lg:pb-5">
          <div className="flex flex-col gap-2 lg:pointer-events-auto">
            {/* Solid backgrounds on both notices: on desktop the strip
                behind them is transparent, and they float over the page. */}
            {failure && !hosting && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm font-medium text-destructive lg:shadow-lg"
              >
                {FAILURE_COPY[failure]}
              </div>
            )}
            {hosting && hostingSlow && (
              <p
                role="status"
                className="rounded-xl bg-background/95 px-4 py-1.5 text-center text-sm text-muted-foreground lg:shadow-lg"
              >
                {SLOW_CREATE_COPY}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={hosting}
              className="w-full lg:shadow-lg"
            >
              {hosting ? (
                <>
                  Setting up your activity…
                  <Loader2 className="size-4 animate-spin motion-reduce:animate-none" />
                </>
              ) : (
                <>
                  Host the Activity
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
