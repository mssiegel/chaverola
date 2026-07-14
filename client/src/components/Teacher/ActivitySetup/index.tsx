import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clapperboard, Drama, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  buildHostedActivity,
  MAX_CHARACTERS,
  NAME_COUNTER_FROM,
  NAME_MAX_CHARS,
  readActivityDraft,
  saveActivityDraft,
  saveHostedActivity,
  SCENE_COUNTER_FROM,
  SCENE_MAX_WORDS,
  validateActivityDraft,
  type ActivityDraft,
  type CharacterDraft,
  type SetupField,
  type SetupProblem,
} from "@/lib/activitySetup";
import { useLocalePath } from "@/lib/locale";
import { charCount, clampChars, clampWords, countWords } from "@/lib/text";
import { cn } from "@/lib/utils";
import { mockGenerateJoinCode } from "@/mockData";
import type { ActivitySettings } from "@/types/activity";

import {
  CharacterRowsField,
  type CharacterRowState,
} from "./CharacterRowsField";
import { FieldError, LimitCounter } from "./FieldFeedback";
import { FormSection } from "./FormSection";
import { LobbyPreview } from "./LobbyPreview";
import { SettingsSection } from "./SettingsSection";

// Same id-stamping idiom as the demo engines: rows need stable React keys,
// but the persisted draft stores only the content.
let rowSeq = 0;
const nextRowId = () => `character-row-${++rowSeq}`;

interface SetupFormState extends Omit<ActivityDraft, "characters"> {
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
  const navigate = useNavigate();
  const localePath = useLocalePath();

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

  const patch = (changes: Partial<SetupFormState>) =>
    setForm((prev) => ({ ...prev, ...changes }));

  const patchSettings = (changes: Partial<ActivitySettings>) =>
    setForm((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...changes },
    }));

  const updateCharacter = (id: string, changes: Partial<CharacterDraft>) =>
    setForm((prev) => ({
      ...prev,
      characters: prev.characters.map((row) =>
        row.id === id ? { ...row, ...changes } : row
      ),
    }));

  const addCharacter = () =>
    setForm((prev) =>
      prev.characters.length >= MAX_CHARACTERS
        ? prev
        : {
            ...prev,
            characters: [...prev.characters, { id: nextRowId(), name: "" }],
          }
    );

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
    navigate(localePath(`/activity/host/${activity.joinCode}`));
  };

  const hostNameError = problemFor("hostName");
  const emailError = problemFor("teacherEmail");
  const sceneWords = countWords(form.scene);

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
            <div className="flex flex-col gap-5">
              <div>
                <FieldLabelRow htmlFor="setup-host-name" label="Your name">
                  <LimitCounter
                    count={charCount(form.hostName)}
                    max={NAME_MAX_CHARS}
                    showFrom={NAME_COUNTER_FROM}
                  />
                </FieldLabelRow>
                <Input
                  id="setup-host-name"
                  ref={registerField("hostName")}
                  value={form.hostName}
                  onChange={(event) =>
                    patch({
                      hostName: clampChars(event.target.value, NAME_MAX_CHARS),
                    })
                  }
                  placeholder="Ms. Cohen"
                  aria-invalid={hostNameError ? true : undefined}
                />
                {hostNameError ? (
                  <FieldError message={hostNameError} className="mt-1.5" />
                ) : (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Students see “Hosted by {form.hostName.trim() || "…"}” in
                    the lobby.
                  </p>
                )}
              </div>

              <div>
                <FieldLabelRow
                  htmlFor="setup-teacher-email"
                  label="Your email"
                  optional
                />
                <Input
                  id="setup-teacher-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  ref={registerField("teacherEmail")}
                  value={form.teacherEmail}
                  onChange={(event) =>
                    patch({ teacherEmail: event.target.value })
                  }
                  placeholder="you@school.org"
                  aria-invalid={emailError ? true : undefined}
                />
                {emailError ? (
                  <FieldError message={emailError} className="mt-1.5" />
                ) : (
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    We'll email you every chat from the activity once it wraps
                    up.
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Set the scene"
            icon={Clapperboard}
            accent="sky"
            optional
            hint="One or two lines about where and when the chat happens. Students read it in the lobby while they wait."
          >
            <Textarea
              rows={2}
              value={form.scene}
              onChange={(event) =>
                patch({
                  scene: clampWords(event.target.value, SCENE_MAX_WORDS),
                })
              }
              aria-label="Scene"
              placeholder="Rome, 44 BC, the night before the Ides of March…"
            />
            {sceneWords >= SCENE_COUNTER_FROM && (
              <div className="mt-1.5 flex justify-end">
                <LimitCounter
                  count={sceneWords}
                  max={SCENE_MAX_WORDS}
                  showFrom={SCENE_COUNTER_FROM}
                  unit="words"
                />
              </div>
            )}
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

function FieldLabelRow({
  htmlFor,
  label,
  optional,
  children,
}: {
  htmlFor: string;
  label: string;
  optional?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex items-baseline justify-between gap-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-foreground"
      >
        {label}
        {optional && (
          <span className="ml-1.5 font-normal text-muted-foreground">
            (optional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
