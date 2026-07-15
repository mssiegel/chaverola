import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clapperboard, Drama, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  buildHostedActivity,
  readActivityDraft,
  saveActivityDraft,
  saveHostedActivity,
  validateActivityDraft,
  type ActivityDraft,
  type ActivityDraftFields,
  type SetupField,
  type SetupProblem,
} from "@/lib/activitySetup";
import { useLocaleNavigate } from "@/lib/locale";
import { cn } from "@/lib/utils";
import { mockGenerateJoinCode } from "@/mockData";

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
 * tab discards it. "Host the Activity" is never disabled: tapping it with a
 * problem left scrolls to and highlights the first one instead of navigating.
 */
export function ActivitySetupForm() {
  const navigate = useLocaleNavigate();

  const [form, setForm] = useState<SetupFormState>(() =>
    fromDraft(readActivityDraft())
  );
  // Problems render only after the first failed Host tap; from then on they
  // update live, so fixing a field clears its error the moment it's fixed.
  const [showProblems, setShowProblems] = useState(false);

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
    const firstProblem = problems[0];
    if (firstProblem) {
      setShowProblems(true);
      scrollToProblem(firstProblem);
      return;
    }
    // The draft stays put on purpose: Chaverola is a series of activities
    // with the same class, so the next round starts from this setup.
    const activity = buildHostedActivity(toDraft(form), mockGenerateJoinCode());
    saveHostedActivity(activity);
    navigate(`/activity/host/${activity.joinCode}`);
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

        {/* Desktop rail: the live lobby preview with the Host action right
            under it — fill on the left, watch it land on the right. */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 flex flex-col gap-5">
            <LobbyPreview
              hostName={form.hostName}
              scene={form.scene}
              characters={form.characters}
            />
            <div className="flex flex-col gap-2.5">
              <HostCta hintClassName="text-sm" />
            </div>
          </div>
        </aside>
      </div>

      {/* Docked Host bar below lg: the action stays in thumb reach, which
          pays off when a returning teacher rehosts an already-filled draft. */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/85 backdrop-blur-sm lg:hidden">
        <div className="mx-auto w-full max-w-2xl px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <HostCta hintClassName="mt-2 text-xs" />
        </div>
      </div>
    </form>
  );
}

/** The one submit, rendered in both of its breakpoint homes (rail + dock). */
function HostCta({ hintClassName }: { hintClassName: string }) {
  return (
    <>
      <Button type="submit" size="lg" className="w-full">
        Host the Activity
        <ArrowRight className="size-4" />
      </Button>
      <p className={cn("text-center text-muted-foreground", hintClassName)}>
        Your join code shows up on the next screen.
      </p>
    </>
  );
}
